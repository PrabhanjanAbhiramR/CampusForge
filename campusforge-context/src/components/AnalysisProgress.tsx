import { Check, LoaderCircle } from 'lucide-react'

const analysisSteps = [
  'Analyzing research momentum',
  'Matching faculty expertise',
  'Checking campus infrastructure',
  'Reviewing existing projects',
  'Detecting capability gaps',
]

export function AnalysisProgress({ activeStep, complete, comparison = false }: { activeStep: number; complete: boolean; comparison?: boolean }) {
  return (
    <section className="analysis-panel" aria-live="polite" aria-busy={!complete}>
      <div className="analysis-heading">
        <div>
          <p className="analysis-kicker">{comparison ? 'Parallel campus capability scan' : 'Campus capability scan'}</p>
          <h2>{complete ? 'Initial assessment complete' : comparison ? 'Comparing two opportunities' : 'Evaluating opportunity'}</h2>
        </div>
        <span className={complete ? 'analysis-status complete' : 'analysis-status'}>
          {complete ? '5 sources reviewed' : comparison ? '2 analyses in progress' : 'In progress'}
        </span>
      </div>

      <ol className="analysis-steps">
        {analysisSteps.map((step, index) => {
          const isComplete = complete || index < activeStep
          const isActive = !complete && index === activeStep
          return (
            <li className={isActive ? 'active' : isComplete ? 'done' : ''} key={step}>
              <span className="step-icon" aria-hidden="true">
                {isComplete ? <Check size={14} strokeWidth={2.2} /> : isActive ? (
                  <LoaderCircle className="spin" size={14} />
                ) : <span className="step-number">{index + 1}</span>}
              </span>
              <span>{step}</span>
            </li>
          )
        })}
      </ol>

      {complete && (
        <p className="analysis-note">
          The opportunity is ready for a deeper evidence and feasibility review.
        </p>
      )}
    </section>
  )
}
