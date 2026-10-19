import { useState } from "react";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import api from "../services/api";
import "./RolePages.css";

const VALID_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "ESCALATED"];
const VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

function SpecialistDashboard() {
  const [ticketId, setTicketId] = useState("");
  const [status, setStatus] = useState("IN_PROGRESS");
  const [priority, setPriority] = useState("MEDIUM");
  const [loading, setLoading] = useState(false);
  const [updatedTicket, setUpdatedTicket] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleUpdateTicket(e) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setUpdatedTicket(null);

    const cleanId = ticketId.trim();
    if (!cleanId) {
      setError("Please enter a valid Ticket ID.");
      return;
    }

    setLoading(true);
    try {
      // Calls PATCH /api/tickets/:ticketId (supported by backend for SPECIALIST/SUPERVISOR)
      const payload = { status, priority };
      const response = await api.patch(`/tickets/${cleanId}`, payload);

      if (response?.success) {
        setSuccessMessage("Ticket updated successfully!");
        setUpdatedTicket(response.data);
      } else {
        setError(response?.message || "Failed to update ticket.");
      }
    } catch (err) {
      setError(err?.message || "An error occurred while updating the ticket.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="specialist-container">
      <PageHeader
        title="Support Specialist Dashboard"
        description="View and update ticket resolution status and priority levels."
      />

      {error && <div className="alert-box alert-error">{error}</div>}
      {successMessage && <div className="alert-box alert-success">{successMessage}</div>}

      <div className="specialist-grid">
        <Card className="ticket-editor-card">
          <h3>Update Ticket Status</h3>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 12px 0" }}>
            Enter the ticket ID provided by customers or escalation workflows to manage status and priority.
          </p>

          <form onSubmit={handleUpdateTicket} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="form-group">
              <label htmlFor="ticket-id">Ticket ID</label>
              <input
                id="ticket-id"
                type="text"
                className="form-control"
                placeholder="e.g. 6ad4d4a92e0e2eb50c77fb8a"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="ticket-status">Status</label>
              <select
                id="ticket-status"
                className="form-control"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {VALID_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="ticket-priority">Priority</label>
              <select
                id="ticket-priority"
                className="form-control"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {VALID_PRIORITIES.map((pr) => (
                  <option key={pr} value={pr}>
                    {pr}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Updating..." : "Update Ticket"}
            </Button>
          </form>
        </Card>

        <Card className="ticket-details-card">
          <h3>Ticket Information</h3>
          {updatedTicket ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
              <div>
                <strong>Title:</strong> {updatedTicket.title}
              </div>
              <div>
                <strong>Ticket ID:</strong> <code>{updatedTicket._id}</code>
              </div>
              <div>
                <strong>Status:</strong>{" "}
                <span className={`ticket-status-badge badge-${updatedTicket.status.toLowerCase()}`}>
                  {updatedTicket.status}
                </span>
              </div>
              <div>
                <strong>Priority:</strong> {updatedTicket.priority}
              </div>
              <div>
                <strong>Description:</strong>
                <p style={{ background: "#f9fafb", padding: "12px", borderRadius: "6px", fontSize: "14px" }}>
                  {updatedTicket.description}
                </p>
              </div>
              <div>
                <small style={{ color: "#9ca3af" }}>
                  Last Updated: {updatedTicket.updatedAt ? new Date(updatedTicket.updatedAt).toLocaleString() : "Just now"}
                </small>
              </div>
            </div>
          ) : (
            <p style={{ color: "#6b7280", fontSize: "14px" }}>
              Submit a ticket update using the form on the left to preview updated ticket details here.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

export default SpecialistDashboard;
