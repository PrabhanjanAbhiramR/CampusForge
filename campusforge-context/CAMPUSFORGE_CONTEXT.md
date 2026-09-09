# CampusForge Current-State Technical Snapshot

Snapshot date: 2026-09-07. This document describes the repository as inspected; it is not a CampusForge 2.0 design. Generated build output, dependencies, Git metadata, caches, lockfile contents, and secret-bearing environment files are intentionally excluded.

## 1. Project Overview

CampusForge is a React and Express prototype for assessing whether a campus has the people, facilities, equipment, active work, and research momentum needed to pursue a proposed research opportunity. Its differentiating runtime path sends a natural-language opportunity to a Databricks Genie Space, retrieves Genie's narrative and query-result attachments, asks Genie for a strict JSON rendering, grounds that result against returned evidence, and calibrates the headline readiness, momentum, and verdict before displaying an institutional research briefing.

The main user flow is:

1. A user enters or selects a research opportunity on **Discover**.
2. The browser posts the opportunity to `POST /api/analyze`.
3. Express checks its one-hour in-memory cache, then uses the Databricks Genie REST API on a miss.
4. The adapter extracts JSON, filters entity claims to evidence visible in the Genie response/query results, and recalibrates direct-evidence metrics.
5. Discover renders a research briefing with verdict, readiness, momentum, evidence, gaps, collaboration suggestions, and a recommendation.

Current features are:

- **Discover:** single-opportunity analysis through the live backend; suggested inquiry shortcuts; simulated staged loading; evidence, gap, team, collaboration, and recommendation presentation.
- **Compare Ideas:** runs two calls through the same analysis API in parallel and compares returned results side by side, with a client-generated comparison takeaway.
- **Research Trends:** static prototype trend table, momentum classification guide, and an Evaluate action that prefills Discover without submitting.
- **Campus Resources:** four-tab browser for 8 faculty, 6 labs, 10 equipment records, and 8 projects (32 total records).
- **Collaborations:** four clearly labeled prototype recommendations assembled from the shared faculty/lab data.
- **Insights:** deterministic views over shared equipment plus hardcoded capability/reuse narratives and mock gaps.
- **Deployment:** one Express process can serve both `/api/*` and the built Vite SPA; `app.yaml` targets Databricks Apps.

What appears complete for a prototype:

- The primary SPA routes, sidebar navigation, responsive shell, visual system, and empty/error/loading states exist.
- The end-to-end Genie conversation, polling, query-result retrieval, structured-response repair, evidence normalization, cache, and production static serving paths are implemented.
- Production supports Databricks App service-principal credentials; local development supports a personal access token.
- The direct-evidence calibration explicitly separates direct query-domain evidence from merely adjacent technology.

What is incomplete, mocked, placeholder, or potentially broken:

- The repository contains no campus database, CSV, SQL migration, or Databricks table definition. `campusData.ts`, `researchTrends.ts`, and much of Insights/Collaborations are hardcoded prototype data.
- Discover is the only page whose main content comes from the live Genie analysis. Other pages do not persist or query current institutional systems.
- `Insights` uses capability/reuse copy embedded in the page and imports capability gaps from a fixed Edge AI mock analysis, so those gaps are not derived from the selected/live opportunity.
- Collaboration recommendations are authored in frontend code, not generated or verified collaborations.
- Equipment in the shared campus dataset has `labId: null` for every record, so the resource table cannot demonstrate lab ownership from that dataset.
- The frontend trusts a successful API body as `CampusForgeAnalysis`; malformed nested data can reach components because runtime validation is only shallow on the backend.
- No automated tests or CI configuration are present. The README describes only the early frontend setup and is materially behind the implemented backend/deployment architecture.
- `PlaceholderPage.tsx`, several `.gitkeep`-only directories, and the `discoverQuery` field on one trend appear unused.

## 2. Complete Project Structure

Important current repository structure (excluding `.git`, `node_modules`, `dist`, caches, generated artifacts, and lockfile contents):

```text
CampusForge 2/
├── .gitignore
├── .oxlintrc.json
├── README.md
├── app.yaml
├── index.html
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── public/
│   └── campusforge-logo.png
├── server/
│   ├── index.ts
│   ├── adapters/
│   │   └── campusForgeAnalysis.ts
│   └── services/
│       └── databricksGenie.ts
└── src/
    ├── App.tsx
    ├── index.css
    ├── main.tsx
    ├── components/
    │   ├── AnalysisProgress.tsx
    │   ├── AppShell.tsx
    │   ├── CapabilityEvidence.tsx
    │   ├── OpportunityQuery.tsx
    │   └── ResearchBriefing.tsx
    ├── data/
    │   ├── campusData.ts
    │   ├── mockAnalysis.ts
    │   └── researchTrends.ts
    ├── pages/
    │   ├── CampusResourcesPage.tsx
    │   ├── CollaborationsPage.tsx
    │   ├── CompareIdeasPage.tsx
    │   ├── DiscoverPage.tsx
    │   ├── InsightsPage.tsx
    │   ├── PlaceholderPage.tsx
    │   └── ResearchTrendsPage.tsx
    └── services/
        └── campusForgeApi.ts
```

