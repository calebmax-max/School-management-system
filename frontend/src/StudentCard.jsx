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

export default function StudentCard({ student, showDetails, onToggleDetails, onPrintReport }) {
  const {
    name = 'Unknown',
    email = '',
    className = 'Not assigned',
    position = 'Unranked',
    totalGrade: explicitTotalGrade,
    admissionNumber = 'N/A',
    results = {},
    fees = {},
    feesByTerm = {},
    payments = [],
    extraRecords = {},
    attendanceByTerm = {},
    performanceHistory = [],
    classStats = {},
  } = student || {};

  const resultsByClass = useMemo(() => normalizeResultsByClass(results, className), [results, className]);
  const availableClasses = useMemo(() => Object.keys(resultsByClass), [resultsByClass]);
  const [selectedClass, setSelectedClass] = useState(className);
  const [selectedTerm, setSelectedTerm] = useState('termOne');
  const [selectedExamType, setSelectedExamType] = useState('opener');

  useEffect(() => {
    setSelectedClass((current) =>
      current && resultsByClass[current] ? current : availableClasses[0] || className
    );
  }, [availableClasses, className, resultsByClass]);

  const selectedClassResults = resultsByClass[selectedClass] || createEmptyTermStructure();
  const availableTerms = useMemo(() => Object.keys(selectedClassResults), [selectedClassResults]);

  useEffect(() => {
    setSelectedTerm((current) =>
      current && selectedClassResults[current] ? current : availableTerms[0] || 'termOne'
    );
  }, [availableTerms, selectedClassResults]);

  const selectedTermResults = selectedClassResults[selectedTerm] || {};
  const availableExamTypes = useMemo(() => Object.keys(selectedTermResults), [selectedTermResults]);

  useEffect(() => {
    setSelectedExamType((current) =>
      current && selectedTermResults[current] ? current : availableExamTypes[0] || 'opener'
    );
  }, [availableExamTypes, selectedTermResults]);

  const selectedExamResults = selectedTermResults[selectedExamType] || {};
  const performanceScore = useMemo(
    () => performanceHistory.reduce((sum, entry) => sum + entry.score, 0) / Math.max(performanceHistory.length, 1),
    [performanceHistory]
  );

  const totalGrade = useMemo(() => {
    if (explicitTotalGrade) return explicitTotalGrade;
    return calculateTotalGrade(flattenTermResults(selectedClassResults));
  }, [explicitTotalGrade, selectedClassResults]);

  return (
    <section className={`student-card ${showDetails ? 'card-expanded' : 'card-collapsed'}`}>
      <div className="student-card-header">
        <div>
          <p className="eyebrow">Student details</p>
          <h2>{name}</h2>
          <div className="badge-row">
            <span className="status-badge status-success">{fees.status}</span>
            <span className="status-badge status-info">Avg score {Math.round(performanceScore)}%</span>
            <span className="status-badge status-muted">Attendance {extraRecords.attendance ?? 'N/A'}</span>
          </div>
        </div>

        <div className="header-actions">
          <button className="button button-secondary" onClick={onPrintReport}>
            Print report
          </button>
          <button className="button button-outline" onClick={onToggleDetails}>
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
        </div>
      </div>

      <div className="student-grid">
        <CardItem label="Class" value={className} />
        <CardItem label="Position" value={position} />
        <CardItem label="Overall grade" value={totalGrade} />
        <CardItem label="Outstanding fee" value={formatCurrency(fees.due ?? 0)} />
      </div>

      {showDetails && (
        <>
          <div className="student-section">
            <div className="section-heading-row">
              <h3>Performance by class, term and exam type</h3>
              <div className="performance-toolbar">
                <span className="micro-label">Select class</span>
                <select
                  className="table-select class-results-select"
                  value={selectedClass}
                  onChange={(event) => setSelectedClass(event.target.value)}
                >
                  {availableClasses.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>
                <span className="micro-label">Select term</span>
                <select
                  className="table-select class-results-select"
                  value={selectedTerm}
                  onChange={(event) => setSelectedTerm(event.target.value)}
                >
                  {availableTerms.map((term) => (
                    <option key={term} value={term}>
                      {toLabel(term)}
                    </option>
                  ))}
                </select>
                <span className="micro-label">Select exam</span>
                <select
                  className="table-select class-results-select"
                  value={selectedExamType}
                  onChange={(event) => setSelectedExamType(event.target.value)}
                >
                  {availableExamTypes.map((examType) => (
                    <option key={examType} value={examType}>
                      {toLabel(examType)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="term-results-layout">
              <div className="term-results-section">
                <div className="section-heading-row">
                  <h4>{toLabel(selectedTerm)}</h4>
                  <span className="status-badge status-info">
                    Mean Grade {calculateTotalGrade(flattenExamResults(selectedTermResults))}
                  </span>
                </div>
                <div className="exam-results-layout">
                  <div key={`${selectedTerm}-${selectedExamType}`} className="exam-results-section">
                    <div className="section-heading-row">
                      <h5>{toLabel(selectedExamType)}</h5>
                      <span className="status-badge status-muted">
                        Grade {calculateTotalGrade(selectedExamResults)}
                      </span>
                    </div>
                    <div className="results-grid">
                      {Object.entries(selectedExamResults).length === 0 ? (
                        <p>No {toLabel(selectedExamType)} results available</p>
                      ) : (
                        Object.entries(selectedExamResults).map(([subject, score]) => (
                          <div key={`${selectedTerm}-${selectedExamType}-${subject}`} className="result-card">
                            <span>{subject}</span>
                            <strong>{score}</strong>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
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

          <div className="student-section">
            <div className="section-heading-row">
              <h3>Fee Statement</h3>
              <span className="micro-label">Current account summary</span>
            </div>
            <div className="fee-statement-grid">
              <CardItem label="Total Fees" value={formatCurrency(fees.total ?? 0)} />
              <CardItem label="Amount Paid" value={formatCurrency(fees.paid ?? 0)} />
              <CardItem label="Balance" value={formatCurrency(fees.due ?? 0)} />
              <CardItem label="Fee Status" value={fees.status ?? 'Pending'} />
            </div>
            <div className="fee-statement-grid" style={{ marginTop: '12px' }}>
              {['termOne', 'termTwo', 'termThree'].map((term) => (
                <CardItem
                  key={term}
                  label={toLabel(term)}
                  value={`${formatCurrency(feesByTerm?.[term]?.paid ?? 0)} / ${formatCurrency(feesByTerm?.[term]?.total ?? 0)}`}
                />
              ))}
            </div>
            <div className="payments-history">
              {(payments || []).map((payment) => (
                <div key={payment.receiptNumber} className="payment-item">
                  <strong>{payment.receiptNumber}</strong>
                  <span>{toLabel(payment.term || 'termOne')}</span>
                  <span>{payment.method}</span>
                  <span>{formatCurrency(payment.amount)}</span>
                  <span>{payment.date}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="student-section">
            <div className="section-heading-row">
              <h3>Class Analytics</h3>
              <span className="micro-label">Live class standing</span>
            </div>
            <div className="fee-statement-grid">
              <CardItem label="Class Position" value={position} />
              <CardItem label="Class Size" value={classStats.classSize ?? 'N/A'} />
              <CardItem label="Class Mean Score" value={`${classStats.classMeanScore ?? 0}%`} />
              <CardItem label="Class Mean Grade" value={classStats.classMeanGrade ?? 'N/A'} />
            </div>
          </div>

          <div className="student-section">
            <div className="section-heading-row">
              <h3>Attendance Register</h3>
              <span className="micro-label">By term</span>
            </div>
            <div className="fee-statement-grid">
              {Object.entries(attendanceByTerm).map(([term, values]) => (
                <CardItem
                  key={term}
                  label={toLabel(term)}
                  value={`${values.present ?? 0}/${values.total ?? 0}`}
                />
              ))}
            </div>
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

function createEmptyTermStructure() {
  return {
    termOne: { opener: {}, mid: {}, endterm: {} },
    termTwo: { opener: {}, mid: {}, endterm: {} },
    termThree: { opener: {}, mid: {}, endterm: {} },
  };
}

function normalizeResultsByClass(results, currentClassName) {
  if (!results || typeof results !== 'object' || Array.isArray(results)) {
    return { [currentClassName || 'Current Class']: createEmptyTermStructure() };
  }

  const knownTerms = ['termOne', 'termTwo', 'termThree'];
  const hasTermsAtRoot = knownTerms.some((term) => {
    const value = results[term];
    return value && typeof value === 'object' && !Array.isArray(value);
  });

  if (hasTermsAtRoot) {
    return {
      [currentClassName || 'Current Class']: normalizeResultsByTerm(results),
    };
  }

  const classEntries = Object.entries(results).filter(
    ([, value]) => value && typeof value === 'object' && !Array.isArray(value)
  );

  if (!classEntries.length) {
    return {
      [currentClassName || 'Current Class']: normalizeResultsByTerm(results),
    };
  }

  return Object.fromEntries(
    classEntries.map(([classLabel, classResults]) => [classLabel, normalizeResultsByTerm(classResults)])
  );
}

function normalizeResultsByTerm(results) {
  const defaultStructure = createEmptyTermStructure();

  if (!results || typeof results !== 'object' || Array.isArray(results)) {
    return defaultStructure;
  }

  const terms = ['termOne', 'termTwo', 'termThree'];
  const examTypes = ['opener', 'mid', 'endterm'];

  const hasExplicitTerms = terms.some((term) => {
    const value = results[term];
    return value && typeof value === 'object' && !Array.isArray(value);
  });

  if (hasExplicitTerms) {
    return Object.fromEntries(
      terms.map((term) => {
        const termResults = results[term];
        const hasExamTypes = examTypes.some((examType) => {
          const value = termResults?.[examType];
          return value && typeof value === 'object' && !Array.isArray(value);
        });

        if (hasExamTypes) {
          return [
            term,
            {
              opener: sanitizeExamResults(termResults?.opener),
              mid: sanitizeExamResults(termResults?.mid),
              endterm: sanitizeExamResults(termResults?.endterm),
            },
          ];
        }

        return [
          term,
          {
            opener: {},
            mid: {},
            endterm: sanitizeExamResults(termResults),
          },
        ];
      })
    );
  }

  return {
    termOne: {
      opener: {},
      mid: {},
      endterm: sanitizeExamResults(results),
    },
    termTwo: {
      opener: {},
      mid: {},
      endterm: {},
    },
    termThree: {
      opener: {},
      mid: {},
      endterm: {},
    },
  };
}

function sanitizeExamResults(results) {
  if (!results || typeof results !== 'object' || Array.isArray(results)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(results).filter(([, value]) => typeof value === 'string' || typeof value === 'number')
  );
}

function flattenExamResults(exams) {
  return Object.values(exams).reduce((merged, examResults) => ({ ...merged, ...examResults }), {});
}

function flattenTermResults(resultsByTerm) {
  return Object.values(resultsByTerm).reduce(
    (merged, exams) => ({ ...merged, ...flattenExamResults(exams) }),
    {}
  );
}

function calculateTotalGrade(results) {
  const scale = {
    A: 80,
    B: 70,
    C: 60,
    D: 50,
    E: 0,
  };

  const grades = Object.values(results);
  if (grades.length === 0) return 'N/A';

  const averageValue = grades.reduce((sum, grade) => {
    const normalized = String(grade).trim();
    return sum + (scale[normalized] ?? 0);
  }, 0) / grades.length;

  if (averageValue >= 80) return 'A';
  if (averageValue >= 70) return 'B';
  if (averageValue >= 60) return 'C';
  if (averageValue >= 50) return 'D';
  return 'E';
}

function formatCurrency(value) {
  return typeof value === 'number'
    ? new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(value)
    : value;
}

function toLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^./, (str) => str.toUpperCase());
}
