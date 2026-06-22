import { useState, useEffect } from "react";

// Change this to update the shared PIN. Keep it simple — this is a basic
// deterrent against randoms with the link, not bank-grade security.
const CORRECT_PIN = "0296";
const SESSION_KEY = "budget-pin-unlocked";

export default function PinGate({ children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved === "true") {
      setUnlocked(true);
    }
    setChecked(true);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (pin === CORRECT_PIN) {
      sessionStorage.setItem(SESSION_KEY, "true");
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setPin("");
    }
  }

  if (!checked) {
    return null;
  }

  if (unlocked) {
    return children;
  }

  return (
    <div
      style={{
        background: "#0F1117",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        padding: 20,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#161A26",
          border: "1px solid #252A3A",
          borderRadius: 14,
          padding: "32px 28px",
          width: "100%",
          maxWidth: 320,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 10 }}>🔒</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EAF0", marginBottom: 6 }}>
          Household Budget
        </div>
        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 20 }}>
          Enter the PIN to continue
        </div>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setError(false);
          }}
          maxLength={6}
          style={{
            width: "100%",
            background: "#0F1117",
            border: "1px solid " + (error ? "#F87171" : "#252A3A"),
            borderRadius: 8,
            padding: "12px 14px",
            fontSize: 20,
            letterSpacing: "0.3em",
            textAlign: "center",
            color: "#E8EAF0",
            boxSizing: "border-box",
            marginBottom: 14,
          }}
        />
        {error && (
          <div style={{ color: "#F87171", fontSize: 12, marginBottom: 14 }}>
            Incorrect PIN, try again.
          </div>
        )}
        <button
          type="submit"
          style={{
            width: "100%",
            background: "#1E3A5F",
            color: "#60A5FA",
            border: "1px solid #2D5A8E",
            borderRadius: 8,
            padding: "11px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Unlock
        </button>
      </form>
    </div>
  );
}
