import assert from 'node:assert/strict'
import test from 'node:test'
import type { CampusForgeAnalysis } from '../../src/data/mockAnalysis.ts'
import type { EvidenceDomainResult } from '../scoring/readinessEngine.ts'
import type { GenieMessage, GenieQueryEvidence } from '../services/databricksGenie.ts'
import { adaptGenieMessage } from './campusForgeAnalysis.ts'

const retrieval: EvidenceDomainResult[] = ['trends', 'faculty', 'labs', 'equipment', 'projects'].map((domain) => ({
  domain: domain as EvidenceDomainResult['domain'], completed: true, attachmentCount: 1, rowCount: 1,
}))

function analysis(overrides: Partial<CampusForgeAnalysis> = {}): CampusForgeAnalysis {
  return {
    opportunity: { title: 'Test opportunity', verdict: 'Model verdict', rationale: 'Test rationale' },
    readiness: {
      score: 0, maximum: 100, label: 'Prototype readiness', disclaimer: 'Test.', confidence: 0,
      categories: {
        faculty: { score: 0, maximum: 25, explanation: '' },
        labs: { score: 0, maximum: 20, explanation: '' },
        equipment: { score: 0, maximum: 20, explanation: '' },
        projects: { score: 0, maximum: 20, explanation: '' },
        momentum: { score: 0, maximum: 15, explanation: '' },
      },
    },
    researchTrend: { momentum: 'Low', summary: '' },
    faculty: [], labs: [], equipment: [], projects: [], gaps: [],
    collaboration: { departments: [], summary: 'None', members: [], capabilityFlow: [] },
    recommendation: { verdict: 'Model verdict', summary: 'Test recommendation', evidenceKind: 'recommendation' },
    evidence: [], researchConnection: '',
    canonicalEvidence: {
      faculty: { direct: [], adjacent: [] }, labs: { direct: [], adjacent: [] },
      equipment: { direct: [], adjacent: [] }, projects: { direct: [], adjacent: [] },
      trends: { direct: [], adjacent: [] },
    },
    ...overrides,
  }
}

function result(domain: GenieQueryEvidence['domain'], columns: string[], rows: unknown[][]): GenieQueryEvidence {
  return { attachmentId: `${domain}-attachment`, domain, columns, rows, rowCount: rows.length }
}

function adapt(query: string, modelAnalysis: CampusForgeAnalysis, evidence: GenieQueryEvidence[]) {
  const repair: GenieMessage = {
    status: 'COMPLETED',
    attachments: [{ attachment_id: 'answer', text: { purpose: 'TEXT_ATTACHMENT_PURPOSE_ANSWER', content: JSON.stringify(modelAnalysis) } }],
  }
  return adaptGenieMessage(repair, { status: 'COMPLETED', attachments: [] }, evidence, query, retrieval)
}

const trendEvidence = result('trends', ['trend_id', 'research_area', 'activity_score', 'growth'], [
  ['T1', 'Edge AI for Smart Agriculture', 86, 'High'],
])

test('three scored direct faculty are all returned canonically', () => {
  const facultyEvidence = result('faculty', ['faculty_id', 'name', 'department', 'expertise'], [
    ['F1', 'Dr. One', 'Computing', 'Edge AI'],
    ['F2', 'Dr. Two', 'Agriculture', 'Smart Agriculture'],
    ['F3', 'Dr. Three', 'Engineering', 'Edge AI, Smart Agriculture'],
  ])
  const output = adapt('Can our campus pursue Edge AI for smart agriculture?', analysis({
    faculty: [{ id: 'F1', name: 'Dr. One', department: 'Computing', expertise: ['Edge AI'] }],
  }), [trendEvidence, facultyEvidence])
  assert.equal(output.canonicalEvidence.faculty.direct.length, 3)
  assert.equal(output.faculty.length, 3)
  assert.match(output.readiness.categories.faculty.explanation, /^3 direct/)
})

test('an unmappable raw row cannot raise a canonical category count', () => {
  const invalidFaculty = result('faculty', ['department', 'expertise'], [['Computing', 'Edge AI']])
  const output = adapt('Edge AI', analysis(), [trendEvidence, invalidFaculty])
  assert.equal(output.canonicalEvidence.faculty.direct.length, 0)
  assert.match(output.readiness.categories.faculty.explanation, /^0 direct/)
})

test('adjacent records remain separate from direct records', () => {
  const facultyEvidence = result('faculty', ['faculty_id', 'name', 'department', 'expertise'], [
    ['F1', 'Dr. Direct', 'Computing', 'Edge AI'],
    ['F2', 'Dr. Adjacent', 'Engineering', 'Internet of Things'],
  ])
  const output = adapt('Edge AI', analysis(), [facultyEvidence])
  assert.deepEqual(output.canonicalEvidence.faculty.direct.map((item) => item.id), ['F1'])
  assert.deepEqual(output.canonicalEvidence.faculty.adjacent.map((item) => item.id), ['F2'])
})

test('labs, equipment, and projects use the same canonical consistency rule', () => {
  const output = adapt('Edge AI', analysis(), [
    result('labs', ['lab_id', 'name', 'capabilities'], [['L1', 'Edge Systems Lab', 'Edge AI']]),
    result('equipment', ['equipment_id', 'name', 'lab_id', 'capability', 'utilization', 'status'], [['E1', 'Edge Device', 'L1', 'Edge AI', 35, 'Available']]),
    result('projects', ['project_id', 'title', 'status', 'fields'], [['P1', 'Edge AI Deployment', 'Ongoing', 'Edge AI']]),
  ])
  assert.equal(output.canonicalEvidence.labs.direct.length, 1)
  assert.equal(output.canonicalEvidence.equipment.direct.length, 1)
  assert.equal(output.canonicalEvidence.projects.direct.length, 1)
  assert.equal(output.labs.length, 1)
  assert.equal(output.equipment.length, 1)
  assert.equal(output.projects.length, 1)
})

test('missing second-domain faculty expertise creates a generalized domain gap', () => {
  const output = adapt('Edge AI for healthcare', analysis(), [
    result('trends', ['trend_id', 'research_area', 'activity_score', 'growth'], [['T2', 'Edge AI for Healthcare', 80, 'High']]),
    result('faculty', ['faculty_id', 'name', 'department', 'expertise'], [['F1', 'Dr. Technical', 'Computing', 'Edge AI']]),
  ])
  assert.ok(output.gaps.some((gap) => gap.id === 'readiness-v2-missing-domain-side-expertise'))
})

test('no domain gap is emitted when faculty collectively cover both major domains', () => {
  const output = adapt('Edge AI for healthcare', analysis(), [
    result('trends', ['trend_id', 'research_area', 'activity_score', 'growth'], [['T2', 'Edge AI for Healthcare', 80, 'High']]),
    result('faculty', ['faculty_id', 'name', 'department', 'expertise'], [
      ['F1', 'Dr. Technical', 'Computing', 'Edge AI'],
      ['F2', 'Dr. Domain', 'Medicine', 'Healthcare'],
    ]),
  ])
  assert.ok(!output.gaps.some((gap) => gap.id === 'readiness-v2-missing-domain-side-expertise'))
})
