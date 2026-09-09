import type { EvidenceDomainName, EvidenceDomainResult } from '../scoring/readinessEngine'

type GenieStatus =
  | 'FETCHING_METADATA'
  | 'FILTERING_CONTEXT'
  | 'ASKING_AI'
  | 'PENDING_WAREHOUSE'
  | 'EXECUTING_QUERY'
  | 'FAILED'
  | 'COMPLETED'
  | 'SUBMITTED'
  | 'QUERY_RESULT_EXPIRED'
  | 'CANCELLED'

export interface GenieAttachment extends Record<string, unknown> {
  attachment_id?: string
  text?: { content?: string; purpose?: string; [key: string]: unknown }
  query?: {
    query?: string
    title?: string
    description?: string
    statement_id?: string
    query_result_metadata?: Record<string, unknown>
    [key: string]: unknown
  }
}

export interface GenieMessage extends Record<string, unknown> {
  id?: string
  message_id?: string
  conversation_id?: string
  status?: GenieStatus
  attachments?: GenieAttachment[]
  error?: { error?: string; type?: string; message?: string; error_code?: string; code?: string }
}

interface StartConversationResponse {
  message_id: string
  message: GenieMessage
}

export interface GenieConfig {
  host: string
  spaceId: string
  credentials:
    | { type: 'pat'; token: string }
    | { type: 'oauth'; clientId: string; clientSecret: string }
}

interface OAuthTokenResponse {
  access_token?: string
  expires_in?: number
}

export interface CompletedGenieConversation {
  conversationId: string
  message: GenieMessage
  queryEvidence: GenieQueryEvidence[]
  evidenceDomains: EvidenceDomainResult[]
}

export interface GenieQueryEvidence {
  attachmentId: string
  domain: EvidenceDomainName
  title?: string
  description?: string
  columns: string[]
  rows: unknown[][]
  rowCount: number
}

interface GenieQueryResultResponse {
  statement_response?: {
    manifest?: { schema?: { columns?: Array<{ name?: string }> }; total_row_count?: number }
    result?: { data_array?: unknown[][] }
  }
}

export class GenieServiceError extends Error {
  readonly code: 'CONFIG' | 'API' | 'FAILED' | 'TIMEOUT'

  constructor(message: string, code: 'CONFIG' | 'API' | 'FAILED' | 'TIMEOUT') {
    super(message)
    this.name = 'GenieServiceError'
    this.code = code
  }
}

const terminalFailureStatuses = new Set<GenieStatus>(['FAILED', 'QUERY_RESULT_EXPIRED', 'CANCELLED'])
const pollingIntervalMs = 1_000
const pollingTimeoutMs = 90_000
let oauthTokenCache: { token: string; expiresAt: number } | null = null

function diagnosticString(value: unknown) {
  return typeof value === 'string' ? value.slice(0, 1_000) : undefined
}

function diagnosticRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function redactSql(sql: unknown) {
  if (typeof sql !== 'string') return undefined
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '/* [REDACTED] */')
    .replace(/--[^\r\n]*/g, '-- [REDACTED]')
    .replace(/\$\$[\s\S]*?\$\$/g, '$$[REDACTED]$$')
    .replace(/'(?:''|[^'])*'/g, "'[REDACTED]'")
    .replace(/(?<![\w])[-+]?\d+(?:\.\d+)?(?![\w])/g, '[NUMBER]')
}

