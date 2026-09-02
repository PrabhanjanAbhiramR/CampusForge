import type { ReactNode } from 'react'
import { BarChart3, BookOpenText, Building2, Columns2, Compass, Network } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navigation = [
  { label: 'Discover', icon: Compass, to: '/' },
  { label: 'Compare Ideas', icon: Columns2, to: '/compare-ideas' },
  { label: 'Research Trends', icon: BarChart3, to: '/research-trends' },
  { label: 'Campus Resources', icon: Building2, to: '/campus-resources' },
  { label: 'Collaborations', icon: Network, to: '/collaborations' },
  { label: 'Insights', icon: BookOpenText, to: '/insights' },
]

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">CF</div>
          <div>
            <p className="brand-name">CampusForge</p>
            <p className="brand-subtitle">Research Intelligence</p>
          </div>
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          {navigation.map(({ label, icon: Icon, to }) => (
            <NavLink
              className={({ isActive }) => isActive ? 'nav-item nav-item-active' : 'nav-item'}
              to={to}
              end={to === '/'}
              key={label}
            >
              <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="institution-dot" aria-hidden="true" />
          <div>
            <p>University workspace</p>
            <span>Institutional view</span>
          </div>
        </div>
      </aside>
      <main className="workspace">{children}</main>
    </div>
  )
}
