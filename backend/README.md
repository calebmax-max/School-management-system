# Python Backend for School Management System

This backend is built with FastAPI and SQLite and now powers the React website directly.

## Install

1. Create a virtual environment:

```bash
python -m venv .venv
```

2. Activate it:

- Windows:
  ```powershell
  .venv\Scripts\Activate.ps1
  ```
- macOS / Linux:
  ```bash
  source .venv/bin/activate
  ```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

## Run the backend

From the project root:

```bash
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Or from inside the `backend` folder:

```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## API endpoints

- `GET /api/dashboard`
- `GET /api/students`
- `GET /api/students/{student_id}`
- `POST /api/students`
- `PUT /api/students/{student_id}`
- `DELETE /api/students/{student_id}`
- `GET /api/teachers`
- `GET /api/teachers/{teacher_id}`
- `POST /api/teachers`
- `PUT /api/teachers/{teacher_id}`
- `DELETE /api/teachers/{teacher_id}`
- `GET /api/teachers/{teacher_id}/students`
- `PUT /api/teachers/{teacher_id}/students/{student_id}`
- `GET /api/health`

## Notes

- The backend creates `data.db` automatically in the `backend` folder.
- Sample students and teachers are seeded automatically on first run.
- The Vite frontend proxies `/api/*` requests to `http://127.0.0.1:8000`.
