import email
import os
import random
from datetime import datetime, timedelta, date

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS
from flask_mail import Mail, Message
from werkzeug.security import check_password_hash, generate_password_hash

from db import db_cursor

load_dotenv()

app = Flask(__name__)

class CustomJSONProvider(DefaultJSONProvider):
    def default(self, o):
        if isinstance(o, (date, datetime)):
            return o.strftime("%Y-%m-%d")
        return super().default(o)

app.json = CustomJSONProvider(app)

app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
app.config["MAIL_SERVER"] = os.getenv("MAIL_SERVER", "smtp.gmail.com")
app.config["MAIL_PORT"] = int(os.getenv("MAIL_PORT", "587"))
app.config["MAIL_USE_TLS"] = os.getenv("MAIL_USE_TLS", "true").lower() == "true"
app.config["MAIL_USERNAME"] = os.getenv("MAIL_USERNAME")
app.config["MAIL_PASSWORD"] = os.getenv("MAIL_PASSWORD")
app.config["MAIL_DEFAULT_SENDER"] = os.getenv("MAIL_DEFAULT_SENDER")

CORS(app)
mail = Mail(app)


def ok(data=None, status=200):
    if data is None:
        data = {}
    return jsonify(data), status


def error(message, status=400):
    return jsonify({"error": message}), status


def body():
    return request.get_json(silent=True) or {}


def recalculate_project(project_id, status_override=None):
    with db_cursor() as cur:
        cur.execute("SELECT COUNT(*) AS total FROM tasks WHERE project_id=%s", (project_id,))
        total = cur.fetchone()["total"]
        cur.execute(
            "SELECT COUNT(*) AS completed FROM tasks WHERE project_id=%s AND status='Completed'",
            (project_id,),
        )
        completed = cur.fetchone()["completed"]
        
        cur.execute("SELECT status FROM projects WHERE id=%s", (project_id,))
        row = cur.fetchone()
        current_status = row["status"] if row else "Not Started"
        
        if status_override is not None:
            status = status_override
        elif current_status == "On Hold":
            status = "On Hold"
        elif total and completed == total:
            status = "Completed"
        else:
            if current_status == "Completed":
                status = "In Progress" if total else "Not Started"
            elif current_status == "Not Started" and total > 0:
                status = "In Progress"
            elif current_status == "In Progress" and total == 0:
                status = "Not Started"
            else:
                status = current_status
                
        if status == "Completed":
            progress = 100
        elif status == "Not Started":
            progress = 0
        else:
            progress = round((completed / total) * 100) if total else 0
            
        cur.execute(
            "UPDATE projects SET progress=%s, status=%s WHERE id=%s",
            (progress, status, project_id),
        )


def fetch_all(sql, params=()):
    with db_cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def fetch_one(sql, params=()):
    with db_cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone()


def safe_fetch_all(sql, params=()):
    try:
        return fetch_all(sql, params)
    except Exception as exc:
        app.logger.warning("Optional query failed: %s", exc)
        return []


def table_columns(table):
    with db_cursor() as cur:
        cur.execute(f"SHOW COLUMNS FROM {table}")
        return [row["Field"] for row in cur.fetchall()]


@app.post("/admin/login")
def admin_login():
    data = body()
    email = data.get("email")
    password = data.get("password")
    admin = fetch_one("SELECT * FROM admins WHERE email=%s", (email,))
    if not admin:
        return error("Invalid email or password", 401)
    stored_password = admin["password_hash"]
    password_matches = stored_password == password
    if not password_matches:
        try:
            password_matches = check_password_hash(stored_password, password or "")
        except ValueError:
            password_matches = False
    if not password_matches:
        return error("Invalid email or password", 401)
    if stored_password == password:
        with db_cursor() as cur:
            cur.execute("UPDATE admins SET password_hash=%s WHERE id=%s", (generate_password_hash(password), admin["id"]))
    return ok({"admin": {"id": admin["id"], "name": admin["name"], "email": admin["email"]}})


