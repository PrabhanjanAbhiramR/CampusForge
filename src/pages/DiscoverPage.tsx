import { useEffect, useRef, useState } from 'react'
import { AnalysisProgress } from '../components/AnalysisProgress'
import { OpportunityQuery } from '../components/OpportunityQuery'
import { ResearchBriefing } from '../components/ResearchBriefing'
import type { CampusForgeAnalysis } from '../data/mockAnalysis'
import { analyzeOpportunity as requestOpportunityAnalysis } from '../services/campusForgeApi'
import { useSearchParams } from 'react-router-dom'

const defaultQuery = 'Can our campus pursue Edge AI for smart agriculture?'
const totalSteps = 5

export function DiscoverPage() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('query')?.trim() || defaultQuery)
  const [analysisVisible, setAnalysisVisible] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [analysis, setAnalysis] = useState<CampusForgeAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const runId = useRef(0)
  const progressTimer = useRef<number | null>(null)

  useEffect(() => () => {
    runId.current += 1
    if (progressTimer.current !== null) window.clearInterval(progressTimer.current)
  }, [])

  async function analyzeOpportunity() {
    if (!query.trim()) return
    runId.current += 1
    const currentRun = runId.current
    setAnalysisVisible(true)
    setActiveStep(0)
    setAnalysis(null)
    setError(null)

    if (progressTimer.current !== null) window.clearInterval(progressTimer.current)
    progressTimer.current = window.setInterval(() => {
      setActiveStep((step) => Math.min(step + 1, totalSteps - 1))
    }, 220)

    try {
      const result = await requestOpportunityAnalysis(query)
      if (runId.current === currentRun) setAnalysis(result)
    } catch {
      if (runId.current === currentRun) setError('The opportunity analysis could not be completed. Please try again.')
    } finally {
      if (runId.current === currentRun) {
        setAnalysisVisible(false)
        if (progressTimer.current !== null) window.clearInterval(progressTimer.current)
        progressTimer.current = null
      }
    }
  }

  return (
    <div className="discover-page">
      <header className="page-header">
        <p className="eyebrow">Research opportunity analysis</p>
        <h1>Discover what your campus can build next.</h1>
        <p className="page-intro">
          Evaluate emerging research opportunities against faculty expertise, infrastructure,
          existing projects, and available campus capacity.
        </p>
      </header>

      <OpportunityQuery query={query} analyzing={analysisVisible}
        onQueryChange={setQuery} onAnalyze={analyzeOpportunity} />

      {analysis ? (
        <ResearchBriefing analysis={analysis} />
      ) : analysisVisible ? (
        <AnalysisProgress activeStep={activeStep} complete={false} />
      ) : error ? (
        <p className="analysis-error" role="alert">{error}</p>
      ) : null}
    </div>
  )
}
