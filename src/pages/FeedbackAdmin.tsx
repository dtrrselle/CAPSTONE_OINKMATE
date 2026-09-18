import { useState, useMemo, useEffect } from "react";
import {
  FiMessageSquare,
  FiStar,
  FiThumbsUp,
  FiThumbsDown,
  FiFilter,
  FiEye,
  FiCheckCircle,
  FiArchive,
  FiRotateCcw,
  FiX,
  FiUser,
  FiCalendar,
  FiTag,
  FiChevronDown,
} from "react-icons/fi";
import { AiFillStar, AiOutlineStar } from "react-icons/ai";
import "./FeedbackAdmin.css";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Feedback {
  id: number;
  userName: string;
  userInitials: string;
  subject: "Concern" | "Suggestion" | "Compliment";
  message: string;
  rating: number;
  dateSubmitted: string;
  status: "New" | "Reviewed";
  archived: boolean;
}

// ─── API Config ───────────────────────────────────────────────────────────────
// Points to htdocs/oinkmate-api/api/feedback (adjust the host/port if you're
// not using the default XAMPP setup at http://localhost).
const API_BASE = "http://localhost/oinkmate-api/api/feedback";

// ─── Star Rating Component ────────────────────────────────────────────────────

const StarRating = ({ rating, size = 14 }: { rating: number; size?: number }) => (
  <span className="fb-stars" style={{ fontSize: size }}>
    {[1, 2, 3, 4, 5].map((s) =>
      s <= rating ? (
        <AiFillStar key={s} className="fb-star-filled" />
      ) : (
        <AiOutlineStar key={s} className="fb-star-empty" />
      )
    )}
  </span>
);

// ─── Category Badge Helper ────────────────────────────────────────────────────

const categoryBadgeClass = (subject: Feedback["subject"]) =>
  `fb-badge fb-badge--${subject.toLowerCase()}`;

// ─── Avatar Component ─────────────────────────────────────────────────────────

const Avatar = ({
  initials,
  size = "md",
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
}) => <div className={`fb-avatar fb-avatar--${size}`}>{initials}</div>;

// ─── Main Component ───────────────────────────────────────────────────────────

