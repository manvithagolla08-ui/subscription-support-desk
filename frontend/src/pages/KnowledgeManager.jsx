import { useEffect, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import api from "../services/api";
import "./RolePages.css";

function KnowledgeManager() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishingId, setPublishingId] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function fetchArticles() {
    setLoading(true);
    setError("");
    try {
      // Calls GET /api/help (Supported by backend)
      const res = await api.get("/help");
      const list = Array.isArray(res?.data) ? res.data : [];
      setArticles(list);
    } catch (err) {
      setError(err?.message || "Failed to load help articles.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchArticles();
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchArticles();
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Calls POST /api/help/search (Supported by backend)
      const res = await api.post("/help/search", { query: searchQuery.trim() });
      const list = Array.isArray(res?.data) ? res.data : [];
      setArticles(list);
    } catch (err) {
      setError(err?.message || "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateArticle(e) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!title.trim() || !content.trim()) {
      setError("Please provide both title and content.");
      return;
    }

    setSubmitting(true);
    try {
      if (publishImmediately) {
        // Calls POST /api/help (Creates & immediately publishes & indexes)
        await api.post("/help", { title: title.trim(), content: content.trim() });
        setSuccessMessage("Article published and indexed successfully!");
      } else {
        // Calls POST /api/help/drafts (Creates DRAFT)
        await api.post("/help/drafts", { title: title.trim(), content: content.trim() });
        setSuccessMessage("Draft article created successfully!");
      }

      setTitle("");
      setContent("");
      fetchArticles();
    } catch (err) {
      setError(err?.message || "Failed to create article.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublishDraft(articleId) {
    setPublishingId(articleId);
    setError("");
    setSuccessMessage("");
    try {
      // Calls POST /api/help/drafts/:articleId/publish (Supported by backend)
      await api.post(`/help/drafts/${articleId}/publish`);
      setSuccessMessage("Draft article successfully published and indexed!");
      fetchArticles();
    } catch (err) {
      setError(err?.message || "Failed to publish draft.");
    } finally {
      setPublishingId(null);
    }
  }

  return (
    <div className="knowledge-container">
      <PageHeader
        title="Knowledge Manager"
        description="Create, manage, and publish help center knowledge base articles."
      />

      {error && <div className="alert-box alert-error">{error}</div>}
      {successMessage && <div className="alert-box alert-success">{successMessage}</div>}

      <div className="specialist-grid">
        {/* CREATE / DRAFT FORM */}
        <Card className="knowledge-card">
          <h3>Create Help Article</h3>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 12px 0" }}>
            Add new support documentation to improve automated AI answers and public help.
          </p>

          <form onSubmit={handleCreateArticle} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="form-group">
              <label htmlFor="art-title">Article Title</label>
              <input
                id="art-title"
                type="text"
                className="form-control"
                placeholder="e.g. How to Connect Webhooks"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="art-content">Article Content</label>
              <textarea
                id="art-content"
                className="form-control"
                rows={6}
                placeholder="Provide comprehensive details, setup steps, and notes..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="checkbox"
                id="publish-immed"
                checked={publishImmediately}
                onChange={(e) => setPublishImmediately(e.target.checked)}
              />
              <label htmlFor="publish-immed" style={{ fontSize: "14px", cursor: "pointer" }}>
                Publish and index immediately (otherwise saved as Draft)
              </label>
            </div>

            <Button type="submit" disabled={submitting} className="btn-primary">
              {submitting
                ? "Processing..."
                : publishImmediately
                ? "Publish & Index"
                : "Save as Draft"}
            </Button>
          </form>
        </Card>

        {/* ARTICLES LIST & SEARCH */}
        <Card className="knowledge-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Articles Repository</h3>
            <span style={{ fontSize: "13px", color: "#6b7280" }}>{articles.length} items</span>
          </div>

          <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              className="form-control"
              style={{ flex: 1 }}
              placeholder="Search articles by query..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" className="btn-secondary">
              Search
            </Button>
          </form>

          {loading ? (
            <p style={{ color: "#6b7280" }}>Loading articles...</p>
          ) : articles.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No articles found.</p>
          ) : (
            <div className="article-list" style={{ maxHeight: "460px", overflowY: "auto" }}>
              {articles.map((art) => (
                <div key={art._id} className="article-item">
                  <div className="article-header">
                    <h4 className="article-title">{art.title}</h4>
                    <span
                      className={`ticket-status-badge badge-${(art.status || "published").toLowerCase()}`}
                    >
                      {art.status || "PUBLISHED"}
                    </span>
                  </div>
                  <p className="article-content">
                    {art.content?.length > 160 ? `${art.content.substring(0, 160)}...` : art.content}
                  </p>
                  {art.status === "DRAFT" && (
                    <div style={{ marginTop: "6px" }}>
                      <Button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: "12px", padding: "4px 10px" }}
                        disabled={publishingId === art._id}
                        onClick={() => handlePublishDraft(art._id)}
                      >
                        {publishingId === art._id ? "Publishing..." : "Publish Draft"}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default KnowledgeManager;
