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
  query?: { query?: string; title?: string; description?: string; [key: string]: unknown }
}

export interface GenieMessage extends Record<string, unknown> {
  id?: string
  message_id?: string
  conversation_id?: string
  status?: GenieStatus
  attachments?: GenieAttachment[]
  error?: { error?: string; type?: string }
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
}

export interface GenieQueryEvidence {
  attachmentId: string
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

const analysisPrompt = (query: string) => `
Evaluate this university research opportunity using only evidence available in this CampusForge Genie space:
${query}

Analyze this as you would in the interactive CampusForge Genie experience. Retrieve and preserve all relevant evidence for:
- research trends and momentum
- faculty expertise
- labs and capabilities
- equipment, utilization, and availability
- existing research projects
- collaboration opportunities and genuine capability gaps

Evaluate evidence relative to the exact requested research area. Direct matches in trends, faculty expertise,
labs, equipment, and projects must carry more weight than adjacent or generally transferable capabilities.
Identify the coherent research-domain phrases in the request. Query each domain phrase independently across
every relevant campus table and union the matching source records; do not require every phrase to occur in the
same row. Then retrieve semantically adjacent capabilities as supporting evidence. Return original entity rows
with exact identifiers, names or titles, and domain fields. Do not collapse those records into only a synthesized
evidence-role summary; preserve every directly matching entity record.
Do not assign High momentum from trends in other research areas. When direct evidence is absent, report low
momentum and limited readiness even if the campus has strong capabilities in unrelated areas. Include relevant
records returned by the campus datasets, clearly label adjacent capabilities, distinguish dataset evidence from
inferred gaps, and do not invent records or values.

Separate the result into three evidence roles when reasoning:
1. direct domain evidence that explicitly names the requested research domain or its coherent domain phrases
2. adjacent/supporting capabilities that may enable future work but do not prove current domain capability
3. inferred recommendations derived from the first two roles
Generic technology overlap is supporting evidence, not direct domain evidence.
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

async function genieRequest<T>(config: GenieConfig, path: string, init?: RequestInit): Promise<T> {
  let response: Response
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
    console.error('Databricks Genie request failed:', JSON.stringify({
      method: init?.method ?? 'GET',
      path,
      status: response.status,
      statusText: response.statusText,
      authMode: config.credentials.type,
    }))
    throw new GenieServiceError(
      authenticationFailure
        ? 'Databricks Genie authentication or authorization failed.'
        : `Databricks Genie request failed with status ${response.status}.`,
      'API',
    )
  }

  return response.json() as Promise<T>
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function pollMessage(config: GenieConfig, conversationId: string, messageId: string): Promise<GenieMessage> {
  const deadline = Date.now() + pollingTimeoutMs

  while (Date.now() < deadline) {
    const message = await genieRequest<GenieMessage>(
      config,
      `/api/2.0/genie/spaces/${encodeURIComponent(config.spaceId)}/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
    )

    if (message.status === 'COMPLETED') return message
    if (message.status && terminalFailureStatuses.has(message.status)) {
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
): Promise<GenieQueryEvidence[]> {
  const messageId = message.message_id ?? message.id
  if (!messageId) return []

  const queryAttachments = (message.attachments ?? []).filter(
    (attachment) => attachment.query && attachment.attachment_id,
  )

  return Promise.all(queryAttachments.map(async (attachment) => {
    const attachmentId = attachment.attachment_id as string
    const queryResult = await genieRequest<GenieQueryResultResponse>(
      config,
      `/api/2.0/genie/spaces/${encodeURIComponent(config.spaceId)}/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}/query-result`,
    )
    const columns = queryResult.statement_response?.manifest?.schema?.columns
      ?.map((column) => column.name)
      .filter((name): name is string => Boolean(name)) ?? []
    const rows = queryResult.statement_response?.result?.data_array ?? []

    return {
      attachmentId,
      title: attachment.query?.title,
      description: attachment.query?.description,
      columns,
      rows,
      rowCount: queryResult.statement_response?.manifest?.total_row_count ?? rows.length,
    }
  }))
}

export async function startGenieAnalysis(query: string, config: GenieConfig): Promise<CompletedGenieConversation> {
  const started = await genieRequest<StartConversationResponse>(
    config,
    `/api/2.0/genie/spaces/${encodeURIComponent(config.spaceId)}/start-conversation`,
    { method: 'POST', body: JSON.stringify({ content: analysisPrompt(query), enable_visualization: false }) },
  )

  const conversationId = started.message.conversation_id
  const messageId = started.message_id ?? started.message.message_id
  if (!conversationId || !messageId) {
    throw new GenieServiceError('Databricks Genie did not return conversation identifiers.', 'API')
  }

  const message = await pollMessage(config, conversationId, messageId)
  return { conversationId, message, queryEvidence: await fetchQueryEvidence(config, conversationId, message) }
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
  )

  const messageId = repair.message_id ?? repair.id
  if (!messageId) throw new GenieServiceError('Databricks Genie did not return a repair message identifier.', 'API')
  return {
    conversationId: completed.conversationId,
    message: await pollMessage(config, completed.conversationId, messageId),
    queryEvidence: completed.queryEvidence,
  }
}