function summarizeGenieFailure(message: GenieMessage, conversationId: string, messageId: string) {
  const error = message.error && typeof message.error === 'object' ? message.error : undefined

  return {
    status: message.status,
    conversationId: message.conversation_id ?? conversationId,
    messageId: message.message_id ?? message.id ?? messageId,
    errorCode: diagnosticString(error?.error_code ?? error?.code ?? message.error_code),
    errorType: diagnosticString(error?.type ?? message.error_type),
    errorMessage: diagnosticString(error?.error ?? error?.message ?? message.error_message),
    failureReason: diagnosticString(message.failure_reason ?? message.failureReason),
    warehouseId: diagnosticString(message.warehouse_id),
    attachments: (message.attachments ?? []).map((attachment) => {
      const queryMetadata = diagnosticRecord(attachment.query?.query_result_metadata)
      const queryError = diagnosticRecord(
        attachment.query?.error ?? queryMetadata?.error ?? attachment.error,
      )
      const queryStatus = diagnosticRecord(attachment.query?.status ?? queryMetadata?.status)

      return {
        attachmentId: attachment.attachment_id,
        kind: attachment.query ? 'query' : attachment.text ? 'text' : 'unknown',
        textPurpose: diagnosticString(attachment.text?.purpose),
        queryTitle: diagnosticString(attachment.query?.title),
        generatedSql: redactSql(attachment.query?.query),
        warehouseId: diagnosticString(
          attachment.query?.warehouse_id ?? queryMetadata?.warehouse_id ?? attachment.warehouse_id,
        ),
        statementId: diagnosticString(
          attachment.query?.statement_id ?? queryMetadata?.statement_id ?? attachment.statement_id,
        ),
        executionStatus: diagnosticString(
          queryStatus?.state ?? queryStatus?.status ?? attachment.query?.status ?? queryMetadata?.status,
        ),
        executionErrorCode: diagnosticString(
          queryError?.error_code ?? queryError?.code ?? attachment.query?.error_code,
        ),
        executionErrorType: diagnosticString(queryError?.type ?? attachment.query?.error_type),
        executionErrorMessage: diagnosticString(
          queryError?.message ?? queryError?.error ?? attachment.query?.error_message,
        ),
      }
    }),
  }
}

async function summarizeHttpError(response: Response) {
  let body: Record<string, unknown> | undefined
  try {
    const value = await response.json() as unknown
    if (value && typeof value === 'object' && !Array.isArray(value)) body = value as Record<string, unknown>
  } catch {
    // The HTTP status remains useful when Databricks does not return JSON.
  }

  return {
    status: response.status,
    statusText: response.statusText,
    errorCode: diagnosticString(body?.error_code),
    errorType: diagnosticString(body?.error_type),
    errorMessage: diagnosticString(body?.message),
  }
}

interface GenieRequestTrace {
  operation: string
  conversationId?: string
  messageId?: string
  attempt?: number
}

function requestBodySummary(body: RequestInit['body']) {
  if (typeof body !== 'string') return undefined
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>
    return {
      keys: Object.keys(parsed),
      contentCharacterLength: typeof parsed.content === 'string' ? parsed.content.length : undefined,
      enableVisualization: typeof parsed.enable_visualization === 'boolean'
        ? parsed.enable_visualization
        : undefined,
    }
  } catch {
    return { keys: [] }
  }
}

function logGenieLifecycle(
  event: 'sent' | 'received' | 'terminal' | 'begin',
  trace: GenieRequestTrace,
  details: Record<string, unknown>,
) {
  console.info('Databricks Genie lifecycle:', JSON.stringify({
    event,
    operation: trace.operation,
    timestamp: new Date().toISOString(),
    conversationId: trace.conversationId,
    messageId: trace.messageId,
    attempt: trace.attempt,
    ...details,
  }))
}

const evidenceDomains = [
  { name: 'trends' as const, table: 'workspace.default.research_trends' },
  { name: 'faculty', table: 'workspace.default.faculty' },
  { name: 'labs', table: 'workspace.default.labs' },
  { name: 'equipment', table: 'workspace.default.equipment' },
  { name: 'projects', table: 'workspace.default.projects' },
] as const

type EvidenceDomain = typeof evidenceDomains[number]

