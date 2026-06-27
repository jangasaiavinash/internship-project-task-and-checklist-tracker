import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api.js'

export default function Login() {
  const navigate = useNavigate()
  const [role, setRole] = useState('admin')
  const [form, setForm] = useState({ email: 'admin@gmail.com', password: 'admin123' })
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      if (role === 'admin') {
        const { data } = await api.post('/admin/login', form)
        localStorage.setItem('admin', JSON.stringify(data.admin))
        localStorage.removeItem('employee')
        navigate('/')
      } else {
        const { data } = await api.post('/employee/login', form)
        localStorage.setItem('employee', JSON.stringify(data.employee))
        localStorage.removeItem('admin')
        navigate('/')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    }
  }

  function handleRoleChange(selectedRole) {
    setRole(selectedRole)
    setError('')
    if (selectedRole === 'admin') {
      setForm({ email: 'admin@gmail.com', password: 'admin123' })
    } else {
      setForm({ email: 'anirudh@glory.com', password: 'employee123' })
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="login-tabs">
          <button type="button" className={role === 'admin' ? 'active' : ''} onClick={() => handleRoleChange('admin')}>Admin</button>
          <button type="button" className={role === 'employee' ? 'active' : ''} onClick={() => handleRoleChange('employee')}>Employee</button>
        </div>
        <h1>{role === 'admin' ? 'Admin Login' : 'Employee Login'}</h1>
        <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
        {error && (
          error.includes('1045') || error.toLowerCase().includes('access denied') ? (
            <div className="db-error-banner">
              <strong>⚠️ Database Connection Failed</strong>
              <p>The backend cannot connect to MySQL. To resolve this:</p>
              <ol>
                <li>Open <code>backend/.env</code> in your editor.</li>
                <li>Add your MySQL root password:
                  <pre>DB_PASSWORD=your_password</pre>
                </li>
                <li>Save the file and click Login again.</li>
              </ol>
            </div>
          ) : (
            <p className="error">{error}</p>
          )
        )}
        <button className="primary">Login</button>
        {role === 'admin' && <Link to="/forgot-password">Forgot password?</Link>}
      </form>
    </div>
  )
}

