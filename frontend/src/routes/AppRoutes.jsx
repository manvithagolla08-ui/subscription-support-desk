import { Navigate, Route, Routes } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import Dashboard from "../pages/Dashboard";
import Subscriptions from "../pages/Subscriptions";
import Support from "../pages/Support";
import SpecialistDashboard from "../pages/SpecialistDashboard";
import KnowledgeManager from "../pages/KnowledgeManager";
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

          {/* Subscriptions: Customers and Supervisors only */}
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

          {/* Specialist Dashboard: Support Specialists and Supervisors only */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={["SPECIALIST", "SUPERVISOR"]}
              />
            }
          >
            <Route
              path="/specialist"
              element={<SpecialistDashboard />}
            />
          </Route>

          {/* Knowledge Manager: Knowledge Managers and Supervisors only */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={["KNOWLEDGE_MANAGER", "SUPERVISOR"]}
              />
            }
          >
            <Route
              path="/knowledge"
              element={<KnowledgeManager />}
            />
          </Route>
        </Route>
      </Route>

      {/* Redirect unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;