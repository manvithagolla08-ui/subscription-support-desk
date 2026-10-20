import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

function Sidebar() {
  const { user } = useAuth();
  const role = user?.role;

  const navItems = [
  {
    label: "Subscriptions",
    path: "/subscriptions",
    show: ["CUSTOMER", "KNOWLEDGE_MANAGER", "SUPERVISOR"].includes(role),
  },
  {
    label: "Supervisor",
    path: "/supervisor",
    show: role === "SUPERVISOR"
},
  {
    label: "Support",
    path: "/support",
    show: ["CUSTOMER", "SPECIALIST", "KNOWLEDGE_MANAGER", "SUPERVISOR"].includes(role),
  },
  {
    label: "Specialist Tickets",
    path: "/specialist",
    show: ["SPECIALIST", "SUPERVISOR"].includes(role),
  },
  {
    label: "Knowledge Base",
    path: "/knowledge",
    show: ["KNOWLEDGE_MANAGER", "SUPERVISOR"].includes(role),
  },
];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Support Desk</h2>
      </div>

      <nav className="sidebar-nav">
        {navItems
          .filter((item) => item.show)
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? "sidebar-link active" : "sidebar-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
      </nav>
    </aside>
  );
}

export default Sidebar;