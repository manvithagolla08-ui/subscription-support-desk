import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import api from "../services/api";
import "./RolePages.css";

const DRAFTS_STORAGE_KEY = "km_drafts";

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || "CUSTOMER";

  const [publishedCount, setPublishedCount] = useState(0);
  const [draftCount, setDraftCount] = useState(0);
  const [recentArticles, setRecentArticles] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [systemStatus, setSystemStatus] = useState("Operational");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadDashboardMetrics() {
      setLoading(true);
      try {
        // 1. Fetch published articles from GET /api/help
        try {
          const helpRes = await api.get("/help");
          if (!ignore && Array.isArray(helpRes?.data)) {
            setPublishedCount(helpRes.data.length);
            setRecentArticles(helpRes.data.slice(0, 3));
          }
        } catch {
          if (!ignore) {
            setPublishedCount(0);
            setRecentArticles([]);
          }
        }

        // 2. Read local drafts count from localStorage
        try {
          const savedDrafts = localStorage.getItem(DRAFTS_STORAGE_KEY);
          if (savedDrafts) {
            const parsed = JSON.parse(savedDrafts);
            if (!ignore && Array.isArray(parsed)) {
              setDraftCount(parsed.length);
            }
          }
        } catch {
          // ignore parsing error
        }

        // 3. Fetch incident/service status from GET /api/status
        try {
          const statusRes = await api.get("/status");
          if (!ignore && statusRes?.data) {
            const list = Array.isArray(statusRes.data) ? statusRes.data : [];
            setIncidents(list);
            const hasOutage = list.some(
              (i) => i.status && i.status !== "RESOLVED" && i.status !== "OPERATIONAL"
            );
            setSystemStatus(hasOutage ? "Degraded" : "All Systems Operational");
          }
        } catch {
          if (!ignore) setSystemStatus("Operational");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadDashboardMetrics();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="dashboard-container">
      {/* WELCOME BANNER */}
      <div className="dashboard-welcome-card">
        <div className="dashboard-welcome-text">
          <h2>Welcome back, {user?.name || "Team Member"}!</h2>
          <p>
            Here is your subscription support desk overview and quick management actions.
          </p>
        </div>
        <div className="dashboard-role-pill">
          ROLE: {role}
        </div>
      </div>

      <PageHeader
        title="Overview & Metrics"
        description="Key statistics and system health indicators."
      />

      {/* METRICS OVERVIEW GRID */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-box metric-icon-blue">📚</div>
          <div className="metric-info">
            <span className="metric-number">{loading ? "..." : publishedCount}</span>
            <span className="metric-title">Published Articles</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box metric-icon-amber">📝</div>
          <div className="metric-info">
            <span className="metric-number">{loading ? "..." : draftCount}</span>
            <span className="metric-title">Active Drafts</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box metric-icon-purple">🤖</div>
          <div className="metric-info">
            <span className="metric-number">Vector AI</span>
            <span className="metric-title">Search & Embeddings</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box metric-icon-green">⚡</div>
          <div className="metric-info">
            <span className="metric-number" style={{ fontSize: "16px" }}>
              {systemStatus}
            </span>
            <span className="metric-title">Platform Health</span>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS SECTION */}
      <PageHeader
        title="Quick Actions"
        description="Jump straight into your daily workflow tools."
      />

      <div className="quick-actions-grid">
        {(role === "KNOWLEDGE_MANAGER" || role === "SUPERVISOR") && (
          <div
            className="quick-action-card"
            onClick={() => navigate("/knowledge")}
          >
            <div className="quick-action-header">
              <span style={{ fontSize: "28px" }}>📖</span>
              <div>
                <h4>Knowledge Base Manager</h4>
                <p className="quick-action-desc">
                  Write help documentation, save drafts, and publish articles for AI vector search.
                </p>
              </div>
            </div>
            <Button
              type="button"
              className="btn-primary"
              style={{ alignSelf: "flex-start", marginTop: "8px" }}
              onClick={(e) => {
                e.stopPropagation();
                navigate("/knowledge");
              }}
            >
              Open Knowledge Base →
            </Button>
          </div>
        )}

        {(role === "SPECIALIST" || role === "SUPERVISOR") && (
          <div
            className="quick-action-card"
            onClick={() => navigate("/specialist")}
          >
            <div className="quick-action-header">
              <span style={{ fontSize: "28px" }}>🎫</span>
              <div>
                <h4>Specialist Ticket Desk</h4>
                <p className="quick-action-desc">
                  View and update escalated customer tickets, adjust priorities, and track resolution.
                </p>
              </div>
            </div>
            <Button
              type="button"
              className="btn-primary"
              style={{ alignSelf: "flex-start", marginTop: "8px" }}
              onClick={(e) => {
                e.stopPropagation();
                navigate("/specialist");
              }}
            >
              Open Ticket Desk →
            </Button>
          </div>
        )}

        <div
          className="quick-action-card"
          onClick={() => navigate("/support")}
        >
          <div className="quick-action-header">
            <span style={{ fontSize: "28px" }}>💬</span>
            <div>
              <h4>Support & AI Chat</h4>
              <p className="quick-action-desc">
                Access interactive customer conversations and automated AI knowledge retrieval.
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="btn-secondary"
            style={{ alignSelf: "flex-start", marginTop: "8px" }}
            onClick={(e) => {
              e.stopPropagation();
              navigate("/support");
            }}
          >
            Launch Support →
          </Button>
        </div>

        {(role === "CUSTOMER" || role === "SUPERVISOR") && (
          <div
            className="quick-action-card"
            onClick={() => navigate("/subscriptions")}
          >
            <div className="quick-action-header">
              <span style={{ fontSize: "28px" }}>💳</span>
              <div>
                <h4>Subscription Plans</h4>
                <p className="quick-action-desc">
                  Manage active plans, view quota entitlements, and adjust organization tiers.
                </p>
              </div>
            </div>
            <Button
              type="button"
              className="btn-secondary"
              style={{ alignSelf: "flex-start", marginTop: "8px" }}
              onClick={(e) => {
                e.stopPropagation();
                navigate("/subscriptions");
              }}
            >
              Manage Plans →
            </Button>
          </div>
        )}
      </div>

      {/* LOWER SECTION: SYSTEM HEALTH & RECENT HELP ARTICLES */}
      <div className="specialist-grid" style={{ marginTop: "10px" }}>
        {/* RECENT ARTICLES CARD */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Recent Published Articles</h3>
            {(role === "KNOWLEDGE_MANAGER" || role === "SUPERVISOR") && (
              <Button
                type="button"
                className="btn-secondary"
                style={{ fontSize: "12px", padding: "4px 10px" }}
                onClick={() => navigate("/knowledge")}
              >
                + New Article
              </Button>
            )}
          </div>

          {loading ? (
            <p style={{ color: "#6b7280", margin: "16px 0 0 0" }}>Loading recent articles...</p>
          ) : recentArticles.length === 0 ? (
            <p style={{ color: "#6b7280", margin: "16px 0 0 0" }}>
              No published articles found. Use the Knowledge Base manager to publish help docs.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "14px" }}>
              {recentArticles.map((art) => (
                <div
                  key={art._id}
                  style={{
                    padding: "12px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    backgroundColor: "#f9fafb",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: "14px", color: "#111827" }}>{art.title}</strong>
                    <span className="ticket-status-badge badge-published">PUBLISHED</span>
                  </div>
                  <p style={{ fontSize: "13px", color: "#4b5563", margin: "6px 0 0 0" }}>
                    {art.content?.length > 100 ? `${art.content.substring(0, 100)}...` : art.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* INCIDENT STATUS & PLATFORM HEALTH */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Service & Incident Status</h3>
            <span className={`status-badge-inline ${systemStatus === "Degraded" ? "status-degraded" : "status-operational"}`}>
              <span className={`status-dot ${systemStatus === "Degraded" ? "status-dot-amber" : "status-dot-green"}`} />
              {systemStatus}
            </span>
          </div>

          <p style={{ fontSize: "13px", color: "#6b7280", margin: "8px 0 14px 0" }}>
            Real-time health monitor for support chat, ticket resolution, and vector embeddings.
          </p>

          {incidents.length === 0 ? (
            <div
              style={{
                backgroundColor: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: "6px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "24px" }}>✅</span>
              <div>
                <strong style={{ color: "#065f46", fontSize: "14px" }}>
                  All systems operational
                </strong>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#047857" }}>
                  AI search, embedding indexing, and ticketing services are operating normally.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {incidents.map((inc, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "10px 14px",
                    border: "1px solid #fde68a",
                    backgroundColor: "#fffbeb",
                    borderRadius: "6px",
                  }}
                >
                  <strong style={{ fontSize: "13px", color: "#92400e" }}>
                    {inc.feature || "System"}: {inc.title || "Incident Reported"}
                  </strong>
                  <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#78350f" }}>
                    {inc.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;
