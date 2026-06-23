import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/appointment", label: "Appointment" },
  { to: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? "rgba(255,255,255,0.97)" : "#fff",
      borderBottom: `1px solid ${scrolled ? "#e2e8f0" : "transparent"}`,
      backdropFilter: "blur(8px)",
      transition: "all 0.3s",
    }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 17, color: "var(--text)", letterSpacing: "-0.02em" }}>
            HealthCare Clinic
          </span>
        </Link>

        {/* Desktop Links */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }} className="desktop-nav">
          {links.map(l => (
            <Link key={l.to} to={l.to} style={{
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: pathname === l.to ? 600 : 500,
              color: pathname === l.to ? "var(--teal)" : "var(--text-muted)",
              background: pathname === l.to ? "var(--teal-light)" : "transparent",
              transition: "all 0.15s",
            }}>{l.label}</Link>
          ))}
          <Link to="/appointment" className="btn-primary" style={{ marginLeft: 8, padding: "9px 20px", fontSize: 14 }}>
            Book Now
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button onClick={() => setOpen(!open)} style={{
          display: "none", background: "none", border: "none",
          padding: 6, borderRadius: 8, color: "var(--text)",
        }} className="hamburger">
          {open
            ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          }
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div style={{
          background: "#fff", borderTop: "1px solid var(--border)",
          padding: "12px 24px 20px",
        }}>
          {links.map(l => (
            <Link key={l.to} to={l.to} style={{
              display: "block", padding: "12px 0",
              fontWeight: pathname === l.to ? 600 : 500,
              color: pathname === l.to ? "var(--teal)" : "var(--text)",
              borderBottom: "1px solid var(--border)",
              fontSize: 15,
            }}>{l.label}</Link>
          ))}
          <Link to="/appointment" className="btn-primary" style={{ marginTop: 16, display: "block", textAlign: "center" }}>
            Book Now
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .hamburger { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