const FeedbackAdmin = () => {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("all");
  const [viewModal, setViewModal] = useState<Feedback | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [toasts, setToasts] = useState<
    { id: number; message: string; type: "success" | "error" }[]
  >([]);

  // ── Fetch feedback from the PHP/MySQL backend ────────────────────────────────
  const fetchFeedback = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${API_BASE}/list.php`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data: Feedback[] = await res.json();
      setFeedbackList(data);
    } catch (err) {
      setLoadError(
        "Could not connect to the database. Check that Apache/MySQL are running and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  // ── Derived Stats (active feedback only, archived excluded) ─────────────────
  const stats = useMemo(() => {
    const active = feedbackList.filter((f) => !f.archived);
    const total = active.length;
    const avg =
      total === 0 ? 0 : active.reduce((sum, f) => sum + f.rating, 0) / total;
    const positive = active.filter((f) => f.rating >= 4).length;
    const negative = active.filter((f) => f.rating <= 2).length;
    return { total, avg: avg.toFixed(1), positive, negative };
  }, [feedbackList]);

  // ── Filtered ──────────────────────────────────────────────────────────────
  const isArchivedView = filterValue === "archived";

  const filtered = useMemo(() => {
    return feedbackList.filter((f) => {
      if (filterValue === "archived") return f.archived;
      if (f.archived) return false;

      let matchesFilter = true;
      if (filterValue === "new") matchesFilter = f.status === "New";
      else if (filterValue === "reviewed") matchesFilter = f.status === "Reviewed";
      else if (filterValue === "5") matchesFilter = f.rating === 5;
      else if (filterValue === "4") matchesFilter = f.rating === 4;
      else if (filterValue === "3") matchesFilter = f.rating === 3;
      else if (filterValue === "2") matchesFilter = f.rating === 2;
      else if (filterValue === "1") matchesFilter = f.rating === 1;

      return matchesFilter;
    });
  }, [feedbackList, filterValue]);

  // ── Toasts ───────────────────────────────────────────────────────────────────
  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleMarkReviewed = async (id: number) => {
    const previous = feedbackList;
    setFeedbackList((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "Reviewed" } : f))
    );
    try {
      const res = await fetch(`${API_BASE}/mark_reviewed.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback_id: id }),
      });
      if (!res.ok) throw new Error();
      showToast("Feedback marked as reviewed.");
    } catch {
      setFeedbackList(previous);
      showToast("Failed to update feedback. Please try again.", "error");
    }
  };

  const handleArchive = async (id: number) => {
    const previous = feedbackList;
    setFeedbackList((prev) =>
      prev.map((f) => (f.id === id ? { ...f, archived: true } : f))
    );
    setArchiveTarget(null);
    if (viewModal?.id === id) setViewModal(null);
    try {
      const res = await fetch(`${API_BASE}/archive.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback_id: id }),
      });
      if (!res.ok) throw new Error();
      showToast("Feedback archived.");
    } catch {
      setFeedbackList(previous);
      showToast("Failed to archive feedback. Please try again.", "error");
    }
  };

  const handleRestore = async (id: number) => {
    const previous = feedbackList;
    setFeedbackList((prev) =>
      prev.map((f) => (f.id === id ? { ...f, archived: false } : f))
    );
    if (viewModal?.id === id) setViewModal({ ...viewModal, archived: false });
    try {
      const res = await fetch(`${API_BASE}/restore.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback_id: id }),
      });
      if (!res.ok) throw new Error();
      showToast("Feedback restored.");
    } catch {
      setFeedbackList(previous);
      showToast("Failed to restore feedback. Please try again.", "error");
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const filterLabel =
    filterValue === "all"
      ? "All Feedback"
      : filterValue === "new"
      ? "New"
      : filterValue === "reviewed"
      ? "Reviewed"
      : filterValue === "archived"
      ? "Archived"
      : `${filterValue} Stars`;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fb-page">
      {/* ── Header Controls (page title lives in the top app bar already) ──── */}
      <div className="fb-page-header">
        <div className="fb-header-controls">
          <div className="fb-filter-wrap">
            <button
              className="fb-filter-btn"
              onClick={() => setFilterOpen((p) => !p)}
            >
              <FiFilter />
              <span>{filterLabel}</span>
              <FiChevronDown
                className={`fb-chevron ${filterOpen ? "fb-chevron--open" : ""}`}
              />
            </button>
            {filterOpen && (
              <div className="fb-filter-dropdown">
                {[
                  { val: "all", label: "All Feedback" },
                  { val: "new", label: "New" },
                  { val: "reviewed", label: "Reviewed" },
                  { val: "archived", label: "Archived" },
                  { val: "5", label: "5 Stars" },
                  { val: "4", label: "4 Stars" },
                  { val: "3", label: "3 Stars" },
                  { val: "2", label: "2 Stars" },
                  { val: "1", label: "1 Star" },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    className={`fb-filter-item ${
                      filterValue === opt.val ? "fb-filter-item--active" : ""
                    }`}
                    onClick={() => {
                      setFilterValue(opt.val);
                      setFilterOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div className="fb-stats-grid">
        <div className="fb-stat-card">
          <div className="fb-stat-icon fb-stat-icon--blue">
            <FiMessageSquare />
          </div>
          <div className="fb-stat-body">
            <span className="fb-stat-value">{stats.total}</span>
            <span className="fb-stat-label">Total Feedback</span>
          </div>
        </div>
        <div className="fb-stat-card">
          <div className="fb-stat-icon fb-stat-icon--gold">
            <FiStar />
          </div>
          <div className="fb-stat-body">
            <span className="fb-stat-value">{stats.avg}</span>
            <span className="fb-stat-label">Average Rating</span>
          </div>
        </div>
        <div className="fb-stat-card">
          <div className="fb-stat-icon fb-stat-icon--green">
            <FiThumbsUp />
          </div>
          <div className="fb-stat-body">
            <span className="fb-stat-value">{stats.positive}</span>
            <span className="fb-stat-label">Positive Feedback</span>
          </div>
        </div>
        <div className="fb-stat-card">
          <div className="fb-stat-icon fb-stat-icon--red">
            <FiThumbsDown />
          </div>
          <div className="fb-stat-body">
            <span className="fb-stat-value">{stats.negative}</span>
            <span className="fb-stat-label">Negative Feedback</span>
          </div>
        </div>
      </div>

      {loading ? (
        /* ── Loading State ────────────────────────────────────────────────── */
        <div className="fb-empty">
          <div className="fb-empty-icon fb-empty-icon--loading">
            <FiMessageSquare />
          </div>
          <h3 className="fb-empty-title">Loading feedback…</h3>
          <p className="fb-empty-desc">Connecting to the database.</p>
        </div>
      ) : loadError ? (
        /* ── Connection Error State ───────────────────────────────────────── */
        <div className="fb-empty fb-empty--error">
          <div className="fb-empty-icon fb-empty-icon--error">
            <FiMessageSquare />
          </div>
          <h3 className="fb-empty-title">Couldn't load feedback</h3>
          <p className="fb-empty-desc">{loadError}</p>
          <button className="fb-retry-btn" onClick={fetchFeedback}>
            Try Again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        /* ── Empty State ──────────────────────────────────────────────────── */
        <div className="fb-empty">
          <div className="fb-empty-icon">
            <FiMessageSquare />
          </div>
          <h3 className="fb-empty-title">No feedback available.</h3>
          <p className="fb-empty-desc">
            Try adjusting your filter to find what you're looking for.
          </p>
        </div>
      ) : (
        <>
          {/* ── Table ────────────────────────────────────────────────────── */}
          <div className="fb-section">
            <h2 className="fb-section-title">
              {isArchivedView ? "Archived Feedback" : "Feedback Overview"}
            </h2>
            <div className="fb-table-wrap">
              <table className="fb-table">
                <thead>
                  <tr>
                    <th>User Name</th>
                    <th>Category</th>
                    <th>Rating</th>
                    <th>Date Submitted</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <div className="fb-table-user">
                          <Avatar initials={f.userInitials} size="sm" />
                          <span>{f.userName}</span>
                        </div>
                      </td>
                      <td>
                        <span className={categoryBadgeClass(f.subject)}>
                          {f.subject}
                        </span>
                      </td>
                      <td>
                        <StarRating rating={f.rating} />
                      </td>
                      <td className="fb-table-date">{formatDate(f.dateSubmitted)}</td>
                      <td>
                        <span
                          className={`fb-badge ${
                            f.status === "New"
                              ? "fb-badge--new"
                              : "fb-badge--reviewed"
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td>
                        <div className="fb-actions">
                          <button
                            className="fb-action-btn fb-action-btn--view"
                            title="View Details"
                            onClick={() => setViewModal(f)}
                          >
                            <FiEye />
                          </button>
                          <button
                            className={`fb-action-btn fb-action-btn--check ${
                              f.status === "Reviewed"
                                ? "fb-action-btn--check-done"
                                : ""
                            }`}
                            title={
                              f.status === "Reviewed"
                                ? "Already Reviewed"
                                : "Mark as Reviewed"
                            }
                            disabled={f.status === "Reviewed"}
                            onClick={() => handleMarkReviewed(f.id)}
                          >
                            <FiCheckCircle />
                          </button>
                          {isArchivedView ? (
                            <button
                              className="fb-action-btn fb-action-btn--restore"
                              title="Restore"
                              onClick={() => handleRestore(f.id)}
                            >
                              <FiRotateCcw />
                            </button>
                          ) : (
                            <button
                              className="fb-action-btn fb-action-btn--archive"
                              title="Archive"
                              onClick={() => setArchiveTarget(f.id)}
                            >
                              <FiArchive />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Cards ────────────────────────────────────────────────────── */}
          <div className="fb-section">
            <h2 className="fb-section-title">
              {isArchivedView ? "Archived Cards" : "Feedback Cards"}
            </h2>
            <div className="fb-cards-grid">
              {filtered.map((f) => (
                <div key={f.id} className="fb-card">
                  <div className="fb-card-header">
                    <Avatar initials={f.userInitials} size="md" />
                    <div className="fb-card-user-info">
                      <span className="fb-card-username">{f.userName}</span>
                      <StarRating rating={f.rating} size={13} />
                    </div>
                    <span
                      className={`fb-badge ${
                        f.status === "New"
                          ? "fb-badge--new"
                          : "fb-badge--reviewed"
                      }`}
                    >
                      {f.status}
                    </span>
                  </div>
                  <div className="fb-card-body">
                    <span className={categoryBadgeClass(f.subject)}>
                      {f.subject}
                    </span>
                    <p className="fb-card-preview">
                      {f.message.length > 110
                        ? f.message.slice(0, 110) + "…"
                        : f.message}
                    </p>
                  </div>
                  <div className="fb-card-footer">
                    <span className="fb-card-date">
                      <FiCalendar />
                      {formatDate(f.dateSubmitted)}
                    </span>
                    <div className="fb-card-actions">
                      <button
                        className="fb-card-btn fb-card-btn--view"
                        onClick={() => setViewModal(f)}
                      >
                        <FiEye /> View
                      </button>
                      {isArchivedView ? (
                        <button
                          className="fb-card-btn fb-card-btn--restore"
                          onClick={() => handleRestore(f.id)}
                        >
                          <FiRotateCcw />
                        </button>
                      ) : (
                        <button
                          className="fb-card-btn fb-card-btn--archive"
                          onClick={() => setArchiveTarget(f.id)}
                        >
                          <FiArchive />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── View Modal ────────────────────────────────────────────────────── */}
      {viewModal && (
        <div className="fb-modal-overlay" onClick={() => setViewModal(null)}>
          <div className="fb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fb-modal-header">
              <h2 className="fb-modal-title">Feedback Details</h2>
              <button
                className="fb-modal-close"
                onClick={() => setViewModal(null)}
              >
                <FiX />
              </button>
            </div>
            <div className="fb-modal-body">
              <div className="fb-modal-user-row">
                <Avatar initials={viewModal.userInitials} size="lg" />
                <div className="fb-modal-user-info">
                  <span className="fb-modal-username">{viewModal.userName}</span>
                  <StarRating rating={viewModal.rating} size={18} />
                </div>
                <span
                  className={`fb-badge ${
                    viewModal.status === "New"
                      ? "fb-badge--new"
                      : "fb-badge--reviewed"
                  }`}
                >
                  {viewModal.status}
                </span>
              </div>

              <div className="fb-modal-fields">
                <div className="fb-modal-field">
                  <span className="fb-modal-field-label">
                    <FiTag /> Category
                  </span>
                  <span className={categoryBadgeClass(viewModal.subject)}>
                    {viewModal.subject}
                  </span>
                </div>
                <div className="fb-modal-field">
                  <span className="fb-modal-field-label">
                    <FiCalendar /> Date Submitted
                  </span>
                  <span className="fb-modal-field-value">
                    {formatDate(viewModal.dateSubmitted)}
                  </span>
                </div>
                <div className="fb-modal-field fb-modal-field--full">
                  <span className="fb-modal-field-label">
                    <FiMessageSquare /> Message
                  </span>
                  <p className="fb-modal-message">{viewModal.message}</p>
                </div>
              </div>
            </div>
            <div className="fb-modal-footer">
              <button
                className={`fb-modal-action-btn fb-modal-action-btn--check ${
                  viewModal.status === "Reviewed"
                    ? "fb-modal-action-btn--check-done"
                    : ""
                }`}
                disabled={viewModal.status === "Reviewed"}
                onClick={() => {
                  handleMarkReviewed(viewModal.id);
                  setViewModal({ ...viewModal, status: "Reviewed" });
                }}
              >
                <FiCheckCircle />
                {viewModal.status === "Reviewed"
                  ? "Reviewed"
                  : "Mark as Reviewed"}
              </button>
              {viewModal.archived ? (
                <button
                  className="fb-modal-action-btn fb-modal-action-btn--restore"
                  onClick={() => handleRestore(viewModal.id)}
                >
                  <FiRotateCcw /> Restore
                </button>
              ) : (
                <button
                  className="fb-modal-action-btn fb-modal-action-btn--archive"
                  onClick={() => {
                    setArchiveTarget(viewModal.id);
                    setViewModal(null);
                  }}
                >
                  <FiArchive /> Archive
                </button>
              )}
              <button
                className="fb-modal-action-btn fb-modal-action-btn--close"
                onClick={() => setViewModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Archive Confirmation Modal ───────────────────────────────────── */}
      {archiveTarget !== null && (
        <div
          className="fb-modal-overlay"
          onClick={() => setArchiveTarget(null)}
        >
          <div
            className="fb-modal fb-modal--confirm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fb-modal-header">
              <h2 className="fb-modal-title fb-modal-title--warn">
                Archive Feedback
              </h2>
              <button
                className="fb-modal-close"
                onClick={() => setArchiveTarget(null)}
              >
                <FiX />
              </button>
            </div>
            <div className="fb-modal-body fb-confirm-body">
              <div className="fb-confirm-icon">
                <FiArchive />
              </div>
              <p className="fb-confirm-text">
                Are you sure you want to archive this feedback?
              </p>
              <p className="fb-confirm-subtext">
                It will be hidden from the main list, but you can restore it
                anytime from the Archived filter.
              </p>
            </div>
            <div className="fb-modal-footer fb-modal-footer--center">
              <button
                className="fb-modal-action-btn fb-modal-action-btn--close"
                onClick={() => setArchiveTarget(null)}
              >
                Cancel
              </button>
              <button
                className="fb-modal-action-btn fb-modal-action-btn--archive"
                onClick={() => handleArchive(archiveTarget)}
              >
                <FiArchive /> Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toasts ──────────────────────────────────────────────────────────── */}
      <div className="fb-toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`fb-toast fb-toast--${t.type}`}>
            <span className="fb-toast-icon">
              <FiCheckCircle />
            </span>
            <span className="fb-toast-message">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeedbackAdmin;