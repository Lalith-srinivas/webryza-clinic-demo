import { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { collection, addDoc, doc, getDoc, setDoc, updateDoc, deleteDoc, orderBy, query, onSnapshot, where, getDocs, runTransaction, serverTimestamp } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../firebase/config";

const statusColors = {
  pending:   { bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
  confirmed: { bg: "#dcfce7", color: "#166534", border: "#86efac" },
  cancelled: { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
};

const inputStyle = {
  padding: "9px 12px", borderRadius: 8, border: "1.5px solid var(--border)",
  fontSize: 13, color: "var(--text)", outline: "none", background: "#fff",
  fontFamily: "var(--font)", transition: "border-color 0.2s",
};

export default function AdminDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [doctorAvailable, setDoctorAvailable] = useState(true);
  const [tokenLimit, setTokenLimit] = useState(50);
  const [editingLimit, setEditingLimit] = useState(false);
  const [newLimit, setNewLimit] = useState(50);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [unavailableFrom, setUnavailableFrom] = useState("");
  const [unavailableTo, setUnavailableTo] = useState("");
  const [editingDateRange, setEditingDateRange] = useState(false);
  const [savingDateRange, setSavingDateRange] = useState(false);
  const [loadingAppts, setLoadingAppts] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [newApptAlert, setNewApptAlert] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "", email: "", date: "", time: "", reason: "", status: "confirmed" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addDuplicate, setAddDuplicate] = useState(null); // existing booking info if duplicate found
  const [addDuplicateConfirmed, setAddDuplicateConfirmed] = useState(false);
  const isFirstLoad = useRef(true);
  const knownIds = useRef(new Set());
  const navigate = useNavigate();

  const today = new Date().toISOString().split("T")[0];

  function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [[523.25, 0], [659.25, 0.18]].forEach(([freq, delay]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.6);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.6);
      });
    } catch {}
  }

  useEffect(() => {
    fetchAvailability();
    const q = query(collection(db, "appointments"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const appts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (isFirstLoad.current) {
        appts.forEach(a => knownIds.current.add(a.id));
        isFirstLoad.current = false;
      } else {
        const newOnes = appts.filter(a => !knownIds.current.has(a.id));
        if (newOnes.length > 0) {
          playNotificationSound();
          setNewApptAlert(newOnes[0]);
          newOnes.forEach(a => knownIds.current.add(a.id));
          setTimeout(() => setNewApptAlert(null), 6000);
        }
      }
      setAppointments(appts);
      setLoadingAppts(false);
    }, () => setLoadingAppts(false));
    return () => unsub();
  }, []);

  async function fetchAvailability() {
    try {
      const snap = await getDoc(doc(db, "settings", "availability"));
      if (snap.exists()) {
        const data = snap.data();
        setDoctorAvailable(data.doctorAvailable);
        const limit = data.tokenLimit ?? 50;
        setTokenLimit(limit);
        setNewLimit(limit);
        setUnavailableFrom(data.unavailableFrom || "");
        setUnavailableTo(data.unavailableTo || "");
      }
    } catch {}
  }

  async function toggleAvailability() {
    setLoadingAvail(true);
    const next = !doctorAvailable;
    try {
      await setDoc(doc(db, "settings", "availability"), { doctorAvailable: next, tokenLimit }, { merge: true });
      setDoctorAvailable(next);
    } catch {}
    setLoadingAvail(false);
  }

  async function saveTokenLimit() {
    const val = parseInt(newLimit);
    if (!val || val < 1) return;
    try {
      await setDoc(doc(db, "settings", "availability"), { tokenLimit: val, doctorAvailable }, { merge: true });
      setTokenLimit(val);
      setEditingLimit(false);
    } catch {}
  }

  async function saveDateRange() {
    setSavingDateRange(true);
    try {
      await setDoc(doc(db, "settings", "availability"), {
        unavailableFrom: unavailableFrom || null,
        unavailableTo: unavailableTo || null,
        doctorAvailable,
        tokenLimit,
      }, { merge: true });
      setEditingDateRange(false);
    } catch {}
    setSavingDateRange(false);
  }

  async function clearDateRange() {
    setSavingDateRange(true);
    try {
      await setDoc(doc(db, "settings", "availability"), {
        unavailableFrom: null,
        unavailableTo: null,
        doctorAvailable,
        tokenLimit,
      }, { merge: true });
      setUnavailableFrom("");
      setUnavailableTo("");
      setEditingDateRange(false);
    } catch {}
    setSavingDateRange(false);
  }

  async function updateStatus(id, status, appt) {
    try {
      await updateDoc(doc(db, "appointments", id), { status });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));

      // If cancelling: decrement token slot counter & adjust visit count
      if (status === "cancelled" && appt) {
        // Decrement slot in tokenCounter
        const counterRef = doc(db, "tokenCounters", appt.date);
        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(counterRef);
          if (!snap.exists()) return;
          const data = snap.data();
          const slots = data.slots || {};
          const slotCount = slots[appt.time] || 0;
          const newSlots = { ...slots, [appt.time]: Math.max(0, slotCount - 1) };
          const newCount = Math.max(0, (data.count || 0) - 1);
          transaction.update(counterRef, { slots: newSlots, count: newCount });
        });

        // Decrement visitCount for this phone number's other appointments
        const othersSnap = await getDocs(query(
          collection(db, "appointments"),
          where("phone", "==", appt.phone),
          where("status", "!=", "cancelled")
        ));
        // Update all non-cancelled appointments for this patient to recalculate count
        const batch = othersSnap.docs.filter(d => d.id !== id);
        for (let i = 0; i < batch.length; i++) {
          await updateDoc(doc(db, "appointments", batch[i].id), { visitCount: i + 1 });
        }
      }
    } catch {}
  }

  async function deleteAppointment(id) {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "appointments", id));
      setAppointments(prev => prev.filter(a => a.id !== id));
    } catch {}
    setDeletingId(null);
    setConfirmDelete(null);
  }

  const timeSlots = [
    "9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM",
    "12:00 PM","12:30 PM","2:00 PM","2:30 PM","3:00 PM","3:30 PM",
    "4:00 PM","4:30 PM","5:00 PM","5:30 PM"
  ];
  const slotOrders = { "9:00 AM":1,"9:30 AM":2,"10:00 AM":3,"10:30 AM":4,"11:00 AM":5,"11:30 AM":6,"12:00 PM":7,"12:30 PM":8,"2:00 PM":9,"2:30 PM":10,"3:00 PM":11,"3:30 PM":12,"4:00 PM":13,"4:30 PM":14,"5:00 PM":15,"5:30 PM":16 };
  const reasons = ["General Checkup","Fever / Cold / Flu","Follow-up Visit","Vaccination","Health Screening","Chronic Disease Management","Medical Certificate","Other"];

  function slotToMinutes(label) {
    const [timePart, period] = label.split(" ");
    let [hours, mins] = timePart.split(":").map(Number);
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + mins;
  }

  async function handleAddAppointment() {
    setAddError("");
    const f = addForm;
    if (!f.name || !f.phone || !f.date || !f.time || !f.reason) {
      setAddError("Please fill in all required fields.");
      return;
    }
    // Block past time slots when adding for today
    if (f.date === today) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      // Inline parse to avoid any scope issues
      const [timePart, period] = f.time.split(" ");
      let [h, m] = timePart.split(":").map(Number);
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      const slotMins = h * 60 + m;
      if (slotMins <= currentMinutes) {
        setAddError(`The ${f.time} slot has already passed. Please select a later time.`);
        return;
      }
    }
    // Check if same patient already booked on this date
    if (!addDuplicateConfirmed) {
      const dupSnap = await getDocs(query(collection(db, "appointments"), where("phone", "==", f.phone), where("date", "==", f.date)));
      const activedup = dupSnap.docs.find(d => d.data().status !== "cancelled");
      if (activedup) {
        setAddDuplicate(activedup.data());
        return;
      }
    }

    setAddLoading(true);
    try {
      // Assign token using counter transaction
      const counterRef = doc(db, "tokenCounters", f.date);
      const slotOrder = slotOrders[f.time] || 99;
      let assignedToken;

      await runTransaction(db, async (transaction) => {
        const counterSnap = await transaction.get(counterRef);
        const existing = counterSnap.exists() ? counterSnap.data() : { count: 0, slots: {} };
        const slots = existing.slots || {};
        const earlierSlotCount = Object.entries(slots)
          .filter(([slotLabel]) => (slotOrders[slotLabel] || 99) < slotOrder)
          .reduce((sum, [, count]) => sum + count, 0);
        const sameSlotCount = slots[f.time] || 0;
        assignedToken = earlierSlotCount + sameSlotCount + 1;
        const newSlots = { ...slots, [f.time]: sameSlotCount + 1 };
        transaction.set(counterRef, { count: (existing.count || 0) + 1, slots: newSlots, date: f.date }, { merge: true });
      });

      // Get visit count for this phone
      const prevSnap = await getDocs(query(collection(db, "appointments"), where("phone", "==", f.phone)));
      const activeVisits = prevSnap.docs.filter(d => d.data().status !== "cancelled");
      const visitCount = activeVisits.length + 1;

      await addDoc(collection(db, "appointments"), {
        name: f.name,
        phone: f.phone,
        email: f.email || "",
        date: f.date,
        time: f.time,
        reason: f.reason,
        status: f.status,
        token: assignedToken,
        timeSlotOrder: slotOrder,
        visitCount,
        addedByAdmin: true,
        createdAt: serverTimestamp(),
      });

      setShowAddModal(false);
      setAddForm({ name: "", phone: "", email: "", date: "", time: "", reason: "", status: "confirmed" });
      setAddDuplicate(null);
      setAddDuplicateConfirmed(false);
    } catch (err) {
      setAddError("Failed to add appointment. Try again.");
    } finally {
      setAddLoading(false);
    }
  }

  const handleLogout = async () => { await signOut(auth); navigate("/admin"); };

  // Apply all filters: status + date + search
  const filtered = appointments.filter(a => {
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const matchDate = !dateFilter || a.date === dateFilter;
    const q = search.toLowerCase().trim();
    const matchSearch = !q || a.name?.toLowerCase().includes(q) || a.phone?.includes(q);
    return matchStatus && matchDate && matchSearch;
  });

  const counts = {
    all: appointments.length,
    pending: appointments.filter(a => a.status === "pending").length,
    confirmed: appointments.filter(a => a.status === "confirmed").length,
    cancelled: appointments.filter(a => a.status === "cancelled").length,
  };

  // Count today's bookings for token limit progress bar
  const todayCount = appointments.filter(a => a.date === today && a.status !== "cancelled").length;

  // Format YYYY-MM-DD → DD-MM-YYYY
  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const [y, m, d] = dateStr.split("-");
    return `${d}-${m}-${y}`;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-soft)" }}>

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 520, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: 18, color: "var(--text)" }}>Add Walk-in Appointment</h3>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Add an offline/walk-in patient directly</p>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text-muted)", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 5 }}>Full Name *</label>
                <input type="text" placeholder="Patient name" value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = "var(--teal)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 5 }}>Phone *</label>
                <input type="tel" placeholder="+91 98765 43210" value={addForm.phone}
                  onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = "var(--teal)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"}
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 5 }}>Email <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></label>
              <input type="email" placeholder="patient@email.com" value={addForm.email}
                onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = "var(--teal)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 5 }}>Date *</label>
                <input type="date" value={addForm.date}
                  onChange={e => { setAddForm(f => ({ ...f, date: e.target.value, time: "" })); setAddError(""); }}
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = "var(--teal)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 5 }}>Time *</label>
                <select value={addForm.time} onChange={e => setAddForm(f => ({ ...f, time: e.target.value }))}
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = "var(--teal)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"}
                >
                  <option value="">Select time</option>
                  {timeSlots
                    .filter(slot => {
                      if (addForm.date !== today) return true;
                      const now = new Date();
                      const currentMins = now.getHours() * 60 + now.getMinutes();
                      // parse "9:00 AM" etc
                      const [timePart, period] = slot.split(" ");
                      let [h, m] = timePart.split(":").map(Number);
                      if (period === "PM" && h !== 12) h += 12;
                      if (period === "AM" && h === 12) h = 0;
                      return (h * 60 + m) > currentMins;
                    })
                    .map(t => <option key={t} value={t}>{t}</option>)
                  }
                </select>
              </div>
            </div>

            {/* Unavailable date warning in admin modal */}
            {addForm.date && unavailableFrom && unavailableTo && addForm.date >= unavailableFrom && addForm.date <= unavailableTo && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#991b1b", lineHeight: 1.6 }}>
                🚫 <strong>Doctor is marked unavailable on {(() => { const [y,m,d] = addForm.date.split("-"); return `${d}-${m}-${y}`; })()}.</strong> Blocked: {(() => { const [y,m,d] = unavailableFrom.split("-"); return `${d}-${m}-${y}`; })()} → {(() => { const [y,m,d] = unavailableTo.split("-"); return `${d}-${m}-${y}`; })()}. You can still add if needed.
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 5 }}>Reason *</label>
              <select value={addForm.reason} onChange={e => setAddForm(f => ({ ...f, reason: e.target.value }))}
                style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = "var(--teal)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
              >
                <option value="">Select reason</option>
                {reasons.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 5 }}>Initial Status</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["pending","confirmed"].map(s => (
                  <button key={s} onClick={() => setAddForm(f => ({ ...f, status: s }))}
                    style={{ flex: 1, padding: "9px", borderRadius: 8, border: `2px solid ${addForm.status === s ? (s === "confirmed" ? "#16a34a" : "#ca8a04") : "var(--border)"}`,
                      background: addForm.status === s ? (s === "confirmed" ? "#dcfce7" : "#fef9c3") : "#fff",
                      color: addForm.status === s ? (s === "confirmed" ? "#166534" : "#854d0e") : "var(--text-muted)",
                      fontWeight: 600, fontSize: 13, cursor: "pointer", textTransform: "capitalize" }}>
                    {s === "confirmed" ? "✅ Confirmed" : "⏳ Pending"}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: "var(--teal-light)", border: "1px solid #99f6e4", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--teal-dark)", lineHeight: 1.6 }}>
              🎫 Token will be auto-assigned based on the selected time slot.
            </div>

            {addError && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#991b1b", fontSize: 13 }}>{addError}</div>
            )}

            {/* Duplicate warning */}
            {addDuplicate && !addDuplicateConfirmed && (
              <div style={{ background: "#fef9c3", border: "2px solid #f59e0b", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: "#854d0e", marginBottom: 6 }}>⚠️ Duplicate Booking Detected</p>
                <p style={{ fontSize: 13, color: "#854d0e", marginBottom: 12, lineHeight: 1.5 }}>
                  This phone number already has an appointment on <strong>{formatDate(addForm.date)}</strong> at <strong>{addDuplicate.time}</strong> for <strong>{addDuplicate.name}</strong>.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setAddDuplicateConfirmed(true); setAddDuplicate(null); handleAddAppointment(); }}
                    style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: "#f59e0b", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                    Add Anyway
                  </button>
                  <button onClick={() => { setAddDuplicate(null); }}
                    style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid var(--border)", background: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", color: "var(--text-muted)" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => { setShowAddModal(false); setAddDuplicate(null); setAddDuplicateConfirmed(false); }}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid var(--border)", background: "#fff", fontSize: 14, fontWeight: 600, color: "var(--text-muted)", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleAddAppointment} disabled={addLoading}
                style={{ flex: 2, padding: "11px", borderRadius: 10, border: "none", background: "var(--teal)", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", opacity: addLoading ? 0.7 : 1 }}>
                {addLoading ? "Adding..." : "Add Appointment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 380, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 40, marginBottom: 16, textAlign: "center" }}>🗑️</div>
            <h3 style={{ fontWeight: 700, fontSize: 18, color: "var(--text)", marginBottom: 10, textAlign: "center" }}>Delete Appointment?</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6, textAlign: "center", marginBottom: 24 }}>
              This will permanently remove <strong>{confirmDelete.name}</strong>'s record. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "#fff", fontSize: 14, fontWeight: 600, color: "var(--text-muted)", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => deleteAppointment(confirmDelete.id)} disabled={deletingId === confirmDelete.id}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#ef4444", fontSize: 14, fontWeight: 600, color: "#fff", cursor: "pointer", opacity: deletingId ? 0.7 : 1 }}>
                {deletingId === confirmDelete.id ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Appointment Toast */}
      {newApptAlert && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 998, background: "#fff", borderRadius: 14, padding: "16px 20px", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: "2px solid var(--teal)", maxWidth: 320, width: "calc(100vw - 48px)", animation: "slideIn 0.3s ease" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--teal-light)", border: "2px solid var(--teal)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>🔔</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 3 }}>New Appointment!</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                <strong>{newApptAlert.name}</strong> booked for {formatDate(newApptAlert.date)} at {newApptAlert.time}
              </p>
              {newApptAlert.token && <p style={{ fontSize: 12, color: "var(--teal)", fontWeight: 600, marginTop: 4 }}>Token #{newApptAlert.token}</p>}
            </div>
            <button onClick={() => setNewApptAlert(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="admin-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, background: "var(--teal)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", lineHeight: 1 }}>HealthCare Clinic</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Admin Dashboard</p>
          </div>
        </div>
        <div className="admin-topbar-actions">
          <Link to="/" className="admin-btn-outline">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span>Back to Site</span>
          </Link>
          <button onClick={() => { setShowAddModal(true); setAddError(""); setAddDuplicate(null); setAddDuplicateConfirmed(false); setAddForm({ name: "", phone: "", email: "", date: "", time: "", reason: "", status: "confirmed" }); }}
            className="admin-btn-primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            <span>Add Appointment</span>
          </button>
          <button onClick={handleLogout} className="admin-btn-ghost">Sign Out</button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>

        {/* Settings Row: Availability + Token Limit + Date Range */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }} className="settings-grid">

          {/* Doctor Availability */}
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 4 }}>Doctor Availability</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {doctorAvailable ? "✅ Available — patients can book" : "🚫 Unavailable — booking disabled"}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: doctorAvailable ? "var(--teal)" : "#ef4444" }}>
                {doctorAvailable ? "ON" : "OFF"}
              </span>
              <button onClick={toggleAvailability} disabled={loadingAvail} aria-label="Toggle availability"
                style={{ width: 52, height: 28, borderRadius: 14, border: "none", background: doctorAvailable ? "var(--teal)" : "#d1d5db", position: "relative", transition: "background 0.25s", cursor: "pointer", opacity: loadingAvail ? 0.6 : 1, flexShrink: 0 }}>
                <span style={{ position: "absolute", top: 3, left: doctorAvailable ? 26 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left 0.25s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", display: "block" }} />
              </button>
            </div>
          </div>

          {/* Token Limit */}
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 2 }}>Daily Token Limit</p>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Today: {todayCount} / {tokenLimit} used</p>
              </div>
              {!editingLimit ? (
                <button onClick={() => { setEditingLimit(true); setNewLimit(tokenLimit); }}
                  style={{ background: "var(--teal-light)", border: "1px solid #99f6e4", color: "var(--teal)", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Edit Limit
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="number" min="1" max="200" value={newLimit} onChange={e => setNewLimit(e.target.value)}
                    style={{ ...inputStyle, width: 70, textAlign: "center" }} />
                  <button onClick={saveTokenLimit} style={{ background: "var(--teal)", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save</button>
                  <button onClick={() => setEditingLimit(false)} style={{ background: "none", border: "1px solid var(--border)", padding: "6px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>✕</button>
                </div>
              )}
            </div>
            {/* Progress bar */}
            <div style={{ background: "var(--border)", borderRadius: 4, height: 6, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 4, transition: "width 0.4s",
                background: todayCount >= tokenLimit ? "#ef4444" : todayCount >= tokenLimit * 0.8 ? "#f59e0b" : "var(--teal)",
                width: `${Math.min(100, (todayCount / tokenLimit) * 100)}%`,
              }} />
            </div>
            {todayCount >= tokenLimit && (
              <p style={{ fontSize: 12, color: "#ef4444", fontWeight: 600, marginTop: 6 }}>🚫 Today's limit reached — no more bookings accepted</p>
            )}
          </div>
          {/* Date Range Unavailability */}
          <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 2 }}>Unavailable Dates</p>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Block bookings for a date range</p>
              </div>
              {!editingDateRange && (
                <button onClick={() => setEditingDateRange(true)}
                  style={{ background: "var(--teal-light)", border: "1px solid #99f6e4", color: "var(--teal)", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {unavailableFrom ? "Edit" : "Set Dates"}
                </button>
              )}
            </div>
            {!editingDateRange ? (
              unavailableFrom && unavailableTo ? (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px" }}>
                  <p style={{ fontSize: 13, color: "#991b1b", fontWeight: 600, marginBottom: 4 }}>🚫 Blocked Period</p>
                  <p style={{ fontSize: 12, color: "#7f1d1d" }}>{formatDate(unavailableFrom)} → {formatDate(unavailableTo)}</p>
                  <button onClick={clearDateRange} disabled={savingDateRange}
                    style={{ marginTop: 8, background: "none", border: "none", color: "#dc2626", fontSize: 12, cursor: "pointer", fontWeight: 600, padding: 0 }}>
                    ✕ Clear
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>No date range set</p>
              )
            ) : (
              <div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>From</label>
                  <input type="date" value={unavailableFrom} onChange={e => setUnavailableFrom(e.target.value)}
                    style={{ ...inputStyle, width: "100%", fontSize: 12, padding: "7px 10px" }}
                    onFocus={e => e.target.style.borderColor = "var(--teal)"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>To</label>
                  <input type="date" value={unavailableTo} onChange={e => setUnavailableTo(e.target.value)}
                    min={unavailableFrom}
                    style={{ ...inputStyle, width: "100%", fontSize: 12, padding: "7px 10px" }}
                    onFocus={e => e.target.style.borderColor = "var(--teal)"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveDateRange} disabled={savingDateRange || !unavailableFrom || !unavailableTo}
                    style={{ flex: 1, background: "var(--teal)", color: "#fff", border: "none", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: (!unavailableFrom || !unavailableTo) ? 0.5 : 1 }}>
                    {savingDateRange ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => setEditingDateRange(false)}
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "#fff", fontSize: 12, cursor: "pointer" }}>
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }} className="stats-grid">
          {[
            { label: "Total", key: "all", color: "var(--teal)" },
            { label: "Pending", key: "pending", color: "#ca8a04" },
            { label: "Confirmed", key: "confirmed", color: "#16a34a" },
            { label: "Cancelled", key: "cancelled", color: "#dc2626" },
          ].map(s => (
            <div key={s.key} onClick={() => setStatusFilter(s.key)} style={{
              background: "#fff", border: `1.5px solid ${statusFilter === s.key ? s.color : "var(--border)"}`,
              borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "border-color 0.2s",
              boxShadow: statusFilter === s.key ? `0 0 0 3px ${s.color}18` : "none",
            }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{counts[s.key]}</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Appointments Table */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>

          {/* Filters Bar */}
          <div className="filters-bar">
            <h2 style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", flexShrink: 0 }}>
              Appointments
              {dateFilter && <span style={{ fontSize: 13, color: "var(--teal)", fontWeight: 500, marginLeft: 8 }}>
                — {formatDate(dateFilter)}
              </span>}
            </h2>
            <div className="filters-controls">
              {/* Search */}
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input
                  type="text" placeholder="Search name or phone…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 30, width: 200 }}
                  onFocus={e => e.target.style.borderColor = "var(--teal)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"}
                />
              </div>
              {/* Date Filter */}
              <div style={{ position: "relative" }}>
                <input
                  type="date" value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                  onFocus={e => e.target.style.borderColor = "var(--teal)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"}
                />
              </div>
              {/* Today shortcut */}
              <button onClick={() => setDateFilter(today)}
                style={{ background: dateFilter === today ? "var(--teal)" : "var(--bg-soft)", color: dateFilter === today ? "#fff" : "var(--text-muted)", border: `1px solid ${dateFilter === today ? "var(--teal)" : "var(--border)"}`, padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                Today
              </button>
              {/* Clear filters */}
              {(dateFilter || search || statusFilter !== "all") && (
                <button onClick={() => { setDateFilter(""); setSearch(""); setStatusFilter("all"); }}
                  style={{ background: "none", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: 8, fontSize: 12, color: "var(--text-muted)", cursor: "pointer", whiteSpace: "nowrap" }}>
                  ✕ Clear
                </button>
              )}
              {/* Live badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f0fdf4", border: "1px solid #86efac", padding: "6px 12px", borderRadius: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a", display: "inline-block", animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#16a34a" }}>Live</span>
              </div>
            </div>
          </div>

          {loadingAppts ? (
            <div style={{ padding: 60, textAlign: "center" }}>
              <div style={{ width: 32, height: 32, border: "3px solid var(--teal)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <p style={{ fontWeight: 600 }}>No appointments found</p>
              <p style={{ fontSize: 14, marginTop: 4 }}>Try changing your filters or search term.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="table-wrapper" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--bg-soft)" }}>
                      {["Token","Visits","Name","Phone","Email","Date","Time","Reason","Status","Change Status","Delete"].map(h => (
                        <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a, i) => {
                      const sc = statusColors[a.status] || statusColors.pending;
                      return (
                        <tr key={a.id} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={{ padding: "13px 14px", textAlign: "center" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", background: a.status === "cancelled" ? "#f1f5f9" : "var(--teal-light)", border: `2px solid ${a.status === "cancelled" ? "#cbd5e1" : "var(--teal)"}`, fontWeight: 800, fontSize: 14, color: a.status === "cancelled" ? "#94a3b8" : "var(--teal)", textDecoration: a.status === "cancelled" ? "line-through" : "none" }}>
                              {a.token ?? "—"}
                            </span>
                          </td>
                          <td style={{ padding: "13px 14px", textAlign: "center" }}>
                            <span style={{ display: "inline-block", background: "#ede9fe", color: "#7c3aed", border: "1px solid #c4b5fd", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>
                              #{a.visitCount ?? 1}
                            </span>
                          </td>
                          <td style={{ padding: "13px 14px", whiteSpace: "nowrap" }}>
                          <span style={{ fontWeight: 600, color: "var(--text)" }}>{a.name}</span>
                          {a.addedByAdmin && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, background: "#ede9fe", color: "#7c3aed", border: "1px solid #c4b5fd", borderRadius: 10, padding: "2px 7px", verticalAlign: "middle" }}>WALK-IN</span>}
                        </td>
                          <td style={{ padding: "13px 14px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{a.phone}</td>
                          <td style={{ padding: "13px 14px", color: "var(--text-muted)" }}>{a.email}</td>
                          <td style={{ padding: "13px 14px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{formatDate(a.date)}</td>
                          <td style={{ padding: "13px 14px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{a.time}</td>
                          <td style={{ padding: "13px 14px", color: "var(--text-muted)", maxWidth: 130 }}>{a.reason}</td>
                          <td style={{ padding: "13px 14px" }}>
                            <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, whiteSpace: "nowrap" }}>
                              {a.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: "13px 14px" }}>
                            <select value={a.status} onChange={e => updateStatus(a.id, e.target.value, a)}
                              style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, color: "var(--text)", background: "#fff", cursor: "pointer" }}>
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td style={{ padding: "13px 14px" }}>
                            {a.status === "cancelled" && (
                              <button onClick={() => setConfirmDelete(a)} title="Delete"
                                style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 7, padding: "6px 10px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="mobile-cards">
                {filtered.map(a => {
                  const sc = statusColors[a.status] || statusColors.pending;
                  return (
                    <div key={a.id} style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", background: a.status === "cancelled" ? "#f1f5f9" : "var(--teal-light)", border: `2px solid ${a.status === "cancelled" ? "#cbd5e1" : "var(--teal)"}`, fontWeight: 900, fontSize: 15, color: a.status === "cancelled" ? "#94a3b8" : "var(--teal)", flexShrink: 0, textDecoration: a.status === "cancelled" ? "line-through" : "none" }}>
                            {a.token ?? "—"}
                          </span>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
                            {a.name}
                            {a.addedByAdmin && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, background: "#ede9fe", color: "#7c3aed", border: "1px solid #c4b5fd", borderRadius: 10, padding: "2px 7px" }}>WALK-IN</span>}
                          </p>
                            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{a.phone} · <span style={{ color: "#7c3aed", fontWeight: 600 }}>Visit #{a.visitCount ?? 1}</span></p>
                          </div>
                        </div>
                        <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, whiteSpace: "nowrap" }}>
                          {a.status.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 3 }}>📧 {a.email}</p>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 3 }}>📅 {formatDate(a.date)} at {a.time}</p>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>📋 {a.reason}</p>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <select value={a.status} onChange={e => updateStatus(a.id, e.target.value, a)}
                          style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13, color: "var(--text)", background: "#fff" }}>
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        {a.status === "cancelled" && (
                          <button onClick={() => setConfirmDelete(a)}
                            style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                            🗑️ Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

        /* ── Top bar ── */
        .admin-topbar {
          background: #fff;
          border-bottom: 1px solid var(--border);
          padding: 0 20px;
          min-height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .admin-topbar-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .admin-btn-primary {
          display: flex; align-items: center; gap: 5px;
          background: var(--teal); color: #fff; border: none;
          padding: 8px 14px; border-radius: 8px;
          font-size: 13px; font-weight: 600; cursor: pointer;
          font-family: var(--font); white-space: nowrap;
        }
        .admin-btn-outline {
          display: flex; align-items: center; gap: 5px;
          background: var(--teal-light); border: 1px solid #99f6e4;
          color: var(--teal); padding: 7px 12px; border-radius: 8px;
          font-size: 13px; font-weight: 600; white-space: nowrap;
        }
        .admin-btn-ghost {
          background: none; border: 1px solid var(--border);
          padding: 7px 12px; border-radius: 8px;
          font-size: 13px; color: var(--text-muted);
          font-weight: 500; cursor: pointer;
          font-family: var(--font); white-space: nowrap;
        }

        /* ── Settings grid ── */
        .settings-grid { grid-template-columns: 1fr 1fr 1fr; }

        /* ── Table / cards ── */
        .mobile-cards { display: none; }

        /* ── Filters bar ── */
        .filters-bar {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
        }
        .filters-controls {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        /* ── Tablet ── */
        @media (max-width: 1000px) {
          .settings-grid { grid-template-columns: 1fr 1fr !important; }
        }

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .admin-topbar { padding: 10px 14px; min-height: auto; }
          .admin-topbar-actions { width: 100%; justify-content: stretch; }
          .admin-btn-primary { flex: 1; justify-content: center; font-size: 12px; padding: 8px 10px; }
          .admin-btn-outline { flex: 1; justify-content: center; font-size: 12px; padding: 7px 8px; }
          .admin-btn-ghost { flex: 1; text-align: center; font-size: 12px; padding: 7px 8px; }
          .settings-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .table-wrapper { display: none; }
          .mobile-cards { display: block; }
          .filters-controls { width: 100%; }
          .filters-controls input[type="text"],
          .filters-controls input[type="date"] { flex: 1; min-width: 0; }
        }
      `}</style>
    </div>
  );
}
