import { useEffect, useMemo, useState } from 'react';
import StudentCard from './StudentCard';
import TeacherCard from './TeacherCard';
import AdminCard from './AdminCard';
import AccountantCard from './AccountantCard';
import SignIn from './SignIn';
import SignUp from './SignUp';
import {
  changePassword,
  createStudent,
  createTeacher,
  deleteStudent,
  deleteTeacher,
  getAuditLogs,
  getDashboard,
  recordStudentPayment,
  setAuthToken,
  signIn,
  signUp,
  updateStudent,
  updateTeacher,
  updateTeacherStudent,
} from './api';

const SESSION_STORAGE_KEY = 'schoolhub.session';

function readStoredSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed?.token ? parsed : null;
  } catch {
    return null;
  }
}

function persistSession(session) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function App() {
  const [authMode, setAuthMode] = useState('signin');
  const [session, setSession] = useState(() => readStoredSession());
  const [showDetails, setShowDetails] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(readStoredSession()));
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingTeacherChanges, setIsSavingTeacherChanges] = useState(false);
  const [notice, setNotice] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    setAuthToken(session?.token ?? null);
    persistSession(session);
  }, [session]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const showNotice = (message, type = 'info') => {
    setNotice({ message, type });
  };

  const loadDashboard = async (activeSession = session) => {
    if (!activeSession?.token) {
      setDashboard(null);
      setLoading(false);
      return null;
    }

    try {
      setError('');
      setLoading(true);
      setAuthToken(activeSession.token);
      const payload = await getDashboard();
      setDashboard(payload);
      return payload;
    } catch (fetchError) {
      setError(fetchError.message || 'Unable to load dashboard data.');
      setDashboard(null);
      if (/authentication|required|expired|permission/i.test(fetchError.message || '')) {
        setSession(null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loadAuditTrail = async (activeSession = session) => {
    if (!activeSession?.token || !['admin', 'accountant'].includes(activeSession.role)) {
      setAuditLogs([]);
      return [];
    }

    try {
      setAuthToken(activeSession.token);
      const entries = await getAuditLogs();
      setAuditLogs(entries);
      return entries;
    } catch (fetchError) {
      setAuditLogs([]);
      return [];
    }
  };

  useEffect(() => {
    if (!session?.token) {
      setLoading(false);
      return;
    }
    loadDashboard();
    loadAuditTrail();
  }, [session?.token]);

  const handleSignIn = async (credentials) => {
    setAuthError('');
    setIsAuthSubmitting(true);
    try {
      const account = await signIn(credentials);
      setSession(account);
      const payload = await loadDashboard(account);
      if (!payload) {
        setAuthError('Signed in, but database data could not be loaded. Check the backend and try again.');
        setSession(null);
        return;
      }
      await loadAuditTrail(account);
    } catch (signInError) {
      setAuthError(signInError.message || 'Unable to sign in.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleSignUp = async (details) => {
    setAuthError('');
    if (details.password !== details.confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    setIsAuthSubmitting(true);
    try {
      const account = await signUp({
        fullName: details.fullName,
        email: details.email,
        password: details.password,
        role: details.role,
      });
      setSession(account);
      const payload = await loadDashboard(account);
      if (!payload) {
        setAuthError('Account created, but database data could not be loaded. Check the backend and try again.');
        setSession(null);
        return;
      }
      await loadAuditTrail(account);
    } catch (signUpError) {
      setAuthError(signUpError.message || 'Unable to create account.');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleSignOut = () => {
    setSession(null);
    setDashboard(null);
    setAuditLogs([]);
    setAuthMode('signin');
    setAuthError('');
    setError('');
    setNotice(null);
    setIsChangingPassword(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  const students = useMemo(() => enrichStudents(dashboard?.students || []), [dashboard?.students]);
  const teachers = dashboard?.teachers || [];
  const stats = dashboard?.stats;
  const growthTrends = dashboard?.growthTrends || [];
  const student =
    session?.role === 'student'
      ? students.find((record) => record.email?.toLowerCase() === session.email?.toLowerCase()) || dashboard?.featuredStudent
      : dashboard?.featuredStudent;
  const teacher =
    session?.role === 'teacher'
      ? teachers.find((record) => record.email?.toLowerCase() === session.email?.toLowerCase()) || dashboard?.featuredTeacher
      : dashboard?.featuredTeacher;

  const formatCurrency = (value) =>
    typeof value === 'number'
      ? new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(value)
      : value;

  const createReportContent = (record, type) => {
    const lines = [];
    lines.push(`${type} Report`);
    lines.push('==============');
    lines.push(`Name: ${record.name}`);

    if (type === 'Student') {
      lines.push(`Class: ${record.className}`);
      lines.push(`Position: ${record.position}`);
      lines.push(`Overall Grade: ${record.totalGrade}`);
      lines.push(`Admission Number: ${record.admissionNumber}`);
      lines.push('');
      lines.push('Results:');
      appendResultsToReport(lines, record.results || {});
      lines.push('');
      lines.push('Fees:');
      lines.push(`  Total: ${formatCurrency(record.fees?.total ?? 0)}`);
      lines.push(`  Paid: ${formatCurrency(record.fees?.paid ?? 0)}`);
      lines.push(`  Due: ${formatCurrency(record.fees?.due ?? 0)}`);
      lines.push(`  Status: ${record.fees?.status ?? 'N/A'}`);
    } else {
      lines.push(`Subject: ${record.subject}`);
      lines.push(`Class Assigned: ${record.classAssigned}`);
      lines.push(`Experience: ${record.experience}`);
      lines.push('');
      lines.push('Qualifications:');
      Object.entries(record.qualifications || {}).forEach(([qual, level]) => {
        lines.push(`  - ${qual}: ${level}`);
      });
    }

    lines.push('');
    lines.push('Performance History:');
    (record.performanceHistory || []).forEach((entry) => {
      lines.push(`  - ${entry.month}: ${entry.score}%`);
    });
    lines.push('');
    lines.push('Other Records:');
    Object.entries(record.extraRecords || {}).forEach(([key, value]) => {
      lines.push(`  - ${key}: ${value}`);
    });
    lines.push('');
    lines.push('Generated by School Management System');
    return lines.join('\n');
  };

  const activeRecord = useMemo(() => {
    if (session?.role === 'student') return student;
    if (session?.role === 'teacher') return teacher;
    return null;
  }, [session?.role, student, teacher]);

  const handleDownload = () => {
    if (!['student', 'teacher'].includes(session?.role)) {
      showNotice('Reports are available for student and teacher accounts only.', 'info');
      return;
    }

    if (!activeRecord) {
      showNotice('No data is available for this account yet.', 'error');
      return;
    }

    const type = session?.role === 'student' ? 'Student' : 'Teacher';
    const content = createReportContent(activeRecord, type);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeRecord.name.replace(/\s+/g, '_')}_${type.toLowerCase()}_report.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePayment = () => {
    showNotice('Online fee payment is not connected yet.', 'info');
  };

  const handlePrintStudentReport = (studentRecord) => {
    if (!studentRecord || typeof window === 'undefined') {
      return;
    }

    const reportWindow = window.open('', '_blank', 'width=900,height=700');
    if (!reportWindow) {
      return;
    }

    reportWindow.document.write(`
      <html>
        <head>
          <title>${studentRecord.name} Report Card</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #1f2937; }
            h1, h2, h3 { margin-bottom: 8px; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 16px 0 24px; }
            .card { border: 1px solid #dbe3f1; border-radius: 12px; padding: 12px 16px; }
            .section { margin-top: 24px; }
            .row { margin: 6px 0; }
          </style>
        </head>
        <body>
          <h1>Student Report Card</h1>
          <h2>${studentRecord.name}</h2>
          <div class="grid">
            <div class="card"><strong>Class:</strong> ${studentRecord.className}</div>
            <div class="card"><strong>Admission No:</strong> ${studentRecord.admissionNumber}</div>
            <div class="card"><strong>Overall Grade:</strong> ${studentRecord.totalGrade}</div>
            <div class="card"><strong>Position:</strong> ${studentRecord.position}</div>
          </div>
          <div class="section">
            <h3>Fee Statement</h3>
            <div class="row">Total Fees: ${formatCurrency(studentRecord.fees?.total ?? 0)}</div>
            <div class="row">Paid: ${formatCurrency(studentRecord.fees?.paid ?? 0)}</div>
            <div class="row">Balance: ${formatCurrency(studentRecord.fees?.due ?? 0)}</div>
            <div class="row">Status: ${studentRecord.fees?.status ?? 'Pending'}</div>
          </div>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  const handleAddStudent = async (formValues) => {
    setIsSubmitting(true);
    try {
      await createStudent({
        name: formValues.name,
        email: formValues.email,
        className: formValues.className,
        position: 'New admission',
        totalGrade: 'N/A',
        admissionNumber: `ADM-${Date.now()}`,
        results: {},
        fees: { total: 0, paid: 0, due: 0, status: 'Pending' },
        extraRecords: {
          guardianName: 'Not set',
          transport: 'Not assigned',
          attendance: 'N/A',
          behavior: 'N/A',
        },
        performanceHistory: [],
        status: formValues.status,
        currentScore: 0,
      });
      await loadDashboard();
      showNotice('Student added successfully.', 'success');
      return true;
    } catch (submitError) {
      showNotice(submitError.message || 'Unable to add student.', 'error');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    setIsSubmitting(true);
    try {
      await deleteStudent(studentId);
      await loadDashboard();
      await loadAuditTrail();
      showNotice('Student removed successfully.', 'success');
      return true;
    } catch (submitError) {
      showNotice(submitError.message || 'Unable to remove student.', 'error');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStudentAssignment = async (studentRecord, updates) => {
    setIsSubmitting(true);
    try {
      await updateStudent(studentRecord.id, {
        name: studentRecord.name,
        email: studentRecord.email,
        className: updates.className,
        position: studentRecord.position,
        totalGrade: studentRecord.totalGrade,
        admissionNumber: studentRecord.admissionNumber,
        results: studentRecord.results,
        fees: studentRecord.fees,
        extraRecords: studentRecord.extraRecords,
        performanceHistory: studentRecord.performanceHistory,
        status: updates.status,
        currentScore: studentRecord.currentScore,
      });
      await loadDashboard();
      await loadAuditTrail();
      showNotice('Student details updated successfully.', 'success');
      return true;
    } catch (saveError) {
      showNotice(saveError.message || 'Unable to update student assignment.', 'error');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStudentFinance = async (studentRecord, fees) => {
    setIsSubmitting(true);
    try {
      await updateStudent(studentRecord.id, {
        name: studentRecord.name,
        email: studentRecord.email,
        className: studentRecord.className,
        position: studentRecord.position,
        totalGrade: studentRecord.totalGrade,
        admissionNumber: studentRecord.admissionNumber,
        results: studentRecord.results,
        fees,
        feesByTerm: fees.feesByTerm || studentRecord.feesByTerm || {},
        payments: studentRecord.payments || [],
        extraRecords: studentRecord.extraRecords,
        attendanceByTerm: studentRecord.attendanceByTerm || {},
        performanceHistory: studentRecord.performanceHistory,
        status: studentRecord.status,
        currentScore: studentRecord.currentScore,
      });
      await loadDashboard();
      await loadAuditTrail();
      showNotice('Student finance record updated successfully.', 'success');
      return true;
    } catch (saveError) {
      showNotice(saveError.message || 'Unable to update student finance record.', 'error');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTeacher = async (formValues) => {
    setIsSubmitting(true);
    try {
      await createTeacher({
        name: formValues.name,
        subject: formValues.subject,
        email: formValues.email,
        classAssigned: formValues.classAssigned,
        experience: 'New teacher',
        qualifications: {
          Degree: `${formValues.subject} Degree`,
          Certification: 'Teaching License',
          Specialization: formValues.subject,
        },
        performance: {
          rating: 0,
          feedback: 'Pending review',
        },
        extraRecords: {
          department: `${formValues.subject} Department`,
          publications: 'None yet',
          awards: 'None yet',
        },
        performanceHistory: [],
        status: formValues.status,
      });
      await loadDashboard();
      await loadAuditTrail();
      showNotice('Teacher added successfully.', 'success');
      return true;
    } catch (submitError) {
      showNotice(submitError.message || 'Unable to add teacher.', 'error');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeacher = async (teacherId) => {
    setIsSubmitting(true);
    try {
      await deleteTeacher(teacherId);
      await loadDashboard();
      await loadAuditTrail();
      showNotice('Teacher removed successfully.', 'success');
      return true;
    } catch (submitError) {
      showNotice(submitError.message || 'Unable to remove teacher.', 'error');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTeacherAssignment = async (teacherRecord, updates) => {
    setIsSubmitting(true);
    try {
      await updateTeacher(teacherRecord.id, {
        name: teacherRecord.name,
        subject: updates.subject,
        email: teacherRecord.email,
        classAssigned: updates.classAssigned,
        experience: teacherRecord.experience,
        qualifications: teacherRecord.qualifications,
        performance: teacherRecord.performance,
        extraRecords: teacherRecord.extraRecords,
        performanceHistory: teacherRecord.performanceHistory,
        status: updates.status,
      });
      await loadDashboard();
      await loadAuditTrail();
      showNotice('Teacher assignment updated successfully.', 'success');
      return true;
    } catch (saveError) {
      showNotice(saveError.message || 'Unable to update teacher assignment.', 'error');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordStudentPayment = async (studentId, payload) => {
    setIsSubmitting(true);
    try {
      await recordStudentPayment(studentId, payload);
      await loadDashboard();
      await loadAuditTrail();
      showNotice('Payment recorded successfully.', 'success');
      return true;
    } catch (saveError) {
      showNotice(saveError.message || 'Unable to record payment.', 'error');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveStudentPerformance = async (updates) => {
    if (!teacher) {
      return;
    }

    setIsSavingTeacherChanges(true);
    try {
      await Promise.all(
        updates.map((update) =>
          updateTeacherStudent(teacher.id, update.studentId, {
            currentScore: update.currentScore,
            currentGrade: update.currentGrade,
            term: update.term,
            examType: update.examType,
            subject: update.subject,
          })
        )
      );
      await loadDashboard();
      await loadAuditTrail();
      showNotice('Student grades updated successfully.', 'success');
    } catch (saveError) {
      showNotice(saveError.message || 'Unable to save grade changes.', 'error');
    } finally {
      setIsSavingTeacherChanges(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showNotice('New password and confirmation do not match.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsChangingPassword(false);
      await loadAuditTrail();
      showNotice('Password updated successfully.', 'success');
    } catch (saveError) {
      showNotice(saveError.message || 'Unable to update password.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <main className="app-shell auth-shell">
        <div className="auth-panel">
          {authMode === 'signin' ? (
            <SignIn
              onSubmit={handleSignIn}
              onSwitch={() => {
                setAuthError('');
                setAuthMode('signup');
              }}
              error={authError}
              isSubmitting={isAuthSubmitting}
            />
          ) : (
            <SignUp
              onSubmit={handleSignUp}
              onSwitch={() => {
                setAuthError('');
                setAuthMode('signin');
              }}
              error={authError}
              isSubmitting={isAuthSubmitting}
            />
          )}
        </div>
      </main>
    );
  }

  if (!loading && !dashboard) {
    return (
      <main className="app-shell">
        <div className="app-panel">
          <section className="student-card card-expanded">
            <p className="eyebrow">Database Connection</p>
            <h2>Live data is unavailable</h2>
            <p style={{ color: '#475569', lineHeight: 1.7 }}>
              The app is set to use data from the database only. Start the Python backend and refresh the page.
            </p>
            {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="app-panel">
        <div className="role-header">
          <div>
            <p className="eyebrow">Academic Performance</p>
            <h1>
              {session.role === 'student'
                ? 'Student Dashboard'
                : session.role === 'teacher'
                  ? 'Teacher Dashboard'
                  : session.role === 'accountant'
                    ? 'Finance Dashboard'
                    : 'Admin Panel'}
            </h1>
            <p className="session-copy">
              Signed in as {session.name} ({session.role})
            </p>
            {error && <p style={{ color: '#b91c1c', marginTop: '8px' }}>{error}</p>}
          </div>
          <div className="role-actions">
            {['student', 'teacher'].includes(session.role) && (
              <button className="button button-secondary" onClick={handleDownload}>
                Download report
              </button>
            )}
            {session.role === 'student' && (
              <button className="button button-primary" onClick={handlePayment}>
                Pay fee
              </button>
            )}
            <button className="button button-outline" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>

        {notice && (
          <div className={`notice-banner notice-${notice.type}`}>
            {notice.message}
          </div>
        )}

        {session && (
          <div className="account-strip">
            <div>
              <p className="micro-label">Account Security</p>
              <strong>Manage your password without leaving the dashboard</strong>
            </div>
            <button
              className="button button-secondary"
              onClick={() => setIsChangingPassword((current) => !current)}
            >
              {isChangingPassword ? 'Hide Password Form' : 'Change Password'}
            </button>
          </div>
        )}

        {isChangingPassword && (
          <section className="security-panel">
            <div className="section-heading-row">
              <h3>Change Password</h3>
              <span className="micro-label">Use at least 8 characters</span>
            </div>
            <div className="form-group">
              <input
                type="password"
                placeholder="Current password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
              />
              <input
                type="password"
                placeholder="New password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
              />
            </div>
            <div className="form-actions">
              <button className="button button-primary" onClick={handleChangePassword} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Update Password'}
              </button>
            </div>
          </section>
        )}

        {loading ? (
          <section className="student-card card-expanded">
            <p>Loading data...</p>
          </section>
        ) : session.role === 'student' ? (
          <StudentCard
            student={student}
            showDetails={showDetails}
            onToggleDetails={() => setShowDetails((current) => !current)}
            onPrintReport={() => handlePrintStudentReport(student)}
          />
        ) : session.role === 'teacher' ? (
          <TeacherCard
            teacher={teacher}
            showDetails={showDetails}
            onToggleDetails={() => setShowDetails((current) => !current)}
            onSaveStudentPerformance={handleSaveStudentPerformance}
            isSaving={isSavingTeacherChanges}
          />
        ) : session.role === 'accountant' ? (
          <AccountantCard
            students={students}
            auditLogs={auditLogs}
            onUpdateStudentFinance={handleUpdateStudentFinance}
            onRecordPayment={handleRecordStudentPayment}
            onNotify={showNotice}
            isSubmitting={isSubmitting}
          />
        ) : (
          <AdminCard
            showDetails={showDetails}
            onToggleDetails={() => setShowDetails((current) => !current)}
            students={students}
            teachers={teachers}
            stats={stats}
            growthTrends={growthTrends}
            auditLogs={auditLogs}
            onAddStudent={handleAddStudent}
            onDeleteStudent={handleDeleteStudent}
            onUpdateStudent={handleUpdateStudentAssignment}
            onAddTeacher={handleAddTeacher}
            onDeleteTeacher={handleDeleteTeacher}
            onUpdateTeacher={handleUpdateTeacherAssignment}
            onNotify={showNotice}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </main>
  );
}

function appendResultsToReport(lines, results) {
  if (!results || typeof results !== 'object' || Array.isArray(results)) {
    lines.push('  - No results available');
    return;
  }

  const termKeys = ['termOne', 'termTwo', 'termThree'];
  const hasTerms = termKeys.some((term) => results[term] && typeof results[term] === 'object');

  if (!hasTerms) {
    Object.entries(results).forEach(([subject, grade]) => {
      lines.push(`  - ${subject}: ${grade}`);
    });
    return;
  }

  termKeys.forEach((term) => {
    const termResults = results[term];
    if (!termResults || typeof termResults !== 'object') {
      return;
    }

    lines.push(`  ${toReportLabel(term)}:`);
    ['opener', 'mid', 'endterm'].forEach((examType) => {
      const examResults = termResults[examType];
      if (!examResults || typeof examResults !== 'object' || Object.keys(examResults).length === 0) {
        return;
      }
      lines.push(`    ${toReportLabel(examType)}:`);
      Object.entries(examResults).forEach(([subject, grade]) => {
        lines.push(`      - ${subject}: ${grade}`);
      });
    });
  });
}

function enrichStudents(students) {
  const grouped = students.reduce((acc, student) => {
    const key = student.className || 'Unassigned';
    acc[key] = acc[key] || [];
    acc[key].push(student);
    return acc;
  }, {});

  const enrichedById = new Map();

  Object.values(grouped).forEach((classStudents) => {
    const sorted = [...classStudents].sort((a, b) => {
      const scoreDiff = (b.currentScore || 0) - (a.currentScore || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

    const classMeanScore = sorted.length
      ? Math.round(sorted.reduce((sum, student) => sum + (student.currentScore || 0), 0) / sorted.length)
      : 0;

    sorted.forEach((student, index) => {
      enrichedById.set(student.id, {
        ...student,
        position: formatPosition(index + 1, sorted.length),
        classStats: {
          classSize: sorted.length,
          classMeanScore,
          classMeanGrade: scoreToGrade(classMeanScore),
        },
      });
    });
  });

  return students.map((student) => enrichedById.get(student.id) || student);
}

function formatPosition(rank, total) {
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${rank}th of ${total}`;
  }
  const mod10 = rank % 10;
  if (mod10 === 1) return `${rank}st of ${total}`;
  if (mod10 === 2) return `${rank}nd of ${total}`;
  if (mod10 === 3) return `${rank}rd of ${total}`;
  return `${rank}th of ${total}`;
}

function scoreToGrade(score) {
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'E';
}

function toReportLabel(value) {
  return String(value)
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

export default App;