@app.post("/employee/login")
def employee_login():
    data = body()
    email = data.get("email")
    password = data.get("password")
    employee = fetch_one("SELECT * FROM employees WHERE email=%s", (email,))
    if not employee:
        return error("Invalid email or password", 401)
    if employee["status"] != "Active":
        return error("Employee account is inactive", 403)
    stored_password = employee.get("password_hash") or "employee123"
    password_matches = stored_password == password
    if not password_matches:
        try:
            password_matches = check_password_hash(stored_password, password or "")
        except ValueError:
            password_matches = False
    if not password_matches:
        return error("Invalid email or password", 401)
    if stored_password == password:
        with db_cursor() as cur:
            cur.execute("UPDATE employees SET password_hash=%s WHERE id=%s", (generate_password_hash(password), employee["id"]))
    return ok({"employee": {"id": employee["id"], "name": employee["name"], "email": employee["email"], "role": employee["role"], "department": employee["department"]}})



@app.post("/send-otp")
def send_otp():
    data = body()
    email = data.get("email")
    admin = fetch_one("SELECT id FROM admins WHERE email=%s", (email,))
    if not admin:
        return error("Admin email not found", 404)
    otp = str(random.randint(100000, 999999))
    expires_at = datetime.now() + timedelta(minutes=10)
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO password_otps (email, otp, expires_at) VALUES (%s, %s, %s)",
            (email, otp, expires_at)
        )
    mail.send(
        Message(
            "Internship Tracker OTP",
            recipients=[email],
            body=f"Your OTP is {otp}. It expires in 10 minutes."
        )
    )

    return ok({"message": "OTP sent successfully"})

@app.post("/verify-otp")
def verify_otp():
    data = body()
    email = data.get("email")
    otp = data.get("otp")
    record = fetch_one(
        "SELECT id FROM password_otps WHERE email=%s AND otp=%s AND expires_at > NOW() ORDER BY id DESC LIMIT 1",
        (email, otp),
    )
    if not record:
        return error("Invalid or expired OTP", 400)
    with db_cursor() as cur:
        cur.execute("UPDATE password_otps SET verified=TRUE WHERE id=%s", (record["id"],))
    return ok({"message": "OTP verified"})


@app.post("/reset-password")
def reset_password():
    data = body()
    email = data.get("email")
    password = data.get("password")
    verified = fetch_one(
        "SELECT id FROM password_otps WHERE email=%s AND verified=TRUE AND expires_at > NOW() ORDER BY id DESC LIMIT 1",
        (email,),
    )
    if not verified:
        return error("Please verify OTP first", 400)
    with db_cursor() as cur:
        cur.execute("UPDATE admins SET password_hash=%s WHERE email=%s", (generate_password_hash(password), email))
        cur.execute("DELETE FROM password_otps WHERE email=%s", (email,))
    return ok({"message": "Password reset successfully"})


@app.get("/api/dashboard-stats")
def dashboard_stats():
    employee_id = request.args.get("employee_id")
    stats = {}
    if employee_id:
        stats["projects"] = fetch_one(
            "SELECT COUNT(DISTINCT project_id) AS count FROM tasks WHERE employee_id=%s",
            (employee_id,)
        )["count"]
        stats["tasks"] = fetch_one(
            "SELECT COUNT(*) AS count FROM tasks WHERE employee_id=%s",
            (employee_id,)
        )["count"]
        stats["employees"] = 1
        stats["checklist"] = fetch_one(
            """SELECT COUNT(*) AS count FROM checklist c
               JOIN tasks t ON t.id = c.task_id
               WHERE t.employee_id=%s""",
            (employee_id,)
        )["count"]
        stats["reports"] = 0
        stats["completed_tasks"] = fetch_one(
            "SELECT COUNT(*) AS count FROM tasks WHERE employee_id=%s AND status='Completed'",
            (employee_id,)
        )["count"]
        stats["avg_progress"] = fetch_one(
            """SELECT COALESCE(ROUND(AVG(p.progress)), 0) AS value FROM projects p
               WHERE p.id IN (SELECT DISTINCT project_id FROM tasks WHERE employee_id=%s)""",
            (employee_id,)
        )["value"]
        recent_projects = fetch_all(
            """SELECT DISTINCT p.* FROM projects p
               JOIN tasks t ON t.project_id = p.id
               WHERE t.employee_id=%s
               ORDER BY p.id DESC LIMIT 5""",
            (employee_id,)
        )
    else:
        for table in ["projects", "tasks", "employees", "checklist", "reports"]:
            stats[table] = fetch_one(f"SELECT COUNT(*) AS count FROM {table}")["count"]
        stats["completed_tasks"] = fetch_one("SELECT COUNT(*) AS count FROM tasks WHERE status='Completed'")["count"]
        stats["avg_progress"] = fetch_one("SELECT COALESCE(ROUND(AVG(progress)), 0) AS value FROM projects")["value"]
        recent_projects = fetch_all("SELECT * FROM projects ORDER BY id DESC LIMIT 5")
    return ok({"stats": stats, "recent_projects": recent_projects})


