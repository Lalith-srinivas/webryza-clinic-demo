import { useState, useEffect, useRef } from "react";
import { collection, addDoc, doc, getDoc, query, where, getDocs, serverTimestamp, runTransaction } from "firebase/firestore";
import { db } from "../firebase/config";

const timeSlots = [
  { label: "9:00 AM",  order: 1 },
  { label: "9:30 AM",  order: 2 },
  { label: "10:00 AM", order: 3 },
  { label: "10:30 AM", order: 4 },
  { label: "11:00 AM", order: 5 },
  { label: "11:30 AM", order: 6 },
  { label: "12:00 PM", order: 7 },
  { label: "12:30 PM", order: 8 },
  { label: "2:00 PM",  order: 9 },
  { label: "2:30 PM",  order: 10 },
  { label: "3:00 PM",  order: 11 },
  { label: "3:30 PM",  order: 12 },
  { label: "4:00 PM",  order: 13 },
  { label: "4:30 PM",  order: 14 },
  { label: "5:00 PM",  order: 15 },
  { label: "5:30 PM",  order: 16 },
];

const reasons = ["General Checkup","Fever / Cold / Flu","Follow-up Visit","Vaccination","Health Screening","Chronic Disease Management","Medical Certificate","Other"];
const initialForm = { name: "", phone: "", email: "", date: "", time: "", reason: "" };

const inputStyle = {
  width: "100%", padding: "11px 14px", borderRadius: 8,
  border: "1.5px solid var(--border)", fontSize: 14,
  color: "var(--text)", outline: "none", background: "#fff",
  fontFamily: "var(--font)", transition: "border-color 0.2s", boxSizing: "border-box",
};
const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 };

function Field({ label, name, type, placeholder, value, onChange }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} name={name} placeholder={placeholder} value={value} onChange={onChange}
        style={inputStyle}
        onFocus={e => e.target.style.borderColor = "var(--teal)"}
        onBlur={e => e.target.style.borderColor = "var(--border)"}
      />
    </div>
  );
}

function slotToMinutes(label) {
  const [timePart, period] = label.split(" ");
  let [hours, mins] = timePart.split(":").map(Number);
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + mins;
}

