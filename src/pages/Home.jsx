import { Link } from "react-router-dom";

const stats = [
  { value: "15+", label: "Years Experience" },
  { value: "5,000+", label: "Patients Served" },
  { value: "6", label: "Days a Week" },
  { value: "100%", label: "Dedicated Care" },
];

const features = [
  { icon: "🩺", title: "Expert Diagnosis", desc: "Thorough evaluations with attention to every detail of your health." },
  { icon: "💊", title: "Personalized Treatment", desc: "Care plans tailored specifically to you and your family's needs." },
  { icon: "📋", title: "Preventive Care", desc: "Stay ahead of illness with routine checkups and health screenings." },
];

export default function Home() {
  return (
    <div style={{ paddingTop: 68 }}>
      {/* Hero */}
      <section style={{ background: "linear-gradient(135deg, #f0fdfa 0%, #ffffff 60%)", padding: "80px 0 64px" }}>
        <div className="container hero-grid">
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--teal-light)", border: "1px solid #99f6e4", borderRadius: 20, padding: "6px 14px", marginBottom: 24 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--teal)", display: "inline-block" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--teal)" }}>Now Accepting New Patients</span>
            </div>
            <h1 style={{ fontSize: "clamp(30px, 6vw, 52px)", fontWeight: 800, lineHeight: 1.1, color: "var(--text)", marginBottom: 20, letterSpacing: "-0.03em" }}>
              Your Health,<br /><span style={{ color: "var(--teal)" }}>Our Priority.</span>
            </h1>
            <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 32, maxWidth: 460 }}>
              Compassionate general and family medicine care in Hyderabad. From routine checkups to chronic disease management — we're here for every step.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link to="/appointment" className="btn-primary" style={{ fontSize: 15, padding: "13px 28px" }}>Book Appointment</Link>
              <Link to="/services" className="btn-outline" style={{ fontSize: 15, padding: "13px 28px" }}>Our Services</Link>
            </div>
          </div>
          <div className="hero-visual">
            <div style={{ position: "relative", display: "inline-block" }}>
              <div style={{ width: 280, height: 280, borderRadius: "50% 40% 50% 40%", background: "linear-gradient(135deg, #0d9488, #14b8a6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 60px rgba(13,148,136,0.25)" }}>
                <svg width="110" height="110" viewBox="0 0 100 100" fill="none">
                  <rect x="38" y="10" width="24" height="80" rx="5" fill="white" opacity="0.9"/>
                  <rect x="10" y="38" width="80" height="24" rx="5" fill="white" opacity="0.9"/>
                </svg>
              </div>
              <div style={{ position: "absolute", top: 16, right: -16, background: "#fff", borderRadius: 12, padding: "10px 14px", boxShadow: "var(--shadow)", fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: "var(--teal)" }}>Mon – Sat</div>
                <div style={{ color: "var(--text-muted)" }}>9 AM – 6 PM</div>
              </div>
              <div style={{ position: "absolute", bottom: 16, left: -16, background: "#fff", borderRadius: 12, padding: "10px 14px", boxShadow: "var(--shadow)", fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: "var(--text)" }}>⭐ 4.9 / 5.0</div>
                <div style={{ color: "var(--text-muted)" }}>Patient Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: "44px 0", background: "var(--text)" }}>
        <div className="container stats-grid">
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ background: "var(--bg-soft)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p className="section-label">Why Choose Us</p>
            <h2 className="section-title">Care you can count on</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {features.map(f => (
              <div key={f.title} style={{ background: "#fff", borderRadius: 14, padding: 28, boxShadow: "var(--shadow)", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, color: "var(--text)" }}>{f.title}</h3>
                <p style={{ color: "var(--text-muted)", lineHeight: 1.7, fontSize: 14 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "var(--teal)", padding: "64px 0" }}>
        <div className="container" style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(22px, 4vw, 34px)", fontWeight: 800, color: "#fff", marginBottom: 14, letterSpacing: "-0.02em" }}>
            Ready to take charge of your health?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 16, marginBottom: 28 }}>Book your appointment today — it takes less than 2 minutes.</p>
          <Link to="/appointment" style={{ display: "inline-block", background: "#fff", color: "var(--teal)", padding: "13px 32px", borderRadius: 10, fontWeight: 700, fontSize: 15 }}>
            Book Appointment
          </Link>
        </div>
      </section>

      <style>{`
        .hero-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }
        .hero-visual {
          display: flex;
          justify-content: center;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .hero-visual { order: -1; }
          .hero-visual > div > div:first-child { width: 200px !important; height: 200px !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
