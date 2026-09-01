import cors from 'cors'
import 'dotenv/config'
import express from 'express'
import { adaptGenieMessage, CampusForgeAdapterError, summarizeGenieMessage, summarizeQueryEvidence } from './adapters/campusForgeAnalysis'
import { GenieServiceError, getGenieConfig, requestStructuredRepair, startGenieAnalysis } from './services/databricksGenie'

const app = express()
const port = Number(process.env.PORT) || 3001
const genieConfig = getGenieConfig()

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }))
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    service: 'CampusForge API',
    databricksConfigured: Boolean(genieConfig),
  })
})

app.post('/api/analyze', async (request, response) => {
  const query = typeof request.body?.query === 'string' ? request.body.query.trim() : ''
  if (!query) {
    response.status(400).json({ error: 'A research opportunity query is required.' })
    return
  }
  if (!genieConfig) {
    response.status(503).json({ error: 'Databricks Genie is not configured on the server.' })
    return
  }

  try {
    const completed = await startGenieAnalysis(query, genieConfig)
    console.info('Genie conversation completed:', JSON.stringify(summarizeGenieMessage(completed.message)))
    console.info('Genie query evidence retrieved:', JSON.stringify(summarizeQueryEvidence(completed.queryEvidence)))

    const repaired = await requestStructuredRepair(completed, genieConfig, query)
    console.info('Genie repair message completed:', JSON.stringify(summarizeGenieMessage(repaired.message)))
    response.json(adaptGenieMessage(repaired.message, completed.message, completed.queryEvidence, query))
  } catch (error) {
    if (error instanceof CampusForgeAdapterError) {
      response.status(422).json({ error: error.message, responseStructure: error.structure })
      return
    }

    const message = error instanceof Error ? error.message : 'Opportunity analysis failed.'
    const status = error instanceof GenieServiceError && error.code === 'TIMEOUT' ? 504 : 502
    console.error('CampusForge Genie request failed:', message)
    response.status(status).json({ error: message })
  }
})

app.listen(port, () => {
  console.log(`CampusForge API listening on http://localhost:${port}`)
})
