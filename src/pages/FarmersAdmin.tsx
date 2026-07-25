import React, { useMemo, useState, useEffect } from "react";
import {
  FiSearch, FiFilter, FiPlus, FiRefreshCw,
  FiEye, FiEdit2, FiTrash2, FiX,
  FiPhone, FiMapPin, FiCalendar, FiHome,
  FiChevronDown, FiAlertTriangle, FiCheckCircle,
  FiUsers, FiUserCheck, FiUserX,
} from "react-icons/fi";
import "./FarmersAdmin.css";

/* ── Types ─────────────────────────────────────── */
type FarmerStatus = "Active" | "Inactive";
type ToastKind    = "success" | "danger" | "loading";

interface Farmer {
  id: string; name: string; farmName: string;
  contactNumber: string; farmAddress: string;
  status: FarmerStatus; dateRegistered: string;
}
interface FarmerFormData {
  name: string; contactNumber: string;
  farmName: string; farmAddress: string; status: FarmerStatus;
}
interface FormErrors {
  name?: string; contactNumber?: string;
  farmName?: string; farmAddress?: string;
}
type ModalMode = "add" | "edit" | "view" | "delete" | null;

const EMPTY_FORM: FarmerFormData = {
  name: "", contactNumber: "", farmName: "", farmAddress: "", status: "Active",
};

/* ── Helpers ────────────────────────────────────── */
const initials = (n: string) => n.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
const fmtDate  = (d: string) => new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
const todayStr = () => new Date().toISOString().split("T")[0];
let uid = 10;

