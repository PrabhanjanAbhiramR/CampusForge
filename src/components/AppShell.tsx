import { useEffect, useState, type ReactNode } from 'react'
import { BarChart3, BookOpenText, Building2, Columns2, Compass, Menu, Network } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import { Button } from './ui/Button'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from './ui/Sheet'

const navigation = [
  { label: 'Discover', icon: Compass, to: '/' },
  { label: 'Compare Ideas', icon: Columns2, to: '/compare-ideas' },
  { label: 'Research Trends', icon: BarChart3, to: '/research-trends' },
  { label: 'Campus Resources', icon: Building2, to: '/campus-resources' },
  { label: 'Collaborations', icon: Network, to: '/collaborations' },
  { label: 'Insights', icon: BookOpenText, to: '/insights' },
]

function SidebarBody({ onNavigate, showTheme = false }: {
  onNavigate?: () => void
  showTheme?: boolean
}) {
  return <>
    <div className="brand-block">
      <img className="brand-logo" src="/campusforge-logo.png" alt="CampusForge Research Intelligence" />
    </div>
    <nav className="primary-nav" aria-label="Primary navigation">
      {navigation.map(({ label, icon: Icon, to }) => {
        return <NavLink className={({ isActive }) => isActive ? 'nav-item nav-item-active' : 'nav-item'}
          to={to} end={to === '/'} onClick={onNavigate} key={label}>
          <Icon size={18} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>
        </NavLink>
      })}
    </nav>
    <div className="sidebar-footer">
      <span className="institution-dot" aria-hidden="true" />
      <div><p>University workspace</p><span>Institutional view</span></div>
      {showTheme && <div className="sidebar-theme-toggle"><ThemeToggle /></div>}
    </div>
  </>
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
  }, [pathname])

  return <>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <div className="app-shell">
      <aside className="sidebar desktop-sidebar">
        <SidebarBody showTheme />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent className="mobile-sidebar">
          <SheetTitle className="sr-only">CampusForge navigation</SheetTitle>
          <SheetDescription className="sr-only">Navigate between CampusForge research intelligence pages.</SheetDescription>
          <SidebarBody onNavigate={() => setMobileOpen(false)} />
        </SheetContent>

        <div className="app-content">
          <header className="app-header">
            <SheetTrigger asChild>
              <Button className="mobile-menu-trigger" variant="outline" size="icon"
                aria-label="Open navigation"><Menu size={19} /></Button>
            </SheetTrigger>
            <ThemeToggle />
          </header>
          <main className="workspace" id="main-content" tabIndex={-1}>
            <div className="main-container">{children}</div>
          </main>
        </div>
      </Sheet>
    </div>
  </>
}