const analysisPrompt = (query: string, domain: EvidenceDomain) => `
Evaluate this university research opportunity using evidence from exactly one CampusForge table:
${query}

Evidence domain: ${domain.name}
Table: ${domain.table}

Execute one evidence query against only ${domain.table}. Do not query any other table. Do not use UNION or
UNION ALL. Preserve this table's natural schema and return its original identifiers, names or titles, and relevant
domain fields. Search for records directly relevant to the requested research opportunity or its coherent domain
phrases. When useful, include semantically adjacent records only as clearly labeled supporting capability; generic
technology overlap must not be presented as direct domain evidence. If no relevant records exist, return an empty
result from this table rather than searching another table or inventing evidence. Produce no duplicate query.
`.trim()

const campusForgeContract = `{
  "opportunity": { "title": string, "verdict": string, "rationale": string },
  "readiness": { "score": number, "maximum": 100, "label": "Prototype readiness", "disclaimer": string },
  "researchTrend": { "momentum": "Low" | "Medium" | "Medium-High" | "High", "summary": string },
  "faculty": [{ "id": string, "name": string, "department": string, "expertise": string[] }],
  "labs": [{ "id": string, "name": string, "capabilities": string[] }],
  "equipment": [{ "id": string, "name": string, "labId": string, "capability": string, "utilization": number, "status": "Available" | "Limited" | "Unavailable" }],
  "projects": [{ "id": string, "title": string, "status": "Ongoing" | "Completed", "fields": string[] }],
  "gaps": [{ "id": string, "title": string, "explanation": string, "evidenceKind": "inferred-gap" }],
  "collaboration": { "departments": string[], "summary": string, "members": [{ "facultyId": string, "contribution": string }], "capabilityFlow": string[] },
  "recommendation": { "verdict": string, "summary": string, "evidenceKind": "recommendation" },
  "evidence": [{ "kind": "data" | "inferred-gap" | "recommendation", "label": string, "description": string }],
  "researchConnection": string
}`

export function getGenieConfig(): GenieConfig | null {
  const host = process.env.DATABRICKS_HOST?.trim().replace(/\/$/, '')
  const spaceId = process.env.DATABRICKS_GENIE_SPACE_ID?.trim()
  const clientId = process.env.DATABRICKS_CLIENT_ID?.trim()
  const clientSecret = process.env.DATABRICKS_CLIENT_SECRET?.trim()
  const token = process.env.DATABRICKS_TOKEN?.trim()
  const isDatabricksApp = Boolean(process.env.DATABRICKS_APP_NAME || process.env.DATABRICKS_APP_PORT)

  if (!host || !spaceId) return null
  if (clientId && clientSecret) {
    return { host, spaceId, credentials: { type: 'oauth', clientId, clientSecret } }
  }
  if (!isDatabricksApp && token) {
    return { host, spaceId, credentials: { type: 'pat', token } }
  }
  return null
}

