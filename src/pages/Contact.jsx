export default function Contact() {
  return (
    <div style={{ paddingTop: 68 }}>
      <section style={{ background: "var(--bg-soft)" }}>
        <div className="container">
          <p className="section-label">Get In Touch</p>
          <h1 className="section-title">We're here to help.</h1>
          <p className="section-sub">Reach out with any questions, concerns, or to know more about our services.</p>
        </div>
      </section>

      <section>
        <div className="container contact-grid">
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "clamp(18px, 3vw, 22px)", marginBottom: 28, color: "var(--text)" }}>Clinic Information</h2>
            {[
              { icon: "📍", title: "Address", lines: ["123 Medical Lane, Banjara Hills", "Hyderabad, Telangana – 500034"] },
              { icon: "📞", title: "Phone", lines: ["+91 98765 43210", "+91 40-2345-6789"] },
              { icon: "✉️", title: "Email", lines: ["care@healthcareclinic.in", "appointments@healthcareclinic.in"] },
              { icon: "🕐", title: "Working Hours", lines: ["Mon – Sat: 9:00 AM – 6:00 PM", "Sunday: 10:00 AM – 2:00 PM"] },
            ].map(c => (
              <div key={c.title} style={{ display: "flex", gap: 14, marginBottom: 24, alignItems: "flex-start" }}>
                <div style={{ fontSize: 20, width: 42, height: 42, background: "var(--teal-light)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{c.icon}</div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 4 }}>{c.title}</p>
                  {c.lines.map(l => <p key={l} style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6 }}>{l}</p>)}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)", marginBottom: 20 }}>
              <iframe
                title="Clinic Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3806.798!2d78.4483!3d17.4126!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sBanjara+Hills%2C+Hyderabad!5e0!3m2!1sen!2sin!4v1"
                width="100%" height="260" style={{ border: 0, display: "block" }} allowFullScreen="" loading="lazy"
              />
            </div>
            <div style={{ background: "var(--teal-light)", border: "1px solid #99f6e4", borderRadius: 14, padding: 20 }}>
              <p style={{ fontWeight: 700, color: "var(--teal-dark)", marginBottom: 8, fontSize: 14 }}>🚗 Directions</p>
              <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>We are located near Banjara Hills Road No. 12, Hyderabad. Ample parking available. Nearest landmark: Apollo Hospital junction.</p>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .contact-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: start;
        }
        @media (max-width: 768px) {
          .contact-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
        }
      `}</style>
    </div>
  );
}
