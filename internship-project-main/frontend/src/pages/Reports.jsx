
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
    type: 'Project',
    notes: '',
  })

  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  async function load(query = search) {
    try {
      const response = await api.get('/api/reports', {
        params: {
          search: query,
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
    load('')
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
      await load('')
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
      await load(search)
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
    return (title || 'project-report')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function normalizeType(report) {
    return String(
      report.type ||
        report.project_name ||
        'Project'
    )
      .trim()
      .toLowerCase()
  }

  function getProjectName(item) {
    if (item.project_name) {
      return item.project_name
    }

    const project = data.live.projects.find(
      (projectItem) =>
        String(projectItem.id) ===
        String(item.project_id)
    )

    return project?.name || '-'
  }

  function getEmployeeName(item) {
    if (item.employee_name) {
      return item.employee_name
    }

    const employee = data.live.employees.find(
      (employeeItem) =>
        String(employeeItem.id) ===
        String(item.employee_id)
    )

    return employee?.name || 'Not Assigned'
  }

  function getTaskTitle(item) {
    if (item.task_title) {
      return item.task_title
    }

    const task = data.live.tasks.find(
      (taskItem) =>
        String(taskItem.id) ===
        String(item.task_id)
    )

    return task?.title || '-'
  }

  function getReportTable(reportType) {
    if (reportType === 'project') {
      return {
        heading: 'PROJECT DETAILS',

        headers: [
          'Project Name',
          'Status',
          'Progress',
          'Start Date',
          'End Date',
        ],

        rows:
          data.live.projects.length > 0
            ? data.live.projects.map((project) => [
                project.name || '-',
                project.status || '-',
                `${project.progress ?? 0}%`,
                formatDate(project.start_date),
                formatDate(project.end_date),
              ])
            : [
                [
                  'No project data available',
                  '-',
                  '-',
                  '-',
                  '-',
                ],
              ],
      }
    }

    if (reportType === 'task') {
      return {
        heading: 'TASK DETAILS',

        headers: [
          'Task Title',
          'Project',
          'Employee',
          'Priority',
          'Status',
          'Due Date',
        ],

        rows:
          data.live.tasks.length > 0
            ? data.live.tasks.map((task) => [
                task.title ||
                  task.task_title ||
                  '-',

                getProjectName(task),

                getEmployeeName(task),

                task.priority || 'Medium',

                task.status || 'Pending',

                formatDate(task.due_date),
              ])
            : [
                [
                  'No task data available',
                  '-',
                  '-',
                  '-',
                  '-',
                  '-',
                ],
              ],
      }
    }

    if (reportType === 'employee') {
      return {
        heading: 'EMPLOYEE DETAILS',

        headers: [
          'Employee Name',
          'Email',
          'Phone',
          'Role',
          'Department',
          'Status',
        ],

        rows:
          data.live.employees.length > 0
            ? data.live.employees.map(
                (employee) => [
                  employee.name || '-',
                  employee.email || '-',
                  employee.phone || '-',
                  employee.role || '-',
                  employee.department || '-',
                  employee.status || '-',
                ]
              )
            : [
                [
                  'No employee data available',
                  '-',
                  '-',
                  '-',
                  '-',
                  '-',
                ],
              ],
      }
    }

    if (reportType === 'checklist') {
      return {
        heading: 'CHECKLIST DETAILS',

        headers: [
          'Checklist Item',
          'Project',
          'Task',
          'Completion Status',
        ],

        rows:
          data.live.checklist.length > 0
            ? data.live.checklist.map(
                (item) => [
                  item.title ||
                    item.checklist_item ||
                    '-',

                  getProjectName(item),

                  getTaskTitle(item),

                  item.is_done === true ||
                  item.is_done === 1 ||
                  item.is_done === '1'
                    ? 'Completed'
                    : 'Pending',
                ]
              )
            : [
                [
                  'No checklist data available',
                  '-',
                  '-',
                  '-',
                ],
              ],
      }
    }

    return {
      heading: 'REPORT DETAILS',
      headers: ['Information', 'Details'],
      rows: [['No data available', '-']],
    }
  }

  function downloadReport(report) {
    try {
      const reportType = normalizeType(report)

      const reportTitle =
        report.title ||
        report.report_name ||
        'Project Report'

      const reportNotes =
        report.notes ||
        report.generated_by ||
        'No additional notes were provided.'

      const tableData =
        getReportTable(reportType)

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth =
        doc.internal.pageSize.getWidth()

      const pageHeight =
        doc.internal.pageSize.getHeight()

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

      autoTable(doc, {
        startY: 32,

        body: [
          [
            'Report Type',
            reportType.charAt(0).toUpperCase() +
              reportType.slice(1),

            'Generated Date',
            formatDate(new Date()),
          ],

          [
            'Prepared For',
            'Glory Simon Interiors',

            'Created Date',
            formatDate(
              report.created_at ||
                report.report_date
            ),
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

      autoTable(doc, {
        startY:
          doc.lastAutoTable.finalY + 7,

        head: [
          [
            'Projects',
            'Tasks',
            'Employees',
            'Checklist',
          ],
        ],

        body: [
          [
            String(
              data.live.projects.length
            ),

            String(
              data.live.tasks.length
            ),

            String(
              data.live.employees.length
            ),

            String(
              data.live.checklist.length
            ),
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

      let detailsY =
        doc.lastAutoTable.finalY + 10

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(29, 78, 216)

      doc.text(
        tableData.heading,
        15,
        detailsY
      )

      autoTable(doc, {
        startY: detailsY + 4,

        head: [
          tableData.headers,
        ],

        body: tableData.rows,

        theme: 'grid',

        headStyles: {
          fillColor: [29, 78, 216],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },

        bodyStyles: {
          fillColor: [248, 250, 252],
          textColor: [31, 41, 55],
        },

        alternateRowStyles: {
          fillColor: [255, 255, 255],
        },

        styles: {
          fontSize: 8,
          cellPadding: 3,
          lineColor: [203, 213, 225],
          lineWidth: 0.3,
          overflow: 'linebreak',
          valign: 'middle',
        },

        margin: {
          left: 15,
          right: 15,
        },

        didDrawPage: () => {
          doc.setFont(
            'helvetica',
            'normal'
          )

          doc.setFontSize(8)
          doc.setTextColor(
            100,
            116,
            139
          )

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

      if (
        notesStartY >
        pageHeight - 60
      ) {
        doc.addPage()
        notesStartY = 20
      }

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

      doc.setFont(
        'helvetica',
        'normal'
      )

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

      if (footerY < pageHeight - 15) {
        doc.setDrawColor(
          203,
          213,
          225
        )

        doc.line(
          15,
          footerY,
          pageWidth - 15,
          footerY
        )

        doc.setFont(
          'helvetica',
          'normal'
        )

        doc.setFontSize(8.5)
        doc.setTextColor(
          71,
          85,
          105
        )

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
      }

      const fileName =
        createFileName(reportTitle)

      doc.save(`${fileName}.pdf`)
      setError('')
    } catch (err) {
      console.error(err)

      setError(
        'Unable to download the PDF report'
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
            placeholder="Enter report title"
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
            <option value="Project">
              Project
            </option>

            <option value="Task">
              Task
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
            {data.reports.map(
              (report) => (
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
                        title="Download Report PDF"
                        onClick={() =>
                          downloadReport(
                            report
                          )
                        }
                      >
                        <Download
                          size={16}
                        />
                      </button>

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
            )}

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
