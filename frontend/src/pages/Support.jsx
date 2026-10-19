
import { useEffect, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import api from "../services/api";




function Support() {
  const [tickets, setTickets] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState("");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadSupportData() {
    setLoading(true);
    setError("");

    try {
      const [ticketResponse, conversationResponse] = await Promise.all([
        api.get("/tickets"),
        api.get("/conversations"),
      ]);

      setTickets(ticketResponse.data || []);
      setConversations(conversationResponse.data || []);
    } 
 catch (err) {
  setError(err.message || "Could not load support information.");
}
 finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSupportData();
  }, []);

  async function handleEscalate(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!conversationId || !title.trim()) {
      setError("Select a conversation and enter a ticket title.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/tickets/escalate", {
        conversationId,
        title: title.trim(),
        priority,
      });

      setMessage("Conversation escalated successfully.");
      setConversationId("");
      setTitle("");
      setPriority("MEDIUM");

      await loadSupportData();
    } catch (err) {
      setError(err.message || "Could not escalate the conversation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Support"
        description="View your support tickets or escalate an AI conversation to human support."
      />

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      <Card>
        <h2>Escalate a Conversation</h2>
        <p>Select a conversation that needs help from the support team.</p>

        <form onSubmit={handleEscalate}>
          <div>
            <label htmlFor="conversation">Conversation</label>
            <select
              id="conversation"
              value={conversationId}
              onChange={(event) => setConversationId(event.target.value)}
              required
            >
              <option value="">Select a conversation</option>
              {conversations.map((conversation) => (
                <option key={conversation._id} value={conversation._id}>
                  {conversation.title || `Conversation ${conversation._id}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ticket-title">Ticket title</label>
            <input
              id="ticket-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Briefly describe the issue"
              required
            />
          </div>

          <div>
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? "Escalating..." : "Escalate to Support"}
          </Button>
        </form>

        {conversations.length === 0 && !loading && (
          <p>No conversations found to escalate.</p>
        )}
      </Card>

      <Card>
        <h2>My Support Tickets</h2>

        {loading ? (
          <p>Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <p>You don't have any support tickets yet.</p>
        ) : (
          <div>
            {tickets.map((ticket) => (
              <article key={ticket._id}>
                <h3>{ticket.title}</h3>
                <p>
                  <strong>Status:</strong> {ticket.status}
                </p>
                <p>
                  <strong>Priority:</strong> {ticket.priority}
                </p>
                <p>{ticket.description}</p>
                <hr />
              </article>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

export default Support;
