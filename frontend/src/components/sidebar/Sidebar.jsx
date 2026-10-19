import { NavLink } from "react-router-dom";

function Sidebar() {
  const navItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
    },
    {
      label: "Subscriptions",
      path: "/subscriptions",
    },
    {
      label: "Support",
      path: "/support",
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Support Desk</h2>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
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