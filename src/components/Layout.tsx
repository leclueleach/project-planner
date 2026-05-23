import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Settings } from 'lucide-react'

export default function Layout() {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-logo" />
          <span className="nav-title">Project Planner</span>
        </div>
        <div className="nav-links">
          <NavLink
            to="/"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <LayoutDashboard size={16} />
            Departments
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Settings size={16} />
            Settings
          </NavLink>
        </div>
      </nav>
      <main className="page">
        <Outlet />
      </main>
    </div>
  )
}