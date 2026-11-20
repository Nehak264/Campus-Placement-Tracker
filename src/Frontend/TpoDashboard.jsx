import { useEffect, useMemo, useState } from "react";
import "./TpoDashboard.css";

export const DEPARTMENTS = [
  "Computer Science",
  "Information Technology",
  "Mechanical",
  "Civil",
  "Electrical",
  "Electronics & Telecom",
];

export const KEY = "ja_tpo_data";

// Sample feedback and study material for the student dashboard
const extras = () => ({
  registrations: [],
  testResults: [],
  feedback: [
    { id: 101, sample: true, company: "TCS", role: "Ninja", by: "Rahul P.", dept: "Computer Science", rounds: "Online aptitude test, technical interview, HR interview",
      questions: "Reverse a string, four pillars of OOP, difference between INNER and LEFT JOIN, explain your final-year project.",
      areas: ["DBMS / SQL", "Communication"], advice: "Revise SQL joins and practise explaining your project in simple words. The HR round checks confidence." },
    { id: 102, sample: true, company: "Infosys", role: "Systems Engineer", by: "Anjali K.", dept: "Information Technology", rounds: "Online reasoning and verbal test, technical + HR in one round",
      questions: "Difference between abstract class and interface, what is a deadlock, time and work problems.",
      areas: ["Aptitude", "Java / OOP"], advice: "Aptitude cut-off was strict. Solve one timed aptitude set daily and revise Java collections." },
    { id: 103, sample: true, company: "Wipro", role: "Project Engineer", by: "Sagar M.", dept: "Computer Science", rounds: "Coding test, technical round, HR round",
      questions: "Find the second largest element in an array, check if a string is a palindrome, explain the REST API used in your project.",
      areas: ["DSA", "Projects"], advice: "Practise array and string problems on a coding site and know every line of your project code." },
  ],
  materials: [
    { id: 201, sample: true, title: "TCS NQT - previous year questions", type: "Previous year questions", company: "TCS", link: "",
      content: "1. A train 120 m long crosses a pole in 6 seconds. Find its speed in km/h.\n2. Write a program to check whether a number is prime.\n3. Which SQL clause is used to filter groups?\n4. What is the output of 10 + 20 + \"Java\" in Java?", by: "TPC" },
    { id: 202, sample: true, title: "Java and OOP interview checklist", type: "Study material", company: "", link: "",
      content: "Revise: four pillars of OOP, abstract class vs interface, collections (List, Set, Map), exception handling, String vs StringBuilder, multithreading basics, Spring Boot basics.", by: "TPC" },
    { id: 203, sample: true, title: "Aptitude formulas", type: "Study material", company: "Infosys", link: "",
      content: "Speed = Distance / Time. Percentage change = (change / original) x 100. Simple interest = PRT / 100. Work = rate x time. Practise ratio, averages and time-and-work daily.", by: "TPC" },
  ],
});

// Sample data so the dashboard is not empty on first open. Use "Clear sample data" to remove it.
const seed = () => ({
  sample: true,
  ...extras(),
  departments: { "Computer Science": 120, "Information Technology": 60, Mechanical: 90, Civil: 70, Electrical: 60, "Electronics & Telecom": 60 },
  placed: [
    { id: 1, name: "Aarav Patil", dept: "Computer Science", company: "TCS", pkg: 7 },
    { id: 2, name: "Sneha Jadhav", dept: "Computer Science", company: "Infosys", pkg: 6.5 },
    { id: 3, name: "Rohan Shinde", dept: "Information Technology", company: "TCS", pkg: 7 },
    { id: 4, name: "Pooja Kale", dept: "Mechanical", company: "Bajaj Auto", pkg: 5 },
    { id: 5, name: "Omkar More", dept: "Electrical", company: "Siemens", pkg: 6 },
    { id: 6, name: "Neha Deshmukh", dept: "Computer Science", company: "Infosys", pkg: 6.5 },
  ],
  drives: [
    { id: 11, company: "Wipro", role: "Java Developer", jd: "Core Java, Spring Boot, REST APIs and MySQL. Open to CS and IT students with 60% or above and no active backlogs.", dueDate: "2026-12-05", visitDate: "2026-12-12" },
    { id: 12, company: "Cognizant", role: "Programmer Analyst Trainee", jd: "Good problem solving and communication. All branches eligible.", dueDate: "2026-12-18", visitDate: "2027-01-08" },
  ],
});

