
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p>Checking authentication...</p>;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const roleDestinations = {
      CUSTOMER: "/dashboard",
      SPECIALIST: "/support",
      KNOWLEDGE_MANAGER: "/support",
      SUPERVISOR: "/dashboard",
    };

    return (
      <Navigate
        to={roleDestinations[user.role] || "/login"}
        replace
      />
    );
  }

  return <Outlet />;
}
