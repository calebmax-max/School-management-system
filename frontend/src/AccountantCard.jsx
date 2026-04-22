import { useEffect, useMemo, useState } from 'react';

const TERM_OPTIONS = ['termOne', 'termTwo', 'termThree'];

export default function AccountantCard({
  students = [],
  auditLogs = [],
  onUpdateStudentFinance,
  onRecordPayment,
  onNotify,
  isSubmitting = false,
}) {
  const [expandedStudentIds, setExpandedStudentIds] = useState(() => new Set());
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [financeForm, setFinanceForm] = useState({
    termOne: '',
    termTwo: '',
    termThree: '',
  });
  const [paymentStudentId, setPaymentStudentId] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'Cash',
    reference: '',
    term: 'termOne',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const financeStats = useMemo(() => {
    const totalExpected = students.reduce((sum, student) => sum + (student.fees?.total || 0), 0);
    const totalPaid = students.reduce((sum, student) => sum + (student.fees?.paid || 0), 0);
    const totalBalance = students.reduce((sum, student) => sum + (student.fees?.due || 0), 0);
    return { totalExpected, totalPaid, totalBalance };
  }, [students]);

  const classOptions = useMemo(
    () => ['all', ...new Set(students.map((student) => student.className || 'Unassigned'))],
    [students]
  );

  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return students.filter((student) => {
      const matchesSearch =
        !query ||
        [student.name, student.email, student.admissionNumber]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesClass = classFilter === 'all' || (student.className || 'Unassigned') === classFilter;
      const matchesStatus = statusFilter === 'all' || String(student.fees?.status || 'Pending').toLowerCase() === statusFilter;
      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [classFilter, searchTerm, statusFilter, students]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [currentPage, filteredStudents]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const beginFinanceEdit = (student) => {
    setEditingStudentId(student.id);
    setExpandedStudentIds((current) => new Set(current).add(student.id));
    setFinanceForm({
      termOne: String(student.feesByTerm?.termOne?.total ?? 0),
      termTwo: String(student.feesByTerm?.termTwo?.total ?? 0),
      termThree: String(student.feesByTerm?.termThree?.total ?? 0),
    });
  };

  const toggleStudentBreakdown = (studentId) => {
    setExpandedStudentIds((current) => {
      const next = new Set(current);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const saveFinanceEdit = async (student) => {
    const nextFeesByTerm = TERM_OPTIONS.reduce((acc, term) => {
      acc[term] = {
        total: Number(financeForm[term]),
        paid: Number(student.feesByTerm?.[term]?.paid ?? 0),
      };
      return acc;
    }, {});

    const hasInvalidAmount = TERM_OPTIONS.some((term) => !Number.isFinite(nextFeesByTerm[term].total) || nextFeesByTerm[term].total < 0);
    if (hasInvalidAmount) {
      onNotify?.('Please enter valid fee amounts.', 'error');
      return;
    }
    const total = TERM_OPTIONS.reduce((sum, term) => sum + nextFeesByTerm[term].total, 0);
    const paid = TERM_OPTIONS.reduce((sum, term) => sum + nextFeesByTerm[term].paid, 0);
    const due = Math.max(total - paid, 0);
    const status = paid >= total && total > 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Pending';
    const success = await onUpdateStudentFinance?.(student, {
      total,
      paid,
      due,
      status,
      feesByTerm: TERM_OPTIONS.reduce((acc, term) => {
        const termTotal = nextFeesByTerm[term].total;
        const termPaid = nextFeesByTerm[term].paid;
        acc[term] = {
          total: termTotal,
          paid: termPaid,
          due: Math.max(termTotal - termPaid, 0),
          status: termPaid >= termTotal && termTotal > 0 ? 'Paid' : termPaid > 0 ? 'Partial' : 'Pending',
        };
        return acc;
      }, {}),
    });
    if (success) {
      setEditingStudentId(null);
    }
  };

  const savePayment = async (studentId) => {
    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      onNotify?.('Enter a valid payment amount before saving.', 'error');
      return;
    }
    const success = await onRecordPayment?.(studentId, {
      amount,
      method: paymentForm.method,
      reference: paymentForm.reference,
      term: paymentForm.term,
    });
    if (success) {
      setPaymentStudentId(null);
      setPaymentForm({ amount: '', method: 'Cash', reference: '', term: 'termOne' });
    }
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleClassFilterChange = (event) => {
    setClassFilter(event.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  };

  return (
    <section className="student-card card-expanded">
      <div className="student-card-header">
        <div>
          <p className="eyebrow">Accounts Office</p>
          <h2>Finance Dashboard</h2>
          <div className="badge-row">
            <span className="status-badge status-info">{students.length} Student Accounts</span>
            <span className="status-badge status-success">Collected {formatCurrency(financeStats.totalPaid)}</span>
            <span className="status-badge status-muted">Balance {formatCurrency(financeStats.totalBalance)}</span>
          </div>
        </div>
      </div>

      <div className="marksheet-summary">
        <div className="info-card">
          <span className="info-label">Expected Fees</span>
          <strong>{formatCurrency(financeStats.totalExpected)}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">Collected Fees</span>
          <strong>{formatCurrency(financeStats.totalPaid)}</strong>
        </div>
        <div className="info-card">
          <span className="info-label">Outstanding Balance</span>
          <strong>{formatCurrency(financeStats.totalBalance)}</strong>
        </div>
      </div>

      <div className="student-section">
        <div className="section-heading-row">
          <h3>Student Fee Accounts</h3>
          <span className="micro-label">Update fee structure and post payments</span>
        </div>
        <div className="finance-toolbar">
          <input
            className="table-input finance-search"
            type="search"
            placeholder="Search by name, email, or admission number"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <select className="table-select" value={classFilter} onChange={handleClassFilterChange}>
            {classOptions.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? 'All classes' : option}
              </option>
            ))}
          </select>
          <select className="table-select" value={statusFilter} onChange={handleStatusFilterChange}>
            <option value="all">All statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
          </select>
          <span className="micro-label finance-results-label">
            Showing {paginatedStudents.length} of {filteredStudents.length}
          </span>
        </div>
        <div className="finance-table">
          <div className="finance-header">
            <span>Name</span>
            <span>Class</span>
            <span>Actions</span>
          </div>
          {paginatedStudents.map((student) => {
            const termTotals = summarizePaymentsByTerm(student.payments || []);
            const isExpanded = expandedStudentIds.has(student.id) || editingStudentId === student.id;
            return (
              <div key={student.id} className="finance-student-block">
                <div className="finance-row">
                  <span className="student-name">{student.name}</span>
                  <span>{student.className}</span>
                  <div className="table-actions">
                    {paymentStudentId === student.id ? (
                      <>
                        <input
                          className="table-input payment-input"
                          type="number"
                          min="1"
                          placeholder="Amount"
                          value={paymentForm.amount}
                          onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })}
                        />
                        <select
                          className="table-select"
                          value={paymentForm.term}
                          onChange={(event) => setPaymentForm({ ...paymentForm, term: event.target.value })}
                        >
                          {TERM_OPTIONS.map((term) => (
                            <option key={term} value={term}>
                              {toLabel(term)}
                            </option>
                          ))}
                        </select>
                        <select
                          className="table-select"
                          value={paymentForm.method}
                          onChange={(event) => setPaymentForm({ ...paymentForm, method: event.target.value })}
                        >
                          <option value="Cash">Cash</option>
                          <option value="Bank">Bank</option>
                          <option value="Mobile Money">Mobile Money</option>
                        </select>
                        <button className="button button-primary" onClick={() => savePayment(student.id)} disabled={isSubmitting}>
                          Save
                        </button>
                        <button
                          className="button button-outline"
                          onClick={() => {
                            setPaymentStudentId(null);
                            setPaymentForm({ amount: '', method: 'Cash', reference: '', term: 'termOne' });
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : editingStudentId === student.id ? (
                      <>
                        <button className="button button-primary" onClick={() => saveFinanceEdit(student)} disabled={isSubmitting}>
                          Save
                        </button>
                        <button className="button button-outline" onClick={() => setEditingStudentId(null)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="button button-secondary" onClick={() => beginFinanceEdit(student)}>
                          Edit Fees
                        </button>
                        <button
                          className="button button-primary"
                          onClick={() => setPaymentStudentId(student.id)}
                        >
                          Record Payment
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="finance-breakdown-toggle-row">
                  <button
                    className="finance-breakdown-toggle"
                    type="button"
                    onClick={() => toggleStudentBreakdown(student.id)}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? 'Hide terms' : 'View terms'}
                  </button>
                  {editingStudentId === student.id ? (
                    <span className="micro-label">Edit the term amounts below, then save.</span>
                  ) : null}
                </div>
                {isExpanded && (
                  <div className="finance-term-breakdown">
                    <div className="finance-term-header">
                      <span>Term</span>
                      <span>Expected</span>
                      <span>Paid</span>
                      <span>Balance</span>
                      <span>Status</span>
                    </div>
                    {TERM_OPTIONS.map((term) => {
                      const termData = student.feesByTerm?.[term] || {};
                      const termExpected = Number(termData.total ?? 0);
                      const termPaid = Number(termData.paid ?? termTotals[term] ?? 0);
                      const termBalance = Number(termData.due ?? Math.max(termExpected - termPaid, 0));
                      const termStatus =
                        termData.status ||
                        (termPaid >= termExpected && termExpected > 0 ? 'Paid' : termPaid > 0 ? 'Partial' : 'Pending');

                      return (
                        <div key={term} className="finance-term-row">
                          <span className="micro-label">{toLabel(term)}</span>
                          {editingStudentId === student.id ? (
                            <input
                              className="table-input"
                              type="number"
                              min="0"
                              value={financeForm[term]}
                              onChange={(event) => setFinanceForm({ ...financeForm, [term]: event.target.value })}
                            />
                          ) : (
                            <span>{formatCurrency(termExpected)}</span>
                          )}
                          <span>{formatCurrency(termPaid)}</span>
                          <span>{formatCurrency(termBalance)}</span>
                          <span className={`status-${String(termStatus).toLowerCase()}`}>{termStatus}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {paginatedStudents.length === 0 ? (
            <div className="finance-empty-state">
              <p>No student accounts match the current search or filters.</p>
            </div>
          ) : null}
        </div>
        <div className="finance-pagination">
          <button
            className="button button-outline"
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="micro-label">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="button button-outline"
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>

      <div className="student-section">
        <div className="section-heading-row">
          <h3>Finance Audit Trail</h3>
          <span className="micro-label">Latest finance and payment actions</span>
        </div>
        <div className="audit-log-list">
          {auditLogs.length === 0 ? (
            <p className="audit-empty">No finance activity has been recorded yet.</p>
          ) : (
            auditLogs.map((entry) => (
              <div key={entry.id} className="audit-log-item">
                <div className="audit-log-meta">
                  <strong>{formatAuditLabel(entry.actionType)}</strong>
                  <span>{entry.actorEmail}</span>
                </div>
                <p>{entry.message}</p>
                <span className="micro-label">{entry.createdAt}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function formatCurrency(value) {
  return typeof value === 'number'
    ? new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(value)
    : value;
}

function formatAuditLabel(value) {
  return String(value)
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function summarizePaymentsByTerm(payments) {
  const totals = {
    termOne: 0,
    termTwo: 0,
    termThree: 0,
  };

  (payments || []).forEach((payment) => {
    const term = payment.term || 'termOne';
    if (Object.hasOwn(totals, term)) {
      totals[term] += Number(payment.amount) || 0;
    }
  });

  return totals;
}

function toLabel(value) {
  return String(value)
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}
