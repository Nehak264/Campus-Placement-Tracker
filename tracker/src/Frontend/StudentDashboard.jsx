import { useEffect, useRef, useState } from "react";
import { KEY, load, pct, Bar, fmt, todayStr } from "./TpoDashboard";
import "./StudentDashboard.css";

const AREAS = ["Aptitude", "DSA", "Java / OOP", "DBMS / SQL", "Core CS", "Communication", "Projects", "System design"];
const TEST_MINUTES = 15;
const MAX_WARNINGS = 3;

const QUESTIONS = [
  { t: "Aptitude", q: "A train 120 m long passes a pole in 6 seconds. What is its speed in km/h?", o: ["54", "60", "72", "80"], a: 2 },
  { t: "Aptitude", q: "If 20% of a number is 50, what is the number?", o: ["200", "225", "250", "300"], a: 2 },
  { t: "Aptitude", q: "Find the next number: 2, 6, 12, 20, 30, ?", o: ["36", "40", "42", "48"], a: 2 },
  { t: "Java / OOP", q: "Which keyword stops a class from being inherited in Java?", o: ["static", "final", "abstract", "private"], a: 1 },
  { t: "Java / OOP", q: "Which collection does not allow duplicate elements?", o: ["ArrayList", "LinkedList", "HashSet", "Vector"], a: 2 },
  { t: "Java / OOP", q: 'What does System.out.println(10 + 20 + "Java"); print?', o: ["1020Java", "30Java", "Java30", "Compile error"], a: 1 },
  { t: "DBMS / SQL", q: "Which SQL clause filters groups after GROUP BY?", o: ["WHERE", "HAVING", "ORDER BY", "LIMIT"], a: 1 },
  { t: "DBMS / SQL", q: "Which normal form removes partial dependency?", o: ["1NF", "2NF", "3NF", "BCNF"], a: 1 },
  { t: "DBMS / SQL", q: "Which constraint uniquely identifies each row and does not allow NULL?", o: ["FOREIGN KEY", "PRIMARY KEY", "CHECK", "DEFAULT"], a: 1 },
  { t: "DSA", q: "What is the time complexity of binary search on a sorted array?", o: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], a: 1 },
  { t: "DSA", q: "Which data structure follows the LIFO principle?", o: ["Queue", "Stack", "Heap", "Graph"], a: 1 },
  { t: "DSA", q: "What is the worst-case time complexity of quicksort?", o: ["O(n log n)", "O(n)", "O(n^2)", "O(log n)"], a: 2 },
];

const mmss = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
const weakTopics = (res) =>
  res ? Object.entries(res.topics).filter(([, v]) => v.c / v.t < 0.5).map(([k]) => k) : [];

/* ---------------- Profile ---------------- */
function Profile({ user }) {
  const items = [["Name", user.name], ["Email", user.email], ["Phone number", user.phone], ["Department", user.department || "Not set"]];
  return (
    <section className="tpo-panel">
      <div className="st-profile">
        <div className="st-avatar" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase()}</div>
        <div><h3 style={{ margin: 0 }}>{user.name}</h3><p className="tpo-note" style={{ margin: 0 }}>Student</p></div>
      </div>
      <div className="st-grid">
        {items.map(([k, v]) => <div className="st-item" key={k}><span>{k}</span><b>{v}</b></div>)}
      </div>
    </section>
  );
}

