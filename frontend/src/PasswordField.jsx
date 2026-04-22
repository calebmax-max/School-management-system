import { useId, useState } from 'react';

export default function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const inputId = useId();

  return (
    <label className="auth-field">
      <span>{label}</span>
      <div className="password-input-wrap">
        <input
          id={inputId}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
        />
        <button
          className="password-toggle"
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={isVisible ? `Hide ${label}` : `Show ${label}`}
          aria-pressed={isVisible}
          title={isVisible ? 'Hide password' : 'Show password'}
        >
          <EyeIcon crossed={!isVisible} />
        </button>
      </div>
    </label>
  );
}

function EyeIcon({ crossed = false }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M1.5 12s3.8-6 10.5-6 10.5 6 10.5 6-3.8 6-10.5 6S1.5 12 1.5 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      {crossed ? (
        <path
          d="M4 20 20 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}
