import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Settings } from 'lucide-react'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Top Nav */}
      <nav className="bg-[#2c2c2b] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ed1c24] to-[#fcaf17]" />
          <span className="font-bold text-lg tracking-tight">Project Planner</span>
        </div>
        <div className="flex items-center gap-6">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-2 text-sm font-medium transition-colors ${
                isActive ? 'text-[#fcaf17]' : 'text-gray-300 hover:text-white'
              }`
            }
          >
            <LayoutDashboard size={16} />
            Departments
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2 text-sm font-medium transition-colors ${
                isActive ? 'text-[#fcaf17]' : 'text-gray-300 hover:text-white'
              }`
            }
          >
            <Settings size={16} />
            Settings
          </NavLink>
        </div>
      </nav>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}