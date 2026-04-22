import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function AdminCard({
  showDetails,
  onToggleDetails,
  students = [],
  teachers = [],
  stats,
  growthTrends = [],
  auditLogs = [],
  onAddStudent,
  onDeleteStudent,
  onUpdateStudent,
  onAddTeacher,
  onDeleteTeacher,
  onUpdateTeacher,
  onNotify,
  isSubmitting = false,
}) {
  const [newStudent, setNewStudent] = useState({ name: '', email: '', className: '', status: 'Active' });
  const [newTeacher, setNewTeacher] = useState({
    name: '',
    subject: '',
    email: '',
    classAssigned: '',
    status: 'Active',
  });
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [studentEditForm, setStudentEditForm] = useState({ className: '', status: 'Active' });
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [teacherEditForm, setTeacherEditForm] = useState({
    subject: '',
    classAssigned: '',
    status: 'Active',
  });

  const derivedStats = useMemo(
    () =>
      stats || {
        totalStudents: students.length,
        totalTeachers: teachers.length,
        activeStudents: students.filter((student) => student.status === 'Active').length,
        activeTeachers: teachers.filter((teacher) => teacher.status === 'Active').length,
      },
    [stats, students, teachers]
  );

  const classAnalytics = useMemo(() => {
    return Object.entries(
      students.reduce((acc, student) => {
        const key = student.className || 'Unassigned';
        if (!acc[key]) {
          acc[key] = { count: 0, totalScore: 0 };
        }
        acc[key].count += 1;
        acc[key].totalScore += student.currentScore || 0;
        return acc;
      }, {})
    ).map(([className, value]) => ({
      className,
      count: value.count,
      meanScore: value.count ? Math.round(value.totalScore / value.count) : 0,
    }));
  }, [students]);

  const subjectAnalytics = useMemo(() => {
    return Object.entries(
      teachers.reduce((acc, teacher) => {
        const key = teacher.subject || 'Unassigned';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    ).map(([subject, count]) => ({ subject, count }));
  }, [teachers]);

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.email || !newStudent.className) {
      onNotify?.('Please fill in the student name, email, and class.', 'error');
      return;
    }

    const success = await onAddStudent?.(newStudent);
    if (success) {
      setNewStudent({ name: '', email: '', className: '', status: 'Active' });
    }
  };

  const handleAddTeacher = async () => {
    if (!newTeacher.name || !newTeacher.subject || !newTeacher.email || !newTeacher.classAssigned) {
      onNotify?.('Please fill in all teacher fields.', 'error');
      return;
    }

    const success = await onAddTeacher?.(newTeacher);
    if (success) {
      setNewTeacher({
        name: '',
        subject: '',
        email: '',
        classAssigned: '',
        status: 'Active',
      });
    }
  };

  const beginStudentEdit = (student) => {
    setEditingStudentId(student.id);
    setStudentEditForm({
      className: student.className,
      status: student.status,
    });
  };

  const saveStudentEdit = async (student) => {
    const success = await onUpdateStudent?.(student, studentEditForm);
    if (success) {
      setEditingStudentId(null);
    }
  };

  const beginTeacherEdit = (teacher) => {
    setEditingTeacherId(teacher.id);
    setTeacherEditForm({
      subject: teacher.subject,
      classAssigned: teacher.classAssigned,
      status: teacher.status,
    });
  };

  const saveTeacherEdit = async (teacher) => {
    const success = await onUpdateTeacher?.(teacher, teacherEditForm);
    if (success) {
      setEditingTeacherId(null);
    }
  };

  return (
    <section className={`student-card ${showDetails ? 'card-expanded' : 'card-collapsed'}`}>
      <div className="student-card-header">
        <div>
          <p className="eyebrow">Admin panel</p>
          <h2>System Management</h2>
          <div className="badge-row">
            <span className="status-badge status-info">{derivedStats.totalStudents} Students</span>
            <span className="status-badge status-success">{derivedStats.totalTeachers} Teachers</span>
            <span className="status-badge status-muted">{derivedStats.activeStudents} Active</span>
          </div>
        </div>

        <button className="button button-outline" onClick={onToggleDetails}>
          {showDetails ? 'Hide details' : 'Show details'}
        </button>
      </div>

      {showDetails && (
        <>
          <div className="admin-section">
            <h3>System Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <h4>Total Students</h4>
                <div className="stat-number">{derivedStats.totalStudents}</div>
                <div className="stat-change positive">Live from backend</div>
              </div>
              <div className="stat-card">
                <h4>Total Teachers</h4>
                <div className="stat-number">{derivedStats.totalTeachers}</div>
                <div className="stat-change positive">Live from backend</div>
              </div>
              <div className="stat-card">
                <h4>Active Students</h4>
                <div className="stat-number">{derivedStats.activeStudents}</div>
                <div className="stat-change neutral">Current enrolment</div>
              </div>
              <div className="stat-card">
                <h4>Active Teachers</h4>
                <div className="stat-number">{derivedStats.activeTeachers}</div>
                <div className="stat-change neutral">Current workforce</div>
              </div>
            </div>

            <div className="chart-section">
              <h3>Growth Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={growthTrends} margin={{ top: 16, right: 6, bottom: 6, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.12)' }} />
                  <Line type="monotone" dataKey="students" stroke="#4f46e5" strokeWidth={3} name="Students" />
                  <Line type="monotone" dataKey="teachers" stroke="#10b981" strokeWidth={3} name="Teachers" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="analytics-grid">
              <div className="analytics-card">
                <h4>Class Analytics</h4>
                {classAnalytics.map((entry) => (
                  <div key={entry.className} className="analytics-row">
                    <span>{entry.className}</span>
                    <strong>{entry.count} students · Mean {entry.meanScore}%</strong>
                  </div>
                ))}
              </div>
              <div className="analytics-card">
                <h4>Subject Workload</h4>
                {subjectAnalytics.map((entry) => (
                  <div key={entry.subject} className="analytics-row">
                    <span>{entry.subject}</span>
                    <strong>{entry.count} teacher{entry.count === 1 ? '' : 's'}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="admin-section">
            <div className="section-header">
              <h3>Recent Activity</h3>
            </div>
            <div className="audit-log-list">
              {auditLogs.length === 0 ? (
                <p className="audit-empty">No audit activity has been recorded yet.</p>
              ) : (
                auditLogs.map((entry) => (
                  <div key={entry.id} className="audit-log-item">
                    <div className="audit-log-meta">
                      <strong>{formatAuditLabel(entry.actionType)}</strong>
                      <span>{entry.actorEmail} ({entry.actorRole})</span>
                    </div>
                    <p>{entry.message}</p>
                    <span className="micro-label">{entry.createdAt}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="admin-section">
            <div className="section-header">
              <h3>Student Management</h3>
            </div>

            <div className="add-form">
              <h4>Add New Student</h4>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Student Name"
                  value={newStudent.name}
                  onChange={(event) => setNewStudent({ ...newStudent, name: event.target.value })}
                />
                <input
                  type="email"
                  placeholder="Student Email"
                  value={newStudent.email}
                  onChange={(event) => setNewStudent({ ...newStudent, email: event.target.value })}
                />
                <input
                  type="text"
                  placeholder="Class (e.g., Grade 10 - A)"
                  value={newStudent.className}
                  onChange={(event) => setNewStudent({ ...newStudent, className: event.target.value })}
                />
                <select
                  value={newStudent.status}
                  onChange={(event) => setNewStudent({ ...newStudent, status: event.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="form-actions">
                <button className="button button-primary" onClick={handleAddStudent} disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Student'}
                </button>
              </div>
            </div>

            <div className="data-table">
              <div className="table-header">
                <span>Name</span>
                <span>Email</span>
                <span>Class</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {students.map((student) => (
                <div key={student.id} className="table-row">
                  <span className="student-name">{student.name}</span>
                  <span style={{ fontSize: '0.9rem', color: '#64748b' }}>{student.email}</span>
                  {editingStudentId === student.id ? (
                    <input
                      className="table-input"
                      type="text"
                      value={studentEditForm.className}
                      onChange={(event) =>
                        setStudentEditForm({ ...studentEditForm, className: event.target.value })
                      }
                    />
                  ) : (
                    <span>{student.className}</span>
                  )}
                  {editingStudentId === student.id ? (
                    <select
                      className="table-select"
                      value={studentEditForm.status}
                      onChange={(event) =>
                        setStudentEditForm({ ...studentEditForm, status: event.target.value })
                      }
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  ) : (
                    <span className={`status-${student.status.toLowerCase()}`}>{student.status}</span>
                  )}
                  <div className="table-actions">
                    {editingStudentId === student.id ? (
                      <>
                        <button className="button button-primary" onClick={() => saveStudentEdit(student)} disabled={isSubmitting}>
                          {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                        <button className="button button-outline" onClick={() => setEditingStudentId(null)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="button button-secondary" onClick={() => beginStudentEdit(student)}>
                          Edit
                        </button>
                        <button className="button button-danger" onClick={() => onDeleteStudent?.(student.id)}>
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="admin-section">
            <div className="section-header">
              <h3>Teacher Management</h3>
            </div>

            <div className="add-form">
              <h4>Add New Teacher</h4>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px' }}>
                Teachers are stored in the Python backend and show up instantly in the dashboard.
              </p>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Teacher Name"
                  value={newTeacher.name}
                  onChange={(event) => setNewTeacher({ ...newTeacher, name: event.target.value })}
                />
                <input
                  type="text"
                  placeholder="Subject"
                  value={newTeacher.subject}
                  onChange={(event) => setNewTeacher({ ...newTeacher, subject: event.target.value })}
                />
                <input
                  type="text"
                  placeholder="Class Assigned"
                  value={newTeacher.classAssigned}
                  onChange={(event) => setNewTeacher({ ...newTeacher, classAssigned: event.target.value })}
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={newTeacher.email}
                  onChange={(event) => setNewTeacher({ ...newTeacher, email: event.target.value })}
                />
                <select
                  value={newTeacher.status}
                  onChange={(event) => setNewTeacher({ ...newTeacher, status: event.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="form-actions">
                <button className="button button-primary" onClick={handleAddTeacher} disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Teacher'}
                </button>
              </div>
            </div>

            <div className="data-table">
              <div className="table-header">
                <span>Name</span>
                <span>Subject</span>
                <span>Email</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {teachers.map((teacher) => (
                <div key={teacher.id} className="table-row">
                  <span className="student-name">{teacher.name}</span>
                  {editingTeacherId === teacher.id ? (
                    <input
                      className="table-input"
                      type="text"
                      value={teacherEditForm.subject}
                      onChange={(event) =>
                        setTeacherEditForm({ ...teacherEditForm, subject: event.target.value })
                      }
                    />
                  ) : (
                    <span>{teacher.subject}</span>
                  )}
                  <span style={{ fontSize: '0.9rem', color: '#64748b' }}>{teacher.email}</span>
                  {editingTeacherId === teacher.id ? (
                    <div className="teacher-edit-stack">
                      <input
                        className="table-input"
                        type="text"
                        value={teacherEditForm.classAssigned}
                        onChange={(event) =>
                          setTeacherEditForm({ ...teacherEditForm, classAssigned: event.target.value })
                        }
                        placeholder="Assigned class"
                      />
                      <select
                        className="table-select"
                        value={teacherEditForm.status}
                        onChange={(event) =>
                          setTeacherEditForm({ ...teacherEditForm, status: event.target.value })
                        }
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  ) : (
                    <span className={`status-${teacher.status.toLowerCase()}`}>
                      {teacher.classAssigned} · {teacher.status}
                    </span>
                  )}
                  <div className="table-actions">
                    {editingTeacherId === teacher.id ? (
                      <>
                        <button className="button button-primary" onClick={() => saveTeacherEdit(teacher)} disabled={isSubmitting}>
                          {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                        <button className="button button-outline" onClick={() => setEditingTeacherId(null)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="button button-secondary" onClick={() => beginTeacherEdit(teacher)}>
                          Edit
                        </button>
                        <button className="button button-danger" onClick={() => onDeleteTeacher?.(teacher.id)}>
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function formatAuditLabel(value) {
  return String(value)
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
