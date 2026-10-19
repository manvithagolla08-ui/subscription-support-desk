import { Navigate, Route, Routes } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import Dashboard from "../pages/Dashboard";
import Subscriptions from "../pages/Subscriptions";
import Support from "../pages/Support";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import ProtectedRoute from "../auth/ProtectedRoute";

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          {/* Only customers and supervisors can access subscriptions */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={["CUSTOMER", "SUPERVISOR"]}
              />
            }
          >
            <Route
              path="/subscriptions"
              element={<Subscriptions />}
            />
          </Route>

          <Route
            path="/support"
            element={<Support />}
          />
        </Route>
      </Route>

      {/* Redirect unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;