import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
from datetime import date
from pathlib import Path
from typing import Any, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "data.db"
FRONTEND_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

DEFAULT_STUDENT_RESULTS = {
    "termOne": {
        "opener": {"Mathematics": "B", "English": "A", "Science": "B", "History": "A"},
        "mid": {"Mathematics": "A", "English": "A", "Science": "B", "History": "A"},
        "endterm": {"Mathematics": "A", "English": "A", "Science": "B", "History": "A"},
    },
    "termTwo": {
        "opener": {"Mathematics": "A", "English": "B", "Science": "A", "History": "A"},
        "mid": {"Mathematics": "A", "English": "A", "Science": "A", "History": "A"},
        "endterm": {"Mathematics": "A", "English": "A", "Science": "A", "History": "A"},
    },
    "termThree": {
        "opener": {"Mathematics": "A", "English": "A", "Science": "B", "History": "A"},
        "mid": {"Mathematics": "A", "English": "A", "Science": "A", "History": "A"},
        "endterm": {"Mathematics": "A", "English": "A", "Science": "A", "History": "A"},
    },
}
DEFAULT_STUDENT_HISTORY = [
    {"month": "Jan", "score": 85},
    {"month": "Feb", "score": 88},
    {"month": "Mar", "score": 92},
    {"month": "Apr", "score": 90},
    {"month": "May", "score": 94},
    {"month": "Jun", "score": 96},
]
DEFAULT_TEACHER_HISTORY = [
    {"month": "Jan", "score": 92},
    {"month": "Feb", "score": 94},
    {"month": "Mar", "score": 96},
    {"month": "Apr", "score": 93},
    {"month": "May", "score": 98},
    {"month": "Jun", "score": 97},
]
ADMIN_SEED_PASSWORD = os.getenv("SMS_ADMIN_PASSWORD", "AdminChangeMe!2026")
ACCOUNTANT_SEED_PASSWORD = os.getenv("SMS_ACCOUNTANT_PASSWORD", "AccountantChangeMe!2026")
MEMBER_SEED_PASSWORD = os.getenv("SMS_MEMBER_PASSWORD", "SchoolUser123!")
AUTH_TOKEN_TTL_SECONDS = int(os.getenv("SMS_AUTH_TOKEN_TTL_SECONDS", str(60 * 60 * 12)))
AUTH_SECRET = os.getenv("SMS_AUTH_SECRET", f"school-management-{DATABASE_PATH}")
LEGACY_SHARED_PASSWORD = "school123"
ADMIN_SEED_ACCOUNT = {
    "name": "School Admin",
    "email": "admin@school.edu",
    "role": "admin",
}
ACCOUNTANT_SEED_ACCOUNT = {
    "name": "School Accountant",
    "email": "accountant@gmail.com",
    "role": "accountant",
}
SIGN_IN_EMAIL_ALIASES = {
    "accountant@school.edu": ACCOUNTANT_SEED_ACCOUNT["email"],
}

SEED_STUDENTS = [
    {
        "name": "Amelia Johnson",
        "email": "amelia.johnson@school.edu",
        "class_name": "Grade 10 - A",
        "position": "3rd of 40",
        "total_grade": "A",
        "admission_number": "ADM-2025-104",
        "results_json": DEFAULT_STUDENT_RESULTS,
        "fees_total": 3500,
        "fees_paid": 2800,
        "fees_status": "Partial",
        "payments_json": [
            {"receiptNumber": "RCP-1001", "amount": 1500, "method": "Bank", "date": "2026-01-15", "reference": "BNK-1001"},
            {"receiptNumber": "RCP-1098", "amount": 1300, "method": "Cash", "date": "2026-02-20", "reference": "CSH-2241"},
        ],
        "guardian_name": "Mr. and Mrs. Johnson",
        "transport": "Route 3 school bus",
        "attendance": "95%",
        "attendance_by_term_json": {
            "termOne": {"present": 38, "total": 40},
            "termTwo": {"present": 37, "total": 40},
            "termThree": {"present": 39, "total": 40},
        },
        "behavior": "Excellent",
        "performance_history_json": DEFAULT_STUDENT_HISTORY,
        "status": "Active",
        "current_score": 92,
    },
    {
        "name": "James Wilson",
        "email": "james.wilson@school.edu",
        "class_name": "Grade 10 - A",
        "position": "11th of 40",
        "total_grade": "B",
        "admission_number": "ADM-2025-105",
        "results_json": {
            "termOne": {
                "opener": {"Mathematics": "C", "English": "B", "Science": "C", "History": "B"},
                "mid": {"Mathematics": "B", "English": "B", "Science": "C", "History": "B"},
                "endterm": {"Mathematics": "B", "English": "B", "Science": "C", "History": "B"},
            },
            "termTwo": {
                "opener": {"Mathematics": "B", "English": "B", "Science": "B", "History": "B"},
                "mid": {"Mathematics": "B", "English": "A", "Science": "B", "History": "B"},
                "endterm": {"Mathematics": "B", "English": "B", "Science": "B", "History": "B"},
            },
            "termThree": {
                "opener": {"Mathematics": "B", "English": "B", "Science": "C", "History": "B"},
                "mid": {"Mathematics": "B", "English": "B", "Science": "B", "History": "B"},
                "endterm": {"Mathematics": "B", "English": "B", "Science": "B", "History": "B"},
            },
        },
        "fees_total": 3500,
        "fees_paid": 3500,
        "fees_status": "Paid",
        "payments_json": [
            {"receiptNumber": "RCP-1102", "amount": 2000, "method": "Bank", "date": "2026-01-18", "reference": "BNK-3021"},
            {"receiptNumber": "RCP-1164", "amount": 1500, "method": "Cash", "date": "2026-03-04", "reference": "CSH-1458"},
        ],
        "guardian_name": "Grace Wilson",
        "transport": "Parent pickup",
        "attendance": "88%",
        "attendance_by_term_json": {
            "termOne": {"present": 34, "total": 40},
            "termTwo": {"present": 35, "total": 40},
            "termThree": {"present": 36, "total": 40},
        },
        "behavior": "Very Good",
        "performance_history_json": [
            {"month": "Jan", "score": 74},
            {"month": "Feb", "score": 76},
            {"month": "Mar", "score": 77},
            {"month": "Apr", "score": 79},
            {"month": "May", "score": 80},
            {"month": "Jun", "score": 78},
        ],
        "status": "Active",
        "current_score": 78,
    },
    {
        "name": "Emma Davis",
        "email": "emma.davis@school.edu",
        "class_name": "Grade 10 - A",
        "position": "7th of 40",
        "total_grade": "A",
        "admission_number": "ADM-2025-106",
        "results_json": {
            "termOne": {
                "opener": {"Mathematics": "A", "English": "B", "Science": "A", "History": "A"},
                "mid": {"Mathematics": "A", "English": "B", "Science": "A", "History": "A"},
                "endterm": {"Mathematics": "A", "English": "B", "Science": "A", "History": "A"},
            },
            "termTwo": {
                "opener": {"Mathematics": "A", "English": "B", "Science": "A", "History": "A"},
                "mid": {"Mathematics": "A", "English": "A", "Science": "A", "History": "A"},
                "endterm": {"Mathematics": "A", "English": "B", "Science": "A", "History": "A"},
            },
            "termThree": {
                "opener": {"Mathematics": "A", "English": "B", "Science": "A", "History": "A"},
                "mid": {"Mathematics": "A", "English": "A", "Science": "A", "History": "A"},
                "endterm": {"Mathematics": "A", "English": "A", "Science": "A", "History": "A"},
            },
        },
        "fees_total": 3500,
        "fees_paid": 3000,
        "fees_status": "Partial",
        "payments_json": [
            {"receiptNumber": "RCP-1231", "amount": 1000, "method": "Cash", "date": "2026-01-22", "reference": "CSH-7841"},
            {"receiptNumber": "RCP-1280", "amount": 2000, "method": "Bank", "date": "2026-03-11", "reference": "BNK-4122"},
        ],
        "guardian_name": "David Davis",
        "transport": "Route 1 school bus",
        "attendance": "92%",
        "attendance_by_term_json": {
            "termOne": {"present": 36, "total": 40},
            "termTwo": {"present": 37, "total": 40},
            "termThree": {"present": 38, "total": 40},
        },
        "behavior": "Excellent",
        "performance_history_json": [
            {"month": "Jan", "score": 82},
            {"month": "Feb", "score": 83},
            {"month": "Mar", "score": 85},
            {"month": "Apr", "score": 84},
            {"month": "May", "score": 86},
            {"month": "Jun", "score": 85},
        ],
        "status": "Active",
        "current_score": 85,
    },
    {
        "name": "Michael Brown",
        "email": "michael.brown@school.edu",
        "class_name": "Grade 9 - A",
        "position": "18th of 36",
        "total_grade": "C",
        "admission_number": "ADM-2025-107",
        "results_json": {
            "termOne": {
                "opener": {"Mathematics": "D", "English": "C", "Science": "D", "History": "C"},
                "mid": {"Mathematics": "C", "English": "C", "Science": "D", "History": "C"},
                "endterm": {"Mathematics": "C", "English": "C", "Science": "D", "History": "C"},
            },
            "termTwo": {
                "opener": {"Mathematics": "C", "English": "C", "Science": "D", "History": "C"},
                "mid": {"Mathematics": "C", "English": "C", "Science": "C", "History": "C"},
                "endterm": {"Mathematics": "C", "English": "C", "Science": "D", "History": "C"},
            },
            "termThree": {
                "opener": {"Mathematics": "C", "English": "C", "Science": "D", "History": "C"},
                "mid": {"Mathematics": "C", "English": "C", "Science": "D", "History": "C"},
                "endterm": {"Mathematics": "C", "English": "C", "Science": "D", "History": "C"},
            },
        },
        "fees_total": 3200,
        "fees_paid": 2100,
        "fees_status": "Partial",
        "payments_json": [
            {"receiptNumber": "RCP-1320", "amount": 900, "method": "Cash", "date": "2026-01-25", "reference": "CSH-3321"},
            {"receiptNumber": "RCP-1389", "amount": 1200, "method": "Mobile Money", "date": "2026-03-16", "reference": "MMP-2210"},
        ],
        "guardian_name": "Martha Brown",
        "transport": "Route 2 school bus",
        "attendance": "90%",
        "attendance_by_term_json": {
            "termOne": {"present": 35, "total": 40},
            "termTwo": {"present": 36, "total": 40},
            "termThree": {"present": 35, "total": 40},
        },
        "behavior": "Good",
        "performance_history_json": [
            {"month": "Jan", "score": 61},
            {"month": "Feb", "score": 63},
            {"month": "Mar", "score": 64},
            {"month": "Apr", "score": 66},
            {"month": "May", "score": 67},
            {"month": "Jun", "score": 65},
        ],
        "status": "Active",
        "current_score": 65,
    },
]

