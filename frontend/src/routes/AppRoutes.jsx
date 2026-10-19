import { Navigate, Route, Routes } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";

import Dashboard from "../pages/Dashboard";
import Subscriptions from "../pages/Subscriptions";
import Support from "../pages/Support";

function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route
          path="/"
          element={<Navigate to="/dashboard" replace />}
        />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route
          path="/subscriptions"
          element={<Subscriptions />}
        />

        <Route path="/support" element={<Support />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;