async function getOAuthToken(config: Extract<GenieConfig['credentials'], { type: 'oauth' }>, host: string) {
  if (oauthTokenCache && oauthTokenCache.expiresAt > Date.now() + 60_000) return oauthTokenCache.token

  let response: Response
  try {
    response = await fetch(`${host}/oidc/v1/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials&scope=all-apis',
    })
  } catch {
    console.error('Databricks OAuth token request failed:', JSON.stringify({ reason: 'network_error' }))
    throw new GenieServiceError('Unable to reach the Databricks OAuth service.', 'API')
  }

  if (!response.ok) {
    console.error('Databricks OAuth token request failed:', JSON.stringify({
      status: response.status,
      statusText: response.statusText,
    }))
    throw new GenieServiceError('Databricks service principal authentication failed.', 'API')
  }

  const result = await response.json() as OAuthTokenResponse
  if (!result.access_token) {
    console.error('Databricks OAuth token request failed:', JSON.stringify({ reason: 'missing_access_token' }))
    throw new GenieServiceError('Databricks OAuth response did not include an access token.', 'API')
  }

  oauthTokenCache = {
    token: result.access_token,
    expiresAt: Date.now() + (result.expires_in ?? 3_600) * 1_000,
  }
  return oauthTokenCache.token
}

async function getAccessToken(config: GenieConfig) {
  return config.credentials.type === 'pat'
    ? config.credentials.token
    : getOAuthToken(config.credentials, config.host)
}

async function genieRequest<T>(
  config: GenieConfig,
  path: string,
  init?: RequestInit,
  trace: GenieRequestTrace = { operation: 'GENIE_REQUEST' },
): Promise<T> {
  let response: Response
  const startedAt = Date.now()
  const method = init?.method ?? 'GET'
  logGenieLifecycle('sent', trace, {
    method,
    pathname: path,
    authMode: config.credentials.type,
    requestBody: requestBodySummary(init?.body),
  })
  try {
    const accessToken = await getAccessToken(config)
    response = await fetch(`${config.host}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
  } catch (error) {
    if (error instanceof GenieServiceError) throw error
    console.error('Databricks Genie request failed:', JSON.stringify({
      method: init?.method ?? 'GET',
      path,
      authMode: config.credentials.type,
      reason: 'network_error',
    }))
    throw new GenieServiceError('Unable to reach the Databricks Genie service.', 'API')
  }

  if (!response.ok) {
    const authenticationFailure = response.status === 401 || response.status === 403
    const httpError = await summarizeHttpError(response)
    logGenieLifecycle('received', trace, {
      method,
      pathname: path,
      httpStatus: response.status,
      elapsedMilliseconds: Date.now() - startedAt,
      authMode: config.credentials.type,
    })
    console.error('Databricks Genie request failed:', JSON.stringify({
      method: init?.method ?? 'GET',
      path,
      ...httpError,
      authMode: config.credentials.type,
    }))
    throw new GenieServiceError(
      authenticationFailure
        ? 'Databricks Genie authentication or authorization failed.'
        : `Databricks Genie request failed with status ${response.status}.`,
      'API',
    )
  }

  const result = await response.json() as T
  const responseRecord = diagnosticRecord(result)
  const responseMessage = diagnosticRecord(responseRecord?.message)
  logGenieLifecycle('received', trace, {
    method,
    pathname: path,
    httpStatus: response.status,
    conversationId: trace.conversationId ?? diagnosticString(
      responseRecord?.conversation_id ?? responseMessage?.conversation_id,
    ),
    messageId: trace.messageId ?? diagnosticString(
      responseRecord?.message_id ?? responseRecord?.id ?? responseMessage?.message_id ?? responseMessage?.id,
    ),
    status: diagnosticString(responseRecord?.status ?? responseMessage?.status),
    elapsedMilliseconds: Date.now() - startedAt,
    authMode: config.credentials.type,
  })
  return result
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function pollMessage(
  config: GenieConfig,
  conversationId: string,
  messageId: string,
  operation: 'POLL_EVIDENCE_DOMAIN' | 'POLL_STRUCTURED_REPAIR',
): Promise<GenieMessage> {
  const deadline = Date.now() + pollingTimeoutMs
  let attempt = 0

  while (Date.now() < deadline) {
    attempt += 1
    const message = await genieRequest<GenieMessage>(
      config,
      `/api/2.0/genie/spaces/${encodeURIComponent(config.spaceId)}/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
      undefined,
      { operation, conversationId, messageId, attempt },
    )

    if (message.status === 'COMPLETED' || (message.status && terminalFailureStatuses.has(message.status))) {
      logGenieLifecycle('terminal', { operation, conversationId, messageId, attempt }, {
        status: message.status,
      })
    }

    if (message.status === 'COMPLETED') return message
    if (message.status && terminalFailureStatuses.has(message.status)) {
      console.error('Databricks Genie message failed:', JSON.stringify(
        summarizeGenieFailure(message, conversationId, messageId),
      ))
      throw new GenieServiceError(`Databricks Genie could not complete the analysis (${message.status}).`, 'FAILED')
    }

    await wait(pollingIntervalMs)
  }

  throw new GenieServiceError('Databricks Genie analysis timed out.', 'TIMEOUT')
}

async function fetchQueryEvidence(
  config: GenieConfig,
  conversationId: string,
  message: GenieMessage,
  domain: EvidenceDomainName,
): Promise<GenieQueryEvidence[]> {
  const messageId = message.message_id ?? message.id
  if (!messageId) return []

  const queryAttachments = (message.attachments ?? []).filter(
    (attachment) => attachment.query && attachment.attachment_id,
  )

  logGenieLifecycle('begin', { operation: 'FETCH_QUERY_ATTACHMENTS', conversationId, messageId }, {
    status: message.status,
    attachmentCount: queryAttachments.length,
  })

  return Promise.all(queryAttachments.map(async (attachment) => {
    const attachmentId = attachment.attachment_id as string
    const queryResult = await genieRequest<GenieQueryResultResponse>(
      config,
      `/api/2.0/genie/spaces/${encodeURIComponent(config.spaceId)}/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}/query-result`,
      undefined,
      { operation: 'FETCH_QUERY_ATTACHMENT', conversationId, messageId },
    )
    const columns = queryResult.statement_response?.manifest?.schema?.columns
      ?.map((column) => column.name)
      .filter((name): name is string => Boolean(name)) ?? []
    const rows = queryResult.statement_response?.result?.data_array ?? []

    return {
      attachmentId,
      domain,
      title: attachment.query?.title,
      description: attachment.query?.description,
      columns,
      rows,
      rowCount: queryResult.statement_response?.manifest?.total_row_count ?? rows.length,
    }
  }))
}

export async function startGenieAnalysis(query: string, config: GenieConfig): Promise<CompletedGenieConversation> {
  const messages: GenieMessage[] = []
  const queryEvidence: GenieQueryEvidence[] = []
  const evidenceDomainResults: EvidenceDomainResult[] = []
  const firstDomain = evidenceDomains[0]
  const firstDomainStartedAt = Date.now()
  console.info(`EVIDENCE_DOMAIN_START: ${firstDomain.name}`, JSON.stringify({
    domain: firstDomain.name,
    timestamp: new Date(firstDomainStartedAt).toISOString(),
  }))
  const started = await genieRequest<StartConversationResponse>(
    config,
    `/api/2.0/genie/spaces/${encodeURIComponent(config.spaceId)}/start-conversation`,
    {
      method: 'POST',
      body: JSON.stringify({ content: analysisPrompt(query, firstDomain), enable_visualization: false }),
    },
    { operation: 'START_CONVERSATION' },
  )

  const conversationId = started.message.conversation_id
  const messageId = started.message_id ?? started.message.message_id
  if (!conversationId || !messageId) {
    throw new GenieServiceError('Databricks Genie did not return conversation identifiers.', 'API')
  }

  const firstMessage = await pollMessage(config, conversationId, messageId, 'POLL_EVIDENCE_DOMAIN')
  const firstEvidence = await fetchQueryEvidence(config, conversationId, firstMessage, firstDomain.name)
  messages.push(firstMessage)
  queryEvidence.push(...firstEvidence)
  evidenceDomainResults.push({
    domain: firstDomain.name,
    completed: true,
    attachmentCount: firstEvidence.length,
    rowCount: firstEvidence.reduce((total, evidence) => total + evidence.rowCount, 0),
  })
  console.info('EVIDENCE_DOMAIN_COMPLETE:', JSON.stringify({
    domain: firstDomain.name,
    conversationId,
    messageId,
    attachmentCount: firstEvidence.length,
    rowCount: firstEvidence.reduce((total, evidence) => total + evidence.rowCount, 0),
    elapsedMilliseconds: Date.now() - firstDomainStartedAt,
  }))

  for (const domain of evidenceDomains.slice(1)) {
    const domainStartedAt = Date.now()
    console.info(`EVIDENCE_DOMAIN_START: ${domain.name}`, JSON.stringify({
      domain: domain.name,
      conversationId,
      timestamp: new Date(domainStartedAt).toISOString(),
    }))
    const requested = await genieRequest<GenieMessage>(
      config,
      `/api/2.0/genie/spaces/${encodeURIComponent(config.spaceId)}/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ content: analysisPrompt(query, domain), enable_visualization: false }),
      },
      { operation: `EVIDENCE_DOMAIN_${domain.name.toUpperCase()}_POST`, conversationId },
    )
    const domainMessageId = requested.message_id ?? requested.id
    if (!domainMessageId) {
      throw new GenieServiceError(`Databricks Genie did not return a ${domain.name} message identifier.`, 'API')
    }

    const message = await pollMessage(config, conversationId, domainMessageId, 'POLL_EVIDENCE_DOMAIN')
    const evidence = await fetchQueryEvidence(config, conversationId, message, domain.name)
    messages.push(message)
    queryEvidence.push(...evidence)
    evidenceDomainResults.push({
      domain: domain.name,
      completed: true,
      attachmentCount: evidence.length,
      rowCount: evidence.reduce((total, item) => total + item.rowCount, 0),
    })
    console.info('EVIDENCE_DOMAIN_COMPLETE:', JSON.stringify({
      domain: domain.name,
      conversationId,
      messageId: domainMessageId,
      attachmentCount: evidence.length,
      rowCount: evidence.reduce((total, item) => total + item.rowCount, 0),
      elapsedMilliseconds: Date.now() - domainStartedAt,
    }))
  }

  const message: GenieMessage = {
    ...messages[0],
    status: 'COMPLETED',
    attachments: messages.flatMap((completedMessage) => completedMessage.attachments ?? []),
  }
  return { conversationId, message, queryEvidence, evidenceDomains: evidenceDomainResults }
}

