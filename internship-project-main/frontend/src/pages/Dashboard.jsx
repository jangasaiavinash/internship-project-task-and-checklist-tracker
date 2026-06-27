import { useEffect, useState } from 'react'
import api from '../api.js'

export default function Dashboard() {
  const [data, setData] = useState({ stats: {}, recent_projects: [] })

  const employee = JSON.parse(localStorage.getItem('employee') || 'null')
  const isEmployee = !!employee

  useEffect(() => {
    const params = isEmployee ? { employee_id: employee.id } : {}
    api.get('/api/dashboard-stats', { params }).then((res) => setData(res.data))
  }, [])

  const cards = [
    ['Projects', data.stats.projects],
    ['Tasks', data.stats.tasks],
    ['Completed Tasks', data.stats.completed_tasks],
    ...(!isEmployee ? [['Employees', data.stats.employees]] : []),
    ['Checklist Items', data.stats.checklist],
    ['Average Progress', `${data.stats.avg_progress || 0}%`],
  ]

  return (
    <section className="page">
      <h1>Dashboard</h1>
      <div className="stats-grid">
        {cards.map(([label, value]) => <div className="stat" key={label}><span>{label}</span><strong>{value || 0}</strong></div>)}
      </div>
      <div className="panel">
        <h2>Recent Projects</h2>
        <table>
          <thead><tr><th>Name</th><th>Status</th><th>Progress</th></tr></thead>
          <tbody>{data.recent_projects.map((p) => <tr key={p.id}><td>{p.name}</td><td>{p.status}</td><td>{p.progress}%</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  )
}

