import type { CampusForgeAnalysis } from '../data/mockAnalysis'
import { AssessmentSummary } from './assessment/AssessmentSummary'
import { CapabilityGaps } from './assessment/CapabilityGaps'
import { CollaborationCard } from './assessment/CollaborationCard'
import { EvidenceDetails } from './assessment/EvidenceDetails'
import { EvidenceOverview } from './assessment/EvidenceOverview'
import { ReadinessBreakdown } from './assessment/ReadinessBreakdown'
import { RecommendationCard } from './assessment/RecommendationCard'

export function ResearchBriefing({ analysis }: { analysis: CampusForgeAnalysis }) {
  return <article className="research-assessment" aria-label={`Opportunity assessment for ${analysis.opportunity.title}`}>
    <AssessmentSummary analysis={analysis} />
    <ReadinessBreakdown readiness={analysis.readiness} />
    <EvidenceOverview evidence={analysis.canonicalEvidence} />
    <EvidenceDetails evidence={analysis.canonicalEvidence} />
    <CapabilityGaps gaps={analysis.gaps} />
    <CollaborationCard collaboration={analysis.collaboration} faculty={analysis.faculty} />
    <RecommendationCard recommendation={analysis.recommendation} />
  </article>
}
