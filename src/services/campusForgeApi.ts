import type { CampusForgeAnalysis } from '../data/mockAnalysis'

const analyzeEndpoint = 'http://localhost:3001/api/analyze'

export async function analyzeOpportunity(query: string): Promise<CampusForgeAnalysis> {
  if (!query.trim()) {
    throw new Error('A research opportunity query is required.')
  }

  const response = await fetch(analyzeEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: query.trim() }),
  })

  if (!response.ok) {
    const message = `CampusForge API request failed with status ${response.status}.`
    throw new Error(message)
  }

  return response.json() as Promise<CampusForgeAnalysis>
}
