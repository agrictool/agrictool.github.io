import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Users, ClipboardList, BarChart2,
  Trophy, BookOpen, ToggleLeft, Award, Settings
} from 'lucide-react'

const NAV = [
  { to: '/admin',               label: 'Overview',              icon: LayoutDashboard, end: true },
  { to: '/admin/participants',  label: 'Participants',           icon: Users },
  { to: '/admin/pre-survey',    label: 'Pre-Assessment',         icon: ClipboardList },
  { to: '/admin/post-survey',   label: 'Post-Assessment',        icon: ClipboardList },
  { to: '/admin/impact',        label: 'Impact Analysis',        icon: BarChart2 },
  { to: '/admin/challenge',     label: 'Group Challenge',        icon: Trophy },
  { to: '/admin/toolkit',       label: 'Toolkit Moderation',     icon: BookOpen },
  { to: '/admin/phases',        label: 'Programme Phases',       icon: ToggleLeft },
  { to: '/admin/certificates',  label: 'Certificates',           icon: Award },
  { to: '/admin/settings',      label: 'Settings',               icon: Settings },
]

export default function AdminLayout() {
  return (
    <div className="flex flex-col md:flex-row w-full min-h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-[#12304A] border-r border-white/10 flex-shrink-0">
        <div className="p-4 border-b border-white/10">
          <p className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest">Admin Dashboard</p>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto" aria-label="Admin navigation">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors
                 ${isActive
                   ? 'bg-white/10 text-white font-medium border-r-2 border-[#D4AF37]'
                   : 'text-blue-200 hover:bg-white/5 hover:text-white'}`
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden w-full border-b border-[#DDE3E7] bg-white overflow-x-auto">
        <div className="flex px-4 py-2 gap-1 min-w-max">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 text-xs rounded whitespace-nowrap transition-colors
                 ${isActive ? 'bg-[#12304A] text-white' : 'text-[#374151] hover:bg-gray-100'}`
              }
            >
              <item.icon className="w-3.5 h-3.5" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 min-w-0 overflow-auto bg-[#F9FBF9]">
        <Outlet />
      </main>
    </div>
  )
}
