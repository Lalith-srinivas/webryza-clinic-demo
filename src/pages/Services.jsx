import { Link } from "react-router-dom";

const services = [
  { icon: "🩺", title: "General Checkup", desc: "Comprehensive physical examinations to assess and monitor your overall health status." },
  { icon: "🌡️", title: "Fever & Flu", desc: "Diagnosis and treatment of common infections, fever, cold, cough and viral illnesses." },
  { icon: "💉", title: "Vaccinations", desc: "Complete immunization services for children and adults, including seasonal flu shots." },
  { icon: "🫀", title: "Chronic Disease Management", desc: "Ongoing care and management plans for diabetes, hypertension, asthma, and thyroid disorders." },
  { icon: "🔬", title: "Health Screenings", desc: "Preventive screenings for blood pressure, cholesterol, blood sugar, and more." },
  { icon: "👨‍👩‍👧‍👦", title: "Family Medicine", desc: "Healthcare for every member of your family, from newborns to seniors, all in one place." },
  { icon: "🧠", title: "Mental Wellness", desc: "Initial consultation and referral for anxiety, stress, and general mental health concerns." },
  { icon: "📋", title: "Health Certificates", desc: "Medical certificates for fitness, school, work, driving, and insurance requirements." },
];

export default function Services() {
  return (
    <div style={{ paddingTop: 68 }}>
      <section style={{ background: "var(--bg-soft)" }}>
        <div className="container">
          <p className="section-label">What We Offer</p>
          <h1 className="section-title">Services built<br />around your needs.</h1>
          <p className="section-sub">Comprehensive primary care covering everything from preventive medicine to managing complex conditions.</p>
        </div>
      </section>

      <section>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
            {services.map(s => (
              <div key={s.title} style={{
                background: "#fff",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "28px 24px",
                transition: "box-shadow 0.2s, transform 0.2s",
                cursor: "default",
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 32px rgba(13,148,136,0.12)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
              >
                <div style={{ fontSize: 40, marginBottom: 16 }}>{s.icon}</div>
                <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 10, color: "var(--text)" }}>{s.title}</h3>
                <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "var(--teal-light)", borderTop: "1px solid #99f6e4" }}>
        <div className="container" style={{ textAlign: "center" }}>
          <h2 className="section-title">Don't see what you need?</h2>
          <p className="section-sub" style={{ margin: "0 auto 32px" }}>Contact us or book an appointment and we'll discuss your specific health concerns.</p>
          <Link to="/appointment" className="btn-primary">Book a Consultation</Link>
        </div>
      </section>
    </div>
  );
}
