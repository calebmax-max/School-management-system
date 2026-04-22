import { useState } from 'react';
import PasswordField from './PasswordField';

export default function SignUp({ onSubmit, onSwitch, error = '', isSubmitting = false }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit?.(form);
  };

  return (
    <section className="auth-card">
      <div className="auth-copy">
        <p className="eyebrow">Get started</p>
        <h1>Create your account</h1>
        <p>
          Register as a student or teacher. Admin and accountant accounts are created separately by the school.
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>Full name</span>
          <input
            type="text"
            value={form.fullName}
            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
            placeholder="Enter your name"
            required
          />
        </label>

        <label className="auth-field">
          <span>Email address</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="name@school.edu"
            required
          />
        </label>

        <div className="auth-field-grid">
          <PasswordField
            label="Password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder="Create a password"
            required
          />

          <PasswordField
            label="Confirm password"
            value={form.confirmPassword}
            onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
            placeholder="Confirm password"
            required
          />
        </div>

        <label className="auth-field">
          <span>Role</span>
          <select
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value })}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : 'Sign Up'}
        </button>

        <p className="auth-footer">
          Already have an account?{' '}
          <button className="auth-link" type="button" onClick={onSwitch}>
            Sign in
          </button>
        </p>
      </form>
    </section>
  );
}
