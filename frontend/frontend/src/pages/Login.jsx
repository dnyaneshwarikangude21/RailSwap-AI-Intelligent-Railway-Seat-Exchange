import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  TrainFront,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { hasErrors, validateLogin } from "../utils/validators";

const DEMO_ACCOUNTS = [
  {
    label: "Passenger",
    detail: "Aarav · pending request",
    email: "aarav@railswap.demo",
    password: "Demo@1234",
  },
  {
    label: "Recipient",
    detail: "Priya · incoming request",
    email: "priya@railswap.demo",
    password: "Demo@1234",
  },
  {
    label: "Match-ready",
    detail: "Rohan · reciprocal match",
    email: "rohan@railswap.demo",
    password: "Demo@1234",
  },
  {
    label: "Administrator",
    detail: "Demo operations",
    email: "admin@railswap.demo",
    password: "Admin@12345",
  },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || "/dashboard";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const nextErrors = validateLogin(values);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setSubmitting(true);
    try {
      await login(values.email.trim(), values.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Sign in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function useDemo(account) {
    setValues({ email: account.email, password: account.password });
    setErrors({});
    setError("");
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
            <span className="status-dot" /> Consent-based matching prototype
          </span>
          <h1>
            Better journeys,
            <br />
            matched in <span>both directions.</span>
          </h1>
          <p>
            RailSwap AI identifies reciprocal berth preferences on synthetic
            journeys, explains every recommendation, and lets both passengers
            decide. It never represents application consent as an official
            railway change.
          </p>
          <div className="auth-feature-list">
            <div>
              <CheckCircle2 size={18} aria-hidden="true" />
              Deterministic reciprocal eligibility
            </div>
            <div>
              <BrainCircuit size={18} aria-hidden="true" />
              Explainable scoring with a rule fallback
            </div>
            <div>
              <ShieldCheck size={18} aria-hidden="true" />
              Ownership checks and private match results
            </div>
            <div>
              <UsersRound size={18} aria-hidden="true" />
              Two-sided consent workflow
            </div>
          </div>
        </div>

        <div className="auth-visual-footer">
          <span>SYNTHETIC DEMONSTRATION DATA</span>
          <span>No railway system is contacted</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-heading">
            <span className="eyebrow">Secure demo workspace</span>
            <h2>Sign in to RailSwap AI</h2>
            <p>Continue to your berth exchange workspace.</p>
          </div>

          {error && (
            <div className="inline-notice inline-notice-danger" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <div className="input-with-icon">
                <Mail size={17} aria-hidden="true" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@railswap.demo"
                  value={values.email}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
              </div>
              {errors.email && (
                <p className="field-error" id="email-error">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <LockKeyhole size={17} aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={values.password}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                />
              </div>
              {errors.password && (
                <p className="field-error" id="password-error">
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign in"}
              <ArrowRight size={17} />
            </button>
          </form>

          <p className="auth-switch">
            New to the demo? <Link to="/register">Create an account</Link>
          </p>

          <div className="demo-accounts">
            <div className="demo-accounts-heading">
              <span>Local demo accounts</span>
              <small>Select to fill credentials</small>
            </div>
            <div className="demo-account-grid">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  type="button"
                  key={account.email}
                  className="demo-account"
                  onClick={() => useDemo(account)}
                >
                  <strong>{account.label}</strong>
                  <span>{account.detail}</span>
                </button>
              ))}
            </div>
            <p className="demo-warning">
              Demo-only credentials. Change all secrets and credentials before any
              deployment.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
