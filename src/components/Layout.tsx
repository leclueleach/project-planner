import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Settings, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Layout() {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <nav className="nav">
        <div className="nav-brand">
          <div className="nav-logo" />
          <span className="nav-title">Project Planner</span>
        </div>
        <div className="nav-links">
          <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <LayoutDashboard size={16} />
            Departments
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Settings size={16} />
            Settings
          </NavLink>
          <button onClick={handleSignOut} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </nav>
      <main className="page">
        <Outlet />
      </main>
    </div>
  )
}