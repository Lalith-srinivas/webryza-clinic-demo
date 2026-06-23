export default function Suspended() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8fafc",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "var(--font)",
    }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        {/* Icon */}
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "#fee2e2", border: "3px solid #fca5a5",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 28px", fontSize: 36,
        }}>
          🚫
        </div>

        {/* Clinic name */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 17, color: "#94a3b8" }}>HealthCare Clinic</span>
        </div>

        {/* Main message */}
        <h1 style={{
          fontSize: "clamp(20px, 5vw, 26px)",
          fontWeight: 800,
          color: "#1a1a2e",
          marginBottom: 14,
          lineHeight: 1.2,
          letterSpacing: "-0.02em",
        }}>
          Service Temporarily Unavailable
        </h1>

        <p style={{
          fontSize: 16,
          color: "#64748b",
          lineHeight: 1.7,
          marginBottom: 32,
        }}>
          This service is temporarily unavailable.<br />
          Please contact the clinic directly.
        </p>

        {/* Contact card */}
        <div style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          padding: "20px 24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          marginBottom: 24,
        }}>
          <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Contact the Clinic
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <a href="tel:+919876543210" style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "11px 16px", borderRadius: 10,
              background: "#f0fdfa", border: "1px solid #99f6e4",
              color: "#0f766e", fontWeight: 600, fontSize: 15,
              textDecoration: "none",
            }}>
              <span style={{ fontSize: 18 }}>📞</span>
              +91 98765 43210
            </a>
            <a href="mailto:care@healthcareclinic.in" style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "11px 16px", borderRadius: 10,
              background: "#f8fafc", border: "1px solid #e2e8f0",
              color: "#475569", fontWeight: 500, fontSize: 14,
              textDecoration: "none",
            }}>
              <span style={{ fontSize: 18 }}>✉️</span>
              care@healthcareclinic.in
            </a>
          </div>
        </div>

        <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
          We apologize for the inconvenience.<br />
          The clinic's online services will be restored soon.
        </p>
      </div>
    </div>
  );
}
