import { useState } from "react";
import {
  FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff,
  FiDatabase, FiFileText, FiRefreshCw, FiLogOut, FiSave,
  FiShield, FiX, FiAlertTriangle, FiCheckCircle, FiCamera,
  FiEdit2,
} from "react-icons/fi";
import "./SettingsAdmin.css";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ModalConfig {
  title: string;
  body: string;
  confirm: string;
  danger?: boolean;
  onConfirm: () => void;
}

interface ProfileData {
  fullName: string;
  email: string;
  contact: string;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function ConfirmModal({ config, onClose }: { config: ModalConfig; onClose: () => void }) {
  return (
    <div className="s-overlay" onClick={onClose}>
      <div className="s-modal" onClick={e => e.stopPropagation()}>
        <div className={`s-modal-icon ${config.danger ? "icon-danger" : "icon-safe"}`}>
          {config.danger ? <FiAlertTriangle size={22} /> : <FiCheckCircle size={22} />}
        </div>
        <h3 className="s-modal-title">{config.title}</h3>
        <p className="s-modal-body">{config.body}</p>
        <div className="s-modal-actions">
          <button className="s-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className={config.danger ? "s-btn-danger" : "s-btn-confirm"}
            onClick={() => { config.onConfirm(); onClose(); }}
          >
            {config.confirm}
          </button>
        </div>
        <button className="s-modal-close" onClick={onClose} aria-label="Close">
          <FiX />
        </button>
      </div>
    </div>
  );
}

// ─── Read-only display field ──────────────────────────────────────────────────
function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="s-field">
      <span className="s-label">{label}</span>
      <span className="s-read-value">{value}</span>
    </div>
  );
}