@app.route("/api/projects", methods=["GET", "POST"])
def projects():
    if request.method == "GET":
        q = f"%{request.args.get('search', '')}%"
        return ok(fetch_all("SELECT * FROM projects WHERE name LIKE %s OR status LIKE %s ORDER BY id DESC", (q, q)))
    data = body()
    status = data.get("status") or "Not Started"
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO projects (name, description, start_date, end_date, status) VALUES (%s, %s, %s, %s, %s)",
            (data.get("name"), data.get("description"), data.get("start_date") or None, data.get("end_date") or None, status),
        )
        new_id = cur.lastrowid
    return ok(fetch_one("SELECT * FROM projects WHERE id=%s", (new_id,)), 201)


@app.route("/api/projects/<int:item_id>", methods=["PUT", "DELETE"])
def project_detail(item_id):
    if request.method == "DELETE":
        with db_cursor() as cur:
            cur.execute("DELETE FROM projects WHERE id=%s", (item_id,))
        return ok({"message": "Project deleted"})
    data = body()
    status = data.get("status") or "Not Started"
    with db_cursor() as cur:
        cur.execute(
            "UPDATE projects SET name=%s, description=%s, start_date=%s, end_date=%s, status=%s WHERE id=%s",
            (data.get("name"), data.get("description"), data.get("start_date") or None, data.get("end_date") or None, status, item_id),
        )
    recalculate_project(item_id, status_override=status)
    return ok(fetch_one("SELECT * FROM projects WHERE id=%s", (item_id,)))


