import { useState } from "react";
import "./Auth.css";
import TpoDashboard, { DEPARTMENTS } from "./TpoDashboard";
import TpcDashboard from "./TpcDashboard";
import StudentDashboard from "./StudentDashboard";

const ROLES = {
  tpo: { label: "TPO", full: "Training and Placement Officer", icon: "🏛️" },
  tpc: { label: "TPC", full: "Training and Placement Coordinator", icon: "🧑‍💼" },
  student: { label: "Student", full: "Student", icon: "🎓" },
};

const DASH_TEXT = {
  tpo: "Company management, placement drives, eligibility approval and university-wide analytics will appear here.",
  tpc: "Department student list, profile verification, round scheduling and shortlist tracking will appear here.",
  student: "Your profile, resume, eligible drives and application status will appear here.",
};

// ---- frontend-only storage (replace with Spring Boot API calls later) ----
const getUsers = () => {
  try { return JSON.parse(localStorage.getItem("ja_users") || "{}"); }
  catch { return {}; }
};
const saveUsers = (u) => localStorage.setItem("ja_users", JSON.stringify(u));
const hash = async (text) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

function Logo() {
  return (
    <div className="ja-logo">
      <span className="ja-logo-mark">JA</span>
      <span className="ja-logo-text">Job Analyzer</span>
    </div>
  );
}

function CapIllustration() {
  return (
    <svg viewBox="0 0 260 210" width="230" height="186" className="ja-cap" role="img" aria-label="Graduation cap and diploma">
      <ellipse cx="130" cy="190" rx="95" ry="12" fill="#c9d3e6" opacity=".6" />
      <path d="M60 95v45c0 14 32 26 70 26s70-12 70-26V95z" fill="#3b4a5a" />
      <polygon points="130,38 235,80 130,118 25,80" fill="#4a5b6d" />
      <polygon points="130,118 235,80 235,88 130,128" fill="#2f3c4a" />
      <line x1="130" y1="80" x2="215" y2="92" stroke="#e8b83a" strokeWidth="3" />
      <rect x="208" y="92" width="10" height="38" rx="4" fill="#e8b83a" />
      <rect x="198" y="126" width="30" height="22" rx="4" fill="#d99a1c" />
      <rect x="150" y="128" width="95" height="30" rx="15" fill="#f4efe6" transform="rotate(-18 150 128)" />
      <circle cx="170" cy="148" r="13" fill="#d33b3b" />
      <circle cx="170" cy="148" r="6" fill="#f0b4b4" />
    </svg>
  );
}