SEED_TEACHERS = [
    {
        "name": "Dr. Sarah Mitchell",
        "subject": "Mathematics",
        "email": "sarah.mitchell@school.edu",
        "class_assigned": "Grade 10 - A",
        "experience": "12 years",
        "performance_rating": 4.8,
        "performance_feedback": "Excellent",
        "department": "Mathematics Department",
        "publications": "5 research papers",
        "awards": "Teacher of the Year 2023",
        "performance_history_json": DEFAULT_TEACHER_HISTORY,
        "status": "Active",
    },
    {
        "name": "Mr. John Smith",
        "subject": "English",
        "email": "john.smith@school.edu",
        "class_assigned": "Grade 10 - B",
        "experience": "9 years",
        "performance_rating": 4.5,
        "performance_feedback": "Excellent",
        "department": "Languages Department",
        "publications": "2 curriculum guides",
        "awards": "Best Mentor 2024",
        "performance_history_json": [
            {"month": "Jan", "score": 88},
            {"month": "Feb", "score": 89},
            {"month": "Mar", "score": 90},
            {"month": "Apr", "score": 91},
            {"month": "May", "score": 92},
            {"month": "Jun", "score": 91},
        ],
        "status": "Active",
    },
    {
        "name": "Ms. Lisa Chen",
        "subject": "Science",
        "email": "lisa.chen@school.edu",
        "class_assigned": "Grade 9 - A",
        "experience": "7 years",
        "performance_rating": 4.7,
        "performance_feedback": "Outstanding",
        "department": "Science Department",
        "publications": "3 science fair manuals",
        "awards": "Innovation in Teaching 2022",
        "performance_history_json": [
            {"month": "Jan", "score": 90},
            {"month": "Feb", "score": 91},
            {"month": "Mar", "score": 92},
            {"month": "Apr", "score": 93},
            {"month": "May", "score": 94},
            {"month": "Jun", "score": 95},
        ],
        "status": "Active",
    },
]

STUDENT_COLUMNS = {
    "email": "TEXT DEFAULT ''",
    "position": "TEXT DEFAULT 'Unranked'",
    "total_grade": "TEXT DEFAULT 'N/A'",
    "results_json": "TEXT DEFAULT '{}'",
    "fees_total": "REAL DEFAULT 0",
    "fees_paid": "REAL DEFAULT 0",
    "fees_status": "TEXT DEFAULT 'Pending'",
    "fees_by_term_json": "TEXT DEFAULT '{}'",
    "payments_json": "TEXT DEFAULT '[]'",
    "guardian_name": "TEXT DEFAULT ''",
    "transport": "TEXT DEFAULT ''",
    "attendance": "TEXT DEFAULT 'N/A'",
    "attendance_by_term_json": "TEXT DEFAULT '{}'",
    "behavior": "TEXT DEFAULT 'N/A'",
    "performance_history_json": "TEXT DEFAULT '[]'",
    "current_score": "INTEGER DEFAULT 0",
}

TEACHER_COLUMNS = {
    "class_assigned": "TEXT DEFAULT 'N/A'",
    "experience": "TEXT DEFAULT 'N/A'",
    "performance_rating": "REAL DEFAULT 0",
    "performance_feedback": "TEXT DEFAULT 'N/A'",
    "department": "TEXT DEFAULT ''",
    "publications": "TEXT DEFAULT ''",
    "awards": "TEXT DEFAULT ''",
    "performance_history_json": "TEXT DEFAULT '[]'",
}
USER_COLUMNS = {
    "full_name": "TEXT DEFAULT ''",
    "email": "TEXT DEFAULT ''",
    "role": "TEXT DEFAULT 'student'",
    "password_hash": "TEXT DEFAULT ''",
    "linked_student_id": "INTEGER",
    "linked_teacher_id": "INTEGER",
}

