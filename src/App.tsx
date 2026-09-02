import { AppShell } from './components/AppShell'
import { DiscoverPage } from './pages/DiscoverPage'
import { CampusResourcesPage } from './pages/CampusResourcesPage'
import { CollaborationsPage } from './pages/CollaborationsPage'
import { InsightsPage } from './pages/InsightsPage'
import { ResearchTrendsPage } from './pages/ResearchTrendsPage'
import { CompareIdeasPage } from './pages/CompareIdeasPage'
import { Navigate, Route, Routes } from 'react-router-dom'

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DiscoverPage />} />
        <Route path="/compare-ideas" element={<CompareIdeasPage />} />
        <Route path="/research-trends" element={<ResearchTrendsPage />} />
        <Route path="/campus-resources" element={<CampusResourcesPage />} />
        <Route path="/collaborations" element={<CollaborationsPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}

export default App
