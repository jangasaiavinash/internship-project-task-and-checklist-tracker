export default function Settings() {
  const admin = JSON.parse(localStorage.getItem('admin') || 'null')
  const employee = JSON.parse(localStorage.getItem('employee') || 'null')
  const isEmployee = !!employee

  return (
    <section className="page">
      <h1>Settings</h1>
      <div className="panel settings">
        {isEmployee ? (
          <>
            <label>Employee Name<input value={employee?.name || ''} readOnly /></label>
            <label>Employee Email<input value={employee?.email || ''} readOnly /></label>
            <label>Role<input value={employee?.role || ''} readOnly /></label>
            <label>Department<input value={employee?.department || ''} readOnly /></label>
          </>
        ) : (
          <>
            <label>Admin Name<input value={admin?.name || ''} readOnly /></label>
            <label>Admin Email<input value={admin?.email || ''} readOnly /></label>
            <p>Use Forgot Password on the login page to update the admin password with Gmail OTP verification.</p>
          </>
        )}
      </div>
    </section>
  )
}

