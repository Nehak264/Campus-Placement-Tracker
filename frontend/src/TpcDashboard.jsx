import { useEffect, useMemo, useState } from "react";
import { KEY, load, pct, Bar, Drives, DEPARTMENTS } from "./TpoDashboard";
import "./TpoDashboard.css";
import { fetchTpcStudents, approveStudent, rejectStudent } from "./api";

const registeredStudents = (dept) => {
  try {
    return Object.values(JSON.parse(localStorage.getItem("ja_users") || "{}")).filter(
      (u) => u.role === "student" && u.department === dept
    );
  } catch {
    return [];
  }
};

function Overview({ dept, stats, setTotal }) {
  return (
    <>
      <div className="tpo-cards">
        <div className="tpo-stat"><span>Total students in {dept}</span><b>{stats.total}</b></div>
        <div className="tpo-stat ok"><span>Placed</span><b>{stats.placed}</b></div>
        <div className="tpo-stat warn"><span>Remaining to be placed</span><b>{stats.remaining}</b></div>
        <div className="tpo-stat"><span>Placement rate</span><b>{pct(stats.placed, stats.total)}%</b></div>
      </div>

      <section className="tpo-panel">
        <h3>Whole department</h3>
        <p className="tpo-note">
          {stats.placed} placed out of {stats.total} students in {dept}. {stats.remaining} students are still to be placed
          (ratio {stats.placed}:{stats.remaining}).
        </p>
        <Bar value={pct(stats.placed, stats.total)} label="Department placement rate" />
        <label className="tpo-total-edit">
          Total students in your department
          <input className="tpo-num" type="number" min="0" value={stats.total} onChange={setTotal} />
        </label>
      </section>

      <section className="tpo-panel">
        <h3>Company-wise ratio</h3>
        <p className="tpo-note">How many {dept} students each company placed, compared with all {stats.total} students of the department.</p>
        {stats.perCompany.length === 0 ? (
          <p className="tpo-empty">No placements added yet.</p>
        ) : (
          <div className="tpo-scroll">
            <table>
              <thead><tr><th>Company</th><th>Students placed</th><th>Share of placements</th><th>Of department students</th></tr></thead>
              <tbody>
                {stats.perCompany.map((c) => (
                  <tr key={c.company}>
                    <td>{c.company}</td>
                    <td>{c.count}</td>
                    <td className="tpo-ratio"><Bar value={pct(c.count, stats.placed)} label={c.company + " share"} /><span>{pct(c.count, stats.placed)}%</span></td>
                    <td>{c.count} of {stats.total} ({pct(c.count, stats.total)}%)</td>
                  </tr>
                ))}
                <tr className="tpo-total">
                  <td>Not placed yet</td><td>{stats.remaining}</td><td></td>
                  <td>{stats.remaining} of {stats.total} ({pct(stats.remaining, stats.total)}%)</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Students({ dept, placedList, isLive }) {
  const [liveStudents, setLiveStudents] = useState([]);
  const [approvedStudents, setApprovedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const localStudents = registeredStudents(dept);
  const placedBy = {};
  placedList.forEach((p) => { placedBy[p.name.trim().toLowerCase()] = p; });

  const loadStudents = async () => {
    setLoading(true);
    const [pendingList, approvedList] = await Promise.all([
      fetchTpcStudents("PENDING"),
      fetchTpcStudents("APPROVED")
    ]);
    if (pendingList && Array.isArray(pendingList)) {
      setLiveStudents(pendingList);
    }
    if (approvedList && Array.isArray(approvedList)) {
      setApprovedStudents(approvedList);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleApprove = async (id) => {
    try {
      await approveStudent(id);
      loadStudents();
    } catch (e) {
      alert("Approval error: " + e.message);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt("Enter reason for rejection:") || "Documents not verified";
    try {
      await rejectStudent(id, reason);
      loadStudents();
    } catch (e) {
      alert("Rejection error: " + e.message);
    }
  };

  const deptApproved = approvedStudents.filter(
    (s) => !dept || !s.branch || s.branch.toLowerCase() === dept.toLowerCase()
  );
  const students = isLive && approvedStudents.length > 0 ? deptApproved : localStudents;

  return (
    <>
      {(isLive || liveStudents.length > 0) && (
        <section className="tpo-panel" style={{ borderLeft: "4px solid #0d6efd" }}>
          <div className="tpo-filter">
            <h3>Pending Student Verifications ({liveStudents.length})</h3>
            <button className="tpo-tab" type="button" onClick={loadStudents} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <p className="tpo-note">New students who registered and need your approval before they can log in.</p>
          {liveStudents.length === 0 ? (
            <p className="tpo-empty">No pending student verifications right now.</p>
          ) : (
            <div className="tpo-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Branch</th>
                    <th>CGPA</th>
                    <th>Backlogs</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {liveStudents.map((s) => (
                    <tr key={s.id}>
                      <td><b>{s.rollNo}</b></td>
                      <td>{s.name}</td>
                      <td>{s.email}</td>
                      <td>{s.branch}</td>
                      <td>{s.cgpa}</td>
                      <td>{s.activeBacklogs}</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button className="tpo-tab on" style={{ padding: "4px 12px", fontSize: "0.82rem" }} onClick={() => handleApprove(s.id)}>Approve</button>
                          <button className="tpo-del" style={{ padding: "4px 12px", fontSize: "0.82rem" }} onClick={() => handleReject(s.id)}>Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="tpo-panel">
        <h3>Student details - {dept} ({students.length})</h3>
        <p className="tpo-note">Students of your department who have registered on this portal.</p>
        {students.length === 0 ? (
          <p className="tpo-empty">No student from {dept} has registered yet.</p>
        ) : (
          <div className="tpo-scroll">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>{isLive && approvedStudents.length > 0 ? "Roll No" : "Phone"}</th><th>Placement status</th></tr></thead>
              <tbody>
                {students.map((u) => {
                  const p = placedBy[u.name.trim().toLowerCase()];
                  return (
                    <tr key={u.email}>
                      <td>{u.name}</td><td>{u.email}</td><td>{u.rollNo || u.phone || "-"}</td>
                      <td>{p ? <span className="tpo-badge open">Placed at {p.company}</span> : <span className="tpo-badge closed">Not placed yet</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Placed({ dept, data, update }) {
  const empty = { name: "", company: "", pkg: "" };
  const [f, setF] = useState(empty);
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const rows = data.placed.filter((p) => p.dept === dept);

  const add = (e) => {
    e.preventDefault();
    if (!f.name.trim() || !f.company.trim() || f.pkg === "") return setMsg("Fill in name, company and package.");
    const pkg = parseFloat(f.pkg);
    if (!(pkg >= 0)) return setMsg("Enter a valid package in LPA.");
    update({ placed: [...data.placed, { id: Date.now(), name: f.name.trim(), dept, company: f.company.trim(), pkg }] });
    setF(empty);
    setMsg("");
  };
  const remove = (id) => update({ placed: data.placed.filter((p) => p.id !== id) });

  return (
    <div className="tpo-two">
      <form className="tpo-panel" onSubmit={add} noValidate>
        <h3>Add a placed student</h3>
        <p className="tpo-note">Department: {dept}</p>
        <label className="tpo-f"><span>Student name</span><input value={f.name} onChange={set("name")} /></label>
        <label className="tpo-f"><span>Company</span><input value={f.company} onChange={set("company")} /></label>
        <label className="tpo-f"><span>Package (LPA)</span><input type="number" min="0" step="0.1" value={f.pkg} onChange={set("pkg")} /></label>
        <div className="tpo-err" aria-live="polite">{msg}</div>
        <button className="tpo-btn" type="submit">Add student</button>
      </form>

      <section className="tpo-panel">
        <h3>Placed students - {dept} ({rows.length})</h3>
        {rows.length === 0 ? <p className="tpo-empty">No placed students yet.</p> : (
          <div className="tpo-scroll">
            <table>
              <thead><tr><th>Name</th><th>Company</th><th>Package</th><th></th></tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}><td>{p.name}</td><td>{p.company}</td><td>{p.pkg} LPA</td>
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

function Materials({ data, update, user }) {
  const empty = { title: "", type: "Previous year questions", company: "", link: "", content: "" };
  const [f, setF] = useState(empty);
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const list = data.materials || [];

  const add = (e) => {
    e.preventDefault();
    if (!f.title.trim()) return setMsg("Enter a title.");
    if (!f.link.trim() && !f.content.trim()) return setMsg("Add a link or type the content.");
    if (f.link.trim() && !/^https?:\/\//i.test(f.link.trim())) return setMsg("The link must start with http:// or https://");
    update({ materials: [...list, { id: Date.now(), ...f, title: f.title.trim(), company: f.company.trim(), link: f.link.trim(), content: f.content.trim(), by: "TPC " + user.name }] });
    setF(empty);
    setMsg("");
  };
  const remove = (id) => update({ materials: list.filter((m) => m.id !== id) });

  return (
    <div className="tpo-two">
      <form className="tpo-panel" onSubmit={add} noValidate>
        <h3>Upload study material</h3>
        <label className="tpo-f"><span>Title</span><input value={f.title} onChange={set("title")} placeholder="e.g. TCS NQT 2025 questions" /></label>
        <label className="tpo-f"><span>Type</span>
          <select value={f.type} onChange={set("type")}><option>Previous year questions</option><option>Study material</option></select>
        </label>
        <label className="tpo-f"><span>Company (optional)</span><input value={f.company} onChange={set("company")} placeholder="e.g. TCS" /></label>
        <label className="tpo-f"><span>Link to file (Google Drive, PDF, website)</span><input value={f.link} onChange={set("link")} placeholder="https://..." /></label>
        <label className="tpo-f"><span>Or type the questions / notes here</span><textarea rows="5" value={f.content} onChange={set("content")} /></label>
        <div className="tpo-err" aria-live="polite">{msg}</div>
        <button className="tpo-btn" type="submit">Upload</button>
      </form>
      <section className="tpo-panel">
        <h3>Uploaded material ({list.length})</h3>
        {list.length === 0 ? <p className="tpo-empty">Nothing uploaded yet.</p> : list.map((m) => (
          <article className="tpo-drive" key={m.id}>
            <div className="tpo-drive-head">
              <div><b>{m.title}</b>{m.company && <span> - {m.company}</span>}</div>
              <span className="tpo-badge done">{m.type}</span>
            </div>
            <button className="tpo-del" onClick={() => remove(m.id)}>Delete</button>
          </article>
        ))}
      </section>
    </div>
  );
}

export default function TpcDashboard({ user, onLogout }) {
  const [data, setData] = useState(load);
  const [tab, setTab] = useState("overview");
  const [selectedDept, setSelectedDept] = useState(user.department || DEPARTMENTS[0]);
  const dept = user.department || selectedDept;

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, [data]);
  const update = (patch) => setData((d) => ({ ...d, ...patch }));
  const setTotal = (e) => update({ departments: { ...data.departments, [dept]: Math.max(0, parseInt(e.target.value, 10) || 0) } });

  const stats = useMemo(() => {
    const total = Number(data.departments[dept]) || 0;
    const mine = data.placed.filter((p) => p.dept === dept);
    const groups = {};
    mine.forEach((p) => {
      const k = p.company.trim().toLowerCase();
      groups[k] = groups[k] || { company: p.company.trim(), count: 0 };
      groups[k].count += 1;
    });
    return {
      total,
      placed: mine.length,
      remaining: Math.max(total - mine.length, 0),
      perCompany: Object.values(groups).sort((a, b) => b.count - a.count),
    };
  }, [data, dept]);

  const tabs = [["overview", "Overview"], ["students", "Student details"], ["placed", "Placed students"], ["drives", "Upcoming drives"], ["materials", "Study materials"]];

  return (
    <div className="ja-page">
      <nav className="ja-nav">
        <div className="ja-logo"><span className="ja-logo-mark">JA</span><span className="ja-logo-text">Job Analyzer</span></div>
        <button className="ja-out" onClick={onLogout}>Log out</button>
      </nav>
      <main className="tpo-wrap">
        <h2 className="tpo-title">TPC dashboard{dept ? " - " + dept : ""}</h2>
        <p className="tpo-welcome">Welcome, {user.name}</p>

        {!user.department && (
          <div className="tpo-banner">
            <span>Viewing department:</span>
            <select
              value={dept}
              onChange={(e) => setSelectedDept(e.target.value)}
              aria-label="Select department"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}

        <div className="tpo-tabs" role="tablist">
          {tabs.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "tpo-tab on" : "tpo-tab"} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>
        {tab === "overview" && <Overview dept={dept} stats={stats} setTotal={setTotal} />}
        {tab === "students" && <Students dept={dept} placedList={data.placed.filter((p) => p.dept === dept)} isLive={Boolean(user.isLive)} />}
        {tab === "placed" && <Placed dept={dept} data={data} update={update} />}
        {tab === "materials" && <Materials data={data} update={update} user={user} />}
        {tab === "drives" && <Drives data={data} update={update} author={user.name + " (TPC, " + dept + ")"} />}
      </main>
    </div>
  );
}
