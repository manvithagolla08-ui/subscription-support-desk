import { useCallback, useEffect, useRef, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import api from "../services/api";
import "./Support.css";

function getErrorMessage(error) {
  return error?.message || "Something went wrong. Please try again.";
}

function Support() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const loadConversations = useCallback(async () => {
    const response = await api.get("/conversations");
    return response.data || [];
  }, []);

  const openConversation = useCallback(async (conversationId) => {
    setActiveId(conversationId);
    setError("");

    const cached = conversations.find(
      (conversation) => conversation._id === conversationId
    );

    setMessages(cached?.messages || []);

    try {
      const response = await api.get(
        `/conversations/${encodeURIComponent(conversationId)}`
      );

      const conversation = response.data;
      setMessages(conversation.messages || []);
      setActiveId(conversation._id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [conversations]);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setLoading(true);
      setError("");

      try {
        const items = await loadConversations();

        if (cancelled) return;

        setConversations(items);

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
  }, [loadConversations]);

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

    let conversationId = activeId;

    try {
      if (!conversationId) {
        const created = await api.post("/conversations", {
          title: content.slice(0, 45),
        });

        conversationId = created.data._id;
        setActiveId(conversationId);

        setConversations((previous) => [
          created.data,
          ...previous,
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
        `/conversations/${encodeURIComponent(conversationId)}/messages`,
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

      if (conversationId) {
        try {
          const refreshed = await api.get(
            `/conversations/${encodeURIComponent(conversationId)}`
          );

          setMessages(refreshed.data.messages || []);
        } catch {
          // Keep the visible messages if refreshing fails.
        }
      } else {
        setMessages((previous) =>
          previous.filter(
            (message) => !String(message._id).startsWith("temporary-")
          )
        );
      }

      setInput(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  const activeConversation = conversations.find(
    (conversation) => conversation._id === activeId
  );

  return (
    <div className="customer-support-page">
      <PageHeader
        title="AI Support"
        description="Your subscription support assistant, ready to help."
      />

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
                <p className="customer-chat-muted">
                  Loading conversations...
                </p>
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
                  {messages.map((message, index) => (
                    <div
                      key={message._id || `${message.role}-${index}`}
                      className={`customer-chat-message ${
                        message.role === "user" ? "from-user" : "from-ai"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="customer-chat-message-avatar">
                          ✦
                        </div>
                      )}

                      <div className="customer-chat-message-body">
                        <span className="customer-chat-message-author">
                          {message.role === "user" ? "You" : "Support AI"}
                        </span>

                        <div className="customer-chat-bubble">
                          {message.content}
                        </div>

                        {(message.createdAt || message.timestamp) && (
                          <time className="customer-chat-time">
                            {new Date(
                              message.createdAt || message.timestamp
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
                  disabled={
                    !input.trim() || sending || loading || creating
                  }
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
    </div>
  );
}

export default Support;
