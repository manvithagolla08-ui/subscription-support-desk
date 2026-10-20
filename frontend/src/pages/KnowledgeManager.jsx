import { useEffect, useState } from "react";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import api from "../services/api";
import "./RolePages.css";

const DRAFTS_STORAGE_KEY = "km_drafts";

function KnowledgeManager() {
  const [publishedArticles, setPublishedArticles] = useState([]);
  const [drafts, setDrafts] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, DRAFT, PUBLISHED

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishingId, setPublishingId] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Persist drafts to localStorage whenever drafts change
  function saveDrafts(updatedDrafts) {
    setDrafts(updatedDrafts);
    try {
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
    } catch {
      // ignore storage write errors
    }
  }

  async function fetchArticles() {
    setLoading(true);
    setError("");
    try {
      // Calls GET /api/help (Returns published articles)
      const res = await api.get("/help");
      const list = Array.isArray(res?.data) ? res.data : [];
      setPublishedArticles(list);
    } catch (err) {
      // 404 means no published articles found, which is a normal empty state
      if (err?.message?.includes("No published") || err?.status === 404) {
        setPublishedArticles([]);
      } else {
        setError(err?.message || "Failed to load help articles.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchArticles();
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      setIsSearching(false);
      setSearchResults([]);
      fetchArticles();
      return;
    }

    setLoading(true);
    setError("");
    setIsSearching(true);

    try {
      // 1. Semantic search for published articles via backend
      let pubResults = [];
      try {
        const res = await api.post("/help/search", { query: searchQuery.trim() });
        pubResults = Array.isArray(res?.data) ? res.data : [];
      } catch {
        // Fallback to client-side filtering if search service is offline
        pubResults = publishedArticles.filter(
          (art) =>
            art.title?.toLowerCase().includes(query) ||
            art.content?.toLowerCase().includes(query)
        );
      }

      // 2. Client-side filter for local drafts
      const draftResults = drafts.filter(
        (art) =>
          art.title?.toLowerCase().includes(query) ||
          art.content?.toLowerCase().includes(query)
      );

      setSearchResults([...draftResults, ...pubResults]);
    } catch (err) {
      setError(err?.message || "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleResetSearch() {
    setSearchQuery("");
    setIsSearching(false);
    setSearchResults([]);
    fetchArticles();
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
        await fetchArticles();
      } else {
        // Calls POST /api/help/drafts (Creates DRAFT)
        const res = await api.post("/help/drafts", { title: title.trim(), content: content.trim() });
        const createdDraft = res?.data || {
          _id: `draft-${Date.now()}`,
          title: title.trim(),
          content: content.trim(),
          status: "DRAFT",
          createdAt: new Date().toISOString(),
        };

        const updatedDrafts = [
          createdDraft,
          ...drafts.filter((d) => d._id !== createdDraft._id),
        ];
        saveDrafts(updatedDrafts);
        setSuccessMessage(`Draft "${createdDraft.title}" created successfully and saved!`);
      }

      setTitle("");
      setContent("");
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

      // Remove from drafts and refresh published list
      const updatedDrafts = drafts.filter((d) => d._id !== articleId);
      saveDrafts(updatedDrafts);

      setSuccessMessage("Draft article successfully published and indexed!");
      await fetchArticles();
    } catch (err) {
      setError(err?.message || "Failed to publish draft.");
    } finally {
      setPublishingId(null);
    }
  }

  function handleDiscardDraft(articleId) {
    const updatedDrafts = drafts.filter((d) => d._id !== articleId);
    saveDrafts(updatedDrafts);
    setSuccessMessage("Draft discarded.");
  }

  // Calculate items to display based on tab or active search
  const displayedArticles = isSearching
    ? searchResults
    : activeTab === "DRAFT"
    ? drafts
    : activeTab === "PUBLISHED"
    ? publishedArticles
    : [
        ...drafts,
        ...publishedArticles.filter(
          (pub) => !drafts.some((d) => d._id === pub._id)
        ),
      ];

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
            <span style={{ fontSize: "13px", color: "#6b7280" }}>
              {drafts.length + publishedArticles.length} total articles
            </span>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              className="form-control"
              style={{ flex: 1 }}
              placeholder="Search articles by query or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" className="btn-secondary">
              Search
            </Button>
            {isSearching && (
              <Button type="button" onClick={handleResetSearch} className="btn-secondary">
                Clear
              </Button>
            )}
          </form>

          {/* Filter Tabs */}
          {!isSearching && (
            <div className="tab-bar">
              <button
                type="button"
                className={`tab-btn ${activeTab === "ALL" ? "active" : ""}`}
                onClick={() => setActiveTab("ALL")}
              >
                All Articles
                <span className="tab-badge">{drafts.length + publishedArticles.length}</span>
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === "DRAFT" ? "active" : ""}`}
                onClick={() => setActiveTab("DRAFT")}
              >
                Drafts
                <span className="tab-badge tab-badge-draft">{drafts.length}</span>
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === "PUBLISHED" ? "active" : ""}`}
                onClick={() => setActiveTab("PUBLISHED")}
              >
                Published
                <span className="tab-badge">{publishedArticles.length}</span>
              </button>
            </div>
          )}

          {isSearching && (
            <div style={{ fontSize: "13px", color: "#6b7280" }}>
              Showing search results for &ldquo;{searchQuery}&rdquo; ({searchResults.length} found)
            </div>
          )}

          {loading ? (
            <p style={{ color: "#6b7280" }}>Loading articles...</p>
          ) : displayedArticles.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "#6b7280" }}>
              <p style={{ margin: "0 0 8px 0", fontSize: "15px" }}>
                {isSearching
                  ? "No matching articles found."
                  : activeTab === "DRAFT"
                  ? "No draft articles saved."
                  : activeTab === "PUBLISHED"
                  ? "No published articles found."
                  : "No articles available yet."}
              </p>
              <small>Use the form on the left to create and draft articles.</small>
            </div>
          ) : (
            <div className="article-list" style={{ maxHeight: "480px", overflowY: "auto" }}>
              {displayedArticles.map((art) => {
                const isDraft = art.status === "DRAFT";
                return (
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
                    {isDraft && (
                      <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                        <Button
                          type="button"
                          className="btn-primary"
                          style={{ fontSize: "12px", padding: "4px 12px" }}
                          disabled={publishingId === art._id}
                          onClick={() => handlePublishDraft(art._id)}
                        >
                          {publishingId === art._id ? "Publishing..." : "Publish Draft"}
                        </Button>
                        <Button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: "12px", padding: "4px 10px" }}
                          onClick={() => handleDiscardDraft(art._id)}
                        >
                          Discard
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default KnowledgeManager;