export const load = () => {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.departments) return { ...extras(), ...d };
  } catch { /* ignore */ }
  return seed();
};

export const todayStr = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
};
export const fmt = (d) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-";
export const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

export function Bar({ value, label }) {
  return (
    <div className="tpo-bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div style={{ width: value + "%" }} />
    </div>
  );
}

function Overview({ data, stats, update }) {
  const setTotal = (dept) => (e) => {
    const n = Math.max(0, parseInt(e.target.value, 10) || 0);
    update({ departments: { ...data.departments, [dept]: n } });
  };
  return (
    <>
      <div className="tpo-cards">
        <div className="tpo-stat"><span>Total students</span><b>{stats.totalStudents}</b></div>
        <div className="tpo-stat ok"><span>Placed</span><b>{stats.placed}</b></div>
        <div className="tpo-stat warn"><span>Remaining to be placed</span><b>{stats.remaining}</b></div>
        <div className="tpo-stat"><span>Placement rate</span><b>{pct(stats.placed, stats.totalStudents)}%</b></div>
      </div>

      <section className="tpo-panel">
        <h3>Whole university</h3>
        <p className="tpo-note">
          {stats.placed} placed out of {stats.totalStudents} students. {stats.remaining} students are still to be placed.
        </p>
        <Bar value={pct(stats.placed, stats.totalStudents)} label="Overall placement rate" />
      </section>

      <section className="tpo-panel">
        <h3>Department-wise ratio</h3>
        <p className="tpo-note">Edit the total number of students in each department. Placed counts come from the Placed students tab.</p>
        <div className="tpo-scroll">
          <table>
            <thead><tr><th>Department</th><th>Total students</th><th>Placed</th><th>Remaining</th><th>Placed ratio</th></tr></thead>
            <tbody>
              {stats.perDept.map((r) => (
                <tr key={r.dept}>
                  <td>{r.dept}</td>
                  <td><input className="tpo-num" type="number" min="0" value={r.total} onChange={setTotal(r.dept)} aria-label={"Total students in " + r.dept} /></td>
                  <td>{r.placed}</td>
                  <td>{r.remaining}</td>
                  <td className="tpo-ratio"><Bar value={pct(r.placed, r.total)} label={r.dept + " placement rate"} /><span>{r.placed}:{r.remaining} ({pct(r.placed, r.total)}%)</span></td>
                </tr>
              ))}
              <tr className="tpo-total">
                <td>All departments</td><td>{stats.totalStudents}</td><td>{stats.placed}</td><td>{stats.remaining}</td>
                <td className="tpo-ratio"><Bar value={pct(stats.placed, stats.totalStudents)} label="All departments placement rate" /><span>{stats.placed}:{stats.remaining} ({pct(stats.placed, stats.totalStudents)}%)</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="tpo-panel">
        <h3>Company-wise ratio</h3>
        <p className="tpo-note">How many students each company placed, compared with all {stats.totalStudents} students.</p>
        {stats.perCompany.length === 0 ? (
          <p className="tpo-empty">No placements added yet.</p>
        ) : (
          <div className="tpo-scroll">
            <table>
              <thead><tr><th>Company</th><th>Students placed</th><th>Share of all placements</th><th>Of total students</th></tr></thead>
              <tbody>
                {stats.perCompany.map((c) => (
                  <tr key={c.company}>
                    <td>{c.company}</td>
                    <td>{c.count}</td>
                    <td className="tpo-ratio"><Bar value={pct(c.count, stats.placed)} label={c.company + " share of placements"} /><span>{pct(c.count, stats.placed)}%</span></td>
                    <td>{c.count} of {stats.totalStudents} ({pct(c.count, stats.totalStudents)}%)</td>
                  </tr>
                ))}
                <tr className="tpo-total">
                  <td>Not placed yet</td><td>{stats.remaining}</td><td></td>
                  <td>{stats.remaining} of {stats.totalStudents} ({pct(stats.remaining, stats.totalStudents)}%)</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

export function Drives({ data, update, author }) {
  const empty = { company: "", role: "", jd: "", dueDate: "", visitDate: "" };
  const [f, setF] = useState(empty);
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const add = (e) => {
    e.preventDefault();
    if (!f.company.trim() || !f.role.trim() || !f.jd.trim() || !f.dueDate || !f.visitDate)
      return setMsg("Fill in all fields, including both dates.");
    if (f.visitDate < f.dueDate) return setMsg("Campus visit date should be on or after the registration due date.");
    update({ drives: [...data.drives, { id: Date.now(), by: author, ...f, company: f.company.trim(), role: f.role.trim(), jd: f.jd.trim() }] });
    setF(empty);
    setMsg("");
  };
  const remove = (id) => update({ drives: data.drives.filter((d) => d.id !== id) });

  const today = todayStr();
  const status = (d) => (d.visitDate < today ? ["Completed", "done"] : d.dueDate < today ? ["Registration closed", "closed"] : ["Registration open", "open"]);
  const sorted = [...data.drives].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="tpo-two">
      <form className="tpo-panel" onSubmit={add} noValidate>
        <h3>Upload a new drive</h3>
        <label className="tpo-f"><span>Company name</span><input value={f.company} onChange={set("company")} placeholder="e.g. Wipro" /></label>
        <label className="tpo-f"><span>Job role</span><input value={f.role} onChange={set("role")} placeholder="e.g. Java Developer" /></label>
        <label className="tpo-f"><span>Job description</span><textarea rows="5" value={f.jd} onChange={set("jd")} placeholder="Skills, eligibility, package, location..." /></label>
        <div className="tpo-row">
          <label className="tpo-f"><span>Registration due date</span><input type="date" value={f.dueDate} onChange={set("dueDate")} /></label>
          <label className="tpo-f"><span>Campus visit date</span><input type="date" value={f.visitDate} onChange={set("visitDate")} /></label>
        </div>
        <div className="tpo-err" aria-live="polite">{msg}</div>
        <button className="tpo-btn" type="submit">Upload drive</button>
      </form>

      <div>
        <h3 className="tpo-h">Upcoming drives ({sorted.length})</h3>
        {sorted.length === 0 && <p className="tpo-empty">No drives uploaded yet.</p>}
        {sorted.map((d) => {
          const [text, cls] = status(d);
          return (
            <article className="tpo-drive" key={d.id}>
              <div className="tpo-drive-head">
                <div><b>{d.company}</b><span> - {d.role}</span></div>
                <span className={"tpo-badge " + cls}>{text}</span>
              </div>
              <p>{d.jd}</p>
              {d.by && <p className="tpo-by">Posted by {d.by}</p>}
              <div className="tpo-dates">
                <div><span>Register by</span><b>{fmt(d.dueDate)}</b></div>
                <div><span>Coming to campus</span><b>{fmt(d.visitDate)}</b></div>
              </div>
              <button className="tpo-del" onClick={() => remove(d.id)}>Delete</button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Placed({ data, update }) {
  const empty = { name: "", dept: DEPARTMENTS[0], company: "", pkg: "" };
  const [f, setF] = useState(empty);
  const [filter, setFilter] = useState("all");
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const add = (e) => {
    e.preventDefault();
    if (!f.name.trim() || !f.company.trim() || f.pkg === "") return setMsg("Fill in name, company and package.");
    const pkg = parseFloat(f.pkg);
    if (!(pkg >= 0)) return setMsg("Enter a valid package in LPA.");
    update({ placed: [...data.placed, { id: Date.now(), name: f.name.trim(), dept: f.dept, company: f.company.trim(), pkg }] });
    setF({ ...empty, dept: f.dept });
    setMsg("");
  };
  const remove = (id) => update({ placed: data.placed.filter((p) => p.id !== id) });
  const rows = data.placed.filter((p) => filter === "all" || p.dept === filter);

  return (
    <div className="tpo-two">
      <form className="tpo-panel" onSubmit={add} noValidate>
        <h3>Add a placed student</h3>
        <label className="tpo-f"><span>Student name</span><input value={f.name} onChange={set("name")} /></label>
        <label className="tpo-f"><span>Department</span>
          <select value={f.dept} onChange={set("dept")}>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</select>
        </label>
        <label className="tpo-f"><span>Company</span><input value={f.company} onChange={set("company")} /></label>
        <label className="tpo-f"><span>Package (LPA)</span><input type="number" min="0" step="0.1" value={f.pkg} onChange={set("pkg")} /></label>
        <div className="tpo-err" aria-live="polite">{msg}</div>
        <button className="tpo-btn" type="submit">Add student</button>
      </form>

      <section className="tpo-panel">
        <div className="tpo-filter">
          <h3>Placed students ({rows.length})</h3>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by department">
            <option value="all">All departments</option>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        {rows.length === 0 ? <p className="tpo-empty">No placed students to show.</p> : (
          <div className="tpo-scroll">
            <table>
              <thead><tr><th>Name</th><th>Department</th><th>Company</th><th>Package</th><th></th></tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}><td>{p.name}</td><td>{p.dept}</td><td>{p.company}</td><td>{p.pkg} LPA</td>
                    <td><button className="tpo-del" onClick={() => remove(p.id)}>Remove</button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Tpcs() {
  let tpcs = [];
  try { tpcs = Object.values(JSON.parse(localStorage.getItem("ja_users") || "{}")).filter((u) => u.role === "tpc"); } catch { /* ignore */ }
  return (
    <section className="tpo-panel">
      <h3>TPC details ({tpcs.length})</h3>
      {tpcs.length === 0 ? (
        <p className="tpo-empty">No TPC has registered yet. Coordinators who register with the TPC role will appear here.</p>
      ) : (
        <div className="tpo-scroll">
          <table>
            <thead><tr><th>Name</th><th>Department</th><th>Email</th><th>Phone</th></tr></thead>
            <tbody>{tpcs.map((t) => <tr key={t.email}><td>{t.name}</td><td>{t.department || "-"}</td><td>{t.email}</td><td>{t.phone}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function TpoDashboard({ user, onLogout }) {
  const [data, setData] = useState(load);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, [data]);
  const update = (patch) => setData((d) => ({ ...d, ...patch }));
  const clearSample = () => update({ placed: [], drives: [], feedback: [], materials: [], sample: false });

  const stats = useMemo(() => {
    const perDept = DEPARTMENTS.map((dept) => {
      const total = Number(data.departments[dept]) || 0;
      const placed = data.placed.filter((p) => p.dept === dept).length;
      return { dept, total, placed, remaining: Math.max(total - placed, 0) };
    });
    const totalStudents = perDept.reduce((s, d) => s + d.total, 0);
    const placed = data.placed.length;
    const groups = {};
    data.placed.forEach((p) => {
      const k = p.company.trim().toLowerCase();
      groups[k] = groups[k] || { company: p.company.trim(), count: 0 };
      groups[k].count += 1;
    });
    const perCompany = Object.values(groups).sort((a, b) => b.count - a.count);
    return { perDept, perCompany, totalStudents, placed, remaining: Math.max(totalStudents - placed, 0) };
  }, [data]);

  const tabs = [["overview", "Overview"], ["drives", "Upcoming drives"], ["placed", "Placed students"], ["tpc", "TPC details"]];

  return (
    <div className="ja-page">
      <nav className="ja-nav">
        <div className="ja-logo"><span className="ja-logo-mark">JA</span><span className="ja-logo-text">Job Analyzer</span></div>
        <button className="ja-out" onClick={onLogout}>Log out</button>
      </nav>
      <main className="tpo-wrap">
        <h2 className="tpo-title">TPO dashboard</h2>
        <p className="tpo-welcome">Welcome, {user.name}</p>

        {data.sample && (
          <div className="tpo-banner">
            Sample data is loaded so you can see how the dashboard works. Set the real department totals, then clear the sample entries.
            <button onClick={clearSample}>Clear sample data</button>
          </div>
        )}

        <div className="tpo-tabs" role="tablist">
          {tabs.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "tpo-tab on" : "tpo-tab"} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>

        {tab === "overview" && <Overview data={data} stats={stats} update={update} />}
        {tab === "drives" && <Drives data={data} update={update} author={user.name + " (TPO)"} />}
        {tab === "placed" && <Placed data={data} update={update} />}
        {tab === "tpc" && <Tpcs />}
      </main>
    </div>
  );
}