export default function Appointment() {
  const [settings, setSettings]           = useState(null);
  const [form, setForm]                   = useState(initialForm);
  const [loading, setLoading]             = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [error, setError]                 = useState("");

  // Duplicate booking — only shown after submit attempt
  const [existingBooking, setExistingBooking] = useState(null);
  const [duplicateMode, setDuplicateMode]     = useState(null); // null | "ask" | "someone_else"
  const [someoneElseName, setSomeoneElseName] = useState("");   // controlled input instead of getElementById

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    async function loadSettings() {
      try {
        const snap = await getDoc(doc(db, "settings", "availability"));
        if (snap.exists()) setSettings(snap.data());
        else setSettings({ doctorAvailable: true, tokenLimit: 50 });
      } catch { setSettings({ doctorAvailable: true, tokenLimit: 50 }); }
    }
    loadSettings();
  }, []);

  const tokenLimit = settings?.tokenLimit ?? 50;
  const globallyUnavailable = settings && !settings.doctorAvailable && !settings.unavailableFrom;
  const selectedDateUnavailable = !!(settings && form.date && settings.unavailableFrom && settings.unavailableTo
    && form.date >= settings.unavailableFrom && form.date <= settings.unavailableTo);

  // Plain change — NO duplicate checks on blur anymore
  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  async function checkDuplicate(phone, date) {
    if (!phone || !date) return null;
    const snap = await getDocs(query(
      collection(db, "appointments"),
      where("phone", "==", phone),
      where("date", "==", date)
    ));
    const active = snap.docs.find(d => d.data().status !== "cancelled");
    return active ? active.data() : null;
  }

  // skipDuplicateCheck=true when user has already acknowledged duplicate
  async function proceedBooking(overrideName = null, skipDuplicateCheck = false) {
    setError("");
    const submitForm = overrideName ? { ...form, name: overrideName } : form;

    if (!submitForm.name || !submitForm.phone || !submitForm.date || !submitForm.time || !submitForm.reason) {
      setError("Please fill in all required fields including name, phone, date, time and reason.");
      return;
    }

    // Block past slots for today
    if (submitForm.date === today) {
      const now = new Date();
      if (slotToMinutes(submitForm.time) <= now.getHours() * 60 + now.getMinutes()) {
        setError(`The ${submitForm.time} slot has already passed. Please select a later time.`);
        return;
      }
    }

    setLoading(true);
    try {
      const counterRef = doc(db, "tokenCounters", submitForm.date);
      const selectedSlot = timeSlots.find(t => t.label === submitForm.time);
      const slotOrder = selectedSlot ? selectedSlot.order : 99;
      let assignedToken;
      let limitReached = false;

      await runTransaction(db, async (transaction) => {
        const counterSnap = await transaction.get(counterRef);
        const existing = counterSnap.exists() ? counterSnap.data() : { count: 0, slots: {}, tokenLimit };
        const currentCount = existing.count || 0;
        const limit = existing.tokenLimit ?? tokenLimit;
        if (currentCount >= limit) limitReached = true;

        const slots = existing.slots || {};
        const earlierSlotCount = Object.entries(slots)
          .filter(([slotLabel]) => {
            const slot = timeSlots.find(t => t.label === slotLabel);
            return slot && slot.order < slotOrder;
          })
          .reduce((sum, [, count]) => sum + count, 0);
        const sameSlotCount = slots[submitForm.time] || 0;
        assignedToken = earlierSlotCount + sameSlotCount + 1;
        const newSlots = { ...slots, [submitForm.time]: sameSlotCount + 1 };
        transaction.set(counterRef, { count: currentCount + 1, slots: newSlots, tokenLimit: limit, date: submitForm.date });
      });

      const prevSnap = await getDocs(query(collection(db, "appointments"), where("phone", "==", submitForm.phone)));
      const activeVisits = prevSnap.docs.filter(d => d.data().status !== "cancelled");
      const visitCount = activeVisits.length + 1;

      await addDoc(collection(db, "appointments"), {
        ...submitForm,
        token: assignedToken,
        timeSlotOrder: slotOrder,
        visitCount,
        status: "pending",
        overTokenLimit: limitReached,
        createdAt: serverTimestamp(),
      });

      setBookingResult({ token: assignedToken, name: submitForm.name, date: submitForm.date, time: submitForm.time, visitCount });
      setForm(initialForm);
      setDuplicateMode(null);
      setExistingBooking(null);
      setSomeoneElseName("");
    } catch (err) {
      console.error("Booking error:", err);
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.phone || !form.date || !form.time || !form.reason) {
      setError("Please fill in all required fields.");
      return;
    }

    // Check for duplicate booking only on first submit attempt
    const existing = await checkDuplicate(form.phone, form.date);
    if (existing) {
      setExistingBooking(existing);
      setDuplicateMode("ask");
      return;
    }

    await proceedBooking(null, true);
  };

  const availableSlots = timeSlots.filter(t => {
    if (form.date !== today) return true;
    const now = new Date();
    return slotToMinutes(t.label) > now.getHours() * 60 + now.getMinutes();
  });

  const formatDate = dateStr => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}-${m}-${y}`;
  };

  return (
    <div style={{ paddingTop: 68 }}>
      <section style={{ background: "var(--bg-soft)" }}>
        <div className="container">
          <p className="section-label">Book a Visit</p>
          <h1 className="section-title">Schedule your appointment.</h1>
          <p className="section-sub">Fill in the form below and we'll confirm your slot. You'll receive a token number for your visit.</p>
        </div>
      </section>

      <section>
        <div className="container" style={{ maxWidth: 700 }}>

          {/* Loading */}
          {settings === null && (
            <div style={{ textAlign: "center", padding: 48 }}>
              <div style={{ width: 36, height: 36, border: "3px solid var(--teal)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto" }} />
            </div>
          )}

          {/* Globally unavailable */}
          {settings !== null && globallyUnavailable && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>🚫</div>
              <h3 style={{ fontWeight: 700, fontSize: 20, color: "#991b1b", marginBottom: 10 }}>Doctor Unavailable</h3>
              <p style={{ color: "#7f1d1d", lineHeight: 1.7, fontSize: 15 }}>
                Dr. Rajesh Sharma is currently unavailable. Please check back later or call us at <strong>+91 98765 43210</strong>.
              </p>
            </div>
          )}

          {/* Success */}
          {settings !== null && !globallyUnavailable && bookingResult && (
            <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 40px rgba(13,148,136,0.15)", border: "1px solid #99f6e4" }}>
              <div style={{ background: "var(--teal)", padding: "36px 24px", textAlign: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Your Token Number</p>
                <div style={{ width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "3px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <span style={{ fontSize: 44, fontWeight: 900, color: "#fff" }}>{bookingResult.token}</span>
                </div>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>Valid for {formatDate(bookingResult.date)}</p>
              </div>
              <div style={{ background: "#fff", padding: 28 }}>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                  <h3 style={{ fontWeight: 700, fontSize: 20, color: "var(--text)", marginBottom: 6 }}>Booked! Hi, {bookingResult.name.split(" ")[0]} 👋</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6 }}>Your appointment is received. We'll confirm via phone or email shortly.</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Date", value: formatDate(bookingResult.date), icon: "📅" },
                    { label: "Time", value: bookingResult.time, icon: "🕐" },
                    { label: "Token", value: `#${bookingResult.token}`, icon: "🎫" },
                    { label: "Visit No.", value: bookingResult.visitCount === 1 ? "1st Visit 🌟" : `Visit #${bookingResult.visitCount}`, icon: "🏥" },
                  ].map(d => (
                    <div key={d.label} style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 16px" }}>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{d.icon} {d.label}</p>
                      <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{d.value}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background: "#fef9c3", border: "1px solid #fde047", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#854d0e", lineHeight: 1.6 }}>
                  💡 <strong>Remember token #{bookingResult.token}.</strong> Show this to the receptionist when you arrive.
                </div>
                <button className="btn-primary" onClick={() => setBookingResult(null)} style={{ width: "100%", fontSize: 15, padding: 13 }}>
                  Book Another Appointment
                </button>
              </div>
            </div>
          )}

          {/* ── Duplicate: Ask what to do ── */}
          {settings !== null && !globallyUnavailable && !bookingResult && duplicateMode === "ask" && existingBooking && (
            <div style={{ background: "#fff", borderRadius: 16, padding: 32, boxShadow: "var(--shadow)", border: "2px solid #f59e0b" }}>
              <div style={{ fontSize: 48, textAlign: "center", marginBottom: 16 }}>🤔</div>
              <h3 style={{ fontWeight: 700, fontSize: 18, color: "var(--text)", marginBottom: 10, textAlign: "center" }}>Already Booked!</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7, textAlign: "center", marginBottom: 24 }}>
                Mobile <strong>{form.phone}</strong> already has an appointment on <strong>{formatDate(form.date)}</strong> at <strong>{existingBooking.time}</strong>.<br />
                What would you like to do?
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <button onClick={() => proceedBooking(null, true)}
                  style={{ padding: "13px", borderRadius: 10, border: "2px solid var(--teal)", background: "var(--teal-light)", color: "var(--teal)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  ✅ Yes, book another appointment for myself
                </button>
                <button onClick={() => { setDuplicateMode("someone_else"); setSomeoneElseName(""); setError(""); }}
                  style={{ padding: "13px", borderRadius: 10, border: "2px solid #7c3aed", background: "#ede9fe", color: "#7c3aed", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  👤 Book for someone else using my number
                </button>
                <button onClick={() => {
                    // Cancel — reset form and go back to empty form
                    setDuplicateMode(null);
                    setExistingBooking(null);
                    setForm(initialForm);
                    setError("");
                  }}
                  style={{ padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "#fff", color: "var(--text-muted)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                  ✕ Cancel — clear form
                </button>
              </div>
            </div>
          )}

          {/* ── Duplicate: Book for someone else ── */}
          {settings !== null && !globallyUnavailable && !bookingResult && duplicateMode === "someone_else" && (
            <div style={{ background: "#fff", borderRadius: 16, padding: 32, boxShadow: "var(--shadow)", border: "2px solid #7c3aed" }}>
              <div style={{ fontSize: 40, textAlign: "center", marginBottom: 16 }}>👤</div>
              <h3 style={{ fontWeight: 700, fontSize: 18, color: "var(--text)", marginBottom: 8, textAlign: "center" }}>Book for Someone Else</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6, textAlign: "center", marginBottom: 24 }}>
                Enter the name of the person you're booking for.<br />
                Phone <strong>{form.phone}</strong> · Date <strong>{formatDate(form.date)}</strong> · Time <strong>{form.time}</strong>
              </p>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Patient Name *</label>
                <input
                  type="text"
                  placeholder="Enter their full name"
                  value={someoneElseName}
                  onChange={e => { setSomeoneElseName(e.target.value); setError(""); }}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#7c3aed"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"}
                  autoFocus
                />
              </div>
              {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 16px", marginBottom: 16, color: "#991b1b", fontSize: 14 }}>{error}</div>
              )}
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={() => { setDuplicateMode("ask"); setError(""); setSomeoneElseName(""); }}
                  style={{ flex: 1, padding: "12px", borderRadius: 10, border: "1px solid var(--border)", background: "#fff", color: "var(--text-muted)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (!someoneElseName.trim()) { setError("Please enter the patient name."); return; }
                    proceedBooking(someoneElseName.trim(), true);
                  }}
                  disabled={loading}
                  style={{ flex: 2, padding: "12px", borderRadius: 10, border: "none", background: "#7c3aed", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Booking..." : "Confirm Booking"}
                </button>
              </div>
            </div>
          )}

          {/* ── Main booking form ── */}
          {settings !== null && !globallyUnavailable && !bookingResult && !duplicateMode && (
            <form onSubmit={handleSubmit} style={{ background: "#fff", borderRadius: 16, padding: "clamp(20px, 5vw, 40px)", boxShadow: "var(--shadow)", border: "1px solid var(--border)" }}>
              <div className="form-row" style={{ marginBottom: 20 }}>
                <Field label="Full Name" name="name" type="text" placeholder="Your full name" value={form.name} onChange={handleChange} />
                <Field label="Phone Number" name="phone" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <Field label="Email Address (optional)" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} />
              </div>
              <div className="form-row" style={{ marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>Preferred Date</label>
                  <input type="date" name="date" min={today} value={form.date}
                    onChange={handleChange}
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "var(--teal)"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Preferred Time</label>
                  <select name="time" value={form.time} onChange={handleChange} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "var(--teal)"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"}
                  >
                    <option value="">Select time</option>
                    {availableSlots.length === 0
                      ? <option disabled>No slots available for today</option>
                      : availableSlots.map(t => <option key={t.label} value={t.label}>{t.label}</option>)
                    }
                  </select>
                </div>
              </div>

              {/* Date-range unavailability warning */}
              {selectedDateUnavailable && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#991b1b", lineHeight: 1.6 }}>
                  🚫 <strong>Doctor unavailable on {formatDate(form.date)}.</strong> Please choose a different date.
                  {settings.unavailableFrom && settings.unavailableTo && (
                    <span> (Blocked: {formatDate(settings.unavailableFrom)} → {formatDate(settings.unavailableTo)})</span>
                  )}
                </div>
              )}

              <div style={{ marginBottom: 28 }}>
                <label style={labelStyle}>Reason for Visit</label>
                <select name="reason" value={form.reason} onChange={handleChange} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--teal)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"}
                >
                  <option value="">Select reason</option>
                  {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ background: "var(--teal-light)", border: "1px solid #99f6e4", borderRadius: 10, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "var(--teal-dark)", lineHeight: 1.6 }}>
                🎫 <strong>Token assigned by appointment time</strong> — earlier slots get lower tokens. Past time slots are automatically hidden.
              </div>
              {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#991b1b", fontSize: 14 }}>{error}</div>
              )}
              <button type="submit" className="btn-primary" disabled={loading || selectedDateUnavailable} style={{ width: "100%", fontSize: 15, padding: 14 }}>
                {loading ? "Booking..." : "Request Appointment & Get Token"}
              </button>
              <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-muted)", marginTop: 14 }}>
                We'll confirm via phone or email within a few hours.
              </p>
            </form>
          )}

        </div>
      </section>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 540px) { .form-row { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
