
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setLoading(true);
    setError("");

    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setError("Logout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="logout-container">
      <button
        type="button"
        className="logout-button"
        onClick={handleLogout}
        disabled={loading}
      >
        {loading ? "Logging out..." : "Logout"}
      </button>

      {error && <p role="alert" className="logout-error">{error}</p>}
    </div>
  );
}