app = FastAPI(
    title="School Management API",
    description="Python backend API for the School Management System.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class APIModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class FeeSummary(APIModel):
    total: float = 0
    paid: float = 0
    due: float = 0
    status: str = "Pending"


class TermFeeSummary(FeeSummary):
    pass


class PaymentRecord(APIModel):
    receipt_number: str = Field(alias="receiptNumber")
    amount: float
    method: str
    date: str
    reference: str = ""
    term: str = "termOne"


class AttendanceTermSummary(APIModel):
    present: int = 0
    total: int = 0


class StudentExtraRecords(APIModel):
    guardian_name: str = Field(default="", alias="guardianName")
    transport: str = ""
    attendance: str = ""
    behavior: str = ""


class PerformancePoint(APIModel):
    month: str
    score: int


class StudentBase(APIModel):
    name: str = Field(..., min_length=1)
    email: str = Field(..., pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    class_name: str = Field(..., alias="className", min_length=1)
    position: str = "Unranked"
    total_grade: str = Field(default="N/A", alias="totalGrade")
    admission_number: str = Field(default="", alias="admissionNumber")
    results: dict[str, Any] = Field(default_factory=dict)
    fees: FeeSummary = Field(default_factory=FeeSummary)
    fees_by_term: dict[str, TermFeeSummary] = Field(default_factory=dict, alias="feesByTerm")
    payments: list[PaymentRecord] = Field(default_factory=list)
    extra_records: StudentExtraRecords = Field(default_factory=StudentExtraRecords, alias="extraRecords")
    attendance_by_term: dict[str, AttendanceTermSummary] = Field(default_factory=dict, alias="attendanceByTerm")
    performance_history: list[PerformancePoint] = Field(default_factory=list, alias="performanceHistory")
    status: str = "Active"
    current_score: int = Field(default=0, alias="currentScore", ge=0, le=100)


class StudentCreate(StudentBase):
    pass


class Student(StudentBase):
    id: int


class TeacherQualifications(APIModel):
    degree: str = Field(default="", alias="Degree")
    certification: str = Field(default="", alias="Certification")
    specialization: str = Field(default="", alias="Specialization")


class TeacherPerformance(APIModel):
    rating: float = 0
    feedback: str = "N/A"


class TeacherExtraRecords(APIModel):
    department: str = ""
    publications: str = ""
    awards: str = ""


class ManagedStudent(APIModel):
    id: int
    name: str
    admission_number: str = Field(alias="admissionNumber")
    current_grade: str = Field(alias="currentGrade")
    current_score: int = Field(alias="currentScore")
    attendance: str


class TeacherBase(APIModel):
    name: str = Field(..., min_length=1)
    subject: str = Field(..., min_length=1)
    email: str = Field(..., pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    class_assigned: str = Field(default="N/A", alias="classAssigned")
    experience: str = "N/A"
    qualifications: TeacherQualifications = Field(default_factory=TeacherQualifications)
    performance: TeacherPerformance = Field(default_factory=TeacherPerformance)
    extra_records: TeacherExtraRecords = Field(default_factory=TeacherExtraRecords, alias="extraRecords")
    performance_history: list[PerformancePoint] = Field(default_factory=list, alias="performanceHistory")
    status: str = "Active"


class TeacherCreate(TeacherBase):
    pass


class Teacher(TeacherBase):
    id: int
    students: list[ManagedStudent] = Field(default_factory=list)


class TeacherStudentUpdate(APIModel):
    current_score: int = Field(alias="currentScore", ge=0, le=100)
    current_grade: str = Field(alias="currentGrade", min_length=1, max_length=2)
    term: str = Field(default="termOne", min_length=1)
    exam_type: str = Field(default="endterm", alias="examType", min_length=1)
    subject: str = Field(default="General", min_length=1)


class StudentPaymentCreate(APIModel):
    amount: float = Field(gt=0)
    method: str = Field(default="Cash", min_length=1)
    reference: str = ""
    term: str = Field(default="termOne", min_length=1)


class DashboardStats(APIModel):
    total_students: int = Field(alias="totalStudents")
    total_teachers: int = Field(alias="totalTeachers")
    active_students: int = Field(alias="activeStudents")
    active_teachers: int = Field(alias="activeTeachers")


class DashboardSummary(APIModel):
    featured_student: Student = Field(alias="featuredStudent")
    featured_teacher: Teacher = Field(alias="featuredTeacher")
    students: list[Student]
    teachers: list[Teacher]
    stats: DashboardStats
    growth_trends: list[dict[str, int | str]] = Field(alias="growthTrends")


class AuthSignInRequest(APIModel):
    email: str = Field(..., pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str = Field(..., min_length=6)


class AuthSignUpRequest(AuthSignInRequest):
    full_name: str = Field(alias="fullName", min_length=1)
    role: str = Field(pattern=r"^(student|teacher)$")


class AuthResponse(APIModel):
    name: str
    email: str
    role: str
    token: str


class CurrentUser(APIModel):
    id: int
    name: str
    email: str
    role: str
    linked_student_id: Optional[int] = Field(default=None, alias="linkedStudentId")
    linked_teacher_id: Optional[int] = Field(default=None, alias="linkedTeacherId")


class ChangePasswordRequest(APIModel):
    current_password: str = Field(alias="currentPassword", min_length=6)
    new_password: str = Field(alias="newPassword", min_length=8)


class AuditLogEntry(APIModel):
    id: int
    actor_email: str = Field(alias="actorEmail")
    actor_role: str = Field(alias="actorRole")
    action_type: str = Field(alias="actionType")
    target_type: str = Field(alias="targetType")
    target_id: str = Field(alias="targetId")
    message: str
    created_at: str = Field(alias="createdAt")


def get_db() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def parse_json(raw_value: Optional[str], fallback: Any) -> Any:
    if not raw_value:
        return fallback
    try:
        return json.loads(raw_value)
    except json.JSONDecodeError:
        return fallback


def normalize_email(value: str) -> str:
    return value.strip().lower()


def resolve_sign_in_email(value: str) -> str:
    normalized_email = normalize_email(value)
    return SIGN_IN_EMAIL_ALIASES.get(normalized_email, normalized_email)


def hash_password(password: str, salt: Optional[str] = None) -> str:
    salt_value = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_value.encode("utf-8"),
        100000,
    ).hex()
    return f"{salt_value}${digest}"


def verify_password(password: str, stored_hash: str) -> bool:
    if not stored_hash or not isinstance(stored_hash, str):
        return False
    if "$" not in stored_hash:
        return False
    salt, expected_hash = stored_hash.split("$", 1)
    computed_hash = hash_password(password, salt).split("$", 1)[1]
    return hmac.compare_digest(computed_hash, expected_hash)


def encode_token_segment(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("utf-8").rstrip("=")


def decode_token_segment(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}")


def create_access_token(user: sqlite3.Row) -> str:
    payload = {
        "sub": int(user["id"]),
        "email": user["email"],
        "role": user["role"],
        "exp": int(time.time()) + AUTH_TOKEN_TTL_SECONDS,
    }
    encoded_payload = encode_token_segment(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    signature = hmac.new(
        AUTH_SECRET.encode("utf-8"),
        encoded_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"{encoded_payload}.{signature}"


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        payload_segment, signature = token.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid authentication token") from exc

    expected_signature = hmac.new(
        AUTH_SECRET.encode("utf-8"),
        payload_segment.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(status_code=401, detail="Invalid authentication token")

    try:
        payload = json.loads(decode_token_segment(payload_segment).decode("utf-8"))
    except (ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=401, detail="Invalid authentication token") from exc

    if int(payload.get("exp", 0)) < int(time.time()):
        raise HTTPException(status_code=401, detail="Authentication token expired")
    return payload


def ensure_columns(conn: sqlite3.Connection, table_name: str, columns: dict[str, str]) -> None:
    existing_columns = {
        row["name"] for row in conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    }
    for column_name, column_sql in columns.items():
        if column_name not in existing_columns:
            conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_sql}")


def init_db() -> None:
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                class_name TEXT NOT NULL,
                admission_number TEXT DEFAULT '',
                results TEXT DEFAULT '',
                fees TEXT DEFAULT '',
                status TEXT DEFAULT 'Active'
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS teachers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                subject TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                status TEXT DEFAULT 'Active'
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                role TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                linked_student_id INTEGER,
                linked_teacher_id INTEGER
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                actor_email TEXT NOT NULL,
                actor_role TEXT NOT NULL,
                action_type TEXT NOT NULL,
                target_type TEXT NOT NULL,
                target_id TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        ensure_columns(conn, "students", STUDENT_COLUMNS)
        ensure_columns(conn, "teachers", TEACHER_COLUMNS)
        ensure_columns(conn, "users", USER_COLUMNS)
        conn.commit()
        seed_data(conn)


def seed_data(conn: sqlite3.Connection) -> None:
    student_count = conn.execute("SELECT COUNT(*) FROM students").fetchone()[0]
    if student_count == 0:
        for student in SEED_STUDENTS:
            seeded_fee_terms = empty_fee_term_breakdown()
            seeded_fee_terms["termOne"] = {
                "total": float(student["fees_total"]),
                "paid": float(student["fees_paid"]),
                "due": calculate_due(float(student["fees_total"]), float(student["fees_paid"])),
                "status": derive_fee_status(float(student["fees_total"]), float(student["fees_paid"])),
            }
            conn.execute(
                """
                INSERT INTO students (
                    name, email, class_name, position, total_grade, admission_number, results_json,
                    fees_total, fees_paid, fees_status, fees_by_term_json, payments_json, guardian_name, transport, attendance,
                    attendance_by_term_json, behavior, performance_history_json, status, current_score
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    student["name"],
                    student["email"],
                    student["class_name"],
                    student["position"],
                    student["total_grade"],
                    student["admission_number"],
                    json.dumps(student["results_json"]),
                    student["fees_total"],
                    student["fees_paid"],
                    student["fees_status"],
                    json.dumps(seeded_fee_terms),
                    json.dumps(student.get("payments_json", [])),
                    student["guardian_name"],
                    student["transport"],
                    student["attendance"],
                    json.dumps(student.get("attendance_by_term_json", {})),
                    student["behavior"],
                    json.dumps(student["performance_history_json"]),
                    student["status"],
                    student["current_score"],
                ),
            )

    teacher_count = conn.execute("SELECT COUNT(*) FROM teachers").fetchone()[0]
    if teacher_count == 0:
        for teacher in SEED_TEACHERS:
            conn.execute(
                """
                INSERT INTO teachers (
                    name, subject, email, class_assigned, experience, performance_rating,
                    performance_feedback, department, publications, awards,
                    performance_history_json, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    teacher["name"],
                    teacher["subject"],
                    teacher["email"],
                    teacher["class_assigned"],
                    teacher["experience"],
                    teacher["performance_rating"],
                    teacher["performance_feedback"],
                    teacher["department"],
                    teacher["publications"],
                    teacher["awards"],
                    json.dumps(teacher["performance_history_json"]),
                    teacher["status"],
                ),
            )

    for student in SEED_STUDENTS:
        conn.execute(
            """
            UPDATE students
            SET email = COALESCE(NULLIF(email, ''), ?)
            WHERE admission_number = ?
            """,
            (student["email"], student["admission_number"]),
        )
    seed_auth_accounts(conn)
    conn.commit()


def calculate_due(total: float, paid: float) -> float:
    return max(total - paid, 0)


def score_to_grade(score: int) -> str:
    if score >= 80:
        return "A"
    if score >= 70:
        return "B"
    if score >= 60:
        return "C"
    if score >= 50:
        return "D"
    return "E"


def derive_fee_status(total: float, paid: float) -> str:
    if paid >= total and total > 0:
        return "Paid"
    if paid > 0:
        return "Partial"
    return "Pending"


def empty_fee_term_breakdown() -> dict[str, dict[str, float | str]]:
    return {
        "termOne": {"total": 0.0, "paid": 0.0, "due": 0.0, "status": "Pending"},
        "termTwo": {"total": 0.0, "paid": 0.0, "due": 0.0, "status": "Pending"},
        "termThree": {"total": 0.0, "paid": 0.0, "due": 0.0, "status": "Pending"},
    }


def normalize_fee_term_breakdown(
    raw_value: Any,
    total: float,
    paid: float,
    payments: list[dict[str, Any]],
) -> dict[str, dict[str, float | str]]:
    normalized = empty_fee_term_breakdown()

    if isinstance(raw_value, dict):
        for term in normalized:
            current = raw_value.get(term, {})
            if not isinstance(current, dict):
                current = {}
            term_total = float(current.get("total", 0) or 0)
            term_paid = float(current.get("paid", 0) or 0)
            normalized[term] = {
                "total": term_total,
                "paid": term_paid,
                "due": calculate_due(term_total, term_paid),
                "status": derive_fee_status(term_total, term_paid),
            }
    else:
        normalized["termOne"] = {
            "total": total,
            "paid": 0.0,
            "due": total,
            "status": derive_fee_status(total, 0),
        }

    if all(float(term_data["paid"]) == 0 for term_data in normalized.values()):
        for payment in payments:
            if not isinstance(payment, dict):
                continue
            term = str(payment.get("term", "termOne")).strip()
            if term not in normalized:
                term = "termOne"
            normalized[term]["paid"] = float(normalized[term]["paid"]) + float(payment.get("amount", 0) or 0)

    total_paid_from_terms = sum(float(term_data["paid"]) for term_data in normalized.values())
    if total_paid_from_terms == 0 and paid > 0:
        normalized["termOne"]["paid"] = paid

    total_total_from_terms = sum(float(term_data["total"]) for term_data in normalized.values())
    if total_total_from_terms == 0 and total > 0:
        normalized["termOne"]["total"] = total

    for term, term_data in normalized.items():
        term_total = float(term_data["total"] or 0)
        term_paid = float(term_data["paid"] or 0)
        normalized[term] = {
            "total": term_total,
            "paid": term_paid,
            "due": calculate_due(term_total, term_paid),
            "status": derive_fee_status(term_total, term_paid),
        }

    return normalized


def summarize_fee_terms(fees_by_term: dict[str, dict[str, float | str]]) -> FeeSummary:
    total = sum(float(term_data["total"]) for term_data in fees_by_term.values())
    paid = sum(float(term_data["paid"]) for term_data in fees_by_term.values())
    return FeeSummary(
        total=total,
        paid=paid,
        due=calculate_due(total, paid),
        status=derive_fee_status(total, paid),
    )


def generate_receipt_number() -> str:
    return f"RCP-{secrets.randbelow(9000) + 1000}"


def normalize_results_structure(results: Any) -> dict[str, dict[str, dict[str, str]]]:
    default_structure = {
        "termOne": {"opener": {}, "mid": {}, "endterm": {}},
        "termTwo": {"opener": {}, "mid": {}, "endterm": {}},
        "termThree": {"opener": {}, "mid": {}, "endterm": {}},
    }
    if not isinstance(results, dict):
        return default_structure

    has_terms = any(isinstance(results.get(term), dict) for term in default_structure)
    if has_terms:
        normalized: dict[str, dict[str, dict[str, str]]] = {}
        for term in default_structure:
            term_value = results.get(term, {})
            if isinstance(term_value, dict) and any(isinstance(term_value.get(exam), dict) for exam in default_structure[term]):
                normalized[term] = {
                    exam: {
                        str(subject): str(grade)
                        for subject, grade in (term_value.get(exam, {}) or {}).items()
                        if isinstance(subject, str)
                    }
                    for exam in default_structure[term]
                }
            else:
                normalized[term] = {
                    "opener": {},
                    "mid": {},
                    "endterm": {
                        str(subject): str(grade)
                        for subject, grade in (term_value or {}).items()
                        if isinstance(subject, str)
                    },
                }
        return normalized

    return {
        "termOne": {
            "opener": {},
            "mid": {},
            "endterm": {
                str(subject): str(grade)
                for subject, grade in results.items()
                if isinstance(subject, str)
            },
        },
        "termTwo": {"opener": {}, "mid": {}, "endterm": {}},
        "termThree": {"opener": {}, "mid": {}, "endterm": {}},
    }


def upsert_user(
    conn: sqlite3.Connection,
    *,
    full_name: str,
    email: str,
    role: str,
    password: Optional[str] = None,
    force_reset_password: bool = False,
    linked_student_id: Optional[int] = None,
    linked_teacher_id: Optional[int] = None,
) -> None:
    normalized_email = normalize_email(email)
    existing = conn.execute(
        "SELECT id, password_hash FROM users WHERE email = ?",
        (normalized_email,),
    ).fetchone()
    password_hash = hash_password(password) if password else ""
    if existing is not None:
        existing_password_hash = existing["password_hash"] or ""
        should_replace_existing = bool(
            password and (
                force_reset_password
                or not existing_password_hash
                or verify_password(LEGACY_SHARED_PASSWORD, existing_password_hash)
            )
        )
        password_hash = password_hash if should_replace_existing else existing_password_hash

    if existing is None:
        conn.execute(
            """
            INSERT INTO users (full_name, email, role, password_hash, linked_student_id, linked_teacher_id)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (full_name, normalized_email, role, password_hash, linked_student_id, linked_teacher_id),
        )
        return

    conn.execute(
        """
        UPDATE users
        SET full_name = ?, role = ?, password_hash = ?, linked_student_id = ?, linked_teacher_id = ?
        WHERE email = ?
        """,
        (full_name, role, password_hash, linked_student_id, linked_teacher_id, normalized_email),
    )


def delete_user_by_email(conn: sqlite3.Connection, email: str) -> None:
    conn.execute("DELETE FROM users WHERE email = ?", (normalize_email(email),))


def log_audit_event(
    conn: sqlite3.Connection,
    *,
    actor_email: str,
    actor_role: str,
    action_type: str,
    target_type: str,
    target_id: str,
    message: str,
) -> None:
    conn.execute(
        """
        INSERT INTO audit_logs (
            actor_email, actor_role, action_type, target_type, target_id, message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            normalize_email(actor_email),
            actor_role,
            action_type,
            target_type,
            target_id,
            message,
            date.today().isoformat(),
        ),
    )


def seed_auth_accounts(conn: sqlite3.Connection) -> None:
    upsert_user(
        conn,
        full_name=ADMIN_SEED_ACCOUNT["name"],
        email=ADMIN_SEED_ACCOUNT["email"],
        role=ADMIN_SEED_ACCOUNT["role"],
        password=ADMIN_SEED_PASSWORD,
        force_reset_password=True,
    )
    upsert_user(
        conn,
        full_name=ACCOUNTANT_SEED_ACCOUNT["name"],
        email=ACCOUNTANT_SEED_ACCOUNT["email"],
        role=ACCOUNTANT_SEED_ACCOUNT["role"],
        password=ACCOUNTANT_SEED_PASSWORD,
        force_reset_password=True,
    )
    for student in SEED_STUDENTS:
        student_record = conn.execute(
            "SELECT id FROM students WHERE admission_number = ?",
            (student["admission_number"],),
        ).fetchone()
        if student_record is None:
            continue
        upsert_user(
            conn,
            full_name=student["name"],
            email=student["email"],
            role="student",
            password=MEMBER_SEED_PASSWORD,
            linked_student_id=int(student_record["id"]),
        )
    for teacher in SEED_TEACHERS:
        teacher_record = conn.execute(
            "SELECT id FROM teachers WHERE email = ?",
            (normalize_email(teacher["email"]),),
        ).fetchone()
        if teacher_record is None:
            continue
        upsert_user(
            conn,
            full_name=teacher["name"],
            email=teacher["email"],
            role="teacher",
            password=MEMBER_SEED_PASSWORD,
            linked_teacher_id=int(teacher_record["id"]),
        )
    student_teacher_users = conn.execute(
        """
        SELECT id, password_hash
        FROM users
        WHERE role IN ('student', 'teacher')
        """
    ).fetchall()
    for user in student_teacher_users:
        if user["password_hash"] and verify_password(LEGACY_SHARED_PASSWORD, user["password_hash"]):
            conn.execute("UPDATE users SET password_hash = '' WHERE id = ?", (user["id"],))


def create_minimal_student_record(conn: sqlite3.Connection, full_name: str, email: str) -> int:
    empty_term_fees = empty_fee_term_breakdown()
    cursor = conn.execute(
        """
        INSERT INTO students (
            name, email, class_name, position, total_grade, admission_number, results_json,
            fees_total, fees_paid, fees_status, fees_by_term_json, payments_json, guardian_name, transport, attendance,
            attendance_by_term_json, behavior, performance_history_json, status, current_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            full_name,
            normalize_email(email),
            "Unassigned",
            "New student",
            "N/A",
            f"ADM-{secrets.randbelow(900000) + 100000}",
            json.dumps({}),
            0,
            0,
            "Pending",
            json.dumps(empty_term_fees),
            json.dumps([]),
            "Not set",
            "Not assigned",
            "N/A",
            json.dumps({}),
            "N/A",
            json.dumps([]),
            "Active",
            0,
        ),
    )
    return int(cursor.lastrowid)


def create_minimal_teacher_record(conn: sqlite3.Connection, full_name: str, email: str) -> int:
    cursor = conn.execute(
        """
        INSERT INTO teachers (
            name, subject, email, class_assigned, experience, performance_rating,
            performance_feedback, department, publications, awards,
            performance_history_json, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            full_name,
            "General Studies",
            normalize_email(email),
            "Unassigned",
            "New teacher",
            0,
            "Pending review",
            "General Department",
            "None yet",
            "None yet",
            json.dumps([]),
            "Active",
        ),
    )
    return int(cursor.lastrowid)


def row_to_student(row: sqlite3.Row) -> Student:
    results = parse_json(row["results_json"], parse_json(row["results"], {}))
    performance_history = parse_json(row["performance_history_json"], [])
    payments = parse_json(row["payments_json"], [])
    attendance_by_term = parse_json(row["attendance_by_term_json"], {})
    fees_total = float(row["fees_total"] or 0)
    fees_paid = float(row["fees_paid"] or 0)
    fees_by_term = normalize_fee_term_breakdown(parse_json(row["fees_by_term_json"], {}), fees_total, fees_paid, payments)
    fee_summary = summarize_fee_terms(fees_by_term)
    return Student(
        id=row["id"],
        name=row["name"],
        email=row["email"] or "",
        className=row["class_name"],
        position=row["position"] or "Unranked",
        totalGrade=row["total_grade"] or "N/A",
        admissionNumber=row["admission_number"] or "",
        results=results,
        fees=FeeSummary(
            total=fee_summary.total,
            paid=fee_summary.paid,
            due=fee_summary.due,
            status=fee_summary.status,
        ),
        feesByTerm={key: TermFeeSummary(**value) for key, value in fees_by_term.items()},
        payments=[PaymentRecord(**entry) for entry in payments],
        extraRecords=StudentExtraRecords(
            guardianName=row["guardian_name"] or "",
            transport=row["transport"] or "",
            attendance=row["attendance"] or "",
            behavior=row["behavior"] or "",
        ),
        attendanceByTerm={
            key: AttendanceTermSummary(**value) for key, value in attendance_by_term.items() if isinstance(value, dict)
        },
        performanceHistory=[PerformancePoint(**entry) for entry in performance_history],
        status=row["status"] or "Active",
        currentScore=int(row["current_score"] or 0),
    )


def row_to_managed_student(row: sqlite3.Row) -> ManagedStudent:
    return ManagedStudent(
        id=row["id"],
        name=row["name"],
        admissionNumber=row["admission_number"] or "",
        currentGrade=row["total_grade"] or "N/A",
        currentScore=int(row["current_score"] or 0),
        attendance=row["attendance"] or "",
    )


def get_teacher_students(conn: sqlite3.Connection, class_assigned: str) -> list[ManagedStudent]:
    rows = conn.execute(
        """
        SELECT id, name, admission_number, total_grade, current_score, attendance
        FROM students
        WHERE class_name = ?
        ORDER BY name
        """,
        (class_assigned,),
    ).fetchall()
    return [row_to_managed_student(row) for row in rows]


def row_to_teacher(row: sqlite3.Row, conn: sqlite3.Connection) -> Teacher:
    performance_history = parse_json(row["performance_history_json"], [])
    return Teacher(
        id=row["id"],
        name=row["name"],
        subject=row["subject"],
        email=row["email"],
        classAssigned=row["class_assigned"] or "N/A",
        experience=row["experience"] or "N/A",
        qualifications=TeacherQualifications(
            Degree=f"{row['subject']} Degree",
            Certification="Teaching License",
            Specialization=row["subject"],
        ),
        performance=TeacherPerformance(
            rating=float(row["performance_rating"] or 0),
            feedback=row["performance_feedback"] or "N/A",
        ),
        extraRecords=TeacherExtraRecords(
            department=row["department"] or "",
            publications=row["publications"] or "",
            awards=row["awards"] or "",
        ),
        performanceHistory=[PerformancePoint(**entry) for entry in performance_history],
        status=row["status"] or "Active",
        students=get_teacher_students(conn, row["class_assigned"] or ""),
    )


def row_to_current_user(row: sqlite3.Row) -> CurrentUser:
    return CurrentUser(
        id=row["id"],
        name=row["full_name"],
        email=row["email"],
        role=row["role"],
        linkedStudentId=row["linked_student_id"],
        linkedTeacherId=row["linked_teacher_id"],
    )


def row_to_auth_response(row: sqlite3.Row) -> AuthResponse:
    return AuthResponse(
        name=row["full_name"],
        email=row["email"],
        role=row["role"],
        token=create_access_token(row),
    )


def get_current_user(authorization: Optional[str] = Header(default=None)) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")

    payload = decode_access_token(authorization.split(" ", 1)[1].strip())
    user_id = int(payload.get("sub", 0))
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if user is None:
            raise HTTPException(status_code=401, detail="Authentication required")
        if normalize_email(user["email"]) != normalize_email(str(payload.get("email", ""))):
            raise HTTPException(status_code=401, detail="Authentication required")
        return row_to_current_user(user)


def require_roles(*allowed_roles: str):
    def dependency(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="You do not have permission to perform this action")
        return current_user

    return dependency


def get_dashboard_payload(conn: sqlite3.Connection, current_user: CurrentUser) -> DashboardSummary:
    student_rows = conn.execute("SELECT * FROM students ORDER BY id ASC").fetchall()
    teacher_rows = conn.execute("SELECT * FROM teachers ORDER BY id ASC").fetchall()
    all_students = [row_to_student(row) for row in student_rows]
    all_teachers = [row_to_teacher(row, conn) for row in teacher_rows]
    if not all_students or not all_teachers:
        raise HTTPException(status_code=404, detail="Dashboard data is not available")

    visible_students = all_students
    visible_teachers = all_teachers
    featured_student = all_students[0]
    featured_teacher = all_teachers[0]

    if current_user.role == "student":
        if current_user.linked_student_id is None:
            raise HTTPException(status_code=403, detail="Student account is not linked to a record")
        visible_students = [student for student in all_students if student.id == current_user.linked_student_id]
        if not visible_students:
            raise HTTPException(status_code=404, detail="Student record not found")
        featured_student = visible_students[0]
        visible_teachers = []
    elif current_user.role == "teacher":
        if current_user.linked_teacher_id is None:
            raise HTTPException(status_code=403, detail="Teacher account is not linked to a record")
        visible_teachers = [teacher for teacher in all_teachers if teacher.id == current_user.linked_teacher_id]
        if not visible_teachers:
            raise HTTPException(status_code=404, detail="Teacher record not found")
        featured_teacher = visible_teachers[0]
        visible_students = [
            student for student in all_students if student.class_name == featured_teacher.class_assigned
        ]

    active_students = sum(1 for student in visible_students if student.status == "Active")
    active_teachers = sum(1 for teacher in visible_teachers if teacher.status == "Active")
    return DashboardSummary(
        featuredStudent=featured_student,
        featuredTeacher=featured_teacher,
        students=visible_students,
        teachers=visible_teachers,
        stats=DashboardStats(
            totalStudents=len(visible_students),
            totalTeachers=len(visible_teachers),
            activeStudents=active_students,
            activeTeachers=active_teachers,
        ),
        growthTrends=get_growth_trends(conn),
    )


def row_to_audit_log(row: sqlite3.Row) -> AuditLogEntry:
    return AuditLogEntry(
        id=row["id"],
        actorEmail=row["actor_email"],
        actorRole=row["actor_role"],
        actionType=row["action_type"],
        targetType=row["target_type"],
        targetId=row["target_id"],
        message=row["message"],
        createdAt=row["created_at"],
    )


def get_student_or_404(conn: sqlite3.Connection, student_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return row


def get_teacher_or_404(conn: sqlite3.Connection, teacher_id: int) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM teachers WHERE id = ?", (teacher_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return row


def get_growth_trends(conn: sqlite3.Connection) -> list[dict[str, int | str]]:
    total_students = conn.execute("SELECT COUNT(*) FROM students").fetchone()[0]
    total_teachers = conn.execute("SELECT COUNT(*) FROM teachers").fetchone()[0]
    return [
        {"month": "Jan", "students": max(total_students - 15, 0), "teachers": max(total_teachers - 1, 0)},
        {"month": "Feb", "students": max(total_students - 12, 0), "teachers": max(total_teachers - 1, 0)},
        {"month": "Mar", "students": max(total_students - 9, 0), "teachers": total_teachers},
        {"month": "Apr", "students": max(total_students - 6, 0), "teachers": total_teachers},
        {"month": "May", "students": max(total_students - 3, 0), "teachers": total_teachers},
        {"month": "Jun", "students": total_students, "teachers": total_teachers},
    ]


@app.on_event("startup")
def startup_event() -> None:
    init_db()


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "message": "Python backend is running"}


@app.post("/api/auth/signin", response_model=AuthResponse)
def sign_in(payload: AuthSignInRequest) -> AuthResponse:
    with get_db() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (resolve_sign_in_email(payload.email),),
        ).fetchone()
        if user is None or not user["password_hash"] or not verify_password(payload.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        return row_to_auth_response(user)


@app.post("/api/auth/signup", response_model=AuthResponse, status_code=201)
def sign_up(payload: AuthSignUpRequest) -> AuthResponse:
    with get_db() as conn:
        normalized_email = normalize_email(payload.email)
        existing_user = conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (normalized_email,),
        ).fetchone()

        linked_student_id = None
        linked_teacher_id = None

        if payload.role == "student":
            student = conn.execute("SELECT id FROM students WHERE email = ?", (normalized_email,)).fetchone()
            linked_student_id = int(student["id"]) if student else create_minimal_student_record(conn, payload.full_name, normalized_email)
        elif payload.role == "teacher":
            teacher = conn.execute("SELECT id FROM teachers WHERE email = ?", (normalized_email,)).fetchone()
            linked_teacher_id = int(teacher["id"]) if teacher else create_minimal_teacher_record(conn, payload.full_name, normalized_email)

        if existing_user is not None:
            if existing_user["role"] != payload.role:
                raise HTTPException(status_code=400, detail="This email is already assigned to a different role")
            if existing_user["password_hash"]:
                raise HTTPException(status_code=400, detail="An account with this email already exists")

        upsert_user(
            conn,
            full_name=payload.full_name,
            email=normalized_email,
            role=payload.role,
            password=payload.password,
            linked_student_id=linked_student_id,
            linked_teacher_id=linked_teacher_id,
        )
        conn.commit()
        created_user = conn.execute("SELECT * FROM users WHERE email = ?", (normalized_email,)).fetchone()
        return row_to_auth_response(created_user)


@app.post("/api/auth/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: CurrentUser = Depends(get_current_user),
) -> dict[str, str]:
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from the current password")

    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id = ?", (current_user.id,)).fetchone()
        if user is None or not user["password_hash"] or not verify_password(payload.current_password, user["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

        conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (hash_password(payload.new_password), current_user.id),
        )
        log_audit_event(
            conn,
            actor_email=current_user.email,
            actor_role=current_user.role,
            action_type="password_change",
            target_type="user",
            target_id=str(current_user.id),
            message=f"{current_user.role.title()} account updated its password",
        )
        conn.commit()
    return {"message": "Password updated successfully"}


@app.get("/api/dashboard", response_model=DashboardSummary)
def get_dashboard(current_user: CurrentUser = Depends(get_current_user)) -> DashboardSummary:
    with get_db() as conn:
        return get_dashboard_payload(conn, current_user)


@app.get("/api/audit-logs", response_model=list[AuditLogEntry])
def list_audit_logs(
    category: Optional[str] = Query(default=None),
    current_user: CurrentUser = Depends(require_roles("admin", "accountant")),
) -> list[AuditLogEntry]:
    with get_db() as conn:
        clauses = []
        params: list[Any] = []
        if current_user.role == "accountant":
            clauses.append("action_type IN ('finance_update', 'payment_recorded')")
        if category:
            clauses.append("action_type = ?")
            params.append(category)

        where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        rows = conn.execute(
            f"""
            SELECT *
            FROM audit_logs
            {where_sql}
            ORDER BY id DESC
            LIMIT 30
            """,
            params,
        ).fetchall()
        return [row_to_audit_log(row) for row in rows]


@app.get("/api/students", response_model=list[Student])
def list_students(current_user: CurrentUser = Depends(require_roles("admin", "accountant"))) -> list[Student]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM students ORDER BY id DESC").fetchall()
        return [row_to_student(row) for row in rows]


@app.get("/api/students/{student_id}", response_model=Student)
def get_student(student_id: int, current_user: CurrentUser = Depends(get_current_user)) -> Student:
    with get_db() as conn:
        row = get_student_or_404(conn, student_id)
        if current_user.role == "student" and current_user.linked_student_id != student_id:
            raise HTTPException(status_code=403, detail="You do not have permission to view this student")
        if current_user.role == "teacher":
            teacher = get_teacher_or_404(conn, current_user.linked_teacher_id or 0)
            if row["class_name"] != teacher["class_assigned"]:
                raise HTTPException(status_code=403, detail="You do not have permission to view this student")
        if current_user.role not in {"admin", "accountant", "student", "teacher"}:
            raise HTTPException(status_code=403, detail="You do not have permission to view this student")
        return row_to_student(row)


@app.post("/api/students", response_model=Student, status_code=201)
def create_student(
    student: StudentCreate,
    current_user: CurrentUser = Depends(require_roles("admin")),
) -> Student:
    with get_db() as conn:
        normalized_fee_terms = normalize_fee_term_breakdown(
            {key: value.model_dump() for key, value in student.fees_by_term.items()},
            student.fees.total,
            student.fees.paid,
            [payment.model_dump(by_alias=True) for payment in student.payments],
        )
        fee_summary = summarize_fee_terms(normalized_fee_terms)
        cursor = conn.execute(
            """
        INSERT INTO students (
            name, email, class_name, position, total_grade, admission_number, results_json,
            fees_total, fees_paid, fees_status, fees_by_term_json, payments_json, guardian_name, transport, attendance,
            attendance_by_term_json, behavior, performance_history_json, status, current_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
                student.name,
                student.email,
                student.class_name,
                student.position,
                student.total_grade,
                student.admission_number,
                json.dumps(student.results),
            fee_summary.total,
            fee_summary.paid,
            fee_summary.status,
            json.dumps(normalized_fee_terms),
            json.dumps([payment.model_dump(by_alias=True) for payment in student.payments]),
            student.extra_records.guardian_name,
            student.extra_records.transport,
            student.extra_records.attendance,
            json.dumps({key: value.model_dump() for key, value in student.attendance_by_term.items()}),
            student.extra_records.behavior,
            json.dumps([point.model_dump() for point in student.performance_history]),
            student.status,
                student.current_score,
            ),
        )
        upsert_user(
            conn,
            full_name=student.name,
            email=student.email,
            role="student",
            linked_student_id=int(cursor.lastrowid),
        )
        log_audit_event(
            conn,
            actor_email=current_user.email,
            actor_role=current_user.role,
            action_type="student_created",
            target_type="student",
            target_id=str(cursor.lastrowid),
            message=f"Created student record for {student.name}",
        )
        conn.commit()
        row = conn.execute("SELECT * FROM students WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return row_to_student(row)


@app.put("/api/students/{student_id}", response_model=Student)
def update_student(student_id: int, student: StudentCreate, current_user: CurrentUser = Depends(get_current_user)) -> Student:
    with get_db() as conn:
        existing_student = get_student_or_404(conn, student_id)
        action_type = "student_updated"
        message = f"Updated student record for {student.name}"
        if current_user.role not in {"admin", "accountant"}:
            raise HTTPException(status_code=403, detail="You do not have permission to update this student")

        existing_payments_raw = [
            payment
            for payment in parse_json(existing_student["payments_json"], [])
            if isinstance(payment, dict)
        ]
        existing_fee_terms = normalize_fee_term_breakdown(
            parse_json(existing_student["fees_by_term_json"], {}),
            float(existing_student["fees_total"] or 0),
            float(existing_student["fees_paid"] or 0),
            existing_payments_raw,
        )
        if current_user.role == "accountant":
            action_type = "finance_update"
            message = f"Updated finance details for {existing_student['name']}"
            student = StudentCreate(
                name=existing_student["name"],
                email=existing_student["email"],
                className=existing_student["class_name"],
                position=existing_student["position"] or "Unranked",
                totalGrade=existing_student["total_grade"] or "N/A",
                admissionNumber=existing_student["admission_number"] or "",
                results=parse_json(existing_student["results_json"], parse_json(existing_student["results"], {})),
                fees=student.fees,
                feesByTerm=student.fees_by_term,
                payments=[PaymentRecord(**payment) for payment in existing_payments_raw],
                extraRecords=StudentExtraRecords(
                    guardianName=existing_student["guardian_name"] or "",
                    transport=existing_student["transport"] or "",
                    attendance=existing_student["attendance"] or "",
                    behavior=existing_student["behavior"] or "",
                ),
                attendanceByTerm={
                    key: AttendanceTermSummary(**value)
                    for key, value in parse_json(existing_student["attendance_by_term_json"], {}).items()
                    if isinstance(value, dict)
                },
                performanceHistory=[
                    PerformancePoint(**point)
                    for point in parse_json(existing_student["performance_history_json"], [])
                    if isinstance(point, dict)
                ],
                status=existing_student["status"] or "Active",
                currentScore=int(existing_student["current_score"] or 0),
            )
        elif not student.fees_by_term:
            student = student.model_copy(update={"fees_by_term": {key: TermFeeSummary(**value) for key, value in existing_fee_terms.items()}})

        normalized_fee_terms = normalize_fee_term_breakdown(
            {key: value.model_dump() for key, value in student.fees_by_term.items()},
            student.fees.total,
            student.fees.paid,
            [payment.model_dump(by_alias=True) for payment in student.payments],
        )
        fee_summary = summarize_fee_terms(normalized_fee_terms)
        conn.execute(
            """
            UPDATE students
            SET name = ?, email = ?, class_name = ?, position = ?, total_grade = ?, admission_number = ?,
                results_json = ?, fees_total = ?, fees_paid = ?, fees_status = ?, fees_by_term_json = ?, payments_json = ?, guardian_name = ?,
                transport = ?, attendance = ?, attendance_by_term_json = ?, behavior = ?, performance_history_json = ?,
                status = ?, current_score = ?
            WHERE id = ?
            """,
            (
                student.name,
                student.email,
                student.class_name,
                student.position,
                student.total_grade,
                student.admission_number,
                json.dumps(student.results),
                fee_summary.total,
                fee_summary.paid,
                fee_summary.status,
                json.dumps(normalized_fee_terms),
                json.dumps([payment.model_dump(by_alias=True) for payment in student.payments]),
                student.extra_records.guardian_name,
                student.extra_records.transport,
                student.extra_records.attendance,
                json.dumps({key: value.model_dump() for key, value in student.attendance_by_term.items()}),
                student.extra_records.behavior,
                json.dumps([point.model_dump() for point in student.performance_history]),
                student.status,
                student.current_score,
                student_id,
            ),
        )
        if existing_student["email"] and normalize_email(existing_student["email"]) != normalize_email(student.email):
            delete_user_by_email(conn, existing_student["email"])
        upsert_user(
            conn,
            full_name=student.name,
            email=student.email,
            role="student",
            linked_student_id=student_id,
        )
        log_audit_event(
            conn,
            actor_email=current_user.email,
            actor_role=current_user.role,
            action_type=action_type,
            target_type="student",
            target_id=str(student_id),
            message=message,
        )
        conn.commit()
        row = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
        return row_to_student(row)


@app.post("/api/students/{student_id}/payments", response_model=Student)
def record_student_payment(
    student_id: int,
    payload: StudentPaymentCreate,
    current_user: CurrentUser = Depends(require_roles("accountant")),
) -> Student:
    with get_db() as conn:
        student = get_student_or_404(conn, student_id)
        normalized_term = payload.term.strip()
        if normalized_term not in {"termOne", "termTwo", "termThree"}:
            raise HTTPException(status_code=400, detail="Invalid payment term supplied")
        existing_payments = parse_json(student["payments_json"], [])
        fees_by_term = normalize_fee_term_breakdown(
            parse_json(student["fees_by_term_json"], {}),
            float(student["fees_total"] or 0),
            float(student["fees_paid"] or 0),
            existing_payments,
        )
        payment_record = {
            "receiptNumber": generate_receipt_number(),
            "amount": payload.amount,
            "method": payload.method,
            "date": date.today().isoformat(),
            "reference": payload.reference,
            "term": normalized_term,
        }
        updated_payments = [payment_record, *existing_payments]
        fees_by_term[normalized_term]["paid"] = float(fees_by_term[normalized_term]["paid"]) + payload.amount
        fees_by_term = normalize_fee_term_breakdown(fees_by_term, float(student["fees_total"] or 0), float(student["fees_paid"] or 0), updated_payments)
        updated_summary = summarize_fee_terms(fees_by_term)

        conn.execute(
            """
            UPDATE students
            SET fees_paid = ?, fees_status = ?, fees_by_term_json = ?, payments_json = ?
            WHERE id = ?
            """,
            (updated_summary.paid, updated_summary.status, json.dumps(fees_by_term), json.dumps(updated_payments), student_id),
        )
        log_audit_event(
            conn,
            actor_email=current_user.email,
            actor_role=current_user.role,
            action_type="payment_recorded",
            target_type="student",
            target_id=str(student_id),
            message=f"Recorded {payload.method} payment of {payload.amount:.2f} for {student['name']} in {normalized_term}",
        )
        conn.commit()
        row = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
        return row_to_student(row)


@app.delete("/api/students/{student_id}", status_code=204)
def delete_student(student_id: int, current_user: CurrentUser = Depends(require_roles("admin"))) -> None:
    with get_db() as conn:
        student = get_student_or_404(conn, student_id)
        if student["email"]:
            delete_user_by_email(conn, student["email"])
        log_audit_event(
            conn,
            actor_email=current_user.email,
            actor_role=current_user.role,
            action_type="student_deleted",
            target_type="student",
            target_id=str(student_id),
            message=f"Removed student record for {student['name']}",
        )
        conn.execute("DELETE FROM students WHERE id = ?", (student_id,))
        conn.commit()


@app.get("/api/teachers", response_model=list[Teacher])
def list_teachers(current_user: CurrentUser = Depends(require_roles("admin"))) -> list[Teacher]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM teachers ORDER BY id DESC").fetchall()
        return [row_to_teacher(row, conn) for row in rows]


@app.get("/api/teachers/{teacher_id}", response_model=Teacher)
def get_teacher(teacher_id: int, current_user: CurrentUser = Depends(get_current_user)) -> Teacher:
    with get_db() as conn:
        row = get_teacher_or_404(conn, teacher_id)
        if current_user.role == "teacher" and current_user.linked_teacher_id != teacher_id:
            raise HTTPException(status_code=403, detail="You do not have permission to view this teacher")
        if current_user.role not in {"admin", "teacher"}:
            raise HTTPException(status_code=403, detail="You do not have permission to view this teacher")
        return row_to_teacher(row, conn)


@app.post("/api/teachers", response_model=Teacher, status_code=201)
def create_teacher(
    teacher: TeacherCreate,
    current_user: CurrentUser = Depends(require_roles("admin")),
) -> Teacher:
    with get_db() as conn:
        try:
            cursor = conn.execute(
                """
                INSERT INTO teachers (
                    name, subject, email, class_assigned, experience, performance_rating,
                    performance_feedback, department, publications, awards,
                    performance_history_json, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    teacher.name,
                    teacher.subject,
                    teacher.email,
                    teacher.class_assigned,
                    teacher.experience,
                    teacher.performance.rating,
                    teacher.performance.feedback,
                    teacher.extra_records.department,
                    teacher.extra_records.publications,
                    teacher.extra_records.awards,
                    json.dumps([point.model_dump() for point in teacher.performance_history]),
                    teacher.status,
                ),
            )
            upsert_user(
                conn,
                full_name=teacher.name,
                email=teacher.email,
                role="teacher",
                linked_teacher_id=int(cursor.lastrowid),
            )
            log_audit_event(
                conn,
                actor_email=current_user.email,
                actor_role=current_user.role,
                action_type="teacher_created",
                target_type="teacher",
                target_id=str(cursor.lastrowid),
                message=f"Created teacher record for {teacher.name}",
            )
            conn.commit()
        except sqlite3.IntegrityError as exc:
            raise HTTPException(status_code=400, detail="Email already exists") from exc
        row = conn.execute("SELECT * FROM teachers WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return row_to_teacher(row, conn)


@app.put("/api/teachers/{teacher_id}", response_model=Teacher)
def update_teacher(
    teacher_id: int,
    teacher: TeacherCreate,
    current_user: CurrentUser = Depends(require_roles("admin")),
) -> Teacher:
    with get_db() as conn:
        existing_teacher = get_teacher_or_404(conn, teacher_id)
        try:
            conn.execute(
                """
                UPDATE teachers
                SET name = ?, subject = ?, email = ?, class_assigned = ?, experience = ?,
                    performance_rating = ?, performance_feedback = ?, department = ?,
                    publications = ?, awards = ?, performance_history_json = ?, status = ?
                WHERE id = ?
                """,
                (
                    teacher.name,
                    teacher.subject,
                    teacher.email,
                    teacher.class_assigned,
                    teacher.experience,
                    teacher.performance.rating,
                    teacher.performance.feedback,
                    teacher.extra_records.department,
                    teacher.extra_records.publications,
                    teacher.extra_records.awards,
                    json.dumps([point.model_dump() for point in teacher.performance_history]),
                    teacher.status,
                    teacher_id,
                ),
            )
            if existing_teacher["email"] and normalize_email(existing_teacher["email"]) != normalize_email(teacher.email):
                delete_user_by_email(conn, existing_teacher["email"])
            upsert_user(
                conn,
                full_name=teacher.name,
                email=teacher.email,
                role="teacher",
                linked_teacher_id=teacher_id,
            )
            log_audit_event(
                conn,
                actor_email=current_user.email,
                actor_role=current_user.role,
                action_type="teacher_updated",
                target_type="teacher",
                target_id=str(teacher_id),
                message=f"Updated teacher record for {teacher.name}",
            )
            conn.commit()
        except sqlite3.IntegrityError as exc:
            raise HTTPException(status_code=400, detail="Email already exists") from exc
        row = conn.execute("SELECT * FROM teachers WHERE id = ?", (teacher_id,)).fetchone()
        return row_to_teacher(row, conn)


@app.delete("/api/teachers/{teacher_id}", status_code=204)
def delete_teacher(teacher_id: int, current_user: CurrentUser = Depends(require_roles("admin"))) -> None:
    with get_db() as conn:
        teacher = get_teacher_or_404(conn, teacher_id)
        if teacher["email"]:
            delete_user_by_email(conn, teacher["email"])
        log_audit_event(
            conn,
            actor_email=current_user.email,
            actor_role=current_user.role,
            action_type="teacher_deleted",
            target_type="teacher",
            target_id=str(teacher_id),
            message=f"Removed teacher record for {teacher['name']}",
        )
        conn.execute("DELETE FROM teachers WHERE id = ?", (teacher_id,))
        conn.commit()


@app.get("/api/teachers/{teacher_id}/students", response_model=list[ManagedStudent])
def list_teacher_students(teacher_id: int, current_user: CurrentUser = Depends(get_current_user)) -> list[ManagedStudent]:
    with get_db() as conn:
        if current_user.role == "teacher" and current_user.linked_teacher_id != teacher_id:
            raise HTTPException(status_code=403, detail="You do not have permission to view these students")
        if current_user.role not in {"admin", "teacher"}:
            raise HTTPException(status_code=403, detail="You do not have permission to view these students")
        teacher = get_teacher_or_404(conn, teacher_id)
        return get_teacher_students(conn, teacher["class_assigned"] or "")


@app.put("/api/teachers/{teacher_id}/students/{student_id}", response_model=ManagedStudent)
def update_teacher_student(
    teacher_id: int,
    student_id: int,
    payload: TeacherStudentUpdate,
    current_user: CurrentUser = Depends(get_current_user),
) -> ManagedStudent:
    with get_db() as conn:
        if current_user.role == "teacher" and current_user.linked_teacher_id != teacher_id:
            raise HTTPException(status_code=403, detail="You do not have permission to update this student")
        if current_user.role not in {"admin", "teacher"}:
            raise HTTPException(status_code=403, detail="You do not have permission to update this student")
        teacher = get_teacher_or_404(conn, teacher_id)
        student = get_student_or_404(conn, student_id)
        if student["class_name"] != teacher["class_assigned"]:
            raise HTTPException(status_code=400, detail="Student is not assigned to this teacher's class")

        normalized_term = payload.term.strip()
        normalized_exam_type = payload.exam_type.strip().lower()
        subject_name = payload.subject.strip()
        valid_terms = {"termOne", "termTwo", "termThree"}
        valid_exam_types = {"opener", "mid", "endterm"}
        if normalized_term not in valid_terms:
            raise HTTPException(status_code=400, detail="Invalid term supplied")
        if normalized_exam_type not in valid_exam_types:
            raise HTTPException(status_code=400, detail="Invalid exam type supplied")

        results = normalize_results_structure(parse_json(student["results_json"], parse_json(student["results"], {})))
        results[normalized_term][normalized_exam_type][subject_name] = payload.current_grade.upper()

        conn.execute(
            "UPDATE students SET current_score = ?, total_grade = ?, results_json = ? WHERE id = ?",
            (
                payload.current_score,
                score_to_grade(payload.current_score),
                json.dumps(results),
                student_id,
            ),
        )
        log_audit_event(
            conn,
            actor_email=current_user.email,
            actor_role=current_user.role,
            action_type="grade_updated",
            target_type="student",
            target_id=str(student_id),
            message=f"Updated {subject_name} grade for {student['name']} in {normalized_term} {normalized_exam_type}",
        )
        conn.commit()
        updated_student = conn.execute(
            "SELECT id, name, admission_number, total_grade, current_score, attendance FROM students WHERE id = ?",
            (student_id,),
        ).fetchone()
        return row_to_managed_student(updated_student)
