import { Outlet } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import Sidebar from "../components/sidebar/Sidebar";
import LogoutButton from "../components/LogoutButton";

function MainLayout() {
  return (
    <div className="app-layout">
      <Navbar />

      {/* Logout button */}
      <div className="layout-logout">
        <LogoutButton />
      </div>

      <div className="app-body">
        <Sidebar />

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;