import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/config";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async e => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Enter both email and password."); return; }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/admin/dashboard");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-soft)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, background: "var(--teal)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <h1 style={{ fontWeight: 800, fontSize: 24, color: "var(--text)", letterSpacing: "-0.02em" }}>Admin Panel</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 6 }}>HealthCare Clinic — Staff Access</p>
        </div>

        <form onSubmit={handleLogin} style={{ background: "#fff", borderRadius: 16, padding: 36, boxShadow: "var(--shadow)", border: "1px solid var(--border)" }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@clinic.in"
              style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1.5px solid var(--border)", fontSize: 14, outline: "none", fontFamily: "var(--font)" }}
              onFocus={e => e.target.style.borderColor = "var(--teal)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            />
          </div>
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1.5px solid var(--border)", fontSize: 14, outline: "none", fontFamily: "var(--font)" }}
              onFocus={e => e.target.style.borderColor = "var(--teal)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            />
          </div>
          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 20, color: "#991b1b", fontSize: 13 }}>
              {error}
            </div>
          )}
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", fontSize: 15, padding: 13, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginTop: 20 }}>
          This page is for clinic staff only.
        </p>
      </div>
    </div>
  );
}
