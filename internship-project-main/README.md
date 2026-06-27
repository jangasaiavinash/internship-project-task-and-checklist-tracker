# Project Task & Checklist Tracker

Full internship project with React + Vite frontend, Flask backend, and MySQL persistence.

## 1. Database

Open MySQL and run:

```sql
SOURCE database/schema.sql;
```

Default admin:

```text
Email: admin@gmail.com
Password: admin123
```

The first successful login upgrades the seeded plain password to a Werkzeug password hash.

## 2. Backend

```bash
cd backend
copy .env.example .env
```

Edit `.env` with your MySQL password and Gmail app password.

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Backend runs on `http://localhost:5000`.

For Gmail OTP, create a Gmail App Password and set:

```text
MAIL_USERNAME=your_gmail@gmail.com
MAIL_PASSWORD=your_gmail_app_password
MAIL_DEFAULT_SENDER=your_gmail@gmail.com
```

If mail settings are empty, the OTP is printed in the Flask terminal for development.

## 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on the Vite URL shown in the terminal, usually `http://localhost:5173`.

## Included Features

- Admin login
- Forgot password with Gmail OTP
- Dashboard stats from live database data
- Projects, tasks, employees, checklist, reports, settings pages
- React Router protected dashboard routes
- Axios API calls
- Sidebar and header on dashboard pages
- Dark mode persisted in local storage
- Add, edit, delete, and search for Projects, Tasks, Employees, Checklist
- Add, delete, and search for Reports
- Flask APIs for all requested modules
- MySQL schema with relationships
- Employee assignment to tasks
- Project progress auto-calculates from completed tasks
- Project status becomes `Completed` at 100 percent progress
- Reports include real project/task/employee/checklist data