Empty placeholder directories also exist under `src/features`, `src/hooks`, `src/layouts`, `src/lib`, and `src/types`; each contains only `.gitkeep` and has no runtime role.

## 3. Tech Stack

| Area | Technology and evidence |
|---|---|
| Frontend | React 19.2.8 and React DOM 19.2.8 (`package.json`, `src/main.tsx`) |
| Language | TypeScript 6.x in strict mode; installed 6.0.3, declared `~6.0.2` (`tsconfig*.json`, package metadata) |
| Build/dev | Vite 8.2.2 with `@vitejs/plugin-react` and `@tailwindcss/vite` (`vite.config.ts`) |
| Styling | Tailwind CSS 4.3.3 is imported, but the application primarily uses a large custom stylesheet in `src/index.css` and semantic class names |
| Routing | `react-router-dom` 7.18.3; `BrowserRouter`, `Routes`, `Route`, `Navigate`, and query parameters |
| Icons | `lucide-react` 1.38.0 |
| Backend | Node.js with Express 5.2.1, TypeScript executed by `tsx` 4.23.13 |
| HTTP/CORS | Native `fetch` on the server, Express JSON middleware, `cors` 2.8.6 |
| Environment loading | `dotenv` 17.4.2 for local process configuration |
| Databricks | Direct REST calls to `/api/2.0/genie/...` and `/oidc/v1/token`; **no Databricks SDK dependency** |
| Genie | Start-conversation, message polling, message submission, attachment query-result retrieval |
| Database/data source | No directly configured database client. Campus data used by the frontend is hardcoded TypeScript; live evidence is whatever the configured Genie Space exposes |
| Linting | Oxlint (installed 1.80.0, declared `^1.79.0`) with React, TypeScript, Oxc, and React Hooks rules |
| Deployment | Databricks Apps via `app.yaml`; production Express serves Vite's `dist` directory |

Other installed-vs-declared differences are normal caret-range resolution: React type packages and the React Vite plugin resolve slightly above their declared minimum versions. There are no Python requirements or Python sources.

## 4. Frontend Architecture

### Entry point and routing

`src/main.tsx` mounts React in `StrictMode`, wraps the app in `BrowserRouter`, and imports the global stylesheet. `src/App.tsx` places all routes inside `AppShell`:

| Route | Page |
|---|---|
| `/` | `DiscoverPage` |
| `/compare-ideas` | `CompareIdeasPage` |
| `/research-trends` | `ResearchTrendsPage` |
| `/campus-resources` | `CampusResourcesPage` |
| `/collaborations` | `CollaborationsPage` |
| `/insights` | `InsightsPage` |
| any other path | Redirect to `/` |

`AppShell.tsx` owns the fixed-width institutional sidebar, logo, six navigation links, active-link styling, content outlet, and sidebar footer. The sidebar is 224px on wider screens and becomes a top/navigation treatment at smaller breakpoints. The brand uses `/public/campusforge-logo.png` through the public URL `/campusforge-logo.png`.

### Shared components

- `OpportunityQuery.tsx`: controlled form for one opportunity, three hardcoded suggestion chips, and Analyze submission.
- `AnalysisProgress.tsx`: visual five-step progress state. Its timing is driven by frontend timers, not server progress events.
- `CapabilityEvidence.tsx`: faculty/equipment evidence panels, equipment status presentation, utilization, and lab-name resolution using both returned labs and the shared campus lab dataset.
- `ResearchBriefing.tsx`: the main live analysis renderer: headline result, trend, rationale, direct evidence, projects, gaps, collaboration, suggested team, recommendation, and evidence legend.
- `AppShell.tsx`: layout and navigation.

### State management and API calls

There is no Redux, context store, query library, or persistence layer. Pages use local React state (`useState`) and limited router state (`useSearchParams`, `useNavigate`). `src/services/campusForgeApi.ts` is the sole API client. In Vite development it posts to `http://localhost:3001/api/analyze`; in production it posts to the same-origin `/api/analyze`. The request is JSON `{ "query": <trimmed string> }`.

### Important UI flows and pages

**Discover (`DiscoverPage.tsx`)**

- Starts with an Edge AI/smart agriculture example, or initializes from a `query` URL parameter.
- A query arriving from Research Trends is prefilled but not automatically submitted.
- On submit, resets old state, advances a client-side step every 220 ms, calls `analyzeOpportunity`, and renders `ResearchBriefing` on success.
- Presents a generic error panel on failure and clean empty states for missing faculty, equipment, projects, gaps, collaboration, or suggested team.

**Compare Ideas (`CompareIdeasPage.tsx`)**

