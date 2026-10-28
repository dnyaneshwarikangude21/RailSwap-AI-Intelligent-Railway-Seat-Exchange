import {
  ArrowRight,
  BrainCircuit,
  LockKeyhole,
  Mail,
  ShieldCheck,
  TrainFront,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { hasErrors, validateRegistration } from "../utils/validators";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({
    display_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const nextErrors = validateRegistration(values);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setSubmitting(true);
    try {
      await register({
        display_name: values.display_name.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="auth-page">
      <section className="auth-visual">
        <Link to="/login" className="auth-brand">
          <span className="brand-mark">
            <TrainFront size={24} />
          </span>
          <span>
            <strong>RailSwap AI</strong>
            <small>Intelligent berth exchange</small>
          </span>
        </Link>

        <div className="auth-visual-copy">
          <span className="eyebrow">
            <span className="status-dot" /> Create a local demo account
          </span>
          <h1>
            A calmer way to find a
            <br />
            <span>mutually useful berth.</span>
          </h1>
          <p>
            Add a synthetic booking, set a berth preference, and review only
            reciprocal candidates. Every request requires explicit consent from
            both application users.
          </p>
          <div className="auth-feature-list">
            <div>
              <ShieldCheck size={18} aria-hidden="true" />
              Passwords hashed with Werkzeug
            </div>
            <div>
              <TrainFront size={18} aria-hidden="true" />
              Fictional trains and demo bookings
            </div>
            <div>
              <BrainCircuit size={18} aria-hidden="true" />
              Transparent weighted compatibility scores
            </div>
            <div>
              <UsersRound size={18} aria-hidden="true" />
              In-app notifications and consent states
            </div>
          </div>
        </div>

        <div className="auth-visual-footer">
          <span>NO REAL TICKET DETAILS REQUIRED</span>
          <span>Academic prototype</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-heading">
            <span className="eyebrow">Demo registration</span>
            <h2>Create your account</h2>
            <p>Use any fictional name and email for this prototype.</p>
          </div>

          {error && (
            <div className="inline-notice inline-notice-danger" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="display_name">Display name</label>
              <div className="input-with-icon">
                <UserRound size={17} aria-hidden="true" />
                <input
                  id="display_name"
                  type="text"
                  autoComplete="name"
                  placeholder="Demo passenger"
                  value={values.display_name}
                  onChange={(event) => update("display_name", event.target.value)}
                  aria-invalid={Boolean(errors.display_name)}
                />
              </div>
              {errors.display_name && (
                <p className="field-error">{errors.display_name}</p>
              )}
            </div>

            <div className="field">
              <label htmlFor="email">Email address</label>
              <div className="input-with-icon">
                <Mail size={17} aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="demo@example.com"
                  value={values.email}
                  onChange={(event) => update("email", event.target.value)}
                  aria-invalid={Boolean(errors.email)}
                />
              </div>
              {errors.email && <p className="field-error">{errors.email}</p>}
            </div>

            <div className="form-grid two-column">
              <div className="field">
                <label htmlFor="password">Password</label>
                <div className="input-with-icon">
                  <LockKeyhole size={17} aria-hidden="true" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={values.password}
                    onChange={(event) => update("password", event.target.value)}
                    aria-invalid={Boolean(errors.password)}
                  />
                </div>
                {errors.password && (
                  <p className="field-error">{errors.password}</p>
                )}
              </div>
              <div className="field">
                <label htmlFor="confirm_password">Confirm password</label>
                <div className="input-with-icon">
                  <LockKeyhole size={17} aria-hidden="true" />
                  <input
                    id="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    value={values.confirm_password}
                    onChange={(event) =>
                      update("confirm_password", event.target.value)
                    }
                    aria-invalid={Boolean(errors.confirm_password)}
                  />
                </div>
                {errors.confirm_password && (
                  <p className="field-error">{errors.confirm_password}</p>
                )}
              </div>
            </div>

            <p className="field-hint">
              By creating an account, you acknowledge that this is a synthetic
              demonstration and does not interact with railway reservation systems.
            </p>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={submitting}
            >
              {submitting ? "Creating account..." : "Create demo account"}
              <ArrowRight size={17} />
            </button>
          </form>

          <p className="auth-switch">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