// ─── Editable input field ─────────────────────────────────────────────────────
function EditField({
  label, value, onChange, type = "text", icon,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; icon: React.ReactNode;
}) {
  return (
    <div className="s-field">
      <label className="s-label">{label}</label>
      <div className="s-input-wrap">
        <span className="s-icon-left">{icon}</span>
        <input
          className="s-input s-input-padded"
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

// ─── Password Field ───────────────────────────────────────────────────────────
function PwField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [vis, setVis] = useState(false);
  return (
    <div className="s-field">
      <label className="s-label">{label}</label>
      <div className="s-input-wrap">
        <FiLock className="s-icon-left" />
        <input
          type={vis ? "text" : "password"}
          className="s-input s-input-padded"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="s-icon-right-btn"
          onClick={() => setVis(v => !v)}
          aria-label={vis ? "Hide" : "Show"}
        >
          {vis ? <FiEyeOff /> : <FiEye />}
        </button>
      </div>
    </div>
  );
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────
function ToggleRow({ label, desc, checked, onChange }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="s-toggle-row">
      <div className="s-toggle-text">
        <span className="s-toggle-label">{label}</span>
        <span className="s-toggle-desc">{desc}</span>
      </div>
      <button
        role="switch"
        aria-pressed={checked}
        aria-label={label}
        className={`s-toggle ${checked ? "s-toggle-on" : "s-toggle-off"}`}
        onClick={() => onChange(!checked)}
      >
        <span className="s-thumb" />
      </button>
    </div>
  );
}

// ─── Section Heading ──────────────────────────────────────────────────────────
function SectionHeading({ label }: { label: string }) {
  return (
    <div className="s-section-heading">
      <span className="s-section-label">{label}</span>
      <div className="s-section-rule" />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const INITIAL_PROFILE: ProfileData = {
  fullName: "Maria Santos",
  email: "m.santos@oinkmate.ph",
  contact: "+63 912 345 6789",
};

export default function SettingsAdmin() {
  const [saved, setSaved] = useState<ProfileData>(INITIAL_PROFILE);
  const [draft, setDraft] = useState<ProfileData>(INITIAL_PROFILE);
  const [editing, setEditing] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [prefs, setPrefs] = useState({
    email: true, alerts: true, registration: false, feedback: true,
  });

  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalConfig | null>(null);

  const fire = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };
  const ask = (cfg: ModalConfig) => setModal(cfg);
  const closeModal = () => setModal(null);

  // ── Edit mode
  const enterEdit = () => {
    setDraft({ ...saved });
    setEditing(true);
  };

  const isDirty =
    draft.fullName !== saved.fullName ||
    draft.email !== saved.email ||
    draft.contact !== saved.contact;

  const trySaveAll = () => ask({
    title: "Save changes?",
    body: "Your profile information will be updated across the portal.",
    confirm: "Save changes",
    onConfirm: () => {
      setSaved({ ...draft });
      setEditing(false);
      fire("Changes saved.");
    },
  });

  const tryDiscard = () => {
    if (!isDirty) { setEditing(false); return; }
    ask({
      title: "Discard changes?",
      body: "Any edits you've made will be lost. This cannot be undone.",
      confirm: "Discard",
      danger: true,
      onConfirm: () => {
        setDraft({ ...saved });
        setEditing(false);
      },
    });
  };

  // ── Other actions
  const tryChangePhoto = () => ask({
    title: "Change profile photo?",
    body: "This would open a file picker in production. Photo upload requires a backend connection which is not included in this build.",
    confirm: "Upload photo",
    onConfirm: () => fire("Photo upload triggered."),
  });

  const trySavePassword = () => {
    if (!pw.current || !pw.next || !pw.confirm) return fire("Fill in all password fields.");
    if (pw.next !== pw.confirm) return fire("New passwords do not match.");
    ask({
      title: "Update password?",
      body: "Your current password will be replaced immediately. You will remain logged in.",
      confirm: "Yes, update password",
      onConfirm: () => {
        setPw({ current: "", next: "", confirm: "" });
        fire("Password updated.");
      },
    });
  };

  const tryBackup = () => ask({
    title: "Back up data now?",
    body: "A full system snapshot will be exported. The file will download to your browser.",
    confirm: "Start backup",
    onConfirm: () => fire("Backup started — check your downloads."),
  });

  const tryExport = () => ask({
    title: "Export reports?",
    body: "Logs and analytics will be compiled into a downloadable file. This may take a moment.",
    confirm: "Export",
    onConfirm: () => fire("Reports exported."),
  });

  const tryReset = () => ask({
    title: "Reset all settings?",
    body: "Every preference will be restored to its default value. Your profile and password will not be affected.",
    confirm: "Reset settings",
    danger: true,
    onConfirm: () => {
      setPrefs({ email: true, alerts: true, registration: false, feedback: true });
      fire("Settings reset to defaults.");
    },
  });

  const tryLogout = () => ask({
    title: "Log out?",
    body: "Your session will end and you will be redirected to the login page. Unsaved changes will be lost.",
    confirm: "Log out",
    danger: true,
    onConfirm: () => fire("Logged out. Redirecting…"),
  });

  return (
    <div className="s-page">
      {toast && <div className="s-toast">{toast}</div>}
      {modal && <ConfirmModal config={modal} onClose={closeModal} />}

      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="s-page-header">
        <div>
          <p className="s-page-eyebrow">Admin Portal</p>
          <h1 className="s-page-title">Settings</h1>
          <p className="s-page-desc">
            {editing
              ? "Edit mode is on — update your details below, then save when ready."
              : "View and manage your profile, preferences, and system information."}
          </p>
        </div>

        <div className="s-header-actions">
          {editing ? (
            <>
              <button className="s-btn-ghost-header" onClick={tryDiscard}>
                Discard
              </button>
              <button className="s-btn-primary" onClick={trySaveAll}>
                <FiSave size={13} /> Save Changes
              </button>
            </>
          ) : (
            <button className="s-btn-edit" onClick={enterEdit}>
              <FiEdit2 size={13} /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* ── Edit mode banner ──────────────────────────────────────── */}
      {editing && (
        <div className="s-edit-banner">
          <FiEdit2 size={13} />
          <span>Edit mode — profile fields are now unlocked.</span>
          {isDirty && <span className="s-edit-banner-dot" />}
          {isDirty && <span className="s-edit-banner-unsaved">Unsaved changes</span>}
        </div>
      )}

      {/* ── Two-column layout ─────────────────────────────────────── */}
      <div className="s-layout">

        {/* ══ LEFT ASIDE ═══════════════════════════════════════════ */}
        <aside className="s-aside">
          <div className="s-profile-strip">
            {/* Avatar with camera overlay in edit mode */}
            <div className={`s-avatar-wrap ${editing ? "s-avatar-wrap-editing" : ""}`}>
              <div className="s-avatar">
                {saved.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              {editing && (
                <button
                  className="s-avatar-overlay"
                  onClick={tryChangePhoto}
                  aria-label="Change photo"
                >
                  <FiCamera size={15} />
                </button>
              )}
            </div>

            <p className="s-profile-name">{saved.fullName}</p>
            <p className="s-profile-role">System Administrator</p>

            {editing && (
              <button className="s-btn-ghost-sm" onClick={tryChangePhoto}>
                <FiCamera size={11} /> Change photo
              </button>
            )}
          </div>

          <div className="s-divider" />

          <div className="s-meta-block">
            <p className="s-meta-label">System</p>
            <p className="s-meta-value">OinkMate</p>
          </div>
          <div className="s-meta-block">
            <p className="s-meta-label">Version</p>
            <p className="s-meta-value">v1.0.0</p>
          </div>
          <div className="s-meta-block">
            <p className="s-meta-label">Status</p>
            <p className="s-meta-value s-badge-sage">Beta</p>
          </div>
          <div className="s-meta-block">
            <p className="s-meta-label">Last updated</p>
            <p className="s-meta-value">June 30, 2026</p>
          </div>
          <div className="s-meta-block">
            <p className="s-meta-label">Platform</p>
            <p className="s-meta-value">Raspberry Pi 4</p>
          </div>

          <div className="s-divider" />

          <button className="s-logout-btn" onClick={tryLogout}>
            <FiLogOut size={13} /> Log out
          </button>
        </aside>

        {/* ══ RIGHT MAIN ═══════════════════════════════════════════ */}
        <main className="s-main">

          {/* ── Admin Profile ─────────────────────────────────────── */}
          <SectionHeading label="Admin Profile" />

          <div className="s-fields-grid">
            {editing ? (
              <>
                <EditField
                  label="Full name"
                  value={draft.fullName}
                  onChange={v => setDraft({ ...draft, fullName: v })}
                  icon={<FiUser size={14} />}
                />
                <EditField
                  label="Email address"
                  value={draft.email}
                  onChange={v => setDraft({ ...draft, email: v })}
                  type="email"
                  icon={<FiMail size={14} />}
                />
                <EditField
                  label="Contact number"
                  value={draft.contact}
                  onChange={v => setDraft({ ...draft, contact: v })}
                  icon={<FiPhone size={14} />}
                />
              </>
            ) : (
              <>
                <ReadField label="Full name" value={saved.fullName} />
                <ReadField label="Email address" value={saved.email} />
                <ReadField label="Contact number" value={saved.contact} />
              </>
            )}
          </div>

          {!editing && (
            <div className="s-read-hint">
              <FiEdit2 size={11} />
              Click <strong>Edit Profile</strong> in the top right to make changes.
            </div>
          )}

          <div className="s-divider s-divider-lg" />

          {/* ── Change Password ───────────────────────────────────── */}
          <SectionHeading label="Change Password" />
          <div className="s-fields-grid">
            <PwField
              label="Current password"
              value={pw.current}
              onChange={v => setPw({ ...pw, current: v })}
              placeholder="Enter current password"
            />
            <PwField
              label="New password"
              value={pw.next}
              onChange={v => setPw({ ...pw, next: v })}
              placeholder="Enter new password"
            />
            <PwField
              label="Confirm new password"
              value={pw.confirm}
              onChange={v => setPw({ ...pw, confirm: v })}
              placeholder="Re-enter new password"
            />
          </div>
          <div className="s-action-row">
            <button className="s-btn-primary" onClick={trySavePassword}>
              <FiShield size={13} /> Update password
            </button>
          </div>

          <div className="s-divider s-divider-lg" />

          {/* ── Notifications & Preferences ──────────────────────── */}
          <SectionHeading label="Notifications & Preferences" />
          <div className="s-toggle-list">
            <ToggleRow
              label="Email notifications"
              desc="Activity summaries and alerts sent to your email."
              checked={prefs.email}
              onChange={v => setPrefs({ ...prefs, email: v })}
            />
            <ToggleRow
              label="System alerts"
              desc="Sensor errors and feeding failures trigger an in-app alert."
              checked={prefs.alerts}
              onChange={v => setPrefs({ ...prefs, alerts: v })}
            />
            <ToggleRow
              label="New farmer registration"
              desc="Get notified when a new farmer account is created."
              checked={prefs.registration}
              onChange={v => setPrefs({ ...prefs, registration: v })}
            />
            <ToggleRow
              label="Feedback notifications"
              desc="Be alerted when farmers submit feedback or reports."
              checked={prefs.feedback}
              onChange={v => setPrefs({ ...prefs, feedback: v })}
            />
          </div>

          <div className="s-divider s-divider-lg" />

          {/* ── Quick Actions ─────────────────────────────────────── */}
          <SectionHeading label="Quick Actions" />
          <div className="s-actions-grid">
            <button className="s-action-tile" onClick={tryBackup}>
              <span className="s-action-icon"><FiDatabase size={18} /></span>
              <span className="s-action-name">Backup data</span>
              <span className="s-action-hint">Export a full system snapshot</span>
            </button>
            <button className="s-action-tile" onClick={tryExport}>
              <span className="s-action-icon"><FiFileText size={18} /></span>
              <span className="s-action-name">Export reports</span>
              <span className="s-action-hint">Download logs and analytics</span>
            </button>
            <button className="s-action-tile s-action-tile-warn" onClick={tryReset}>
              <span className="s-action-icon s-action-icon-warn"><FiRefreshCw size={18} /></span>
              <span className="s-action-name">Reset settings</span>
              <span className="s-action-hint">Restore all defaults</span>
            </button>
          </div>

        </main>
      </div>
    </div>
  );
}