export async function requestStructuredRepair(
  completed: CompletedGenieConversation,
  config: GenieConfig,
  query: string,
): Promise<CompletedGenieConversation> {
  const narrativeEvidence = (completed.message.attachments ?? [])
    .flatMap((attachment) => attachment.text?.content ? [attachment.text.content] : [])
  const evidenceContext = {
    narrativeEvidence,
    queryResults: completed.queryEvidence.map(({ title, description, columns, rows, rowCount }) => ({
      title,
      description,
      columns,
      rows,
      rowCount,
    })),
  }
  const repair = await genieRequest<GenieMessage>(
    config,
    `/api/2.0/genie/spaces/${encodeURIComponent(config.spaceId)}/conversations/${encodeURIComponent(completed.conversationId)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({
        content: `Transform the original analysis into the CampusForge JSON contract below for this exact requested research opportunity: ${JSON.stringify(query)}. Use all evidence supplied after the contract; it was retrieved from the original completed message in this same conversation. Every faculty member, lab, equipment item, and project must be directly supported by those rows or the original narrative. Separate direct domain evidence, adjacent/supporting capability, and inferred recommendations. Direct domain evidence must explicitly name the requested domain or a coherent domain phrase; generic technology overlap is only supporting capability and must not establish readiness. Preserve supported records, but distinguish direct matches from adjacent capabilities. Do not use an unrelated trend to claim High momentum. If no trend directly matches the requested domain, momentum must be Low. Do not invent items. Return one valid JSON object with no markdown or commentary.\n\nCONTRACT:\n${campusForgeContract}\n\nORIGINAL_EVIDENCE:\n${JSON.stringify(evidenceContext)}`,
        enable_visualization: false,
      }),
    },
    { operation: 'STRUCTURED_REPAIR_POST', conversationId: completed.conversationId },
  )

  const messageId = repair.message_id ?? repair.id
  if (!messageId) throw new GenieServiceError('Databricks Genie did not return a repair message identifier.', 'API')
  return {
    conversationId: completed.conversationId,
    message: await pollMessage(
      config,
      completed.conversationId,
      messageId,
      'POLL_STRUCTURED_REPAIR',
    ),
    queryEvidence: completed.queryEvidence,
    evidenceDomains: completed.evidenceDomains,
  }
}