@app.route("/api/tasks", methods=["GET", "POST"])
def tasks():
    if request.method == "GET":
        q = f"%{request.args.get('search', '')}%"
        employee_id = request.args.get("employee_id")
        if employee_id:
            return ok(fetch_all(
                """SELECT t.*, p.name AS project_name, e.name AS employee_name
                   FROM tasks t
                   LEFT JOIN projects p ON p.id=t.project_id
                   LEFT JOIN employees e ON e.id=t.employee_id
                   WHERE t.employee_id = %s AND (t.title LIKE %s OR t.status LIKE %s OR p.name LIKE %s OR e.name LIKE %s)
                   ORDER BY t.id DESC""",
                (employee_id, q, q, q, q),
            ))
        return ok(fetch_all(
            """SELECT t.*, p.name AS project_name, e.name AS employee_name
               FROM tasks t
               LEFT JOIN projects p ON p.id=t.project_id
               LEFT JOIN employees e ON e.id=t.employee_id
               WHERE t.title LIKE %s OR t.status LIKE %s OR p.name LIKE %s OR e.name LIKE %s
               ORDER BY t.id DESC""",
            (q, q, q, q),
        ))
    data = body()
    priority = data.get("priority") or "Medium"
    status = data.get("status") or "Pending"
    with db_cursor() as cur:
        cur.execute(
            """INSERT INTO tasks (project_id, employee_id, title, description, priority, status, due_date)
               VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (data.get("project_id"), data.get("employee_id") or None, data.get("title"), data.get("description"), priority, status, data.get("due_date") or None),
        )
        new_id = cur.lastrowid
    recalculate_project(data.get("project_id"))
    return ok(fetch_one("SELECT * FROM tasks WHERE id=%s", (new_id,)), 201)


@app.route("/api/tasks/<int:item_id>", methods=["PUT", "DELETE"])
def task_detail(item_id):
    existing = fetch_one("SELECT project_id FROM tasks WHERE id=%s", (item_id,))
    if not existing:
        return error("Task not found", 404)
    if request.method == "DELETE":
        with db_cursor() as cur:
            cur.execute("DELETE FROM tasks WHERE id=%s", (item_id,))
        recalculate_project(existing["project_id"])
        return ok({"message": "Task deleted"})
    data = body()
    project_id = data.get("project_id") or existing["project_id"]
    priority = data.get("priority") or "Medium"
    status = data.get("status") or "Pending"
    with db_cursor() as cur:
        cur.execute(
            """UPDATE tasks SET project_id=%s, employee_id=%s, title=%s, description=%s, priority=%s, status=%s, due_date=%s WHERE id=%s""",
            (project_id, data.get("employee_id") or None, data.get("title"), data.get("description"), priority, status, data.get("due_date") or None, item_id),
        )
    recalculate_project(existing["project_id"])
    recalculate_project(project_id)
    return ok(fetch_one("SELECT * FROM tasks WHERE id=%s", (item_id,)))


@app.route("/api/employees", methods=["GET", "POST"])
def employees():
    if request.method == "GET":
        q = f"%{request.args.get('search', '')}%"
        return ok(fetch_all("SELECT * FROM employees WHERE name LIKE %s OR email LIKE %s OR role LIKE %s ORDER BY id DESC", (q, q, q)))
    data = body()
    status = data.get("status") or "Active"
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO employees (name, email, phone, role, department, status) VALUES (%s, %s, %s, %s, %s, %s)",
            (data.get("name"), data.get("email"), data.get("phone"), data.get("role", "Intern"), data.get("department"), status),
        )
        new_id = cur.lastrowid
    return ok(fetch_one("SELECT * FROM employees WHERE id=%s", (new_id,)), 201)


@app.route("/api/employees/<int:item_id>", methods=["PUT", "DELETE"])
def employee_detail(item_id):
    if request.method == "DELETE":
        with db_cursor() as cur:
            cur.execute("DELETE FROM employees WHERE id=%s", (item_id,))
        return ok({"message": "Employee deleted"})
    data = body()
    status = data.get("status") or "Active"
    with db_cursor() as cur:
        cur.execute(
            "UPDATE employees SET name=%s, email=%s, phone=%s, role=%s, department=%s, status=%s WHERE id=%s",
            (data.get("name"), data.get("email"), data.get("phone"), data.get("role"), data.get("department"), status, item_id),
        )
    return ok(fetch_one("SELECT * FROM employees WHERE id=%s", (item_id,)))


@app.route("/api/checklist", methods=["GET", "POST"])
def checklist():
    if request.method == "GET":
        q = f"%{request.args.get('search', '')}%"
        employee_id = request.args.get("employee_id")
        if employee_id:
            return ok(fetch_all(
                """SELECT c.*, p.name AS project_name, t.title AS task_title
                   FROM checklist c
                   LEFT JOIN projects p ON p.id=c.project_id
                   LEFT JOIN tasks t ON t.id=c.task_id
                   WHERE t.employee_id = %s AND (c.title LIKE %s OR p.name LIKE %s OR t.title LIKE %s)
                   ORDER BY c.id DESC""",
                (employee_id, q, q, q),
            ))
        return ok(fetch_all(
            """SELECT c.*, p.name AS project_name, t.title AS task_title
               FROM checklist c
               LEFT JOIN projects p ON p.id=c.project_id
               LEFT JOIN tasks t ON t.id=c.task_id
               WHERE c.title LIKE %s OR p.name LIKE %s OR t.title LIKE %s
               ORDER BY c.id DESC""",
            (q, q, q),
        ))
    data = body()
    with db_cursor() as cur:
        cur.execute(
            "INSERT INTO checklist (project_id, task_id, title, is_done) VALUES (%s, %s, %s, %s)",
            (data.get("project_id"), data.get("task_id") or None, data.get("title"), bool(data.get("is_done"))),
        )
        new_id = cur.lastrowid
    return ok(fetch_one("SELECT * FROM checklist WHERE id=%s", (new_id,)), 201)


@app.route("/api/checklist/<int:item_id>", methods=["PUT", "DELETE"])
def checklist_detail(item_id):
    if request.method == "DELETE":
        with db_cursor() as cur:
            cur.execute("DELETE FROM checklist WHERE id=%s", (item_id,))
        return ok({"message": "Checklist item deleted"})
    data = body()
    with db_cursor() as cur:
        cur.execute(
            "UPDATE checklist SET project_id=%s, task_id=%s, title=%s, is_done=%s WHERE id=%s",
            (data.get("project_id"), data.get("task_id") or None, data.get("title"), bool(data.get("is_done")), item_id),
        )
    return ok(fetch_one("SELECT * FROM checklist WHERE id=%s", (item_id,)))


@app.route("/api/reports", methods=["GET", "POST"])
def reports():
    columns = table_columns("reports")
    if request.method == "GET":
        q = f"%{request.args.get('search', '')}%"
        if "title" in columns:
            reports_data = fetch_all("SELECT * FROM reports WHERE title LIKE %s OR type LIKE %s ORDER BY id DESC", (q, q))
        elif "report_name" in columns:
            searchable = ["report_name"]
            if "project_name" in columns:
                searchable.append("project_name")
            if "status" in columns:
                searchable.append("status")
            where = " OR ".join([f"{col} LIKE %s" for col in searchable])
            reports_data = fetch_all(f"SELECT * FROM reports WHERE {where} ORDER BY id DESC", tuple([q] * len(searchable)))
        else:
            reports_data = fetch_all("SELECT * FROM reports ORDER BY id DESC")
        live = {
            "projects": safe_fetch_all("SELECT id, name, status, progress FROM projects ORDER BY id DESC"),
            "tasks": safe_fetch_all("SELECT id, title, status, priority, project_id, employee_id FROM tasks ORDER BY id DESC"),
            "employees": safe_fetch_all("SELECT id, name, role, status FROM employees ORDER BY id DESC"),
            "checklist": safe_fetch_all("SELECT id, title, is_done, project_id, task_id FROM checklist ORDER BY id DESC"),
        }
        return ok({"reports": reports_data, "live": live})
    data = body()
    if "title" in columns:
        rep_type = data.get("type") or "Project"
        with db_cursor() as cur:
            cur.execute("INSERT INTO reports (title, type, notes) VALUES (%s, %s, %s)", (data.get("title"), rep_type, data.get("notes")))
            new_id = cur.lastrowid
    else:
        insert_columns = []
        values = []
        mapping = {
            "report_name": data.get("title") or data.get("report_name"),
            "project_name": data.get("project_name") or data.get("type", "Project"),
            "generated_by": data.get("generated_by", "admin"),
            "report_date": data.get("report_date") or datetime.now().date(),
            "status": data.get("status", "Pending"),
        }
        for col, value in mapping.items():
            if col in columns:
                insert_columns.append(col)
                values.append(value)
        placeholders = ", ".join(["%s"] * len(insert_columns))
        with db_cursor() as cur:
            cur.execute(f"INSERT INTO reports ({', '.join(insert_columns)}) VALUES ({placeholders})", tuple(values))
            new_id = cur.lastrowid
    return ok(fetch_one("SELECT * FROM reports WHERE id=%s", (new_id,)), 201)


@app.route("/api/reports/<int:item_id>", methods=["PUT", "DELETE"])
def report_detail(item_id):
    if request.method == "DELETE":
        with db_cursor() as cur:
            cur.execute("DELETE FROM reports WHERE id=%s", (item_id,))
        return ok({"message": "Report deleted"})

    data = body()
    columns = table_columns("reports")

    if "title" in columns:
        with db_cursor() as cur:
            cur.execute(
                "UPDATE reports SET title=%s, type=%s, notes=%s WHERE id=%s",
                (
                    data.get("title") or data.get("report_name"),
                    data.get("type") or data.get("project_name") or "Project",
                    data.get("notes") or data.get("generated_by"),
                    item_id,
                ),
            )
    else:
        allowed_values = {
            "report_name": data.get("report_name") or data.get("title"),
            "project_name": data.get("project_name") or data.get("project_scope") or data.get("type"),
            "generated_by": data.get("generated_by"),
            "report_date": data.get("report_date"),
            "status": data.get("status"),
        }
        updates = []
        values = []
        for col, value in allowed_values.items():
            if col in columns and value not in (None, ""):
                updates.append(f"{col}=%s")
                values.append(value)
        if not updates:
            return error("No valid report fields provided", 400)
        values.append(item_id)
        with db_cursor() as cur:
            cur.execute(f"UPDATE reports SET {', '.join(updates)} WHERE id=%s", tuple(values))

    return ok(fetch_one("SELECT * FROM reports WHERE id=%s", (item_id,)))


@app.errorhandler(Exception)
def handle_exception(exc):
    app.logger.exception(exc)
    return error(str(exc), 500)


@app.get("/health")
def health():
    try:
        with db_cursor() as cur:
            cur.execute("SELECT 1")
            cur.fetchone()
        return {"status": "Database Connected"}
    except Exception as e:
        return {"error": str(e)}, 500


if __name__ == "__main__":
    app.run(debug=True)
