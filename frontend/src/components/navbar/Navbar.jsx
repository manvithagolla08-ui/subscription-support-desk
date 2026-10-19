function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-brand">
        <h1>Subscription Support Desk</h1>
      </div>

      <div className="navbar-actions">
        <button type="button" className="navbar-button">
          Notifications
        </button>

        <button type="button" className="navbar-button">
          Profile
        </button>
      </div>
    </header>
  );
}

export default Navbar;