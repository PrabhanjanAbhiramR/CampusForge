import { ArrowRight, Search } from 'lucide-react'
import type { FormEvent } from 'react'

const suggestions = [
  'Where could our water research strengths support regional resilience?',
  'Do we have the capacity to lead a quantum sensing initiative?',
  'Which circular materials opportunities fit our current facilities?',
]

type OpportunityQueryProps = {
  query: string
  analyzing: boolean
  onQueryChange: (query: string) => void
  onAnalyze: () => void
}

export function OpportunityQuery({ query, analyzing, onQueryChange, onAnalyze }: OpportunityQueryProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onAnalyze()
  }

  return (
    <section className="query-section" aria-labelledby="query-label">
      <form onSubmit={handleSubmit}>
        <label className="query-label" id="query-label" htmlFor="research-query">
          What research opportunity should we evaluate?
        </label>
        <div className="query-control">
          <Search size={20} strokeWidth={1.7} aria-hidden="true" />
          <input
            id="research-query"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Describe a field, capability, or opportunity"
            autoComplete="off"
          />
          <button type="submit" disabled={!query.trim() || analyzing}>
            <span>{analyzing ? 'Analyzing' : 'Analyze Opportunity'}</span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </form>

      <div className="suggestions" aria-label="Suggested research questions">
        <span className="suggestions-label">Suggested inquiries</span>
        <div className="suggestion-list">
          {suggestions.map((suggestion) => (
            <button type="button" onClick={() => onQueryChange(suggestion)} key={suggestion}>
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