- Accepts two opportunity inputs and uses `Promise.all` with two calls to `analyzeOpportunity`.
- Wraps each call so one API failure does not discard the successful result from the other.
- Shows verdict, readiness, momentum, four resource counts, rationale, and capability gaps side by side.
- Generates a two-to-three-sentence “Analytical guidance” takeaway only from the two returned objects. It declares one clearly stronger only when both score and evidence breadth separate materially; this comparison rule is frontend logic, not the backend scoring model.

**Research Trends (`ResearchTrendsPage.tsx`)**

- Renders eight hardcoded trend records from `researchTrends.ts` with activity score, growth classification, technologies, and an Evaluate action.
- Evaluate derives `Can our campus pursue <research area>?`, navigates to Discover with a query parameter, and does not submit.
- Includes static High/Medium-High/Medium/Low score-band guidance and states that the activity score is synthetic.

**Campus Resources (`CampusResourcesPage.tsx`)**

- Four local tabs: Faculty and Labs use compact rows; Equipment and Projects use compact tables.
- Uses only `campusData.ts`; it makes no API call.
- Shows the fixed total of 32 records implied by the four arrays.

**Collaborations (`CollaborationsPage.tsx`)**

- Contains four hardcoded interdisciplinary recommendation definitions.
- Resolves faculty and lab IDs against shared data, and explicitly labels the content as recommendations/inferred prototype guidance rather than verified collaborations.

**Insights (`InsightsPage.tsx`)**

- Derives “available and below 50% reported utilization” equipment from `campusData.ts`.
- Shows hardcoded major capability strengths and hardcoded project-reuse opportunities.
- Uses capability gaps imported from the static `mockAnalysis` object.
- Labels dataset evidence separately from inferred insight, but does not query the backend.

**Placeholder (`PlaceholderPage.tsx`)**

- A generic placeholder component that is not routed or imported by the current app.

## 5. Backend Architecture

### Entry point and request flow

`server/index.ts` is the only server entry point. It loads `.env` locally, creates an Express application, enables CORS/JSON parsing, calculates a port, captures Genie configuration at process startup, creates a module-level analysis cache, registers API endpoints, serves `dist`, installs the SPA fallback, and listens.

For analysis requests it validates that `query` is a non-empty string, normalizes it for cache lookup, rejects unavailable Genie configuration, runs a two-message Genie workflow, adapts and calibrates the response, stores only the successful final analysis, and returns it.

### Endpoints

| Endpoint | Method | Purpose | Input | Output | File |
|---|---|---|---|---|---|
| `/api/health` | GET | Process/configuration health check | None | `{ status, service, databricksConfigured }` | `server/index.ts` |
| `/api/analyze` | POST | Analyze a research opportunity through cache + Genie + adapter | JSON `{ query: string }` | `CampusForgeAnalysis`; errors use `{ error, details? }` | `server/index.ts` |
| non-API SPA paths | GET | Serve built React entry for client-side routing | URL path | `dist/index.html` | `server/index.ts` |
| static asset paths | GET | Serve Vite production assets | URL path | Static file | `server/index.ts` |

### Validation and errors

- Missing/blank/non-string query: HTTP 400.
- Missing Genie configuration: HTTP 503.
- A completed Genie response that cannot be adapted: HTTP 422 with a safe response-structure summary.
- Genie timeout: HTTP 504.
- Other Genie or unexpected failures: HTTP 502.
- Server logs avoid response values and credentials in the dedicated safe summaries, but currently log the normalized user query on cache HIT/MISS.
- There is no maximum query size, schema-validation library, rate limiting, request authentication middleware, or centralized error middleware.

### Important backend modules

- `server/services/databricksGenie.ts`: environment configuration, OAuth/PAT access tokens, REST requests, Genie conversation/message polling, query attachment result retrieval, and the structured-repair prompt.
- `server/adapters/campusForgeAnalysis.ts`: safe logging summaries, JSON extraction, shallow shape checking, evidence rows, direct-domain matching, grounding, lab-ID mapping, readiness/momentum/verdict calibration, and adapter errors.

## 6. Databricks + Genie Integration

### Complete runtime trace

```text
User submits Discover/Compare form
  → DiscoverPage or CompareIdeasPage
  → analyzeOpportunity(query) in src/services/campusForgeApi.ts
  → POST /api/analyze in server/index.ts
  → normalized-query Map lookup
  → startGenieAnalysis(query, config)
  → POST /api/2.0/genie/spaces/{spaceId}/start-conversation
  → poll GET .../conversations/{conversationId}/messages/{messageId}
  → completed Genie narrative + attachments
  → GET .../attachments/{attachmentId}/query-result for each query attachment
  → requestStructuredRepair(...)
  → POST .../conversations/{conversationId}/messages with strict JSON contract
  → poll the repair message
  → adaptGenieMessage(repair, query evidence, query)
  → JSON extraction → grounding → direct-evidence calibration
  → cache successful CampusForgeAnalysis → Express JSON response
  → page state → ResearchBriefing or comparison cards
```

### Authentication