function AuthCard({ onLoggedIn }) {
  const [role, setRole] = useState("student");
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", department: "" });
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState("");

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const switchMode = (m) => { setMode(m); setMsg(""); };

  const handleRegister = async () => {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.replace(/[\s-]/g, "");
    if (!name || !email || !phone || !form.password) return setMsg("Fill in all fields.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMsg("Enter a valid email address.");
    if (!/^\+?\d{10,13}$/.test(phone)) return setMsg("Enter a valid phone number (10 to 13 digits).");
    if (role !== "tpo" && !form.department) return setMsg("Select your department.");
    if (form.password.length < 6) return setMsg("Password must be at least 6 characters.");

    const users = getUsers();
    if (users[name.toLowerCase()]) return setMsg("This name is already registered. Use a different name or log in.");
    if (Object.values(users).some((u) => u.email === email)) return setMsg("This email is already registered. Log in instead.");

    const user = { name, email, phone, role, ...(role !== "tpo" ? { department: form.department } : {}), h: await hash(form.password) };
    users[name.toLowerCase()] = user;
    saveUsers(users);
    onLoggedIn(user);
  };

  const handleLogin = async () => {
    const wrong = "Wrong credentials. Check your name, password and role.";
    if (!form.name.trim() || !form.password) return setMsg(wrong);
    const user = getUsers()[form.name.trim().toLowerCase()];
    if (!user || user.role !== role || user.h !== (await hash(form.password))) return setMsg(wrong);
    onLoggedIn(user);
  };

  const submit = (e) => {
    e.preventDefault();
    mode === "login" ? handleLogin() : handleRegister();
  };

  return (
    <div className="ja-card-wrap">
      <form className="ja-card" onSubmit={submit} noValidate>
        <div className="ja-card-top" />
        <div className="ja-avatar" aria-hidden="true">{ROLES[role].icon}</div>
        <p className="ja-role-full">{ROLES[role].full}</p>

        <div className="ja-roles" role="group" aria-label="Choose your role">
          {Object.entries(ROLES).map(([key, r]) => (
            <button type="button" key={key} className={role === key ? "ja-pill on" : "ja-pill"}
              aria-pressed={role === key} onClick={() => { setRole(key); setMsg(""); }}>
              {r.label}
            </button>
          ))}
        </div>

        <label className="ja-field">
          <span>Name</span>
          <input value={form.name} onChange={set("name")} autoComplete="username" placeholder="Enter your name" />
        </label>

        {mode === "register" && (
          <>
            <label className="ja-field">
              <span>Email</span>
              <input type="email" value={form.email} onChange={set("email")} autoComplete="email" placeholder="you@example.com" />
            </label>
            <label className="ja-field">
              <span>Phone number</span>
              <input type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="10-digit mobile number" />
            </label>
            {role !== "tpo" && (
              <label className="ja-field">
                <span>Department</span>
                <select value={form.department} onChange={set("department")}>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
            )}
          </>
        )}

        <label className="ja-field">
          <span>Password</span>
          <div className="ja-pw">
            <input type={showPw ? "text" : "password"} value={form.password} onChange={set("password")}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder={mode === "login" ? "Enter your password" : "At least 6 characters"} />
            <button type="button" className="ja-show" onClick={() => setShowPw(!showPw)}>{showPw ? "Hide" : "Show"}</button>
          </div>
        </label>

        <div className="ja-msg" aria-live="polite">{msg}</div>

        <div className="ja-actions">
          <button type="submit" className="ja-primary">{mode === "login" ? "Sign in" : "Register"}</button>
          <span className="ja-switch">
            {mode === "login" ? "New user? " : "Already registered? "}
            <button type="button" className="ja-link" onClick={() => switchMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Register" : "Login"}
            </button>
          </span>
        </div>
      </form>
      <div className="ja-card-tab">{mode === "login" ? "Login" : "Register"} as {ROLES[role].label}</div>
    </div>
  );
}

function Dashboard({ user, onLogout }) {
  if (user.role === "tpo") return <TpoDashboard user={user} onLogout={onLogout} />;
  if (user.role === "tpc") return <TpcDashboard user={user} onLogout={onLogout} />;
  if (user.role === "student") return <StudentDashboard user={user} onLogout={onLogout} />;
  const r = ROLES[user.role];
  return (
    <div className="ja-page">
      <nav className="ja-nav"><Logo /><button className="ja-out" onClick={onLogout}>Log out</button></nav>
      <main className="ja-dash">
        <h2>{r.label} dashboard</h2>
        <p className="ja-sub">Welcome, {user.name}</p>
        <section className="ja-dash-body">{DASH_TEXT[user.role]}</section>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  if (user) return <Dashboard user={user} onLogout={() => setUser(null)} />;

  return (
    <div className="ja-page">
      <nav className="ja-nav"><Logo /></nav>
      <main className="ja-hero">
        <section className="ja-left">
          <p className="ja-quote">Where campus careers begin and tomorrow gets hired.</p>
          <CapIllustration />
          <h1>Job Analyzer and Recruitment Process for University</h1>
          <p className="ja-sub">One place for the TPO, TPC and students to manage campus placements.</p>
        </section>
        <AuthCard onLoggedIn={setUser} />
      </main>
    </div>
  );
}
