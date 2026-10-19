
import { useCallback, useEffect, useRef, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import api from "../services/api";
import "./Support.css";

function getErrorMessage(error) {
  return error?.message || "Something went wrong. Please try again.";
}

function Support() {
  const [tickets, setTickets] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const [conversationId, setConversationId] = useState("");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("MEDIUM");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const loadSupportData = useCallback(async () => {
    const [ticketResponse, conversationResponse] = await Promise.all([
      api.get("/tickets"),
      api.get("/conversations"),
    ]);

    setTickets(ticketResponse.data || []);
    setConversations(conversationResponse.data || []);

    return conversationResponse.data || [];
  }, []);

  const openConversation = useCallback(
    async (id) => {
      setActiveId(id);
      setError("");

      const cached = conversations.find(
        (conversation) => conversation._id === id
      );

      setMessages(cached?.messages || []);

      try {
        const response = await api.get(
          `/conversations/${encodeURIComponent(id)}`
        );

        const conversation = response.data;
        setMessages(conversation.messages || []);
        setActiveId(conversation._id);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    },
    [conversations]
  );

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setLoading(true);
      setError("");

      try {
        const items = await loadSupportData();

        if (cancelled) return;

        if (items.length > 0) {
          const latest = items[0];
          setActiveId(latest._id);
          setMessages(latest.messages || []);

          try {
            const response = await api.get(
              `/conversations/${encodeURIComponent(latest._id)}`
            );

            if (!cancelled) {
              setMessages(response.data.messages || []);
            }
          } catch (err) {
            if (!cancelled) setError(getErrorMessage(err));
          }
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [loadSupportData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function createConversation() {
    if (creating || sending) return;

    setCreating(true);
    setError("");

    try {
      const response = await api.post("/conversations", {
        title: "New conversation",
      });

      const conversation = response.data;

      setConversations((previous) => [
        conversation,
        ...previous.filter((item) => item._id !== conversation._id),
      ]);

      setActiveId(conversation._id);
      setMessages([]);
      setInput("");
      inputRef.current?.focus();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();

    const content = input.trim();

    if (!content || sending || loading || creating) return;

    setError("");
    setSending(true);
    setInput("");

    let id = activeId;

    try {
      if (!id) {
        const created = await api.post("/conversations", {
          title: content.slice(0, 45),
        });

        id = created.data._id;
        setActiveId(id);

        setConversations((previous) => [
          created.data,
          ...previous.filter((item) => item._id !== created.data._id),
        ]);
      }

      setMessages((previous) => [
        ...previous,
        {
          _id: `temporary-${Date.now()}`,
          role: "user",
          content,
          createdAt: new Date().toISOString(),
        },
      ]);

      const response = await api.post(
        `/conversations/${encodeURIComponent(id)}/messages`,
        { content }
      );

      const conversation = response.data;

      setMessages(conversation.messages || []);
      setActiveId(conversation._id);

      setConversations((previous) => [
        conversation,
        ...previous.filter((item) => item._id !== conversation._id),
      ]);
    } catch (err) {
      setError(getErrorMessage(err));

      if (id) {
        try {
          const refreshed = await api.get(
            `/conversations/${encodeURIComponent(id)}`
          );
          setMessages(refreshed.data.messages || []);
        } catch {
          // Keep the messages already visible if refresh fails.
        }
      } else {
        setMessages((previous) =>
          previous.filter(
            (item) => !String(item._id).startsWith("temporary-")
          )
        );
      }

      setInput(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

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

      const items = await loadSupportData();

      // Keep the currently selected conversation open.
      if (activeId && items.some((item) => item._id === activeId)) {
        await openConversation(activeId);
      }
    } catch (err) {
      setError(getErrorMessage(err) || "Could not escalate the conversation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="customer-support-page">
      <PageHeader
        title="AI Support"
        description="Chat with your subscription support assistant, view tickets, or escalate a conversation to human support."
      />

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      <Card>
        <div className="customer-chat">
          <aside className="customer-chat-sidebar">
            <button
              className="customer-chat-new"
              type="button"
              onClick={createConversation}
              disabled={creating || sending}
            >
              <span>＋</span>
              {creating ? "Creating..." : "New conversation"}
            </button>

            <p className="customer-chat-section-label">
              RECENT CONVERSATIONS
            </p>

            <div className="customer-chat-history">
              {loading ? (
                <p className="customer-chat-muted">Loading conversations...</p>
              ) : conversations.length === 0 ? (
                <p className="customer-chat-muted">
                  No conversations yet. Start a new one!
                </p>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation._id}
                    type="button"
                    className={`customer-chat-history-item ${
                      activeId === conversation._id ? "active" : ""
                    }`}
                    onClick={() => openConversation(conversation._id)}
                    disabled={sending}
                  >
                    <span className="customer-chat-history-icon">◷</span>
                    <span className="customer-chat-history-details">
                      <strong>
                        {conversation.title || "New conversation"}
                      </strong>
                      <small>
                        {conversation.messages?.length || 0} messages
                      </small>
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="customer-chat-sidebar-footer">
              <span className="customer-chat-online-dot" />
              AI support assistant
            </div>
          </aside>

          <section className="customer-chat-main">
            <header className="customer-chat-header">
              <div className="customer-chat-avatar">✦</div>
              <div>
                <h2>Support Assistant</h2>
                <p>
                  <span className="customer-chat-online-dot" />
                  Ready to help
                </p>
              </div>
              <span className="customer-chat-badge">AI POWERED</span>
            </header>

            <div className="customer-chat-messages" aria-live="polite">
              {loading ? (
                <div className="customer-chat-welcome">
                  <div className="customer-chat-welcome-icon">✦</div>
                  <h3>Loading your support chat...</h3>
                  <p>Just a moment.</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="customer-chat-welcome">
                  <div className="customer-chat-welcome-icon">✦</div>
                  <span className="customer-chat-eyebrow">
                    YOUR AI ASSISTANT
                  </span>
                  <h3>Hey there! How can I help?</h3>
                  <p>
                    Ask about your subscription, plan details, or support
                    tickets. I'll look for answers in the available help
                    articles.
                  </p>

                  <div className="customer-chat-suggestions">
                    {[
                      "How can I track my support ticket?",
                      "How do I check my subscription?",
                      "Where can I find my plan details?",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          setInput(suggestion);
                          inputRef.current?.focus();
                        }}
                      >
                        {suggestion}
                        <span>↗</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="customer-chat-message-list">
                  {messages.map((chatMessage, index) => (
                    <div
                      key={
                        chatMessage._id ||
                        `${chatMessage.role}-${index}`
                      }
                      className={`customer-chat-message ${
                        chatMessage.role === "user" ? "from-user" : "from-ai"
                      }`}
                    >
                      {chatMessage.role === "assistant" && (
                        <div className="customer-chat-message-avatar">✦</div>
                      )}

                      <div className="customer-chat-message-body">
                        <span className="customer-chat-message-author">
                          {chatMessage.role === "user" ? "You" : "Support AI"}
                        </span>

                        <div className="customer-chat-bubble">
                          {chatMessage.content}
                        </div>

                        {(chatMessage.createdAt || chatMessage.timestamp) && (
                          <time className="customer-chat-time">
                            {new Date(
                              chatMessage.createdAt || chatMessage.timestamp
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </time>
                        )}
                      </div>
                    </div>
                  ))}

                  {sending && (
                    <div className="customer-chat-message from-ai">
                      <div className="customer-chat-message-avatar">✦</div>
                      <div className="customer-chat-message-body">
                        <span className="customer-chat-message-author">
                          Support AI
                        </span>
                        <div
                          className="customer-chat-bubble customer-chat-typing"
                          role="status"
                          aria-label="AI is generating a response"
                        >
                          <span />
                          <span />
                          <span />
                          <small>Thinking...</small>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>
              )}

              {error && (
                <div className="customer-chat-error" role="alert">
                  <span>{error}</span>
                  <button type="button" onClick={() => setError("")}>
                    Dismiss
                  </button>
                </div>
              )}
            </div>

            <form className="customer-chat-composer" onSubmit={sendMessage}>
              <label htmlFor="customer-chat-input" className="customer-chat-sr">
                Your message
              </label>

              <div className="customer-chat-input-box">
                <textarea
                  id="customer-chat-input"
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage(event);
                    }
                  }}
                  placeholder="Ask anything about your subscription..."
                  rows={2}
                  maxLength={3000}
                  disabled={sending || loading || creating}
                />

                <button
                  type="submit"
                  className="customer-chat-send"
                  disabled={!input.trim() || sending || loading || creating}
                  aria-label="Send message"
                >
                  {sending ? "…" : "↑"}
                </button>
              </div>

              <div className="customer-chat-composer-footer">
                <span>Enter to send · Shift + Enter for a new line</span>
                <span>{input.length}/3000</span>
              </div>
            </form>
          </section>
        </div>
      </Card>

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
              maxLength={150}
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
    </div>
  );
}

export default Support;
