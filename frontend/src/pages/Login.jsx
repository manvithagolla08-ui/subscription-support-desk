
import { useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import "./Login.css";

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <p className="login-message">Checking your session...</p>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const authenticatedUser = await login(email.trim(), password);

      const roleDestinations = {
        CUSTOMER: "/dashboard",
        SPECIALIST: "/support",
        KNOWLEDGE_MANAGER: "/support",
        SUPERVISOR: "/dashboard",
      };

      const destination =
        roleDestinations[authenticatedUser.role];

      if (!destination) {
        setError(
          "Your account has an unsupported role. Please contact support."
        );
        return;
      }

      const requestedPath = location.state?.from?.pathname;

      // Use a safe, known application route instead of arbitrary URLs.
      navigate(
        requestedPath && requestedPath.startsWith("/")
          ? requestedPath
          : destination,
        { replace: true }
      );
    } catch (err) {
      setError(err.message || "Unable to log in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="login-logo">S</div>
          <p>SUBSCRIPTION SUPPORT DESK</p>
        </div>

        <h1>Welcome back</h1>

        <p className="login-subtitle">
          Sign in to manage your subscriptions and support requests.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
          />

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="login-signup">
          Don't have an account?{" "}
          <Link to="/signup">Sign up</Link>
        </p>

        <p className="login-footer">
          Secure access to your support workspace.
        </p>
      </section>
    </main>
  );
}
