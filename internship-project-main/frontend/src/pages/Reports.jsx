
import { Download, Plus, Search, Trash2 } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { useEffect, useState } from 'react'
import api from '../api.js'

export default function Reports() {
  const [data, setData] = useState({
    reports: [],
    live: {
      projects: [],
      tasks: [],
      employees: [],
      checklist: [],
    },
  })

  const [form, setForm] = useState({
    title: '',
    type: 'Project',
    notes: '',
  })

  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  async function load(q = search) {
    try {
      const res = await api.get('/api/reports', {
        params: { search: q },
      })

      const payload = Array.isArray(res.data)
        ? { reports: res.data, live: {} }
        : res.data

      setData({
        reports:
          payload.reports ||
          payload.data ||
          (payload.id ? [payload] : []),

        live: {
          projects: payload.live?.projects || [],
          tasks: payload.live?.tasks || [],
          employees: payload.live?.employees || [],
          checklist: payload.live?.checklist || [],
        },
      })

      setError('')
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Unable to load reports'
      )
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function submit(event) {
    event.preventDefault()

    try {
      await api.post('/api/reports', form)

      setForm({
        title: '',
        type: 'Project',
        notes: '',
      })

      setError('')
      await load()
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Unable to add report'
      )
    }
  }

  async function remove(id) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this report?'
    )

    if (!confirmed) return

    try {
      await api.delete(`/api/reports/${id}`)
      setError('')
      await load()
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Unable to delete report'
      )
    }
  }

  function formatDate(value) {
    if (!value) return '-'

    const date = new Date(value)

    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
  }

  function createFileName(title) {
    return (title || 'project-report')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function downloadReport(report) {
    try {
      const doc = new jsPDF()

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.text('Project Task & Checklist Tracker', 14, 18)

      doc.setFontSize(14)
      doc.text(
        report.title ||
        report.report_name ||
        'Project Report',
        14,
        29
      )

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)

      doc.text(
        `Downloaded on: ${new Date().toLocaleDateString('en-IN')}`,
        14,
        38
      )

      autoTable(doc, {
        startY: 45,

        head: [
          ['Report Field', 'Details'],
        ],

        body: [
          [
            'Report Title',
            report.title ||
            report.report_name ||
            '-',
          ],
          [
            'Report Type',
            report.type ||
            report.project_name ||
            'Project',
          ],
          [
            'Notes',
            report.notes ||
            report.generated_by ||
            '-',
          ],
          [
            'Created Date',
            formatDate(
              report.created_at ||
              report.report_date
            ),
          ],
          [
            'Total Projects',
            String(data.live.projects.length),
          ],
          [
            'Total Tasks',
            String(data.live.tasks.length),
          ],
          [
            'Total Employees',
            String(data.live.employees.length),
          ],
          [
            'Checklist Items',
            String(data.live.checklist.length),
          ],
        ],

        theme: 'grid',

        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
        },

        styles: {
          fontSize: 10,
          cellPadding: 4,
          overflow: 'linebreak',
        },

        columnStyles: {
          0: {
            fontStyle: 'bold',
            cellWidth: 48,
          },
          1: {
            cellWidth: 130,
          },
        },
      })

      const fileName = createFileName(
        report.title || report.report_name
      )

      doc.save(`${fileName}.pdf`)
    } catch (err) {
      setError('Unable to download the PDF report')
      console.error(err)
    }
  }

  return (
    <section className="page">
      <div className="page-head">
        <h1>Reports</h1>

        <div className="search">
          <Search size={16} />

          <input
            placeholder="Search"
            value={search}
            onChange={(event) => {
              const value = event.target.value
              setSearch(value)
              load(value)
            }}
          />
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <span>Projects</span>
          <strong>{data.live.projects.length}</strong>
        </div>

        <div className="stat">
          <span>Tasks</span>
          <strong>{data.live.tasks.length}</strong>
        </div>

        <div className="stat">
          <span>Employees</span>
          <strong>{data.live.employees.length}</strong>
        </div>

        <div className="stat">
          <span>Checklist</span>
          <strong>{data.live.checklist.length}</strong>
        </div>
      </div>

      <form
        className="panel form-grid"
        onSubmit={submit}
      >
        <label>
          Title

          <input
            value={form.title}
            onChange={(event) =>
              setForm({
                ...form,
                title: event.target.value,
              })
            }
            required
          />
        </label>

        <label>
          Type

          <select
            value={form.type}
            onChange={(event) =>
              setForm({
                ...form,
                type: event.target.value,
              })
            }
          >
            {[
              'Project',
              'Task',
              'Employee',
              'Checklist',
            ].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          Notes

          <input
            value={form.notes}
            onChange={(event) =>
              setForm({
                ...form,
                notes: event.target.value,
              })
            }
          />
        </label>

        <button
          type="submit"
          className="primary"
        >
          <Plus size={16} />
          Add Report
        </button>
      </form>

      <div className="panel table-wrap">
        {error && (
          <p className="error">{error}</p>
        )}

        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Notes</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {data.reports.map((report) => (
              <tr key={report.id}>
                <td>
                  {report.title ||
                  report.report_name}
                </td>

                <td>
                  {report.type ||
                  report.project_name ||
                  'Project'}
                </td>

                <td>
                  {report.notes ||
                  report.generated_by ||
                  '-'}
                </td>

                <td>
                  {formatDate(
                    report.created_at ||
                    report.report_date
                  )}
                </td>

                <td>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                    }}
                  >
                    <button
                      type="button"
                      className="icon-btn"
                      title="Download PDF"
                      onClick={() =>
                        downloadReport(report)
                      }
                    >
                      <Download size={16} />
                    </button>

                    <button
                      type="button"
                      className="icon-btn danger"
                      title="Delete Report"
                      onClick={() =>
                        remove(report.id)
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {data.reports.length === 0 && (
              <tr>
                <td
                  colSpan="5"
                  style={{
                    textAlign: 'center',
                    padding: '24px',
                  }}
                >
                  No reports available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

