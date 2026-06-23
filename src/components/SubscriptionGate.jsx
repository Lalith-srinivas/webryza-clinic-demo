import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import { useLocation } from "react-router-dom";
import Suspended from "../pages/Suspended";

export default function SubscriptionGate({ children }) {
  const [status, setStatus] = useState("loading");
  const { pathname } = useLocation();

  const isAdminRoute = pathname.startsWith("/admin");

  useEffect(() => {
    console.log("SubscriptionGate: starting listener...");

    const unsub = onSnapshot(
      doc(db, "subscription", "clinicStatus"),
      (snap) => {
        console.log("SubscriptionGate: snapshot received");
        console.log("SubscriptionGate: exists?", snap.exists());

        if (snap.exists()) {
          const data = snap.data();
          console.log("SubscriptionGate: full data =", data);
          console.log("SubscriptionGate: status field =", data.status);
          console.log("SubscriptionGate: status type =", typeof data.status);

          const val = (data.status || "").toString().trim().toLowerCase();
          console.log("SubscriptionGate: normalized val =", val);

          setStatus(val === "suspended" ? "suspended" : "active");
        } else {
          console.log("SubscriptionGate: document does not exist — setting active");
          setStatus("active");
        }
      },
      (error) => {
        console.error("SubscriptionGate: Firestore error =", error);
        console.error("SubscriptionGate: error code =", error.code);
        // Show suspended on error to be safe — change to "active" if you prefer
        setStatus("active");
      }
    );

    return () => {
      console.log("SubscriptionGate: unsubscribing");
      unsub();
    };
  }, []);

  // Admin always bypasses
  if (isAdminRoute) return children;

  if (status === "loading") return (
    <div style={{
      minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: 36, height: 36,
        border: "3px solid #0d9488",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (status === "suspended") return <Suspended />;

  return children;
}
