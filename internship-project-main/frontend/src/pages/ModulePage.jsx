import { Edit2, Plus, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import api from '../api.js'

export default function ModulePage({ config }) {
  const emptyForm = useMemo(() => Object.fromEntries(config.fields.map((field) => [field.name, field.type === 'checkbox' ? false : ''])), [config])
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const admin = JSON.parse(localStorage.getItem('admin') || 'null')
  const employee = JSON.parse(localStorage.getItem('employee') || 'null')
  const isEmployee = !!employee

  useEffect(() => {
    setForm(emptyForm)
    setEditing(null)
    load()
  }, [config])

  async function load(q = search) {
    const params = { search: q }
    if (isEmployee && employee?.id) {
      params.employee_id = employee.id
    }
    const { data } = await api.get(config.endpoint, { params })
    setItems(data)
  }

  async function toggleChecklist(item, checked) {
    try {
      await api.put(`/api/checklist/${item.id}`, {
        project_id: item.project_id,
        task_id: item.task_id,
        title: item.title,
        is_done: checked
      })
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update checklist item')
    }
  }

  async function updateTaskStatus(item, newStatus) {
    try {
      await api.put(`/api/tasks/${item.id}`, {
        project_id: item.project_id,
        employee_id: item.employee_id,
        title: item.title,
        description: item.description,
        priority: item.priority,
        status: newStatus,
        due_date: item.due_date
      })
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update task status')
    }
  }

  function valueFor(item, key) {
    const value = item[key]
    if (key === 'is_done') return value ? 'Done' : 'Open'
    return value ?? '-'
  }

  function renderCell(item, col) {
    if (col === 'is_done') {
      return (
        <input 
          type="checkbox" 
          checked={Boolean(item.is_done)} 
          onChange={(e) => toggleChecklist(item, e.target.checked)} 
          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
        />
      )
    }
    if (col === 'status' && config.endpoint === '/api/tasks') {
      if (isEmployee) {
        return (
          <select 
            value={item.status} 
            onChange={(e) => updateTaskStatus(item, e.target.value)} 
            style={{ padding: '6px', minHeight: '34px', width: 'auto', borderRadius: '4px' }}
          >
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        )
      } else {
        const statusColors = {
          'Pending': { bg: '#fef3c7', text: '#d97706' },
          'In Progress': { bg: '#dbeafe', text: '#2563eb' },
          'Completed': { bg: '#d1fae5', text: '#059669' }
        }
        const style = statusColors[item.status] || { bg: '#f3f4f6', text: '#374151' }
        return (
          <span style={{ 
            background: style.bg, 
            color: style.text, 
            padding: '4px 8px', 
            borderRadius: '4px', 
            fontWeight: '600', 
            fontSize: '13px' 
          }}>
            {item.status}
          </span>
        )
      }
    }
    return valueFor(item, col)
  }

  function startEdit(item) {
    setEditing(item.id)
    setForm(Object.fromEntries(config.fields.map((field) => [field.name, field.type === 'checkbox' ? Boolean(item[field.name]) : item[field.name] ?? ''])))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      if (editing) {
        await api.put(`${config.endpoint}/${editing}`, form)
      } else {
        await api.post(config.endpoint, form)
      }
      setForm(emptyForm)
      setEditing(null)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed')
    }
  }

  async function remove(id) {
    await api.delete(`${config.endpoint}/${id}`)
    load()
  }

  return (
    <section className="page">
      <div className="page-head">
        <h1>{config.title}</h1>
        <div className="search">
          <Search size={16} />
          <input placeholder="Search" value={search} onChange={(e) => { setSearch(e.target.value); load(e.target.value) }} />
        </div>
      </div>
      {!isEmployee && (
        <form className="panel form-grid" onSubmit={submit}>
          {config.fields.map((field) => (
            <label key={field.name} className={field.type === 'checkbox' ? 'check-label' : ''}>
              {field.label}
              {field.type === 'select' ? (
                <select value={form[field.name] ?? ''} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} required={field.required}>
                  <option value="">Select</option>
                  {field.options.map((option) => <option key={option}>{option}</option>)}
                </select>
              ) : field.type === 'checkbox' ? (
                <input type="checkbox" checked={Boolean(form[field.name])} onChange={(e) => setForm({ ...form, [field.name]: e.target.checked })} />
              ) : (
                <input type={field.type || 'text'} value={form[field.name] ?? ''} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} required={field.required} />
              )}
            </label>
          ))}
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <button className="primary"><Plus size={16} />{editing ? 'Update' : 'Add'}</button>
            {editing && <button type="button" onClick={() => { setEditing(null); setForm(emptyForm) }}><X size={16} />Cancel</button>}
          </div>
        </form>
      )}
      <div className="panel table-wrap">
        <table>
          <thead><tr>{config.columns.map((col) => <th key={col}>{col.replaceAll('_', ' ')}</th>)}{!isEmployee && <th>Actions</th>}</tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                {config.columns.map((col) => <td key={col}>{renderCell(item, col)}</td>)}
                {!isEmployee && (
                  <td className="row-actions">
                    <button className="icon-btn" onClick={() => startEdit(item)} title="Edit"><Edit2 size={16} /></button>
                    <button className="icon-btn danger" onClick={() => remove(item.id)} title="Delete"><Trash2 size={16} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

