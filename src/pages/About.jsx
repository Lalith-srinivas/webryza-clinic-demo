export default function About() {
  return (
    <div style={{ paddingTop: 68 }}>
      <section style={{ background: "var(--bg-soft)" }}>
        <div className="container">
          <p className="section-label">About Us</p>
          <h1 className="section-title">Healing with heart,<br />science, and trust.</h1>
        </div>
      </section>

      <section>
        <div className="container about-grid">
          <div>
            <div style={{ width: "100%", aspectRatio: "4/3", background: "linear-gradient(135deg, #f0fdfa, #ccfbf1)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "clamp(48px, 10vw, 80px)", marginBottom: 12 }}>👨‍⚕️</div>
                <p style={{ fontWeight: 700, fontSize: "clamp(14px, 3vw, 18px)", color: "var(--text)" }}>Dr. Rajesh Sharma</p>
                <p style={{ color: "var(--teal)", fontSize: 14 }}>MBBS, MD – General Medicine</p>
              </div>
            </div>
          </div>
          <div>
            <p className="section-label">Our Doctor</p>
            <h2 style={{ fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 700, marginBottom: 16, color: "var(--text)" }}>Dr. Rajesh Sharma</h2>
            <p style={{ color: "var(--text-muted)", lineHeight: 1.8, marginBottom: 14, fontSize: 15 }}>
              With over 15 years of clinical experience, Dr. Rajesh Sharma has dedicated his career to providing exceptional primary healthcare to families across Hyderabad.
            </p>
            <p style={{ color: "var(--text-muted)", lineHeight: 1.8, marginBottom: 24, fontSize: 15 }}>
              He completed his MBBS from Osmania Medical College and MD in General Medicine from Gandhi Medical College. Dr. Sharma believes in treating the whole person — not just the illness — and takes time to understand each patient's unique situation.
            </p>
            <div className="info-grid">
              {[
                { label: "Specialization", value: "General & Family Medicine" },
                { label: "Experience", value: "15+ Years" },
                { label: "Education", value: "MBBS, MD" },
                { label: "Languages", value: "Telugu, Hindi, English" },
              ].map(i => (
                <div key={i.label} style={{ background: "var(--bg-soft)", padding: 16, borderRadius: 10, border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{i.label}</p>
                  <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text)" }}>{i.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: "var(--bg-soft)" }}>
        <div className="container">
          <h2 className="section-title" style={{ textAlign: "center", marginBottom: 40 }}>Our Mission</h2>
          <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "var(--text-muted)", lineHeight: 1.8, marginBottom: 18 }}>
              HealthCare Clinic was founded with a simple mission: to make quality healthcare accessible, affordable, and compassionate for every family in our community.
            </p>
            <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "var(--text-muted)", lineHeight: 1.8 }}>
              We believe that a healthy community starts with strong primary care. From your child's first checkup to managing chronic conditions in your later years — we are your lifelong health partner.
            </p>
          </div>
        </div>
      </section>

      <style>{`
        .about-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 768px) {
          .about-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .info-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 400px) {
          .info-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
