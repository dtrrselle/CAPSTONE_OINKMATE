import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FiSearch, FiPlus, FiBookOpen, FiGrid, FiCheckCircle,
  FiFileText, FiEye, FiEdit2, FiTrash2, FiX, FiImage,
  FiAlertTriangle, FiChevronDown, FiCheck,
} from "react-icons/fi";
import "./EducationalAdmin.css";
import { educationalService } from "../services/educationalService";
import type {
  EducationalContent, ContentCategory, ContentStats, ContentStatus,
} from "../services/educationalService";

// ============================================================
// Constants
// ============================================================

const CATEGORIES: ContentCategory[] = [
  "Feeding Guide", "Sanitation Guide", "Pig Health",
  "Disease Prevention", "Farm Management", "Advisory",
];
const FILTER_OPTIONS: ("All" | ContentCategory)[] = ["All", ...CATEGORIES];

interface FormDraft {
  title: string; category: ContentCategory; author: string;
  description: string; body: string; source_url: string;
  source_label: string; status: ContentStatus; image: File | null;
}
const emptyDraft: FormDraft = {
  title: "", category: "Feeding Guide", author: "",
  description: "", body: "", source_url: "", source_label: "",
  status: "Draft", image: null,
};

// ============================================================
// Toast
// ============================================================

type ToastType = "success" | "error";
interface Toast { id: number; message: string; type: ToastType; }

const ToastContainer: React.FC<{ toasts: Toast[]; remove: (id: number) => void }> = ({ toasts, remove }) => (
  <div className="edu-toast-container">
    {toasts.map((t) => (
      <div key={t.id} className={`edu-toast edu-toast--${t.type}`}>
        {t.type === "success" ? <FiCheck size={15} /> : <FiAlertTriangle size={15} />}
        <span>{t.message}</span>
        <button className="edu-toast-close" onClick={() => remove(t.id)}><FiX size={13} /></button>
      </div>
    ))}
  </div>
);

// ============================================================
// Helpers
// ============================================================

const CategoryBadge: React.FC<{ category: ContentCategory }> = ({ category }) => (
  <span className={`category-badge category-${category.replace(/\s+/g, "-").toLowerCase()}`}>{category}</span>
);

const StatusBadge: React.FC<{ status: ContentStatus }> = ({ status }) => (
  <span className={`status-badge status-${status.toLowerCase()}`}>
    <span className="status-dot" />{status}
  </span>
);

const formatDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

// ============================================================
// Modal Shell
// ============================================================

