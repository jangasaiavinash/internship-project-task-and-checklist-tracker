
import {
  Download,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'

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
    type: 'Task',
    notes: '',
  })

  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  async function load(q = search) {
    try {
      const response = await api.get('/api/reports', {
        params: {
          search: q,
        },
      })

      const payload = Array.isArray(response.data)
        ? {
            reports: response.data,
            live: {},
          }
        : response.data

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
        type: 'Task',
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

    if (!confirmed) {
      return
    }

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
    if (!value) {
      return '-'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return value
    }

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  function createFileName(title) {
    return (title || 'pending-tasks-summary')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function normalizeStatus(status) {
    return String(status || '')
      .trim()
      .toLowerCase()
  }

  function getEmployeeName(task) {
    if (task.employee_name) {
      return task.employee_name
    }

    if (task.assigned_employee) {
      return task.assigned_employee
    }

    const employee = data.live.employees.find(
      (item) =>
        String(item.id) ===
        String(task.employee_id)
    )

    return employee?.name || 'Not Assigned'
  }

  function getProjectName(task) {
    if (task.project_name) {
      return task.project_name
    }

    const project = data.live.projects.find(
      (item) =>
        String(item.id) ===
        String(task.project_id)
    )

    return project?.name || 'All Projects'
  }

  function downloadTaskReport(report) {
    try {
      const tasks = data.live.tasks || []

      const completedTasks = tasks.filter(
        (task) =>
          normalizeStatus(task.status) ===
          'completed'
      )

      const inProgressTasks = tasks.filter(
        (task) =>
          normalizeStatus(task.status) ===
          'in progress'
      )

      const pendingTasks = tasks.filter(
        (task) =>
          normalizeStatus(task.status) ===
          'pending'
      )

      const projectNames = [
        ...new Set(
          tasks
            .map((task) => getProjectName(task))
            .filter(Boolean)
        ),
      ]

      const projectText =
        projectNames.length === 1
          ? projectNames[0]
          : projectNames.length > 1
            ? 'Multiple Projects'
            : 'No Project Available'

      const reportTitle =
        report.title ||
        report.report_name ||
        'Pending Tasks Summary Report'

      const reportNotes =
        report.notes ||
        report.generated_by ||
        'This report provides a summary of completed, in-progress, and pending project tasks.'

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth =
        doc.internal.pageSize.getWidth()

      const pageHeight =
        doc.internal.pageSize.getHeight()

      // Main heading
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(15, 23, 42)

      doc.text(
        'PROJECT TASK & CHECKLIST TRACKER',
        pageWidth / 2,
        17,
        {
          align: 'center',
        }
      )

      // Report heading
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(12)
      doc.setTextColor(71, 85, 105)

      doc.text(
        reportTitle,
        pageWidth / 2,
        25,
        {
          align: 'center',
        }
      )

      // Report information table
      autoTable(doc, {
        startY: 32,

        body: [
          [
            'Report Type',
            'Task',
            'Generated Date',
            formatDate(new Date()),
          ],
          [
            'Project',
            projectText,
            'Prepared For',
            'Glory Simon Interiors',
          ],
        ],

        theme: 'grid',

        styles: {
          fontSize: 9,
          cellPadding: 3,
          textColor: [31, 41, 55],
          lineColor: [203, 213, 225],
          lineWidth: 0.3,
        },

        columnStyles: {
          0: {
            fontStyle: 'bold',
            fillColor: [248, 250, 252],
            cellWidth: 30,
          },

          1: {
            cellWidth: 55,
          },

          2: {
            fontStyle: 'bold',
            fillColor: [248, 250, 252],
            cellWidth: 31,
          },

          3: {
            cellWidth: 64,
          },
        },

        margin: {
          left: 15,
          right: 15,
        },
      })

      const informationEndY =
        doc.lastAutoTable.finalY + 7

      // Task summary table
      autoTable(doc, {
        startY: informationEndY,

        head: [
          [
            'Total Tasks',
            'Completed',
            'In Progress',
            'Pending',
          ],
        ],

        body: [
          [
            String(tasks.length),
            String(completedTasks.length),
            String(inProgressTasks.length),
            String(pendingTasks.length),
          ],
        ],

        theme: 'grid',

        headStyles: {
          fillColor: [226, 232, 240],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          halign: 'center',
        },

        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 12,
          halign: 'center',
        },

        styles: {
          fontSize: 9,
          cellPadding: 4,
          lineColor: [203, 213, 225],
          lineWidth: 0.3,
        },

        margin: {
          left: 15,
          right: 15,
        },
      })

      const summaryEndY =
        doc.lastAutoTable.finalY + 10

      // Task details heading
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(29, 78, 216)

      doc.text(
        'TASK DETAILS',
        15,
        summaryEndY
      )

      const taskRows =
        tasks.length > 0
          ? tasks.map((task) => [
              task.title ||
                task.task_title ||
                '-',

              getEmployeeName(task),

              task.priority || 'Medium',

              task.status || 'Pending',

              formatDate(task.due_date),
            ])
          : [
              [
                'No tasks available',
                '-',
                '-',
                '-',
                '-',
              ],
            ]

      // Task details table
      autoTable(doc, {
        startY: summaryEndY + 4,

        head: [
          [
            'Task Title',
            'Employee',
            'Priority',
            'Status',
            'Due Date',
          ],
        ],

        body: taskRows,

        theme: 'grid',

        headStyles: {
          fillColor: [29, 78, 216],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'left',
        },

        bodyStyles: {
          fillColor: [248, 250, 252],
          textColor: [31, 41, 55],
        },

        alternateRowStyles: {
          fillColor: [255, 255, 255],
        },

        styles: {
          fontSize: 8.5,
          cellPadding: 3.5,
          lineColor: [203, 213, 225],
          lineWidth: 0.3,
          overflow: 'linebreak',
          valign: 'middle',
        },

        columnStyles: {
          0: {
            cellWidth: 48,
          },

          1: {
            cellWidth: 38,
          },

          2: {
            cellWidth: 24,
          },

          3: {
            cellWidth: 31,
          },

          4: {
            cellWidth: 39,
          },
        },

        margin: {
          left: 15,
          right: 15,
        },

        didDrawPage: () => {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(100, 116, 139)

          doc.text(
            `Page ${doc.internal.getNumberOfPages()}`,
            pageWidth - 15,
            pageHeight - 8,
            {
              align: 'right',
            }
          )
        },
      })

      let notesStartY =
        doc.lastAutoTable.finalY + 10

      // Add new page when there is insufficient room
      if (notesStartY > pageHeight - 55) {
        doc.addPage()
        notesStartY = 20
      }

      // Notes heading
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(29, 78, 216)

      doc.text(
        'REPORT NOTES',
        15,
        notesStartY
      )

      const noteLines =
        doc.splitTextToSize(
          reportNotes,
          pageWidth - 40
        )

      const noteBoxHeight =
        Math.max(
          24,
          noteLines.length * 5 + 12
        )

      // Notes background
      doc.setFillColor(239, 246, 255)
      doc.setDrawColor(147, 197, 253)

      doc.roundedRect(
        15,
        notesStartY + 5,
        pageWidth - 30,
        noteBoxHeight,
        2,
        2,
        'FD'
      )

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(31, 41, 55)

      doc.text(
        noteLines,
        20,
        notesStartY + 14
      )

      const footerY =
        notesStartY +
        noteBoxHeight +
        14

      // Footer line
      doc.setDrawColor(203, 213, 225)

      doc.line(
        15,
        footerY,
        pageWidth - 15,
        footerY
      )

      // Footer text
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(71, 85, 105)

      doc.text(
        'Generated by: Project Task & Checklist Tracker',
        15,
        footerY + 7
      )

      doc.text(
        'Company: Glory Simon Interiors',
        pageWidth - 15,
        footerY + 7,
        {
          align: 'right',
        }
      )

      const fileName =
        createFileName(reportTitle)

      doc.save(`${fileName}.pdf`)

      setError('')
    } catch (err) {
      console.error(err)

      setError(
        'Unable to download the task report PDF'
      )
    }
  }

  return (
    <section className="page">
      <div className="page-head">
        <h1>Reports</h1>

        <div className="search">
          <Search size={16} />

          <input
            type="text"
            placeholder="Search reports"
            value={search}
            onChange={(event) => {
              const value =
                event.target.value

              setSearch(value)
              load(value)
            }}
          />
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <span>Projects</span>

          <strong>
            {data.live.projects.length}
          </strong>
        </div>

        <div className="stat">
          <span>Tasks</span>

          <strong>
            {data.live.tasks.length}
          </strong>
        </div>

        <div className="stat">
          <span>Employees</span>

          <strong>
            {data.live.employees.length}
          </strong>
        </div>

        <div className="stat">
          <span>Checklist</span>

          <strong>
            {data.live.checklist.length}
          </strong>
        </div>
      </div>

      <form
        className="panel form-grid"
        onSubmit={submit}
      >
        <label>
          Title

          <input
            type="text"
            placeholder="Pending Tasks Summary Report"
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
            <option value="Task">
              Task
            </option>

            <option value="Project">
              Project
            </option>

            <option value="Employee">
              Employee
            </option>

            <option value="Checklist">
              Checklist
            </option>
          </select>
        </label>

        <label>
          Notes

          <input
            type="text"
            placeholder="Enter report notes"
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
          <p className="error">
            {error}
          </p>
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
            {data.reports.map((report) => {
              const reportType =
                report.type ||
                report.project_name ||
                'Task'

              return (
                <tr key={report.id}>
                  <td>
                    {report.title ||
                      report.report_name}
                  </td>

                  <td>
                    {reportType}
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
                      {String(reportType)
                        .toLowerCase() ===
                        'task' && (
                        <button
                          type="button"
                          className="icon-btn"
                          title="Download Task Report PDF"
                          onClick={() =>
                            downloadTaskReport(
                              report
                            )
                          }
                        >
                          <Download
                            size={16}
                          />
                        </button>
                      )}

                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Delete Report"
                        onClick={() =>
                          remove(report.id)
                        }
                      >
                        <Trash2
                          size={16}
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}

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

