import { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function TeacherCard({
  teacher,
  showDetails,
  onToggleDetails,
  onSaveStudentPerformance,
  isSaving = false,
}) {
  const {
    name = 'Unknown',
    subject = 'Not assigned',
    email = '',
    classAssigned = 'N/A',
    experience = 'N/A',
    extraRecords = {},
    performanceHistory = [],
    students = [],
  } = teacher || {};

  const [studentScores, setStudentScores] = useState({});
  const [selectedSubject, setSelectedSubject] = useState(subject);
  const [selectedTerm, setSelectedTerm] = useState('termOne');
  const [selectedExamType, setSelectedExamType] = useState('opener');

  useEffect(() => {
    setStudentScores(
      students.reduce((acc, student) => {
        acc[student.id] = student.currentScore || 0;
        return acc;
      }, {})
    );
  }, [students]);

  useEffect(() => {
    setSelectedSubject(subject);
  }, [subject]);

  const performanceScore = useMemo(
    () => performanceHistory.reduce((sum, entry) => sum + entry.score, 0) / Math.max(performanceHistory.length, 1),
    [performanceHistory]
  );

  const topPerformer = useMemo(() => {
    if (!students.length) return null;
    return [...students].sort((a, b) => (b.currentScore || 0) - (a.currentScore || 0))[0];
  }, [students]);

  const handleScoreChange = (studentId, newScore) => {
    const score = Math.max(0, Math.min(100, parseInt(newScore) || 0));
    setStudentScores((prev) => ({
      ...prev,
      [studentId]: score,
    }));
  };

  const availableSubjects = useMemo(() => {
    const nestedSubjects = students.flatMap((student) => collectSubjectsFromResults(student.results));
    return Array.from(new Set([subject, ...nestedSubjects].filter(Boolean)));
  }, [students, subject]);

  const markSheetMeanScore = useMemo(() => {
    const scores = Object.values(studentScores);
    if (!scores.length) {
      return 0;
    }
    return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
  }, [studentScores]);

  const markSheetMeanGrade = useMemo(() => scoreToGrade(markSheetMeanScore), [markSheetMeanScore]);

  const handleSaveGrades = async () => {
    if (!onSaveStudentPerformance) {
      return;
    }

    const updates = students.map((student) => ({
      studentId: student.id,
      currentScore: studentScores[student.id] ?? student.currentScore ?? 0,
      currentGrade: scoreToGrade(studentScores[student.id] ?? student.currentScore ?? 0),
      term: selectedTerm,
      examType: selectedExamType,
      subject: selectedSubject,
    }));

    await onSaveStudentPerformance(updates);
  };

  return (
    <section className={`student-card ${showDetails ? 'card-expanded' : 'card-collapsed'}`}>
      <div className="student-card-header">
        <div>
          <p className="eyebrow">Teacher details</p>
          <h2>{name}</h2>
          <div className="badge-row">
            <span className="status-badge status-info">Subject: {subject}</span>
            <span className="status-badge status-success">Class: {classAssigned}</span>
            <span className="status-badge status-muted">Avg rating {Math.round(performanceScore)}%</span>
          </div>
        </div>

        <div className="header-actions">
          <button className="button button-outline" onClick={onToggleDetails}>
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
        </div>
      </div>

      <div className="student-grid">
        <CardItem label="Subject" value={subject} />
        <CardItem label="Class Assigned" value={classAssigned} />
        <CardItem label="Students" value={`${students.length} enrolled`} />
      </div>

      {showDetails && (
        <>
          <div className="student-section">
            <div className="section-heading-row">
              <h3>Student Records</h3>
              <div className="teacher-toolbar">
                <select
                  className="table-select"
                  value={selectedSubject}
                  onChange={(event) => setSelectedSubject(event.target.value)}
                >
                  {availableSubjects.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
                <select
                  className="table-select"
                  value={selectedTerm}
                  onChange={(event) => setSelectedTerm(event.target.value)}
                >
                  <option value="termOne">Term 1</option>
                  <option value="termTwo">Term 2</option>
                  <option value="termThree">Term 3</option>
                </select>
                <select
                  className="table-select"
                  value={selectedExamType}
                  onChange={(event) => setSelectedExamType(event.target.value)}
                >
                  <option value="opener">Opener</option>
                  <option value="mid">Mid</option>
                  <option value="endterm">Endterm</option>
                </select>
                <button className="button button-primary" onClick={handleSaveGrades} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
            <div className="marksheet-summary">
              <div className="info-card">
                <span className="info-label">Selected Subject</span>
                <strong>{selectedSubject}</strong>
              </div>
              <div className="info-card">
                <span className="info-label">Exam Window</span>
                <strong>{toDisplayLabel(selectedTerm)} · {toDisplayLabel(selectedExamType)}</strong>
              </div>
              <div className="info-card">
                <span className="info-label">Mean Score</span>
                <strong>{markSheetMeanScore}%</strong>
              </div>
              <div className="info-card">
                <span className="info-label">Mean Grade</span>
                <strong>{markSheetMeanGrade}</strong>
              </div>
              <div className="info-card">
                <span className="info-label">Top Performer</span>
                <strong>{topPerformer ? `${topPerformer.name} (${topPerformer.currentScore || 0}%)` : 'N/A'}</strong>
              </div>
            </div>
            <div className="students-table">
              <div className="table-header">
                <span>Name</span>
                <span>Admission No.</span>
                <span>Attendance</span>
                <span>Score</span>
                <span>Grade</span>
              </div>
              {students.map((student) => (
                <div key={student.id} className="table-row">
                  <span className="student-name">{student.name}</span>
                  <span>{student.admissionNumber}</span>
                  <span>{student.attendance}</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={studentScores[student.id]}
                    onChange={(event) => handleScoreChange(student.id, event.target.value)}
                    className="score-input"
                  />
                  <span className="grade-pill">{scoreToGrade(studentScores[student.id] ?? student.currentScore ?? 0)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="student-section student-chart-panel">
            <div className="section-heading-row">
              <h3>Performance trend</h3>
              <span className="micro-label">Last 6 months</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceHistory} margin={{ top: 16, right: 6, bottom: 6, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} domain={[70, 100]} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 24px rgba(15, 23, 42, 0.12)' }} />
                <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} dot={{ r: 5, fill: '#4f46e5' }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
}

function CardItem({ label, value }) {
  return (
    <div className="info-card">
      <span className="info-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function scoreToGrade(score) {
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'E';
}

function collectSubjectsFromResults(results) {
  if (!results || typeof results !== 'object' || Array.isArray(results)) {
    return [];
  }

  const found = new Set();
  const visit = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return;
    }
    Object.entries(value).forEach(([key, nested]) => {
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        visit(nested);
      } else {
        found.add(key);
      }
    });
  };

  visit(results);
  return Array.from(found);
}

function toDisplayLabel(value) {
  return String(value)
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}
