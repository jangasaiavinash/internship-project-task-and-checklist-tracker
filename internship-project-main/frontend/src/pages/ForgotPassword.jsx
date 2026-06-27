import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api.js'

export default function ForgotPassword() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ email: '', otp: '', password: '' })
  const [message, setMessage] = useState('')

  async function call(path, next) {
    setMessage('')
    try {
      const { data } = await api.post(path, form)
      setMessage(data.message)
      setStep(next)
    } catch (err) {
      setMessage(err.response?.data?.error || 'Request failed')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Reset Password</h1>
        <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={step >= 2} /></label>
        {step >= 2 && <label>OTP<input value={form.otp} onChange={(e) => setForm({ ...form, otp: e.target.value })} /></label>}
        {step >= 3 && <label>New Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>}
        {message && <p className="notice">{message}</p>}
        {step === 1 && <button className="primary" onClick={() => call('/send-otp', 2)}>Send OTP</button>}
        {step === 2 && <button className="primary" onClick={() => call('/verify-otp', 3)}>Verify OTP</button>}
        {step === 3 && <button className="primary" onClick={() => call('/reset-password', 4)}>Reset Password</button>}
        {step === 4 && <Link to="/login">Back to login</Link>}
      </div>
    </div>
  )
}