`getGenieConfig()` in `server/services/databricksGenie.ts` reads the host and Genie Space ID. In a Databricks App environment (detected through `DATABRICKS_APP_NAME` or `DATABRICKS_APP_PORT`), PAT fallback is disabled. When client ID and client secret are present, `getOAuthToken()` exchanges them at `/oidc/v1/token` using the client-credentials grant and `all-apis` scope. The module caches the OAuth bearer token in memory until 60 seconds before expiry. Outside Databricks Apps, a PAT may be used if OAuth credentials are unavailable. Requests attach the bearer token in `Authorization`; logs identify auth mode but never log the token.

### Conversation creation and message submission

`startGenieAnalysis()` creates a conversation with `analysisPrompt(query)` and `enable_visualization: false`. The prompt asks Genie to investigate directly relevant campus evidence and distinguish direct evidence from adjacent/supporting capability and inference. It requires a conversation ID and message ID, then calls `pollMessage()`.

After the initial message and query evidence are available, `requestStructuredRepair()` appends another message to the same conversation. That prompt includes the original narrative and serialized query results plus the explicit `CampusForgeAnalysis` JSON contract. It instructs Genie to return one JSON object and avoid unsupported evidence claims.

### Polling and terminal states

`pollMessage()` performs a GET once per second. `COMPLETED` returns the message. `FAILED`, `QUERY_RESULT_EXPIRED`, or `CANCELLED` throws a `GenieServiceError`. A single poll phase times out after 90 seconds. Because the initial analysis and structured-repair messages are polled separately, one HTTP request can spend close to 180 seconds in polling, plus REST and parsing time.

### Attachments, SQL, and query results

When the initial message completes, `fetchQueryEvidence()` selects attachments with `query` data and an attachment ID. Genie, not CampusForge, generates and executes the SQL. The SQL text is available as `attachment.query.query`; CampusForge records it in `GenieQueryEvidence` but does not execute it directly. For each query attachment it requests:

`GET /api/2.0/genie/spaces/{spaceId}/conversations/{conversationId}/messages/{messageId}/attachments/{attachmentId}/query-result`

It extracts column names/types from the manifest schema, row arrays from `statement_response.result.data_array`, and a reported row count from the manifest. The structured-repair prompt receives those columns and rows. Safe server summaries expose counts, column names, and SQL length, not row values or SQL text.

### JSON/result parsing and adaptation

`adaptGenieMessage()` in `server/adapters/campusForgeAnalysis.ts` recursively collects strings from the repair message, prioritizing answer-purpose text attachments. `parseCandidate()` removes markdown fences and attempts both whole-string and first-brace/last-brace JSON parsing. `isCampusForgeAnalysis()` verifies required top-level objects/arrays and several scalar fields, but not all nested field types or enum values.

For the first parseable candidate:

1. `groundAnalysis()` builds a searchable corpus from the initial Genie narrative and query evidence. Returned faculty, labs, equipment, and projects survive only if their identifying names appear in that corpus. Equipment lab IDs are remapped by returned lab name/ID and evidence rows where possible; collaboration members are limited to grounded faculty.
2. `calibrateDirectEvidence()` derives query-domain facets, finds directly matched trend rows, may extend matching with a directly established trend's core terms, counts direct faculty/labs/equipment/projects from grounded arrays and categorized raw rows, and recomputes momentum, readiness, verdict, and headline recommendation verdict.
3. The adapted object is returned, cached, and sent to the frontend.

### Caching

`analysisCache` is a module-level `Map` in `server/index.ts`. Keys are query strings after trim, lowercase conversion, and whitespace collapsing. Entries store the successful final `CampusForgeAnalysis` plus an expiry timestamp one hour in the future. Cache lookup happens before the configured-Genie check. Expired entries are removed lazily. Errors and incomplete responses are not cached. The cache has no size limit, eviction policy beyond lazy TTL, cross-process sharing, persistence, or in-flight request coalescing. Current diagnostic logs print HIT/MISS, normalized query, PID, and port.

### Failure handling

Databricks non-2xx responses become `GenieServiceError`s with status/reason; 401/403 receive an authentication/permission-oriented message. Missing IDs, terminal message failures, query-result retrieval failures, timeout, invalid JSON, and invalid response structure all fail the request. A failure from any query-result attachment rejects the whole analysis. The frontend reduces server errors to a generic message because it does not parse `{ error, details }`.

## 7. Data Model

### `CampusForgeAnalysis`

The canonical frontend contract is declared in `src/data/mockAnalysis.ts` and imported by both frontend and backend. It contains:

| Field | Shape | Current source |
|---|---|---|
| `opportunity` | `{ title, verdict, subtitle }` | Title/subtitle are Genie-generated; verdict is overwritten by backend calibration |
| `readiness` | `{ score, maximum, label, disclaimer }` | Score and disclaimer are overwritten by calibration; `maximum` and `label` otherwise come from Genie (the repair contract requests 100 and a derived label) |
| `researchTrend` | `{ momentum, summary }` | Overwritten from directly matched trend query-result evidence; defaults to Low/no-direct-trend wording |
| `rationale` | `string` | Genie-generated interpretation; not recalculated by the adapter |
| `faculty` | `FacultyMember[]` | Genie structured output, filtered by occurrence in initial narrative/query evidence |
| `labs` | `Lab[]` | Genie structured output, filtered by occurrence in initial narrative/query evidence |
| `equipment` | `EquipmentAsset[]` | Genie structured output, filtered by occurrence in evidence; lab IDs may be remapped |
| `projects` | `ResearchProject[]` | Genie structured output, filtered by occurrence in evidence |
| `gaps` | `CapabilityGap[]` | Genie-generated/interpreted; currently not independently grounded by the adapter |
| `collaboration` | `Collaboration` | Genie-generated; its member list is filtered to grounded faculty, but summary/departments/flow remain interpreted |
| `recommendation` | `{ verdict, summary }` | Summary is Genie-generated; verdict is overwritten to the calibrated verdict |
| `evidenceLegend` | `EvidenceDefinition[]` | Genie-generated contract output; UI uses it as explanatory text |

Nested types:

- `FacultyMember`: `id`, `name`, `department`, `expertise[]`.
- `Lab`: `id`, `name`, `focus`.
- `EquipmentAsset`: `id`, `name`, `status` (`Available | Limited | Unavailable`), `utilization`, `availabilityNote`, `labId`.
- `ResearchProject`: `id`, `title`, `department`, `status` (`Ongoing | Completed`).
- `CapabilityGap`: `id`, `title`, `description`, `evidence` (`data | inferred-gap | recommendation`).
- `CollaborationMember`: `facultyId`, `role`.
- `Collaboration`: `summary`, `departments[]`, `flow[]`, `members[]`.
- `EvidenceDefinition`: `kind`, `label`, `description`.

### Frontend/backend mismatches and ambiguities

- There is no separately versioned backend DTO: server code imports the frontend type directly. This keeps compile-time alignment in one repository but couples server/runtime contracts to mock-data location and provides no runtime guarantee.
- The backend may return more detailed `{ error, details }`, while the frontend only checks status and throws `CampusForge analysis failed (<status>)`.
- `isCampusForgeAnalysis()` is shallow: it verifies important top-level keys but not every nested element, enum, score range, ID, or nullable field.
- Shared `CampusEquipment.labId` is `string | null`, while live `EquipmentAsset.labId` is declared `string`.
- Shared `ResourceStatus` supports only Available/Limited, while live analysis also supports Unavailable.
- Shared `ProjectStatus` includes Prototype, while live `ResearchProject.status` and the Genie JSON contract allow only Ongoing/Completed.
- UI resource counts are array lengths from the returned structured object, while readiness can also count categorized raw query rows. Those two views can diverge if Genie does not serialize all directly matched raw records into the arrays.

## 8. Current CampusForge Analysis Logic

### Domain matching and direct evidence

The backend, not the browser, recalibrates the core decision. `domainFacets()` normalizes the query, removes prompt-framing words, and creates term groups separated by framing boundaries. `matchesDomainFacet()` requires all normalized tokens in at least one facet to appear in an entity/row's serialized text. Its lightweight morphology removes some plural `s` endings and converts longer `-ics` words to a stem.

Direct trend evidence is more restrictive: `directlyMatchedTrendRows()` looks for rows that resemble a trend source/record, contain an accepted growth signal, match a query facet, and share enough domain tokens with the query. A directly established trend can then contribute its core domain terms as additional facets so related records such as “Robotics & Automation Lab” can support “Autonomous Robotics” without requiring the full phrase. This expansion is gated on a direct trend match, protecting unrelated/unsupported domains from generic technology overlap.

Rows are categorized as faculty, lab, equipment, project, or trend using `evidence_role`, entity/source fields, or category-specific columns. Counts deduplicate structured IDs and raw-row entity keys.

### Readiness

`calibrateDirectEvidence()` uses five equal evidence categories:

- directly relevant faculty present: 1 or 0;
- directly relevant labs present: 1 or 0;
- directly relevant equipment: average availability weight (Available 1, Limited 0.5, other 0), or 0 when absent;
- directly relevant projects present: 1 or 0;
- directly relevant trend present: 1 or 0.

The score is `round(maximum × category sum / 5)`, where `maximum` comes from the parsed object and normally is 100. Equipment availability can therefore lower one category but cannot erase other direct categories. Adjacent capabilities do not enter this formula. This is calculated by CampusForge code from grounded Genie output and Genie query-result rows.

### Verdict

CampusForge overwrites the model verdict using calibrated evidence:

- no direct evidence or score `<= 0`: `Insufficient direct evidence`;
- score `>= 75`: `Strong direct-evidence fit`;
- score `>= 50`: `Moderate direct-evidence fit`;
- otherwise: `Limited direct-evidence fit`.

The same result overwrites `recommendation.verdict`. The narrative `rationale` and `recommendation.summary` remain Genie interpretations, so prose can still be less tightly calibrated than the headline.

### Research momentum

