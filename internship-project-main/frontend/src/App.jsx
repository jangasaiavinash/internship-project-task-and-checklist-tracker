import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ModulePage from './pages/ModulePage.jsx'
import Reports from './pages/Reports.jsx'
import Settings from './pages/Settings.jsx'

const modules = {
  projects: {
    title: 'Projects',
    endpoint: '/api/projects',
    fields: [
      { name: 'name', label: 'Project Name', required: true },
      { name: 'description', label: 'Description' },
      { name: 'start_date', label: 'Start Date', type: 'date' },
      { name: 'end_date', label: 'End Date', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['Not Started', 'In Progress', 'Completed', 'On Hold'], required: true },
    ],
    columns: ['name', 'status', 'progress', 'start_date', 'end_date'],
  },
  tasks: {
    title: 'Tasks',
    endpoint: '/api/tasks',
    fields: [
      { name: 'project_id', label: 'Project ID', type: 'number', required: true },
      { name: 'employee_id', label: 'Employee ID', type: 'number' },
      { name: 'title', label: 'Task Title', required: true },
      { name: 'description', label: 'Description' },
      { name: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High'], required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['Pending', 'In Progress', 'Completed'], required: true },
      { name: 'due_date', label: 'Due Date', type: 'date' },
    ],
    columns: ['title', 'project_name', 'employee_name', 'priority', 'status', 'due_date'],
  },
  employees: {
    title: 'Employees',
    endpoint: '/api/employees',
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'phone', label: 'Phone' },
      { name: 'role', label: 'Role' },
      { name: 'department', label: 'Department' },
      { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'], required: true },
    ],
    columns: ['name', 'email', 'phone', 'role', 'department', 'status'],
  },
  checklist: {
    title: 'Checklist',
    endpoint: '/api/checklist',
    fields: [
      { name: 'project_id', label: 'Project ID', type: 'number', required: true },
      { name: 'task_id', label: 'Task ID', type: 'number' },
      { name: 'title', label: 'Checklist Item', required: true },
      { name: 'is_done', label: 'Done', type: 'checkbox' },
    ],
    columns: ['title', 'project_name', 'task_title', 'is_done'],
  },
}

function RequireAuth({ children }) {
  const admin = localStorage.getItem('admin')
  const employee = localStorage.getItem('employee')
  return (admin || employee) ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<ModulePage config={modules.projects} />} />
        <Route path="tasks" element={<ModulePage config={modules.tasks} />} />
        <Route path="employees" element={<ModulePage config={modules.employees} />} />
        <Route path="checklist" element={<ModulePage config={modules.checklist} />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

