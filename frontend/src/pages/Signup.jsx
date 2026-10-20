import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../api/client";
import "./Signup.css";

export default function Signup() {
  const navigate = useNavigate();

const [form, setForm] = useState({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "CUSTOMER",
});

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const result = await apiRequest("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
  name: form.name.trim(),
  email: form.email.trim(),
  password: form.password,
  role: form.role,
}),
      });

      if (result.success) {
        navigate("/login", {
          state: {
            message: "Account created successfully. Please log in.",
          },
        });
      } else {
        setError(result.message || "Registration failed.");
      }
    } catch (err) {
      setError(err.message || "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-page">
      <form className="signup-form" onSubmit={handleSubmit}>
        <h1>Create an account</h1>
        <p>Register for the Subscription Product Support Desk.</p>

        <label htmlFor="name">Full name</label>
        <input
          id="name"
          name="name"
          value={form.name}
          onChange={handleChange}
          autoComplete="name"
          required
        />

        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          required
        />

<label htmlFor="role">Account role</label>
<select
  id="role"
  name="role"
  value={form.role}
  onChange={handleChange}
  required
>
  <option value="CUSTOMER">Customer</option>
  <option value="SPECIALIST">Support Specialist</option>
  <option value="KNOWLEDGE_MANAGER">Knowledge Manager</option>
  <option value="SUPERVISOR">Supervisor</option>
</select>

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          autoComplete="new-password"
          minLength={8}
          required
        />

        <label htmlFor="confirmPassword">Confirm password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={form.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          required
        />

        {error && <p className="signup-error" role="alert">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Sign Up"}
        </button>

        <p className="signup-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}