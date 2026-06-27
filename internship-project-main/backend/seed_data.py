import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "internship_tracker"),
    )

def conv_date(d_str):
    if not d_str:
        return None
    # Parse DD-MM-YYYY to YYYY-MM-DD
    parts = d_str.split("-")
    if len(parts) == 3:
        return f"{parts[2]}-{parts[1]}-{parts[0]}"
    return d_str

def seed():
    conn = get_connection()
    cur = conn.cursor(dictionary=True)

    # 1. Projects Data
    projects = [
        {
            "name": "Luxury Villa Interior",
            "description": "Complete interior design and furnishing for luxury villa",
            "start_date": conv_date("17-06-2026"),
            "end_date": conv_date("30-07-2026"),
            "status": "In Progress"
        },
        {
            "name": "Modern Office Setup",
            "description": "Interior setup for corporate office workspace",
            "start_date": conv_date("20-06-2026"),
            "end_date": conv_date("10-08-2026"),
            "status": "Not Started"  # mapped from Pending
        },
        {
            "name": "Restaurant Renovation",
            "description": "Renovation and redesign of restaurant interiors",
            "start_date": conv_date("25-06-2026"),
            "end_date": conv_date("20-08-2026"),
            "status": "In Progress"
        },
        {
            "name": "Apartment Makeover",
            "description": "Complete home interior renovation project",
            "start_date": conv_date("01-07-2026"),
            "end_date": conv_date("31-08-2026"),
            "status": "Not Started"  # mapped from Pending
        },
        {
            "name": "Boutique Design Project",
            "description": "Interior design for fashion boutique showroom",
            "start_date": conv_date("05-07-2026"),
            "end_date": conv_date("25-08-2026"),
            "status": "Completed"
        }
    ]

    project_ids = []
    print("Seeding projects...")
    for p in projects:
        cur.execute(
            "INSERT INTO projects (name, description, start_date, end_date, status) VALUES (%s, %s, %s, %s, %s)",
            (p["name"], p["description"], p["start_date"], p["end_date"], p["status"])
        )
        project_ids.append(cur.lastrowid)

    # 2. Employees Data
    employees = [
        {
            "name": "Anirudh",
            "email": "anirudh@glory.com",
            "phone": "9346628678",
            "role": "Project Manager",
            "department": "Management"
        },
        {
            "name": "Priya Sharma",
            "email": "priya@glory.com",
            "phone": "9876543210",
            "role": "Interior Designer",
            "department": "Design"
        },
        {
            "name": "Rahul Verma",
            "email": "rahul@glory.com",
            "phone": "9012345678",
            "role": "Site Engineer",
            "department": "Operations"
        },
        {
            "name": "Sneha Patel",
            "email": "sneha@glory.com",
            "phone": "9988776655",
            "role": "Quality Analyst",
            "department": "Quality Control"
        },
        {
            "name": "Kiran Reddy",
            "email": "kiran@glory.com",
            "phone": "9123456789",
            "role": "Procurement Executive",
            "department": "Procurement"
        }
    ]

    employee_ids = []
    print("Seeding employees...")
    for e in employees:
        cur.execute(
            "INSERT INTO employees (name, email, phone, role, department, status) VALUES (%s, %s, %s, %s, %s, 'Active')",
            (e["name"], e["email"], e["phone"], e["role"], e["department"])
        )
        employee_ids.append(cur.lastrowid)

    # 3. Tasks Data
    tasks = [
        {
            "project_id": project_ids[0],
            "employee_id": employee_ids[0],
            "title": "Site Measurement",
            "description": "Measure all rooms and prepare layout plan",
            "priority": "High",
            "status": "Pending",
            "due_date": conv_date("20-06-2026")
        },
        {
            "project_id": project_ids[1],
            "employee_id": employee_ids[1],
            "title": "Interior Design Draft",
            "description": "Prepare initial design concepts",
            "priority": "High",
            "status": "In Progress",
            "due_date": conv_date("25-06-2026")
        },
        {
            "project_id": project_ids[2],
            "employee_id": employee_ids[2],
            "title": "Material Inspection",
            "description": "Verify quality of ordered materials",
            "priority": "Medium",
            "status": "Pending",
            "due_date": conv_date("28-06-2026")
        },
        {
            "project_id": project_ids[3],
            "employee_id": employee_ids[3],
            "title": "Quality Review",
            "description": "Conduct quality assurance inspection",
            "priority": "Medium",
            "status": "Pending",
            "due_date": conv_date("05-07-2026")
        },
        {
            "project_id": project_ids[4],
            "employee_id": employee_ids[4],
            "title": "Final Handover",
            "description": "Complete project documentation and handover",
            "priority": "Low",
            "status": "Completed",
            "due_date": conv_date("10-07-2026")
        }
    ]

    task_ids = []
    print("Seeding tasks...")
    for t in tasks:
        cur.execute(
            """INSERT INTO tasks (project_id, employee_id, title, description, priority, status, due_date)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (t["project_id"], t["employee_id"], t["title"], t["description"], t["priority"], t["status"], t["due_date"])
        )
        task_ids.append(cur.lastrowid)

    # 4. Checklist Data
    checklist = [
        {
            "project_id": project_ids[0],
            "task_id": task_ids[0],
            "title": "Site measurements completed",
            "is_done": True
        },
        {
            "project_id": project_ids[1],
            "task_id": task_ids[1],
            "title": "Design approved by client",
            "is_done": True
        },
        {
            "project_id": project_ids[2],
            "task_id": task_ids[2],
            "title": "Materials received",
            "is_done": False
        },
        {
            "project_id": project_ids[3],
            "task_id": task_ids[3],
            "title": "Installation started",
            "is_done": False
        },
        {
            "project_id": project_ids[4],
            "task_id": task_ids[4],
            "title": "Project handover completed",
            "is_done": True
        }
    ]

    print("Seeding checklist items...")
    for c in checklist:
        cur.execute(
            "INSERT INTO checklist (project_id, task_id, title, is_done) VALUES (%s, %s, %s, %s)",
            (c["project_id"], c["task_id"], c["title"], c["is_done"])
        )

    # 5. Reports Data
    reports = [
        {
            "title": "Villa Project Progress",
            "type": "Project",
            "notes": "Luxury Villa Interior project is 60% completed."
        },
        {
            "title": "Design Team Status",
            "type": "Employee",
            "notes": "Design department completed initial drafts."
        },
        {
            "title": "Material Procurement Update",
            "type": "Project",
            "notes": "Required materials have been ordered."
        },
        {
            "title": "Quality Inspection Report",
            "type": "Checklist",
            "notes": "Quality inspection scheduled for next week."
        },
        {
            "title": "Final Handover Summary",
            "type": "Task",
            "notes": "Boutique project successfully completed and delivered."
        }
    ]

    print("Seeding reports...")
    for r in reports:
        cur.execute(
            "INSERT INTO reports (title, type, notes) VALUES (%s, %s, %s)",
            (r["title"], r["type"], r["notes"])
        )

    conn.commit()
    
    # 6. Recalculate progress for all projects
    print("Recalculating projects progress...")
    for p_id in project_ids:
        cur.execute("SELECT COUNT(*) AS total FROM tasks WHERE project_id=%s", (p_id,))
        total = cur.fetchone()["total"]
        cur.execute(
            "SELECT COUNT(*) AS completed FROM tasks WHERE project_id=%s AND status='Completed'",
            (p_id,),
        )
        completed = cur.fetchone()["completed"]
        progress = round((completed / total) * 100) if total else 0
        status = "Completed" if progress == 100 and total else "In Progress" if total else "Not Started"
        cur.execute(
            "UPDATE projects SET progress=%s, status=%s WHERE id=%s",
            (progress, status, p_id),
        )

    conn.commit()
    cur.close()
    conn.close()
    print("Seeding completed successfully!")

if __name__ == "__main__":
    seed()