/* ---------------- Upcoming drives + register ---------------- */
function DrivesTab({ data, user, setData }) {
  const today = todayStr();
  const regs = (data.registrations || []).filter((r) => r.email === user.email);
  const isReg = (id) => regs.some((r) => r.driveId === id);
  const register = (id) =>
    setData((d) => ({ ...d, registrations: [...(d.registrations || []), { driveId: id, email: user.email, name: user.name, department: user.department, at: new Date().toISOString() }] }));
  const cancel = (id) =>
    setData((d) => ({ ...d, registrations: (d.registrations || []).filter((r) => !(r.driveId === id && r.email === user.email)) }));
  const sorted = [...data.drives].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <>
      <h3 className="tpo-h">Upcoming drives ({sorted.length})</h3>
      {sorted.length === 0 && <p className="tpo-empty">No drives have been announced yet.</p>}
      {sorted.map((d) => {
        const done = d.visitDate < today, closed = d.dueDate < today;
        const badge = done ? ["Completed", "done"] : closed ? ["Registration closed", "closed"] : ["Registration open", "open"];
        return (
          <article className="tpo-drive" key={d.id}>
            <div className="tpo-drive-head">
              <div><b>{d.company}</b><span> - {d.role}</span></div>
              <span className={"tpo-badge " + badge[1]}>{badge[0]}</span>
            </div>
            <p>{d.jd}</p>
            <div className="tpo-dates">
              <div><span>Register by</span><b>{fmt(d.dueDate)}</b></div>
              <div><span>Coming to campus</span><b>{fmt(d.visitDate)}</b></div>
            </div>
            {isReg(d.id) ? (
              <div className="st-reg">
                <span className="tpo-badge open">You are registered</span>
                {!closed && <button className="tpo-del" onClick={() => cancel(d.id)}>Cancel registration</button>}
              </div>
            ) : (
              <button className="tpo-btn st-regbtn" disabled={closed} onClick={() => register(d.id)}>
                {closed ? "Registration closed" : "Register for this drive"}
              </button>
            )}
          </article>
        );
      })}
    </>
  );
}

