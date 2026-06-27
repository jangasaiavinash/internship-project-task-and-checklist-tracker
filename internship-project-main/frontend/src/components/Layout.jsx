import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, CheckSquare, ClipboardList, LayoutDashboard, LogOut, Moon, Settings, Sun, Users, FolderKanban } from 'lucide-react'
import { useEffect, useState } from 'react'

const nav = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/projects', 'Projects', FolderKanban],
  ['/tasks', 'Tasks', ClipboardList],
  ['/employees', 'Employees', Users],
  ['/checklist', 'Checklist', CheckSquare],
  ['/reports', 'Reports', BarChart3],
  ['/settings', 'Settings', Settings],
]

export default function Layout() {
  const navigate = useNavigate()
  const [dark, setDark] = useState(localStorage.getItem('theme') === 'dark')
  
  const admin = JSON.parse(localStorage.getItem('admin') || 'null')
  const employee = JSON.parse(localStorage.getItem('employee') || 'null')
  const user = admin || employee || {}
  const isEmployee = !!employee

  const filteredNav = isEmployee
    ? nav.filter(([to]) => ['/', '/tasks', '/checklist', '/settings'].includes(to))
    : nav

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  function logout() {
    localStorage.removeItem('admin')
    localStorage.removeItem('employee')
    navigate('/login')
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Internship Tracker</div>
        <nav>
          {filteredNav.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <strong>Project Task & Checklist Tracker</strong>
            <span>{user.email} ({isEmployee ? 'Employee' : 'Admin'})</span>
          </div>
          <div className="top-actions">
            <button className="icon-btn" onClick={() => setDark(!dark)} title="Toggle dark mode">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-btn" onClick={logout} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  )
}