Momentum comes only from directly matched trend rows. The strongest directly matched value is preserved in this order: High, Medium-High, Medium, Low. If no direct trend exists, momentum becomes Low and the summary explicitly reports that no directly relevant trend was returned. Genie prose does not control final momentum.

### Faculty, labs, equipment, and projects

Genie proposes structured entity arrays. `groundAnalysis()` filters each array by checking whether its identifying name/title appears in the combined original narrative and returned query evidence. Calibration further treats only entities matching query facets (plus permitted established-trend facets) as direct. Raw Genie query-result rows may also supply direct evidence counts when categorized.

Equipment availability is taken from the grounded structured equipment or raw rows and weighted as described above. Utilization values are displayed but do not independently affect readiness; status/availability does. Lab mapping first looks at returned lab IDs/names and then scans evidence rows for equipment/lab associations.

### Gaps, recommendations, and collaborations

Capability gaps, rationale, recommendation summary, collaboration description, departments, and flow are generated/interpreted by Genie under the strict repair prompt. They are not independently recalculated from campus code. Collaboration members are filtered to faculty retained during grounding. The frontend merely presents these fields and provides explicit evidence/inference labels where designed.

### Hardcoded/mock/fallback values

- Direct readiness weights and thresholds, verdict strings, default Low momentum behavior, poll timing, cache TTL, and prompts are hardcoded backend policy.
- Discover's initial query and suggestion chips are hardcoded UI examples.
- `mockAnalysis` is a fully hardcoded Edge AI example, currently used by Insights for gaps rather than by Discover.
- Campus Resources, Research Trends, Collaborations, and much of Insights use hardcoded TypeScript data/copy.
- AnalysisProgress timings are simulated; they are not Databricks status events.
- There is no fallback analysis returned when Genie fails; the API returns an error.

## 9. Data Sources

| Source | Contents | Usage |
|---|---|---|
| `src/data/campusData.ts` | 8 faculty, 6 labs, 10 equipment assets, 8 projects | Campus Resources; record resolution in Collaborations and equipment lab labels; equipment-based Insights |
| `src/data/researchTrends.ts` | 8 synthetic research-area trends with activity score, growth, technologies | Research Trends only |
| `src/data/mockAnalysis.ts` | Interfaces plus one complete Edge AI `CampusForgeAnalysis` fixture | Shared TypeScript contract; Insights imports its capability gaps |
| `CollaborationsPage.tsx` local constants | 4 interdisciplinary recommendation definitions | Collaborations page |
| `InsightsPage.tsx` local constants | 3 capability strengths and 2 project-reuse opportunities | Insights page |
| Configured Databricks Genie Space | External tables/data available to the resource named `genie-space` | Live Discover/Compare analysis through generated Genie queries |

There are no CSV, JSON dataset files, SQL files, migrations, table declarations, warehouse IDs, catalog names, schema names, or fully qualified Databricks table names in this repository. Therefore the actual Databricks catalog/schema/table lineage cannot be determined from source control; it lives in the externally configured Genie Space. The local data is demonstrative and is not wired into the server's live Genie requests.

## 10. Environment Variables

Names referenced by application code or deployment configuration:

```text
PORT
DATABRICKS_HOST
DATABRICKS_GENIE_SPACE_ID
DATABRICKS_CLIENT_ID
DATABRICKS_CLIENT_SECRET
DATABRICKS_TOKEN
DATABRICKS_APP_NAME
DATABRICKS_APP_PORT
```

Vite also reads the built-in `DEV` mode flag (`import.meta.env.DEV`); it is not a project secret or a custom environment variable.

No `.env` file is tracked. `.gitignore` ignores `.env` and `.env.*` while allowing a possible `.env.example`. The source scan found no hardcoded credential value, so no hardcoded-secret warning applies.

## 11. Deployment

### Local

1. Install dependencies separately with `npm install` (not performed for this snapshot).
2. Start the Vite frontend with `npm run dev`. Vite's normal default is port 5173 unless occupied/overridden.
3. Start Express separately with `npm run server`; it uses `PORT` or falls back to 3001.
4. In development `analyzeOpportunity()` explicitly sends requests to `http://localhost:3001/api/analyze`. CORS allows common localhost/127.0.0.1 Vite origins.
5. Local Databricks access can use `DATABRICKS_HOST`, `DATABRICKS_GENIE_SPACE_ID`, and `DATABRICKS_TOKEN`; OAuth client credentials also take precedence when supplied.

`npm run build` runs `tsc -b && vite build`. `npm run preview` serves the frontend build through Vite for preview only. `npm run lint` runs Oxlint.

### Databricks Apps

`app.yaml` runs `npm run start`, which executes `tsx server/index.ts`. It exposes `DATABRICKS_GENIE_SPACE_ID` from the Databricks App resource key `genie-space`. Express binds `process.env.PORT` with local fallback 3001 and serves the built `dist` directory plus a client-routing fallback. The production browser calls same-origin `/api/analyze`.

