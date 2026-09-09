import { ArrowRight, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { AnalysisProgress } from '../components/AnalysisProgress'
import type { CampusForgeAnalysis } from '../data/mockAnalysis'
import { analyzeOpportunity } from '../services/campusForgeApi'

type ComparisonResult = {
  analysis: CampusForgeAnalysis | null
  error: string | null
}

const totalSteps = 5
const emptyResult: ComparisonResult = { analysis: null, error: null }

function ComparisonCard({ label, result }: { label: string; result: ComparisonResult }) {
  if (result.error) {
    return (
      <article className="comparison-card comparison-card-error">
        <p className="comparison-label">{label}</p>
        <h2>Analysis unavailable</h2>
        <p>{result.error}</p>
      </article>
    )
  }

  if (!result.analysis) return null

  const { opportunity, readiness, researchTrend, faculty, labs, equipment, projects, gaps } = result.analysis
  const metrics = [
    ['Faculty', faculty.length],
    ['Labs', labs.length],
    ['Equipment', equipment.length],
    ['Projects', projects.length],
  ] as const
  const readinessPercent = Math.min(100, Math.round((readiness.score / readiness.maximum) * 100))

  return (
    <article className="comparison-card">
      <p className="comparison-label">{label}</p>
      <h2>{opportunity.title}</h2>

      <div className="comparison-verdict">
        <span>Verdict</span>
        <strong>{opportunity.verdict}</strong>
      </div>

      <div className="comparison-signals">
        <div>
          <span>Readiness</span>
          <strong>{readiness.score} <small>/ {readiness.maximum}</small></strong>
          <div className="readiness-track"><i style={{ width: `${readinessPercent}%` }} /></div>
        </div>
        <div>
          <span>Momentum</span>
          <strong>{researchTrend.momentum}</strong>
        </div>
      </div>

      <div className="comparison-metrics">
        {metrics.map(([name, value]) => <div key={name}><strong>{value}</strong><span>{name}</span></div>)}
      </div>

      <section className="comparison-copy">
        <h3>Key rationale</h3>
        <p>{opportunity.rationale}</p>
      </section>

      <section className="comparison-copy comparison-gaps">
        <h3>Capability gaps</h3>
        {gaps.length > 0 ? (
          <ul>{gaps.map((gap) => <li key={gap.id}><strong>{gap.title}</strong><span>{gap.explanation}</span></li>)}</ul>
        ) : <p>No capability gaps were identified in the returned analysis.</p>}
      </section>
    </article>
  )
}

function ComparisonTakeaway({ first, second }: { first: CampusForgeAnalysis; second: CampusForgeAnalysis }) {
  const analyses = [first, second]
  const titles = analyses.map((analysis) => analysis.opportunity.title)
  const resourceCounts = analyses.map((analysis) => [
    analysis.faculty.length,
    analysis.labs.length,
    analysis.equipment.length,
    analysis.projects.length,
  ])
  const categoryBreadth = resourceCounts.map((counts) => counts.filter((count) => count > 0).length)
  const resourceTotals = resourceCounts.map((counts) => counts.reduce((total, count) => total + count, 0))
  const readinessDifference = first.readiness.score - second.readiness.score
  const breadthDifference = categoryBreadth[0] - categoryBreadth[1]
  const clearlyStronger = Math.abs(readinessDifference) >= 25 && Math.abs(breadthDifference) >= 1
    && Math.sign(readinessDifference) === Math.sign(breadthDifference)
  const strongerIndex = readinessDifference > 0 ? 0 : 1

  const sentences: string[] = []
  if (clearlyStronger) {
    sentences.push(`${titles[strongerIndex]} is the clearly stronger near-term opportunity, with materially higher readiness and direct evidence across more campus resource categories.`)
  } else if (first.readiness.score !== second.readiness.score || first.researchTrend.momentum !== second.researchTrend.momentum) {
    sentences.push(`${titles[0]} reports ${first.readiness.score}/100 readiness with ${first.researchTrend.momentum.toLowerCase()} momentum, compared with ${second.readiness.score}/100 and ${second.researchTrend.momentum.toLowerCase()} momentum for ${titles[1]}.`)
  } else {
    sentences.push(`Both opportunities show comparable readiness and research momentum in the returned analysis.`)
  }

  if (categoryBreadth[0] === categoryBreadth[1]) {
    sentences.push(`Each draws on ${categoryBreadth[0]} resource categories, with ${resourceTotals[0]} records supporting ${titles[0]} and ${resourceTotals[1]} supporting ${titles[1]}.`)
  } else {
    const broaderIndex = categoryBreadth[0] > categoryBreadth[1] ? 0 : 1
    const narrowerIndex = broaderIndex === 0 ? 1 : 0
    sentences.push(`${titles[broaderIndex]} has broader resource coverage (${categoryBreadth[broaderIndex]} categories versus ${categoryBreadth[narrowerIndex]}), while ${titles[narrowerIndex]} relies on a narrower campus evidence base.`)
  }

  if (first.gaps.length !== second.gaps.length) {
    const fewerGapsIndex = first.gaps.length < second.gaps.length ? 0 : 1
    sentences.push(`${titles[fewerGapsIndex]} also carries fewer identified capability gaps (${analyses[fewerGapsIndex].gaps.length} versus ${analyses[fewerGapsIndex === 0 ? 1 : 0].gaps.length}), which may reduce the coordination needed for an initial program.`)
  } else {
    sentences.push(`Both have ${first.gaps.length} identified capability gap${first.gaps.length === 1 ? '' : 's'}, so the specific gaps—not their count—should guide next-step validation.`)
  }

  return (
    <section className="comparison-takeaway" aria-labelledby="comparison-takeaway-title">
      <div>
        <p>Analytical guidance</p>
        <h2 id="comparison-takeaway-title">Comparison takeaway</h2>
      </div>
      <p>{sentences.join(' ')}</p>
    </section>
  )
}

export function CompareIdeasPage() {
  const [firstQuery, setFirstQuery] = useState('Can our campus pursue Edge AI for smart agriculture?')
  const [secondQuery, setSecondQuery] = useState('Autonomous robotics')
  const [results, setResults] = useState<[ComparisonResult, ComparisonResult]>([emptyResult, emptyResult])
  const [analyzing, setAnalyzing] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const runId = useRef(0)
  const progressTimer = useRef<number | null>(null)

  useEffect(() => () => {
    runId.current += 1
    if (progressTimer.current !== null) window.clearInterval(progressTimer.current)
  }, [])

  async function compareIdeas() {
    if (!firstQuery.trim() || !secondQuery.trim()) return
    runId.current += 1
    const currentRun = runId.current
    setAnalyzing(true)
    setActiveStep(0)
    setResults([emptyResult, emptyResult])

    if (progressTimer.current !== null) window.clearInterval(progressTimer.current)
    progressTimer.current = window.setInterval(() => {
      setActiveStep((step) => Math.min(step + 1, totalSteps - 1))
    }, 220)

    const safeAnalyze = async (query: string): Promise<ComparisonResult> => {
      try {
        return { analysis: await analyzeOpportunity(query), error: null }
      } catch {
        return { analysis: null, error: 'This opportunity could not be analyzed. Review the query or try again.' }
      }
    }

    const comparedResults = await Promise.all([
      safeAnalyze(firstQuery.trim()),
      safeAnalyze(secondQuery.trim()),
    ])

    if (runId.current === currentRun) {
      setResults(comparedResults)
      setAnalyzing(false)
      if (progressTimer.current !== null) window.clearInterval(progressTimer.current)
      progressTimer.current = null
    }
  }

  const hasResults = results.some((result) => result.analysis || result.error)

  return (
    <div className="compare-page">
      <header className="page-header">
        <p className="eyebrow">Comparative opportunity assessment</p>
        <h1>Compare two research ideas.</h1>
        <p className="page-intro">
          Review grounded campus readiness, research momentum, evidence breadth, and capability gaps in parallel.
        </p>
      </header>

      <form className="compare-form" onSubmit={(event) => { event.preventDefault(); void compareIdeas() }}>
        <div className="compare-inputs">
          <label>
            <span>Opportunity 01</span>
            <div className="compare-input-control">
              <Search size={17} strokeWidth={1.7} aria-hidden="true" />
              <input value={firstQuery} onChange={(event) => setFirstQuery(event.target.value)}
                placeholder="Describe the first research opportunity" autoComplete="off" />
            </div>
          </label>
          <label>
            <span>Opportunity 02</span>
            <div className="compare-input-control">
              <Search size={17} strokeWidth={1.7} aria-hidden="true" />
              <input value={secondQuery} onChange={(event) => setSecondQuery(event.target.value)}
                placeholder="Describe the second research opportunity" autoComplete="off" />
            </div>
          </label>
        </div>
        <button className="compare-button" type="submit"
          disabled={analyzing || !firstQuery.trim() || !secondQuery.trim()}>
          <span>{analyzing ? 'Comparing' : 'Compare Ideas'}</span>
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      </form>

      {analyzing ? (
        <AnalysisProgress activeStep={activeStep} complete={false} comparison />
      ) : hasResults ? (
        <>
          <section className="comparison-results" aria-label="Opportunity comparison results">
            <ComparisonCard label="Opportunity 01" result={results[0]} />
            <ComparisonCard label="Opportunity 02" result={results[1]} />
          </section>
          {results[0].analysis && results[1].analysis
            ? <ComparisonTakeaway first={results[0].analysis} second={results[1].analysis} />
            : null}
        </>
      ) : null}
    </div>
  )
}