/* ---------------- Proctored test ---------------- */
function Test({ user, results, addResult, setLocked }) {
  const [phase, setPhase] = useState("intro"); // intro | running | done
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [left, setLeft] = useState(TEST_MINUTES * 60);
  const [warnings, setWarnings] = useState([]);
  const [camera, setCamera] = useState("off"); // off | on | denied
  const [fs, setFs] = useState(true);
  const [report, setReport] = useState(null);

  const videoRef = useRef(null), streamRef = useRef(null), endAt = useRef(0);
  const phaseRef = useRef("intro"), answersRef = useRef({}), warnRef = useRef([]), finishRef = useRef(() => {});
  answersRef.current = answers;

  const stopCamera = () => { if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; } };

  const warn = (msg) => {
    if (phaseRef.current !== "running") return;
    const n = [...warnRef.current, { msg, at: new Date().toLocaleTimeString() }];
    warnRef.current = n;
    setWarnings(n);
    if (n.length >= MAX_WARNINGS) finishRef.current("Auto-submitted after " + MAX_WARNINGS + " warnings");
  };

  const finish = (reason) => {
    if (phaseRef.current !== "running") return;
    phaseRef.current = "done";
    const topics = {};
    let score = 0;
    QUESTIONS.forEach((q, i) => {
      topics[q.t] = topics[q.t] || { c: 0, t: 0 };
      topics[q.t].t += 1;
      if (answersRef.current[i] === q.a) { score += 1; topics[q.t].c += 1; }
    });
    const res = { id: Date.now(), email: user.email, name: user.name, score, total: QUESTIONS.length, topics,
      warnings: warnRef.current.map((w) => w.msg), reason: reason || "Submitted", at: new Date().toISOString() };
    stopCamera();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    addResult(res);
    setReport(res);
    setPhase("done");
    setLocked(false);
  };
  finishRef.current = finish;

  const start = async () => {
    try { if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen(); } catch { /* ignore */ }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true });
      setCamera("on");
    } catch { setCamera("denied"); }
    answersRef.current = {}; warnRef.current = [];
    setAnswers({}); setWarnings([]); setIdx(0); setLeft(TEST_MINUTES * 60);
    setFs(!!document.fullscreenElement);
    phaseRef.current = "running";
    setPhase("running");
    setLocked(true);
  };

  // proctoring listeners
  useEffect(() => {
    const onVis = () => { if (document.hidden) warn("Switched tab or minimised the window"); };
    const onFs = () => {
      const on = !!document.fullscreenElement;
      setFs(on);
      if (!on) warn("Exited full-screen mode");
    };
    const block = (e) => { if (phaseRef.current === "running") e.preventDefault(); };
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("fullscreenchange", onFs);
    ["contextmenu", "copy", "cut", "paste"].forEach((ev) => document.addEventListener(ev, block));
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("fullscreenchange", onFs);
      ["contextmenu", "copy", "cut", "paste"].forEach((ev) => document.removeEventListener(ev, block));
      stopCamera();
    };
  }, []);

  // timer
  useEffect(() => {
    if (phase !== "running") return;
    endAt.current = Date.now() + TEST_MINUTES * 60000;
    const t = setInterval(() => {
      const r = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(r);
      if (r === 0) finishRef.current("Time is up");
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // show camera preview
  useEffect(() => {
    if (phase === "running" && camera === "on" && videoRef.current) videoRef.current.srcObject = streamRef.current;
  }, [phase, camera]);

  const submit = () => {
    const unanswered = QUESTIONS.length - Object.keys(answers).length;
    if (window.confirm(unanswered ? `You have ${unanswered} unanswered question(s). Submit the test?` : "Submit the test?")) finish("Submitted by student");
  };

  if (phase === "intro") {
    return (
      <>
        <section className="tpo-panel">
          <h3>Proctored practice test</h3>
          <p className="tpo-note">{QUESTIONS.length} questions on Aptitude, Java / OOP, DBMS / SQL and DSA. Time limit: {TEST_MINUTES} minutes.</p>
          <ul className="st-rules">
            <li>The test opens in full-screen mode. Do not exit it.</li>
            <li>Do not switch tabs or minimise the window. Copy, paste and right-click are blocked.</li>
            <li>Allow the camera so your face is visible during the test. If you deny it, this is recorded.</li>
            <li>Every violation is a warning. After {MAX_WARNINGS} warnings the test is submitted automatically.</li>
          </ul>
          <button className="tpo-btn st-start" onClick={start}>Start test</button>
        </section>
        <section className="tpo-panel">
          <h3>Your previous attempts</h3>
          {results.length === 0 ? <p className="tpo-empty">You have not taken the test yet.</p> : (
            <div className="tpo-scroll"><table>
              <thead><tr><th>Date</th><th>Score</th><th>Warnings</th><th>Weak topics</th></tr></thead>
              <tbody>{[...results].reverse().map((r) => (
                <tr key={r.id}><td>{new Date(r.at).toLocaleString("en-IN")}</td><td>{r.score} / {r.total}</td><td>{r.warnings.length}</td>
                  <td>{weakTopics(r).join(", ") || "None"}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </section>
      </>
    );
  }

  if (phase === "done" && report) {
    return (
      <section className="tpo-panel">
        <h3>Test result</h3>
        <p className="st-score">{report.score} / {report.total} <span>({pct(report.score, report.total)}%)</span></p>
        <p className="tpo-note">{report.reason}. Warnings: {report.warnings.length}.</p>
        <div className="tpo-scroll"><table>
          <thead><tr><th>Topic</th><th>Correct</th><th>Result</th></tr></thead>
          <tbody>{Object.entries(report.topics).map(([k, v]) => (
            <tr key={k}><td>{k}</td><td>{v.c} / {v.t}</td>
              <td className="tpo-ratio"><Bar value={pct(v.c, v.t)} label={k + " score"} /><span>{v.c / v.t < 0.5 ? "Needs more practice" : "Good"}</span></td></tr>
          ))}</tbody>
        </table></div>
        {report.warnings.length > 0 && <p className="tpo-note" style={{ marginTop: 14 }}>Recorded warnings: {report.warnings.join("; ")}</p>}
        <button className="tpo-btn st-start" onClick={() => { phaseRef.current = "intro"; setPhase("intro"); }}>Back to test page</button>
      </section>
    );
  }

  const q = QUESTIONS[idx];
  return (
    <div className="st-exam">
      <div className="st-topbar">
        <div className="st-timer" aria-live="off">Time left: <b>{mmss(left)}</b></div>
        <div className="st-warn">Warnings: <b>{warnings.length} / {MAX_WARNINGS}</b></div>
        {camera === "on" ? <video ref={videoRef} className="st-cam" autoPlay muted playsInline /> : <span className="st-nocam">Camera not available</span>}
      </div>
      {!fs && document.fullscreenEnabled && (
        <div className="tpo-banner">You left full-screen mode. <button onClick={() => document.documentElement.requestFullscreen().catch(() => {})}>Return to full screen</button></div>
      )}
      <section className="tpo-panel">
        <p className="tpo-note">Question {idx + 1} of {QUESTIONS.length} - {q.t}</p>
        <h3 className="st-q">{q.q}</h3>
        <div className="st-opts">
          {q.o.map((o, i) => (
            <button key={i} className={answers[idx] === i ? "st-opt on" : "st-opt"} onClick={() => setAnswers({ ...answers, [idx]: i })}>
              <b>{String.fromCharCode(65 + i)}.</b> {o}
            </button>
          ))}
        </div>
        <div className="st-nav">
          <button className="tpo-tab" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>Previous</button>
          <button className="tpo-tab" disabled={idx === QUESTIONS.length - 1} onClick={() => setIdx(idx + 1)}>Next</button>
          <button className="tpo-btn st-submit" onClick={submit}>Submit test</button>
        </div>
        <div className="st-palette" aria-label="Question navigator">
          {QUESTIONS.map((_, i) => (
            <button key={i} className={(i === idx ? "cur " : "") + (answers[i] !== undefined ? "ans" : "")} onClick={() => setIdx(i)}>{i + 1}</button>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---------------- Senior feedback + preparation direction ---------------- */
function Feedback({ data, user, setData, latest }) {
  const empty = { company: "", role: "", rounds: "", questions: "", advice: "", areas: [] };
  const [f, setF] = useState(empty);
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("all");
  const list = data.feedback || [];
  const companies = [...new Set(list.map((x) => x.company))];
  const shown = list.filter((x) => filter === "all" || x.company === filter);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (a) => setF({ ...f, areas: f.areas.includes(a) ? f.areas.filter((x) => x !== a) : [...f.areas, a] });

  const counts = AREAS.map((a) => ({ area: a, n: shown.filter((x) => x.areas.includes(a)).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  const mine = weakTopics(latest);

  const add = (e) => {
    e.preventDefault();
    if (!f.company.trim() || !f.role.trim() || !f.questions.trim()) return setMsg("Fill in company, role and the questions asked.");
    if (f.areas.length === 0) return setMsg("Select at least one area where you felt weak.");
    setData((d) => ({ ...d, feedback: [...(d.feedback || []), { id: Date.now(), email: user.email, by: user.name, dept: user.department, ...f,
      company: f.company.trim(), role: f.role.trim(), rounds: f.rounds.trim(), questions: f.questions.trim(), advice: f.advice.trim() }] }));
    setF(empty); setMsg("");
  };
  const remove = (id) => setData((d) => ({ ...d, feedback: (d.feedback || []).filter((x) => x.id !== id) }));

  return (
    <>
      <section className="tpo-panel">
        <div className="tpo-filter">
          <h3>Where to focus your preparation</h3>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by company">
            <option value="all">All companies</option>
            {companies.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <p className="tpo-note">Areas where seniors said they lacked in {filter === "all" ? "their interviews" : filter + " interviews"}. Longer bar = more seniors struggled there.</p>
        {counts.length === 0 ? <p className="tpo-empty">No feedback yet.</p> : (
          <div className="tpo-scroll"><table><tbody>
            {counts.map((c) => (
              <tr key={c.area}><td style={{ width: 160 }}>{c.area}</td>
                <td className="tpo-ratio"><Bar value={pct(c.n, shown.length)} label={c.area} /><span>{c.n} of {shown.length} seniors</span></td></tr>
            ))}
          </tbody></table></div>
        )}
        {latest && (
          <p className="st-focus">
            {mine.length ? <>From your last practice test, you are weak in <b>{mine.join(", ")}</b>. Start with these.</> : <>Your last practice test had no weak topic. Keep practising the areas above.</>}
          </p>
        )}
      </section>

      <div className="tpo-two">
        <form className="tpo-panel" onSubmit={add} noValidate>
          <h3>Share your interview experience</h3>
          <label className="tpo-f"><span>Company</span><input value={f.company} onChange={set("company")} /></label>
          <label className="tpo-f"><span>Role</span><input value={f.role} onChange={set("role")} /></label>
          <label className="tpo-f"><span>Rounds</span><input value={f.rounds} onChange={set("rounds")} placeholder="e.g. Online test, technical, HR" /></label>
          <label className="tpo-f"><span>Questions asked</span><textarea rows="4" value={f.questions} onChange={set("questions")} /></label>
          <div className="tpo-f"><span>Where did you lack?</span>
            <div className="st-checks">{AREAS.map((a) => (
              <label key={a}><input type="checkbox" checked={f.areas.includes(a)} onChange={() => toggle(a)} /> {a}</label>
            ))}</div>
          </div>
          <label className="tpo-f"><span>Advice for juniors</span><textarea rows="3" value={f.advice} onChange={set("advice")} /></label>
          <div className="tpo-err" aria-live="polite">{msg}</div>
          <button className="tpo-btn" type="submit">Share</button>
        </form>

        <div>
          <h3 className="tpo-h">Senior experiences ({shown.length})</h3>
          {shown.length === 0 && <p className="tpo-empty">No experiences shared yet.</p>}
          {shown.map((x) => (
            <article className="tpo-drive" key={x.id}>
              <div className="tpo-drive-head">
                <div><b>{x.company}</b><span> - {x.role}</span></div>
                {x.sample && <span className="tpo-badge done">Sample</span>}
              </div>
              <p className="tpo-by">Shared by {x.by}{x.dept ? ", " + x.dept : ""}</p>
              {x.rounds && <p><b>Rounds:</b> {x.rounds}</p>}
              <p><b>Questions asked:</b> {x.questions}</p>
              <div className="st-tags"><span>Where they lacked:</span>{x.areas.map((a) => <em key={a}>{a}</em>)}</div>
              {x.advice && <p><b>Advice:</b> {x.advice}</p>}
              {x.email === user.email && <button className="tpo-del" onClick={() => remove(x.id)}>Delete</button>}
            </article>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------------- Previous year questions + materials ---------------- */
function Materials({ data }) {
  const list = data.materials || [];
  const [type, setType] = useState("all");
  const [company, setCompany] = useState("all");
  const [q, setQ] = useState("");
  const companies = [...new Set(list.map((m) => m.company).filter(Boolean))];
  const shown = list.filter((m) =>
    (type === "all" || m.type === type) && (company === "all" || m.company === company) &&
    (!q.trim() || (m.title + " " + m.content).toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <section className="tpo-panel">
      <h3>Previous year questions and study material</h3>
      <p className="tpo-note">Uploaded by your TPC.</p>
      <div className="st-filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search material" />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
          <option value="all">All types</option><option>Previous year questions</option><option>Study material</option>
        </select>
        <select value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Company">
          <option value="all">All companies</option>{companies.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      {shown.length === 0 && <p className="tpo-empty">No material found.</p>}
      {shown.map((m) => (
        <article className="tpo-drive" key={m.id}>
          <div className="tpo-drive-head">
            <div><b>{m.title}</b>{m.company && <span> - {m.company}</span>}</div>
            <span className="tpo-badge done">{m.type}</span>
          </div>
          {m.content && <details><summary>View questions / notes</summary><pre className="st-pre">{m.content}</pre></details>}
          {m.link && <p><a href={m.link} target="_blank" rel="noopener noreferrer">Open file / link</a></p>}
          <p className="tpo-by">Uploaded by {m.by}</p>
        </article>
      ))}
    </section>
  );
}

/* ---------------- Dashboard shell ---------------- */
export default function StudentDashboard({ user, onLogout }) {
  const [data, setData] = useState(load);
  const [tab, setTab] = useState("profile");
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, [data]);

  const addResult = (r) => setData((d) => ({ ...d, testResults: [...(d.testResults || []), r] }));
  const results = (data.testResults || []).filter((r) => r.email === user.email);
  const latest = results[results.length - 1];

  const tabs = [["profile", "Profile"], ["drives", "Upcoming drives"], ["test", "Proctored test"], ["feedback", "Senior feedback"], ["materials", "Previous year questions and material"]];

  return (
    <div className="ja-page">
      <nav className="ja-nav">
        <div className="ja-logo"><span className="ja-logo-mark">JA</span><span className="ja-logo-text">Job Analyzer</span></div>
        <button className="ja-out" onClick={onLogout} disabled={locked}>Log out</button>
      </nav>
      <main className="tpo-wrap">
        <h2 className="tpo-title">Student dashboard</h2>
        <p className="tpo-welcome">Welcome, {user.name}</p>
        <div className="tpo-tabs" role="tablist">
          {tabs.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} disabled={locked && k !== "test"}
              className={tab === k ? "tpo-tab on" : "tpo-tab"} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
        {tab === "profile" && <Profile user={user} />}
        {tab === "drives" && <DrivesTab data={data} user={user} setData={setData} />}
        {tab === "test" && <Test user={user} results={results} addResult={addResult} setLocked={setLocked} />}
        {tab === "feedback" && <Feedback data={data} user={user} setData={setData} latest={latest} />}
        {tab === "materials" && <Materials data={data} />}
      </main>
    </div>
  );
}