The Databricks App runtime is expected to supply host and service-principal environment credentials. The code detects the app through `DATABRICKS_APP_NAME`/`DATABRICKS_APP_PORT`, uses OAuth client credentials, and deliberately refuses PAT fallback in that environment. Successful deployment therefore also depends on the app service principal having permission to access the referenced Genie Space and its underlying resources; those external grants are not represented in this repository.

## 12. Problems / Technical Debt

| Rating | Issue | Evidence/impact |
|---|---|---|
| **HIGH** | No runtime schema validation for nested analysis data | The adapter's shape guard is shallow and the frontend casts response JSON. A syntactically valid but malformed repair can fail later in rendering or silently misrepresent fields. |
| **HIGH** | Live data lineage is external and undocumented | No catalog, schema, table, SQL, or Genie Space schema is versioned here. Another environment cannot reproduce or audit the evidence source from this repository alone. |
| **HIGH** | UI evidence counts can diverge from calibrated readiness | Calibration counts direct categorized raw rows as well as structured arrays, while the UI counts returned arrays. Genie omitting a row from JSON can produce headline/category-count inconsistencies. |
| **HIGH** | Insights is partly unrelated static/mock output | Capability strengths and reuse opportunities are page constants; gaps come from a fixed Edge AI mock. The page can appear analytical without reflecting a current live dataset/query. |
| **HIGH** | No tests or CI | Matching, grounding, authentication, parser, cache, route, and page behavior have no automated regression protection. |
| **MEDIUM** | Genie request latency can approach/exceed 180 seconds | Two sequential messages each have a 90-second polling timeout; query-result calls add more time. There is no browser cancellation or server request-abort propagation. |
| **MEDIUM** | In-memory cache is process-local and unbounded | Cache is lost on restart, not shared across replicas, has no maximum size, and does not coalesce simultaneous identical misses. This can produce duplicate Genie work and inconsistent results across processes. |
| **MEDIUM** | Diagnostic cache logging remains in production server code | HIT/MISS logs include normalized user queries plus PID/port. This is useful operationally but may retain research-intent text in logs and appears to be temporary debugging residue. |
| **MEDIUM** | Grounding is corpus-level substring validation | An entity name appearing anywhere in the combined narrative/result corpus is enough to retain it; the code does not prove that a particular returned row supports the particular structured claim. |
| **MEDIUM** | Gaps/recommendation/collaboration prose is not independently grounded | These fields survive from Genie, apart from filtering collaboration members. Unsupported interpretation can remain even when headline calibration is correct. |
| **MEDIUM** | Shared prototype types/data disagree with live types | Nullable lab IDs, equipment status unions, and project status unions differ between `campusData.ts` and `CampusForgeAnalysis`, increasing mapping and display edge cases. |
| **MEDIUM** | Equipment ownership is incomplete | All ten shared equipment records have `labId: null`; the Campus Resources view must show ownership as not reported even though labs exist. |
| **MEDIUM** | API hardening is minimal | No request-size/domain-specific length bound, rate limiting, request correlation ID, structured logging, or API-level auth middleware exists. Databricks Apps may protect the outer app, but the Express layer assumes that boundary. |
| **MEDIUM** | Failure UX discards useful server context | The frontend does not parse server error bodies and reports only an HTTP-status-based generic error. Partial Genie attachment failure aborts the complete analysis. |
| **LOW** | Simulated progress can mislead | Loading steps are timer-based and can reach a late stage independently of actual Genie state. |
| **LOW** | README is obsolete | It documents a frontend foundation and `npm run dev`, but not the implemented API, environment variables, Genie flow, build/start split, or Databricks Apps. |
| **LOW** | Styling is centralized in one large stylesheet | `src/index.css` owns almost all page/component styling, which makes isolated evolution and visual regression control harder. |
| **LOW** | Dead/placeholder code remains | `PlaceholderPage.tsx`, several `.gitkeep` directories, and a trend `discoverQuery` property are not used in the runtime flow. No TODO/FIXME/HACK markers were found. |
| **LOW** | Static asset is relatively heavy for a sidebar mark | The bundled PNG is over 1 MB, adding avoidable application payload for a compact logo. |
| **LOW** | Frontend development API URL is fixed | Development assumes Express on localhost:3001 rather than using a Vite proxy/configurable API base, limiting alternate local/remote workflows. |

No critical hardcoded-secret issue was found. Production OAuth correctness and external Databricks permissions cannot be fully verified through static repository inspection alone.

## 13. CampusForge 2.0 Upgrade Opportunities

These are planning areas inferred from the current architecture, not implemented recommendations.

### AI / Genie

- Move from free-form JSON repair plus shallow parsing to a versioned, schema-validated response contract.
- Preserve citations/row provenance per claim and expose which query row supports which faculty, lab, gap, or recommendation.
- Replace simulated progress with meaningful backend stages or streamed job status.
- Separate evidence retrieval from narrative generation so deterministic campus facts do not depend on model serialization.

### Data Intelligence

