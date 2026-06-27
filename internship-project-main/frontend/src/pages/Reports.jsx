import { Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import api from '../api.js'

export default function Reports() {
  const [data, setData] = useState({ reports: [], live: { projects: [], tasks: [], employees: [], checklist: [] } })
  const [form, setForm] = useState({ title: '', type: 'Project', notes: '' })
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  async function load(q = search) {
    try {
      const res = await api.get('/api/reports', { params: { search: q } })
      const payload = Array.isArray(res.data) ? { reports: res.data, live: {} } : res.data
      setData({
        reports: payload.reports || payload.data || (payload.id ? [payload] : []),
        live: {
          projects: payload.live?.projects || [],
          tasks: payload.live?.tasks || [],
          employees: payload.live?.employees || [],
          checklist: payload.live?.checklist || [],
        },
      })
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    }
  }

  useEffect(() => { load() }, [])

  async function submit(event) {
    event.preventDefault()
    await api.post('/api/reports', form)
    setForm({ title: '', type: 'Project', notes: '' })
    load()
  }

  async function remove(id) {
    await api.delete(`/api/reports/${id}`)
    load()
  }

  return (
    <section className="page">
      <div className="page-head">
        <h1>Reports</h1>
        <div className="search">
          <Search size={16} />
          <input placeholder="Search" value={search} onChange={(e) => { setSearch(e.target.value); load(e.target.value) }} />
        </div>
      </div>
      <div className="stats-grid">
        <div className="stat"><span>Projects</span><strong>{data.live.projects.length}</strong></div>
        <div className="stat"><span>Tasks</span><strong>{data.live.tasks.length}</strong></div>
        <div className="stat"><span>Employees</span><strong>{data.live.employees.length}</strong></div>
        <div className="stat"><span>Checklist</span><strong>{data.live.checklist.length}</strong></div>
      </div>
      <form className="panel form-grid" onSubmit={submit}>
        <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
        <label>Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{['Project', 'Task', 'Employee', 'Checklist'].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Notes<input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        <button className="primary"><Plus size={16} />Add Report</button>
      </form>
      <div className="panel table-wrap">
        {error && <p className="error">{error}</p>}
        <table>
          <thead><tr><th>Title</th><th>Type</th><th>Notes</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>{data.reports.map((r) => <tr key={r.id}><td>{r.title || r.report_name}</td><td>{r.type || r.project_name || 'Project'}</td><td>{r.notes || r.generated_by || '-'}</td><td>{r.created_at || r.report_date}</td><td><button className="icon-btn danger" onClick={() => remove(r.id)}><Trash2 size={16} /></button></td></tr>)}</tbody>
        </table>
      </div>
    </section>
  )
}
