import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer style={{ background: "var(--text)", color: "#94a3b8", padding: "48px 0 32px" }}>
      <div className="container">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 40, marginBottom: 40 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>HealthCare Clinic</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.7 }}>Trusted general & family medicine care for your whole family.</p>
          </div>
          <div>
            <p style={{ color: "#fff", fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Quick Links</p>
            {["Home","About","Services","Appointment","Contact"].map(l => (
              <Link key={l} to={`/${l === "Home" ? "" : l.toLowerCase()}`} style={{ display: "block", fontSize: 14, marginBottom: 8, color: "#94a3b8", transition: "color 0.15s" }}
                onMouseEnter={e => e.target.style.color = "#fff"}
                onMouseLeave={e => e.target.style.color = "#94a3b8"}
              >{l}</Link>
            ))}
          </div>
          <div>
            <p style={{ color: "#fff", fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Hours</p>
            <p style={{ fontSize: 14, marginBottom: 6 }}>Mon – Sat: 9:00 AM – 6:00 PM</p>
            <p style={{ fontSize: 14, marginBottom: 6 }}>Sunday: 10:00 AM – 2:00 PM</p>
            <p style={{ fontSize: 13, marginTop: 12, color: "var(--teal)" }}>Emergency consultations available</p>
          </div>
          <div>
            <p style={{ color: "#fff", fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Contact</p>
            <p style={{ fontSize: 14, marginBottom: 6 }}>📍 123 Medical Lane, Hyderabad</p>
            <p style={{ fontSize: 14, marginBottom: 6 }}>📞 +91 98765 43210</p>
            <p style={{ fontSize: 14 }}>✉️ care@healthcareclinic.in</p>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #334155", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 13 }}>© 2026 HealthCare Clinic. All rights reserved.</p>
          <Link to="/admin" style={{ fontSize: 13, color: "#475569" }}>Admin</Link>
        </div>
      </div>
    </footer>
  );
}
