import { useState } from 'react';
import PasswordField from './PasswordField';

export default function SignIn({ onSubmit, onSwitch, error = '', isSubmitting = false }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit?.(form);
  };

  return (
    <section className="auth-card">
      <div className="auth-copy">
        <p className="eyebrow">Welcome back</p>
        <h1>Sign in to SchoolHub</h1>
        <p>Welcome back! Sign in to access your school dashboard and continue where you left off.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
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

        <PasswordField
          label="Password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          placeholder="Enter your password"
          required
        />

        {error && <p className="auth-error">{error}</p>}

        <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>

        <p className="auth-footer">
          New here?{' '}
          <button className="auth-link" type="button" onClick={onSwitch}>
            Create an account
          </button>
        </p>
      </form>
    </section>
  );
}