/* ══════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════ */
const FarmersAdmin: React.FC = () => {

  /* ── State ── */
  const [farmers,    setFarmers]    = useState<Farmer[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [filter,     setFilter]     = useState<"All" | FarmerStatus>("All");
  const [toolDrop,   setToolDrop]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modal,      setModal]      = useState<ModalMode>(null);
  const [active,     setActive]     = useState<Farmer | null>(null);
  const [form,       setForm]       = useState<FarmerFormData>(EMPTY_FORM);
  const [errors,     setErrors]     = useState<FormErrors>({});
  const [toast,      setToast]      = useState<{ msg: string; kind: ToastKind } | null>(null);

  /* ── Fetch from API ── */
  useEffect(() => { loadFarmers(); }, []);

  const loadFarmers = async () => {
    setIsFetching(true);
    try {
      const res  = await fetch("http://localhost/oinkmate-api/config/get_farmers.php");
      const data = await res.json();
      if (data.success) setFarmers(data.data);
      else              pushToast("Failed to load farmers.", "danger");
    } catch {
      pushToast("Could not connect to server.", "danger");
    } finally {
      setIsFetching(false);
    }
  };

  /* ── Derived ── */
  const rows = useMemo(() =>
    farmers.filter(f => {
      const q = searchName.toLowerCase();
      return (f.name.toLowerCase().includes(q) || f.farmName.toLowerCase().includes(q)) &&
             (filter === "All" || f.status === filter);
    }),
  [farmers, searchName, filter]);

  const stats = useMemo(() => {
    const total  = farmers.length;
    const active = farmers.filter(f => f.status === "Active").length;
    return { total, active, inactive: total - active, farms: new Set(farmers.map(f => f.farmName)).size };
  }, [farmers]);

  /* ── Toast ── */
  const pushToast = (msg: string, kind: ToastKind = "success") => {
    setToast({ msg, kind });
    if (kind !== "loading") window.setTimeout(() => setToast(null), 2800);
  };
  const clearToast = () => setToast(null);

  /* ── Dropdowns ── */
  const closeDrops = () => { setToolDrop(false); };
  const pickFilter = (s: "All" | FarmerStatus) => { setFilter(s); closeDrops(); };

  /* ── Refresh ── */
  const doRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setSearchName(""); setFilter("All");
    pushToast("Refreshing records…", "loading");
    try {
      const res  = await fetch("http://localhost/oinkmate-api/config/get_farmers.php");
      const data = await res.json();
      if (data.success) { setFarmers(data.data); pushToast("Records refreshed.", "success"); }
      else              pushToast("Refresh failed.", "danger");
    } catch {
      pushToast("Could not connect to server.", "danger");
    } finally {
      setRefreshing(false);
    }
  };

  /* ── Modal helpers ── */
  const openAdd    = () => { setForm(EMPTY_FORM); setErrors({}); setActive(null); setModal("add"); };
  const openView   = (f: Farmer) => { setActive(f); setModal("view"); };
  const openEdit   = (f: Farmer) => {
    setActive(f);
    setForm({ name: f.name, contactNumber: f.contactNumber, farmName: f.farmName, farmAddress: f.farmAddress, status: f.status });
    setErrors({});
    setModal("edit");
  };
  const openDelete = (f: Farmer) => { setActive(f); setModal("delete"); };
  const closeModal = () => { setModal(null); setActive(null); setErrors({}); setSubmitting(false); };

  /* ── Form field change ── */
  const setF = (k: keyof FarmerFormData, v: string) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k as keyof FormErrors]) setErrors(p => ({ ...p, [k]: undefined }));
  };

  /* ── Validation ── */
  const validate = (d: FarmerFormData): FormErrors => {
    const e: FormErrors = {};
    if (!d.name.trim())                                              e.name          = "Full name is required.";
    else if (d.name.trim().length < 2)                               e.name          = "Name is too short.";
    if (!d.contactNumber.trim())                                     e.contactNumber = "Contact number is required.";
    else if (!/^[0-9+\-\s()]{7,15}$/.test(d.contactNumber.trim()))  e.contactNumber = "Enter a valid contact number.";
    if (!d.farmName.trim())                                          e.farmName      = "Farm name is required.";
    if (!d.farmAddress.trim())                                       e.farmAddress   = "Farm address is required.";
    return e;
  };

  /* ── Add ── */
  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    // local-state add (swap for API call when ready)
    const nf: Farmer = {
      id: `F-${1000 + uid++}`, name: form.name.trim(),
      contactNumber: form.contactNumber.trim(), farmName: form.farmName.trim(),
      farmAddress: form.farmAddress.trim(), status: form.status, dateRegistered: todayStr(),
    };
    window.setTimeout(() => {
      setFarmers(p => [nf, ...p]);
      pushToast(`${nf.name} added successfully.`, "success");
      closeModal();
    }, 600);
  };

  /* ── Edit ── */
  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSubmitting(true);
    window.setTimeout(() => {
      setFarmers(p => p.map(f => f.id === active.id
        ? { ...f, name: form.name.trim(), contactNumber: form.contactNumber.trim(),
            farmName: form.farmName.trim(), farmAddress: form.farmAddress.trim(), status: form.status }
        : f
      ));
      pushToast(`${form.name.trim()} updated successfully.`, "success");
      closeModal();
    }, 600);
  };

  /* ── Delete ── */
  const doDelete = () => {
    if (!active) return;
    setSubmitting(true);
    window.setTimeout(() => {
      setFarmers(p => p.filter(f => f.id !== active.id));
      pushToast(`${active.name} has been removed.`, "danger");
      closeModal();
    }, 500);
  };

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div className="fm-wrap" onClick={closeDrops}>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fm-toast fm-toast--${toast.kind}`} onClick={clearToast}>
          {toast.kind === "success"  && <FiCheckCircle />}
          {toast.kind === "danger"   && <FiAlertTriangle />}
          {toast.kind === "loading"  && <span className="fm-toast-spinner" />}
          <span>{toast.msg}</span>
        </div>
      )}

      

      {/* ── Stats ── */}
      <div className="fm-stats">
        {[
          { icon: <FiUsers />,     cls: "ic-total",    label: "Total Farmers",    val: stats.total },
          { icon: <FiUserCheck />, cls: "ic-active",   label: "Active Farmers",   val: stats.active },
          { icon: <FiUserX />,     cls: "ic-inactive", label: "Inactive Farmers", val: stats.inactive },
          { icon: <FiHome />,      cls: "ic-farms",    label: "Total Farms",      val: stats.farms },
        ].map(({ icon, cls, label, val }) => (
          <div className="fm-stat-card" key={label}>
            <div className="fm-stat-card-top">
              <div className={`fm-stat-icon ${cls}`}>{icon}</div>
              <span className="fm-stat-live">Live</span>
            </div>
            <div className="fm-stat-info">
              <span className="fm-stat-label">{label}</span>
              <span className="fm-stat-value">{isFetching ? "—" : val}</span>
            </div>

          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="fm-toolbar" onClick={e => e.stopPropagation()}>
        <div className="fm-input fm-input-grow">
          <FiSearch className="fm-cell-icon" />
          <input
            type="text"
            placeholder="Search farmers or farms…"
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
          />
          {searchName && (
            <button className="fm-input-clear" onClick={() => setSearchName("")}>
              <FiX />
            </button>
          )}
        </div>
        {/* Status filter — one only */}
        <div className="fm-drop">
          <button className="fm-btn fm-btn-ghost" onClick={() => { setToolDrop(p => !p); }}>
            <FiFilter />
            <span>{filter === "All" ? "All Status" : filter}</span>
            <FiChevronDown className={`fm-chevron ${toolDrop ? "open" : ""}`} />
          </button>
          {toolDrop && (
            <div className="fm-drop-menu">
              {(["All", "Active", "Inactive"] as const).map(s => (
                <button key={s} className={`fm-drop-item ${filter === s ? "active" : ""}`} onClick={() => pickFilter(s)}>
                  {s === "All" ? "All" : `${s}`}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className={`fm-btn fm-btn-ghost ${refreshing ? "is-refreshing" : ""}`}
          onClick={doRefresh}
          disabled={refreshing}
        >
          <FiRefreshCw className={refreshing ? "fm-spin" : ""} />
          <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
        </button>
        <button className="fm-btn fm-btn-primary" onClick={openAdd}>
          <FiPlus /><span>Add Farmer</span>
        </button>
      </div>

      {/* Filter chip */}
      {filter !== "All" && (
        <div className="fm-chip-row">
          <span className="fm-chip">
            {filter} Farmers
            <button onClick={() => setFilter("All")}><FiX /></button>
          </span>
          <span className="fm-chip-count">{rows.length} result{rows.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* ── Table ── */}
      <div className="fm-table-card">
        {isFetching ? (
          /* Initial page load skeleton */
          <div className="fm-loading">
            <div className="fm-spinner" />
            <p>Loading farmer records…</p>
          </div>
        ) : refreshing ? (
          <div className="fm-loading">
            <div className="fm-spinner" />
            <p>Refreshing farmer records…</p>
          </div>
        ) : rows.length > 0 ? (
          <>
            <div className="fm-table-bar">
              <span className="fm-table-count">
                Showing <strong>{rows.length}</strong> of <strong>{farmers.length}</strong> farmers
              </span>
            </div>
            <div className="fm-table-scroll">
              <table className="fm-table">
                <thead>
                  <tr>
                    <th>Farmer</th>
                    <th>Farm Name</th>
                    <th>Contact</th>
                    <th>Address</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(f => (
                    <tr key={f.id}>
                      <td>
                        <div className="fm-farmer-cell">
                          <div className="fm-avatar">{initials(f.name)}</div>
                          <div>
                            <div className="fm-farmer-name">{f.name}</div>
                            <div className="fm-farmer-id">{f.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>{f.farmName}</td>
                      <td><span className="fm-cell-pair"><FiPhone className="fm-cell-icon" />{f.contactNumber}</span></td>
                      <td><span className="fm-cell-pair"><FiMapPin className="fm-cell-icon" />{f.farmAddress}</span></td>
                      <td>
                        <span className={`fm-badge ${f.status === "Active" ? "fm-badge-active" : "fm-badge-inactive"}`}>
                          <span className="fm-badge-dot" />{f.status}
                        </span>
                      </td>
                      <td><span className="fm-cell-pair"><FiCalendar className="fm-cell-icon" />{fmtDate(f.dateRegistered)}</span></td>
                      <td>
                        <div className="fm-actions">
                          <button className="fm-action fm-action-view"   title="View"   onClick={() => openView(f)}><FiEye /></button>
                          <button className="fm-action fm-action-edit"   title="Edit"   onClick={() => openEdit(f)}><FiEdit2 /></button>
                          <button className="fm-action fm-action-delete" title="Delete" onClick={() => openDelete(f)}><FiTrash2 /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="fm-empty">
            <div className="fm-empty-icon"><FiUsers /></div>
            <h3>No farmers found.</h3>
            <p>Try adjusting your search or filters, or register a new farmer.</p>
            <button className="fm-btn fm-btn-primary" onClick={openAdd}>
              <FiPlus /><span>Add Farmer</span>
            </button>
          </div>
        )}
      </div>


      {/* ═══════════════════════════════
          MODAL — ADD / EDIT
      ═══════════════════════════════ */}
      {(modal === "add" || modal === "edit") && (
        <div className="fm-overlay" onClick={closeModal}>
          <div className="fm-modal" onClick={e => e.stopPropagation()}>

            <div className="fm-modal-head">
              <h2>{modal === "add" ? "Add New Farmer" : "Edit Farmer"}</h2>
              <button className="fm-close" onClick={closeModal}><FiX /></button>
            </div>

            <form className="fm-form" onSubmit={modal === "add" ? submitAdd : submitEdit} noValidate>
              <div className="fm-form-grid">

                <div className={`fm-field ${errors.name ? "has-err" : ""}`}>
                  <label htmlFor="fm-name">Full Name <span className="fm-req">*</span></label>
                  <input id="fm-name" type="text" placeholder="e.g. Juan Dela Cruz"
                    value={form.name} onChange={e => setF("name", e.target.value)} />
                  {errors.name && <span className="fm-field-err"><FiAlertTriangle />{errors.name}</span>}
                </div>

                <div className={`fm-field ${errors.contactNumber ? "has-err" : ""}`}>
                  <label htmlFor="fm-contact">Contact Number <span className="fm-req">*</span></label>
                  <input id="fm-contact" type="text" placeholder="e.g. 0917 234 5678"
                    value={form.contactNumber} onChange={e => setF("contactNumber", e.target.value)} />
                  {errors.contactNumber && <span className="fm-field-err"><FiAlertTriangle />{errors.contactNumber}</span>}
                </div>

                <div className={`fm-field ${errors.farmName ? "has-err" : ""}`}>
                  <label htmlFor="fm-farm">Farm Name <span className="fm-req">*</span></label>
                  <input id="fm-farm" type="text" placeholder="e.g. Dela Cruz Piggery"
                    value={form.farmName} onChange={e => setF("farmName", e.target.value)} />
                  {errors.farmName && <span className="fm-field-err"><FiAlertTriangle />{errors.farmName}</span>}
                </div>

                <div className={`fm-field fm-field-full ${errors.farmAddress ? "has-err" : ""}`}>
                  <label htmlFor="fm-addr">Farm Address <span className="fm-req">*</span></label>
                  <input id="fm-addr" type="text" placeholder="e.g. Brgy. Bolbok, Batangas City"
                    value={form.farmAddress} onChange={e => setF("farmAddress", e.target.value)} />
                  {errors.farmAddress && <span className="fm-field-err"><FiAlertTriangle />{errors.farmAddress}</span>}
                </div>

                <div className="fm-field fm-field-full">
                  <label>Status</label>
                  <div className="fm-toggle">
                    <button type="button"
                      className={`fm-toggle-btn ${form.status === "Active" ? "sel-active" : ""}`}
                      onClick={() => setF("status", "Active")}>
                      <span className="fm-dot fm-dot-green" />Active
                    </button>
                    <button type="button"
                      className={`fm-toggle-btn ${form.status === "Inactive" ? "sel-inactive" : ""}`}
                      onClick={() => setF("status", "Inactive")}>
                      <span className="fm-dot fm-dot-red" />Inactive
                    </button>
                  </div>
                </div>

              </div>

              <div className="fm-modal-foot">
                <button type="button" className="fm-btn fm-btn-outline" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="fm-btn fm-btn-primary" disabled={submitting}>
                  {submitting
                    ? <><span className="fm-btn-spinner" /><span>Saving…</span></>
                    : modal === "add"
                      ? <><FiPlus /><span>Add Farmer</span></>
                      : <><FiCheckCircle /><span>Save Changes</span></>
                  }
                </button>
              </div>
            </form>

          </div>
        </div>
      )}


      {/* ═══════════════════════════════
          MODAL — VIEW
      ═══════════════════════════════ */}
      {modal === "view" && active && (
        <div className="fm-overlay" onClick={closeModal}>
          <div className="fm-modal fm-modal-view" onClick={e => e.stopPropagation()}>

            <button className="fm-close fm-close-abs" onClick={closeModal}><FiX /></button>

            <div className="fm-view-hero">
              <div className="fm-view-avatar">{initials(active.name)}</div>
              <div className="fm-view-info">
                <h2>{active.name}</h2>
                <span className="fm-view-id">{active.id}</span>
              </div>
              <span className={`fm-badge ${active.status === "Active" ? "fm-badge-active" : "fm-badge-inactive"}`}>
                <span className="fm-badge-dot" />{active.status}
              </span>
            </div>

            <div className="fm-view-body">
              {[
                { icon: <FiHome />,     label: "Farm Name",       value: active.farmName },
                { icon: <FiPhone />,    label: "Contact Number",  value: active.contactNumber },
                { icon: <FiMapPin />,   label: "Farm Address",    value: active.farmAddress },
                { icon: <FiCalendar />, label: "Date Registered", value: fmtDate(active.dateRegistered) },
              ].map(({ icon, label, value }) => (
                <div className="fm-view-row" key={label}>
                  <span className="fm-view-icon">{icon}</span>
                  <div>
                    <span className="fm-view-label">{label}</span>
                    <span className="fm-view-value">{value}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="fm-modal-foot">
              <button className="fm-btn fm-btn-outline" onClick={closeModal}>Close</button>
              <button className="fm-btn fm-btn-amber" onClick={() => openEdit(active)}>
                <FiEdit2 /><span>Edit Farmer</span>
              </button>
            </div>

          </div>
        </div>
      )}


      {/* ═══════════════════════════════
          MODAL — DELETE
      ═══════════════════════════════ */}
      {modal === "delete" && active && (
        <div className="fm-overlay" onClick={closeModal}>
          <div className="fm-modal fm-modal-delete" onClick={e => e.stopPropagation()}>

            <div className="fm-del-icon"><FiAlertTriangle /></div>
            <h2 className="fm-del-title">Delete Farmer</h2>
            <p className="fm-del-msg">
              Are you sure you want to delete <strong>{active.name}</strong>? This cannot be undone.
            </p>

            <div className="fm-del-preview">
              <div className="fm-avatar fm-avatar-lg">{initials(active.name)}</div>
              <div>
                <span className="fm-del-fname">{active.name}</span>
                <span className="fm-del-ffarm">{active.farmName}</span>
              </div>
            </div>

            <div className="fm-modal-foot fm-modal-foot-center">
              <button className="fm-btn fm-btn-outline" onClick={closeModal} disabled={submitting}>Cancel</button>
              <button className="fm-btn fm-btn-danger" onClick={doDelete} disabled={submitting}>
                {submitting
                  ? <><span className="fm-btn-spinner fm-btn-spinner-light" /><span>Deleting…</span></>
                  : <><FiTrash2 /><span>Yes, Delete</span></>
                }
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default FarmersAdmin;