interface ModalShellProps {
  onClose: () => void; title: string; children: React.ReactNode;
  footer?: React.ReactNode; size?: "default" | "large" | "library";
  variant?: "default" | "danger";
}
const ModalShell: React.FC<ModalShellProps> = ({ onClose, title, children, footer, size = "default", variant = "default" }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div
      className={`modal-card ${size === "large" ? "modal-card-large" : ""} ${size === "library" ? "modal-card-library" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`modal-header ${variant === "danger" ? "modal-header--danger" : ""}`}>
        <h3>{title}</h3>
        <button className="modal-close-btn" onClick={onClose}><FiX /></button>
      </div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-footer">{footer}</div>}
    </div>
  </div>
);

// ============================================================
// Main Component
// ============================================================

const EducationalAdmin: React.FC = () => {
  const [content, setContent]     = useState<EducationalContent[]>([]);
  const [stats, setStats]         = useState<ContentStats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [toasts, setToasts]       = useState<Toast[]>([]);

  const [searchTerm, setSearchTerm]         = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"All" | ContentCategory>("All");
  const [statusFilter, setStatusFilter]     = useState<"All" | ContentStatus>("All");

  const [showAddModal, setShowAddModal]       = useState(false);
  const [showLibrary, setShowLibrary]         = useState(false);
  const [viewItem, setViewItem]               = useState<EducationalContent | null>(null);
  const [editItem, setEditItem]               = useState<EducationalContent | null>(null);
  const [deleteItem, setDeleteItem] = useState<EducationalContent | null>(null);

  const [formDraft, setFormDraft] = useState<FormDraft>(emptyDraft);

  // ── Toast helpers ─────────────────────────────────────────
  const addToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  const removeToast = useCallback((id: number) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  // ── Fetch ─────────────────────────────────────────────────
  const fetchContent = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await educationalService.list({
        search:   searchTerm || undefined,
        category: categoryFilter !== "All" ? categoryFilter : undefined,
        status:   statusFilter  !== "All" ? statusFilter   : undefined,
      });
      setContent(res.data);
      setStats(res.stats);
    } catch {
      setError("Could not load content. Make sure XAMPP Apache and MySQL are running.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, categoryFilter, statusFilter]);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  // ── Add ───────────────────────────────────────────────────
  const openAddModal = () => { setFormDraft(emptyDraft); setShowAddModal(true); };

  const handlePublish = async () => {
    if (!formDraft.title.trim()) { addToast("Title is required.", "error"); return; }
    setSaving(true);
    try {
      await educationalService.create(formDraft);
      setShowAddModal(false);
      await fetchContent();
      addToast("Content published successfully!");
    } catch (err: any) {
      addToast(err.message || "Failed to save content.", "error");
    } finally { setSaving(false); }
  };

  // ── Edit ──────────────────────────────────────────────────
  const openEditModal = (item: EducationalContent) => {
    setFormDraft({
      title: item.title, category: item.category, author: item.author,
      description: item.description, body: item.body,
      source_url: item.source_url ?? "", source_label: item.source_label ?? "",
      status: item.status, image: null,
    });
    setEditItem(item);
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    if (!formDraft.title.trim()) { addToast("Title is required.", "error"); return; }
    setSaving(true);
    try {
      // Fix: pass id as query param — matches PHP's PUT ?id= endpoint
      await educationalService.update(editItem.id, formDraft);
      setEditItem(null);
      await fetchContent();
      addToast("Content updated successfully!");
    } catch (err: any) {
      addToast(err.message || "Failed to update content.", "error");
    } finally { setSaving(false); }
  };



  // ── Loading / Error ───────────────────────────────────────
  if (loading) return (
    <div className="edu-admin-page">
      <div className="edu-empty-state">
        <div className="edu-empty-illustration"><FiBookOpen /></div>
        <h3>Loading content…</h3>
        <p>Connecting to database. Make sure XAMPP Apache and MySQL are running.</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="edu-admin-page">
      <div className="edu-empty-state">
        <div className="edu-empty-illustration"><FiAlertTriangle /></div>
        <h3>Could not connect to database</h3>
        <p>{error}</p>
        <button className="edu-btn-primary" onClick={fetchContent}>Try Again</button>
      </div>
    </div>
  );

  return (
    <div className="edu-admin-page">
      <ToastContainer toasts={toasts} remove={removeToast} />

      {/* ── Page Header ──────────────────────────────────── */}
      <div className="edu-page-header">

        <div className="edu-header-actions">
          <div className="edu-search-bar">
            <FiSearch className="edu-search-icon" />
            <input type="text" placeholder="Search by title..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="edu-filter-select">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as any)}>
              {FILTER_OPTIONS.map((o) => <option key={o} value={o}>{o === "All" ? "All Categories" : o}</option>)}
            </select>
            <FiChevronDown className="edu-select-chevron" />
          </div>
          <div className="edu-filter-select">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              <option value="All">All Statuses</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
            </select>
            <FiChevronDown className="edu-select-chevron" />
          </div>
          <button className="edu-btn-secondary" onClick={() => setShowLibrary(true)}>
            <FiGrid /> View Content Library
          </button>
          <button className="edu-btn-primary" onClick={openAddModal}>
            <FiPlus /> Add Content
          </button>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────── */}
      <div className="edu-stats-grid">
        {[
          { icon: <FiBookOpen />, value: stats?.total ?? 0,       label: "Total Educational Materials", cls: "icon-total"     },
          { icon: <FiGrid />,     value: stats?.categories ?? 0,  label: "Categories",                  cls: "icon-advisory"  },
          { icon: <FiCheckCircle />, value: stats?.published ?? 0, label: "Published Content",          cls: "icon-published" },
          { icon: <FiFileText />, value: stats?.draft ?? 0,       label: "Draft Content",               cls: "icon-draft"     },
        ].map((s, i) => (
          <div className="edu-stat-card" key={i}>
            <div className={`edu-stat-icon ${s.cls}`}>{s.icon}</div>
            <div className="edu-stat-info">
              <span className="edu-stat-value">{s.value}</span>
              <span className="edu-stat-label">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      {content.length === 0 ? <EmptyState onAdd={openAddModal} /> : (
        <div className="edu-table-card">
          <div className="edu-table-wrapper">
            <table className="edu-table">
              <thead>
                <tr>
                  <th>Title</th><th>Category</th><th>Author</th>
                  <th>Date Published</th><th>Status</th>
                  <th className="edu-actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {content.map((item) => (
                  <tr key={item.id}>
                    <td className="edu-title-cell">{item.title}</td>
                    <td><CategoryBadge category={item.category} /></td>
                    <td>{item.author}</td>
                    <td>{formatDate(item.published_at ?? item.created_at)}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>
                      <div className="edu-row-actions">
                        {/* VIEW — blue */}
                        <button className="edu-icon-btn edu-icon-btn--view" title="View"
                          onClick={() => setViewItem(item)}><FiEye /></button>
                        {/* EDIT — amber */}
                        <button className="edu-icon-btn edu-icon-btn--edit" title="Edit"
                          onClick={() => openEditModal(item)}><FiEdit2 /></button>
                        {/* DELETE — red */}
                        <button className="edu-icon-btn edu-icon-btn--delete" title="Delete"
                          onClick={() => setDeleteItem(item)}><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── LIBRARY MODAL ────────────────────────────────── */}
      {showLibrary && (
        <ModalShell title="Content Library" onClose={() => setShowLibrary(false)} size="library">
          {content.length === 0
            ? <p className="edu-library-empty">No educational content available.</p>
            : (
              <div className="edu-card-grid">
                {content.map((item) => (
                  <div className="edu-content-card" key={item.id}>
                    <div className="edu-card-thumb">
                      {item.image_path
                        ? <img src={educationalService.imageUrl(item.image_path)!} alt={item.title}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <FiImage />}
                    </div>
                    <div className="edu-card-body">
                      <div className="edu-card-top-row">
                        <CategoryBadge category={item.category} />
                        <StatusBadge status={item.status} />
                      </div>
                      <h3 className="edu-card-title">{item.title}</h3>
                      <p className="edu-card-desc">{item.description}</p>
                      <span className="edu-card-date">{formatDate(item.published_at ?? item.created_at)}</span>
                    </div>
                    <div className="edu-card-actions">
                      <button className="edu-icon-btn edu-icon-btn--view"   title="View"   onClick={() => setViewItem(item)}><FiEye /></button>
                      <button className="edu-icon-btn edu-icon-btn--edit"   title="Edit"   onClick={() => openEditModal(item)}><FiEdit2 /></button>
                      <button className="edu-icon-btn edu-icon-btn--delete" title="Delete" onClick={() => setDeleteItem(item)}><FiTrash2 /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </ModalShell>
      )}

      {/* ── ADD MODAL ────────────────────────────────────── */}
      {showAddModal && (
        <ModalShell title="Add Educational Content" onClose={() => setShowAddModal(false)} size="large"
          footer={
            <>
              <button className="edu-btn-secondary" onClick={() => setShowAddModal(false)} disabled={saving}>Cancel</button>
              <button className="edu-btn-primary" onClick={handlePublish} disabled={saving}>
                {saving ? "Saving…" : "Publish Content"}
              </button>
            </>
          }>
          <ContentForm formDraft={formDraft} setFormDraft={setFormDraft} />
        </ModalShell>
      )}

      {/* ── VIEW MODAL ───────────────────────────────────── */}
      {viewItem && (
        <ModalShell title="View Content" onClose={() => setViewItem(null)} size="large"
          footer={
            <>
              <button className="edu-btn-secondary edu-btn--amber" onClick={() => { setViewItem(null); openEditModal(viewItem); }}>
                <FiEdit2 size={14} /> Edit this content
              </button>
              <button className="edu-btn-secondary" onClick={() => setViewItem(null)}>Close</button>
            </>
          }>
          <div className="edu-view-thumb">
            {viewItem.image_path
              ? <img src={educationalService.imageUrl(viewItem.image_path)!} alt={viewItem.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "14px" }} />
              : <FiImage />}
          </div>
          <div className="edu-view-meta-row">
            <CategoryBadge category={viewItem.category} />
            <StatusBadge status={viewItem.status} />
          </div>
          <h2 className="edu-view-title">{viewItem.title}</h2>
          <div className="edu-view-meta-line">
            <span>By {viewItem.author}</span>
            <span className="edu-view-dot">•</span>
            <span>{formatDate(viewItem.published_at ?? viewItem.created_at)}</span>
          </div>
          <p className="edu-view-description">{viewItem.description}</p>
          <div className="edu-view-divider" />
          <p className="edu-view-body">{viewItem.body}</p>
          {viewItem.source_url && (
            <div className="edu-view-source">
              <span className="edu-view-source-label">📄 Source</span>
              <a href={viewItem.source_url} target="_blank" rel="noopener noreferrer" className="edu-view-source-link">
                {viewItem.source_label || viewItem.source_url}
              </a>
            </div>
          )}
        </ModalShell>
      )}

      {/* ── EDIT MODAL ───────────────────────────────────── */}
      {editItem && (
        <ModalShell title="Edit Educational Content" onClose={() => setEditItem(null)} size="large"
          footer={
            <>
              <button className="edu-btn-secondary" onClick={() => setEditItem(null)} disabled={saving}>Cancel</button>
              <button className="edu-btn-primary" onClick={handleSaveEdit} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </>
          }>
          <ContentForm formDraft={formDraft} setFormDraft={setFormDraft} existingImagePath={editItem.image_path} />
        </ModalShell>
      )}

      {/* ── DELETE — Single confirmation modal ───────────── */}
      {deleteItem && (
        <ModalShell title="Delete Content" onClose={() => setDeleteItem(null)} variant="danger"
          footer={
            <>
              <button className="edu-btn-secondary" onClick={() => setDeleteItem(null)} disabled={saving}>
                Cancel
              </button>
              <button className="edu-btn-delete" onClick={async () => {
                setSaving(true);
                try {
                  await educationalService.delete(deleteItem.id);
                  setDeleteItem(null);
                  await fetchContent();
                  addToast("Content deleted successfully!");
                } catch (err: any) {
                  addToast(err.message || "Failed to delete content.", "error");
                } finally { setSaving(false); }
              }} disabled={saving}>
                {saving ? "Deleting…" : "Delete"}
              </button>
            </>
          }>
          <div className="edu-delete-confirm">
            <div className="edu-delete-icon edu-delete-icon--pulse"><FiAlertTriangle /></div>
            <p>Are you sure you want to delete this content?</p>
            <span className="edu-delete-item-title">"{deleteItem.title}"</span>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

// ============================================================
// Content Form
// ============================================================

interface ContentFormProps {
  formDraft: FormDraft;
  setFormDraft: React.Dispatch<React.SetStateAction<FormDraft>>;
  existingImagePath?: string | null;
}

const ContentForm: React.FC<ContentFormProps> = ({ formDraft, setFormDraft, existingImagePath }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFormDraft((p) => ({ ...p, image: file }));
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const displayImage = preview ?? (existingImagePath ? educationalService.imageUrl(existingImagePath) : null);

  return (
    <div className="edu-form">
      <div className="edu-form-row">
        <label>Content Title</label>
        <input type="text" placeholder="e.g. Proper Feed Mixing Ratios for Weaned Piglets"
          value={formDraft.title} onChange={(e) => setFormDraft((p) => ({ ...p, title: e.target.value }))} />
      </div>

      <div className="edu-form-grid">
        <div className="edu-form-row">
          <label>Author</label>
          <input type="text" placeholder="e.g. DA-BAI" value={formDraft.author}
            onChange={(e) => setFormDraft((p) => ({ ...p, author: e.target.value }))} />
        </div>
        <div className="edu-form-row">
          <label>Category</label>
          <div className="edu-form-select">
            <select value={formDraft.category}
              onChange={(e) => setFormDraft((p) => ({ ...p, category: e.target.value as ContentCategory }))}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <FiChevronDown className="edu-select-chevron" />
          </div>
        </div>
      </div>

      <div className="edu-form-row">
        <label>Status</label>
        <div className="edu-form-select">
          <select value={formDraft.status}
            onChange={(e) => setFormDraft((p) => ({ ...p, status: e.target.value as ContentStatus }))}>
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
          </select>
          <FiChevronDown className="edu-select-chevron" />
        </div>
      </div>

      <div className="edu-form-row">
        <label>Short Description</label>
        <textarea rows={2} placeholder="A brief summary..." value={formDraft.description}
          onChange={(e) => setFormDraft((p) => ({ ...p, description: e.target.value }))} />
      </div>

      <div className="edu-form-row">
        <label>
          {existingImagePath ? "Replace Image" : "Upload Image"}
          <span className="edu-form-optional"> (JPG, PNG, WEBP · max 5MB)</span>
        </label>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }} onChange={handleImageChange} />
        <div className="edu-upload-placeholder" onClick={() => fileInputRef.current?.click()}>
          {displayImage
            ? <img src={displayImage} alt="Preview"
                style={{ maxHeight: "120px", objectFit: "cover", borderRadius: "8px" }} />
            : <><FiImage /><span>Click to upload an image</span></>}
        </div>
      </div>

      <div className="edu-form-row">
        <label>Content Body</label>
        <textarea rows={6} placeholder="Write the full content that farmers will see in the app..."
          value={formDraft.body} onChange={(e) => setFormDraft((p) => ({ ...p, body: e.target.value }))} />
      </div>

      <div className="edu-form-divider" />

      <div className="edu-form-row">
        <label>Source URL <span className="edu-form-optional">(optional)</span></label>
        <input type="url" placeholder="https://www.da.gov.ph/..." value={formDraft.source_url}
          onChange={(e) => setFormDraft((p) => ({ ...p, source_url: e.target.value }))} />
      </div>

      <div className="edu-form-row">
        <label>Source Label <span className="edu-form-optional">(optional)</span></label>
        <input type="text" placeholder="e.g. DA-BAI – ASF Prevention Guide" value={formDraft.source_label}
          onChange={(e) => setFormDraft((p) => ({ ...p, source_label: e.target.value }))} />
      </div>
    </div>
  );
};

// ============================================================
// Empty State
// ============================================================

const EmptyState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <div className="edu-empty-state">
    <div className="edu-empty-illustration"><FiBookOpen /></div>
    <h3>No educational content available.</h3>
    <p>Once you add learning materials, advisories, or guides, they'll show up here.</p>
    <button className="edu-btn-primary" onClick={onAdd}><FiPlus /> Add Content</button>
  </div>
);

export default EducationalAdmin;