- Version the campus semantic model: catalog/schema/table identities, columns, definitions, refresh cadence, and stewardship.
- Add data-quality rules for IDs, cross-entity relationships, null ownership, statuses, utilization ranges, and recency.
- Reconcile the local demonstration dataset with the Genie-backed dataset or clearly isolate sample/offline mode.

### Campus Resource Intelligence

- Normalize faculty, lab, equipment, project, and department entities in one service/data layer.
- Add verified lab-equipment ownership, availability windows, utilization timestamps, contacts, and source freshness.
- Provide traceable resource search/filtering rather than static arrays.

### Research Intelligence

- Define a transparent, versioned readiness model with source recency/quality and category-level explanations.
- Make trend scores and growth classifications data-derived and auditable rather than static prototype values.
- Persist analyses so changes in evidence, logic version, and recommendations can be compared over time.

### Collaboration

- Generate candidate teams from a documented compatibility model, with provenance and explicit confidence.
- Distinguish existing relationships, suggested introductions, departmental complementarity, and missing roles.
- Add review/approval workflows before presenting recommendations as actionable institutional guidance.

### UX

- Unify live and static pages around shared evidence/detail components and consistent status semantics.
- Add deep links to evidence, accessible table/mobile alternatives, and actionable recovery from API errors.
- Give comparison a shared evidence basis and explain score/category differences rather than only counts.

### Backend

- Introduce route/controller/service layers, request/response schemas, configuration validation, and structured errors.
- Decouple shared domain types from the mock fixture file.
- Add analysis IDs, provenance metadata, model/prompt/logic versions, and bounded input validation.

### Reliability

- Add unit tests for matching/calibration and contract parsing, integration tests for mocked Genie states, and end-to-end tests for key queries.
- Add request cancellation, total deadlines, retry policy for safe transient calls, partial-attachment handling, and concurrency control.
- Replace or augment the process-local cache with a bounded cache and single-flight behavior; use shared storage only if deployment topology requires it.

### Deployment

- Document Databricks resource declarations, service-principal permissions, build/runtime Node version, health checks, and release verification.
- Add CI for type-check/build/lint/test and a repeatable Databricks Apps deployment process.
- Separate safe operational telemetry from query content and establish log-retention/privacy policy.

## 14. Most Important Files

| File | Why it matters | Area |
|---|---|---|
| `server/index.ts` | Express routes, cache, orchestration, errors, static serving, port | Backend/Deployment |
| `server/services/databricksGenie.ts` | Auth, Genie REST flow, prompts, polling, attachments/results | Databricks/Backend |
| `server/adapters/campusForgeAnalysis.ts` | Parsing, grounding, semantic matching, calibration | Backend/Databricks |
| `src/data/mockAnalysis.ts` | Canonical analysis interfaces plus mock fixture | Frontend/Backend |
| `src/services/campusForgeApi.ts` | Browser-to-server contract and environment URL behavior | Frontend |
| `src/pages/DiscoverPage.tsx` | Primary live opportunity workflow | Frontend |
| `src/components/ResearchBriefing.tsx` | Main analysis display and empty states | Frontend |
| `src/components/CapabilityEvidence.tsx` | Evidence rendering and equipment/lab/status mapping | Frontend |
| `src/pages/CompareIdeasPage.tsx` | Parallel analysis and comparison guidance | Frontend |
| `src/data/campusData.ts` | Shared 32-record prototype campus dataset | Frontend/Data |
| `src/data/researchTrends.ts` | Synthetic trend dataset and momentum vocabulary | Frontend/Data |
| `src/pages/ResearchTrendsPage.tsx` | Trend table, definitions, Discover handoff | Frontend |
| `src/pages/CampusResourcesPage.tsx` | Direct browser of shared resource data | Frontend |
| `src/pages/InsightsPage.tsx` | Current evidence/inference split and static insight logic | Frontend/Data |
| `src/pages/CollaborationsPage.tsx` | Current recommendation construction | Frontend/Data |
| `src/components/AppShell.tsx` | Global layout and navigation | Frontend |
| `src/index.css` | Complete visual/responsive system | Frontend |
| `package.json` | Runtime/build commands and dependency contract | Config |
| `vite.config.ts` | React/Tailwind build integration | Config |
| `app.yaml` | Databricks Apps command and Genie resource binding | Databricks/Config |

## 15. Code Bundle

The companion `campusforge-context/` directory preserves the selected files' repository-relative paths. `campusforge-context.zip` contains this document plus:

- root configuration/documentation: `.gitignore`, `.oxlintrc.json`, `README.md`, `app.yaml`, `index.html`, `package.json`, all TypeScript configs, and `vite.config.ts`;
- the complete `server/` source tree;
- the complete meaningful `src/` source tree (excluding `.gitkeep` placeholders);
- `public/campusforge-logo.png`, because the shell directly depends on this visual asset.

The bundle intentionally excludes `.env` files, `package-lock.json`, `.git`, `node_modules`, `dist`/build output, caches, logs, temporary test artifacts, and the bundle itself. It is a static context package, not an independently installed build.
