import { useEffect, useRef, useState } from "react";
import { KEY, load, pct, Bar, fmt, todayStr } from "./TpoDashboard";
import "./TpoDashboard.css";
import "./StudentDashboard.css";
import { fetchStudentProfile, fetchStudentDrives, applyToDrive, cancelDriveApplication, uploadResume } from "./api";
import { analyzeATS } from "./atsEngine";
import * as pdfjsLib from "pdfjs-dist";

// Point pdf.js worker to its own bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

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
  const items = [
    ["Name", user.name],
    ["Email", user.email],
    ...(user.rollNo ? [["Roll number", user.rollNo]] : []),
    ["Phone number", user.phone || "Not set"],
    ["Department", user.department || "Not set"],
    ...(user.cgpa != null ? [["CGPA", String(user.cgpa)]] : [])
  ];
  return (
    <section className="tpo-panel">
      <div className="st-profile">
        <div className="st-avatar" aria-hidden="true">
          {user.name.trim().charAt(0).toUpperCase()}
        </div>
        <div className="st-profile-text">
          <h3>{user.name}</h3>
          <p>Student</p>
        </div>
      </div>
      <div className="st-grid">
        {items.map(([k, v]) => (
          <div className="st-item" key={k}>
            <span>{k}</span>
            <b title={v}>{v}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Upcoming drives + register ---------------- */
function DrivesTab({ data, user, setData, onAnalyzeJd }) {
  const today = todayStr();
  const regs = (data.registrations || []).filter((r) => r.email === user.email);
  const isReg = (id) => regs.some((r) => r.driveId === id);
  const register = async (id) => {
    setData((d) => ({
      ...d,
      registrations: [
        ...(d.registrations || []),
        { driveId: id, email: user.email, name: user.name, department: user.department, at: new Date().toISOString() }
      ]
    }));
    try {
      await applyToDrive(id);
    } catch (e) {
      console.warn("Backend register application fallback:", e.message);
    }
  };
  const cancel = async (id) => {
    setData((d) => ({
      ...d,
      registrations: (d.registrations || []).filter((r) => !(r.driveId === id && r.email === user.email))
    }));
    try {
      await cancelDriveApplication(id);
    } catch (e) {
      console.warn("Backend cancel application fallback:", e.message);
    }
  };
  const sorted = [...data.drives].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <>
      <h3 className="tpo-h">Upcoming drives ({sorted.length})</h3>
      {sorted.length === 0 && <p className="tpo-empty">No drives have been announced yet.</p>}
      {sorted.map((d) => {
        const done = d.visitDate < today,
          closed = d.dueDate < today;
        const badge = done ? ["Completed", "done"] : closed ? ["Registration closed", "closed"] : ["Registration open", "open"];
        return (
          <article className="tpo-drive" key={d.id}>
            <div className="tpo-drive-head">
              <div>
                <b>{d.company}</b>
                <span> - {d.role}</span>
              </div>
              <span className={"tpo-badge " + badge[1]}>{badge[0]}</span>
            </div>
            <p>{d.jd}</p>
            <div className="tpo-dates">
              <div>
                <span>Register by</span>
                <b>{fmt(d.dueDate)}</b>
              </div>
              <div>
                <span>Coming to campus</span>
                <b>{fmt(d.visitDate)}</b>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              {isReg(d.id) ? (
                <div className="st-reg">
                  <span className="tpo-badge open">You are registered</span>
                  {!closed && (
                    <button className="tpo-del" onClick={() => cancel(d.id)}>
                      Cancel registration
                    </button>
                  )}
                </div>
              ) : (
                <button className="tpo-btn st-regbtn" disabled={closed} onClick={() => register(d.id)}>
                  {closed ? "Registration closed" : "Register for this drive"}
                </button>
              )}
              {onAnalyzeJd && (
                <button
                  type="button"
                  className="tpo-tab"
                  style={{ padding: "6px 16px", fontSize: "0.85rem" }}
                  onClick={() => onAnalyzeJd(d.company + " - " + d.role + "\n" + d.jd)}
                >
                  Analyze JD with AI
                </button>
              )}
            </div>
          </article>
        );
      })}
    </>
  );
}

/* ---------------- PDF text extractor ---------------- */
async function extractPdfText(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(" ") + "\n";
    }
    return text.trim();
  } catch (err) {
    console.warn("PDF extraction failed:", err);
    return "";
  }
}

/* ---------------- Resume Upload Tab ---------------- */
function ResumeTab({ profile, onResumeTextReady, onAnalyzeJd }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [resumeText, setResumeText] = useState("");
  const [uploadedPath, setUploadedPath] = useState(profile?.resumePath || null);
  const fileRef = useRef();

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const ok = /\.(pdf|doc|docx)$/i.test(f.name);
    if (!ok) {
      setMsg({ type: "error", text: "Only PDF, DOC, or DOCX files are allowed." });
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setMsg({ type: "error", text: "File size must be under 10 MB." });
      return;
    }
    setFile(f);
    setMsg({ type: "", text: "" });
  };

  const handleUpload = async () => {
    if (!file) return setMsg({ type: "error", text: "Please choose a file first." });
    setUploading(true);
    setMsg({ type: "", text: "" });
    try {
      const res = await uploadResume(file);
      setUploadedPath(res.resumePath);
      setMsg({ type: "success", text: "Resume uploaded successfully!" });

      // Auto-extract text if PDF
      if (file.name.toLowerCase().endsWith(".pdf")) {
        setExtracting(true);
        const text = await extractPdfText(file);
        setResumeText(text);
        onResumeTextReady(text);
        setExtracting(false);
        if (text.length < 50) {
          setMsg({ type: "warn", text: "Uploaded, but PDF text extraction returned very little content. Use a text-based PDF (not a scanned image) for best ATS results." });
        }
      } else {
        onResumeTextReady(""); // DOC/DOCX — can't extract in browser
        setMsg({ type: "success", text: "Resume uploaded. Note: ATS text analysis works best with PDF resumes." });
      }
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Upload failed. Please try again." });
    } finally {
      setUploading(false);
    }
  };

  const handleExtractOnly = async () => {
    if (!file) return setMsg({ type: "error", text: "Choose a PDF file to extract text." });
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return setMsg({ type: "error", text: "Text extraction only works with PDF files." });
    }
    setExtracting(true);
    setMsg({ type: "", text: "" });
    const text = await extractPdfText(file);
    setResumeText(text);
    onResumeTextReady(text);
    setExtracting(false);
    if (text.length < 50) {
      setMsg({ type: "warn", text: "Very little text was extracted. Use a text-based PDF for accurate ATS scoring." });
    } else {
      setMsg({ type: "success", text: `Extracted ${text.split(/\s+/).length} words from your resume. Ready for ATS analysis!` });
    }
  };

  return (
    <section className="tpo-panel">
      <h3>Resume Upload &amp; Management</h3>
      <p className="tpo-note">
        Upload your resume (PDF preferred for ATS analysis). After upload, switch to the <b>JD Analyzer</b> tab to get a real ATS score compared to any job description.
      </p>

      {/* Current status */}
      {uploadedPath ? (
        <div className="st-resume-status uploaded">
          <span>✅ Resume on file:</span>
          <code style={{ wordBreak: "break-all" }}>{uploadedPath.split("/").pop()}</code>
        </div>
      ) : (
        <div className="st-resume-status none">
          <span>⚠️ No resume uploaded yet.</span>
        </div>
      )}

      {/* File picker */}
      <div className="st-resume-upload">
        <label className="st-file-label">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button type="button" className="tpo-tab" onClick={() => fileRef.current?.click()}>
            📁 Choose File
          </button>
          <span className="st-file-name">{file ? file.name : "No file chosen"}</span>
        </label>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
          <button
            type="button"
            className="tpo-btn"
            style={{ width: "auto", padding: "0 24px" }}
            onClick={handleUpload}
            disabled={uploading || extracting || !file}
          >
            {uploading ? "Uploading…" : "Upload Resume"}
          </button>

          {file?.name?.toLowerCase().endsWith(".pdf") && (
            <button
              type="button"
              className="tpo-tab"
              style={{ padding: "8px 20px" }}
              onClick={handleExtractOnly}
              disabled={extracting || uploading}
            >
              {extracting ? "Extracting…" : "Extract Text Only (no upload)"}
            </button>
          )}

          {onAnalyzeJd && resumeText && (
            <button
              type="button"
              className="tpo-tab on"
              style={{ padding: "8px 20px" }}
              onClick={() => onAnalyzeJd("")}
            >
              🎯 Go to JD Analyzer
            </button>
          )}
        </div>

        {msg.text && (
          <div
            className={`tpo-${msg.type === "error" ? "err" : msg.type === "warn" ? "banner" : "note"}`}
            style={{ marginTop: "14px" }}
          >
            {msg.text}
          </div>
        )}
      </div>

      {/* Extracted text preview */}
      {resumeText && (
        <div style={{ marginTop: "20px" }}>
          <h4 style={{ marginBottom: "8px" }}>
            📄 Extracted Resume Text Preview ({resumeText.split(/\s+/).length} words)
          </h4>
          <pre
            className="st-pre"
            style={{ maxHeight: "220px", overflowY: "auto", fontSize: "0.78rem", background: "#f8f9ff" }}
          >
            {resumeText.slice(0, 1500)}{resumeText.length > 1500 ? "\n\n… (truncated for preview)" : ""}
          </pre>
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        <h4>💡 Tips for a better ATS score</h4>
        <ul className="st-rules">
          <li>Use a <b>text-based PDF</b> (not a scanned image). Most modern resumes created in MS Word or Google Docs qualify.</li>
          <li>Include exact keywords from the job description in your Skills and Experience sections.</li>
          <li>Avoid tables, text boxes, and fancy graphics — ATS parsers often skip them.</li>
          <li>Keep file size under 2 MB for fastest processing.</li>
        </ul>
      </div>
    </section>
  );
}

/* ---------------- AI Job Description Analyzer (with ATS) ---------------- */
function JdAnalyzerTab({ initialText = "", resumeText = "", onSwitchTab }) {
  const [jdText, setJdText] = useState(
    initialText ||
      "Core Java, Spring Boot, REST APIs and MySQL. Open to CS and IT students with 60% or above and no active backlogs. Knowledge of Object Oriented Programming, Microservices, and Git is preferred."
  );
  const [analysis, setAnalysis] = useState(null);
  const [atsResult, setAtsResult] = useState(null);

  const sampleJds = [
    {
      title: "Wipro Java Developer",
      text: "Core Java, Spring Boot, REST APIs and MySQL. Open to CS and IT students with 60% or above and no active backlogs. Knowledge of Object Oriented Programming, Microservices, and Git is preferred."
    },
    {
      title: "Cognizant Trainee",
      text: "Good problem solving and communication. All branches eligible. Basic Aptitude, logical reasoning, verbal ability, and fundamentals of programming (C/Java/Python), SQL queries."
    },
    {
      title: "Cloud & Fullstack SDE",
      text: "React.js, Node.js, Spring Boot, Docker, Kubernetes, AWS Cloud, PostgreSQL, Data Structures & Algorithms, and System Design basics."
    }
  ];

  const runAnalysis = (text) => {
    const raw = text !== undefined ? text : jdText;
    if (!raw.trim()) return;

    const lower = raw.toLowerCase();
    const skillsList = [
      { name: "Java / OOP", kw: ["java", "oop", "object oriented", "collections"] },
      { name: "Spring Boot", kw: ["spring", "spring boot", "springboot", "microservices"] },
      { name: "REST APIs", kw: ["rest", "api", "apis", "endpoints"] },
      { name: "DBMS / SQL", kw: ["sql", "mysql", "postgresql", "dbms", "database"] },
      { name: "Data Structures & Algorithms", kw: ["dsa", "data structures", "algorithms", "problem solving"] },
      { name: "Aptitude & Logical", kw: ["aptitude", "reasoning", "verbal", "quantitative"] },
      { name: "Communication Skills", kw: ["communication", "interpersonal", "english", "presentation"] },
      { name: "Cloud & DevOps (Docker/AWS)", kw: ["docker", "kubernetes", "aws", "cloud", "devops"] },
      { name: "Frontend (React / JS)", kw: ["react", "javascript", "html", "css", "frontend"] },
      { name: "Git & Version Control", kw: ["git", "github", "version control"] }
    ];

    const studentBasics = ["Java / OOP", "DBMS / SQL", "Data Structures & Algorithms", "Aptitude & Logical", "Communication Skills", "REST APIs"];

    const matched = [];
    const gaps = [];

    skillsList.forEach((s) => {
      const foundInJd = s.kw.some((k) => lower.includes(k));
      if (foundInJd) {
        if (studentBasics.includes(s.name)) {
          matched.push(s.name);
        } else {
          gaps.push(s.name);
        }
      }
    });

    const totalJdSkills = matched.length + gaps.length;
    const score = totalJdSkills > 0 ? Math.round((matched.length / totalJdSkills) * 100) : 75;

    setAnalysis({
      score: Math.max(score, 60),
      matched,
      gaps,
      roadmap: [
        `Bridge high-priority skills: ${gaps.length > 0 ? gaps.join(", ") : "Advanced system design & cloud"}.`,
        "Practice timed questions in Aptitude, DSA, and OOP under the Proctored Test tab.",
        "Inspect real questions asked by TCS, Infosys, and Wipro under the Senior Feedback tab.",
        "Review previous year question papers and cheat sheets in the Study Material tab."
      ]
    });

    // Run ATS scoring if resume is available
    if (resumeText && resumeText.trim().length > 50) {
      const ats = analyzeATS(raw, resumeText);
      setAtsResult(ats);
    } else {
      setAtsResult(null);
    }
  };

  useEffect(() => {
    if (initialText) {
      setJdText(initialText);
      runAnalysis(initialText);
    } else {
      runAnalysis();
    }
  }, [initialText, resumeText]);

  const gradeColor = (grade) =>
    grade === "A" ? "#166534" : grade === "B" ? "#1e40af" : grade === "C" ? "#92400e" : "#991b1b";

  return (
    <section className="tpo-panel">
      <h3>AI Job Description Analyzer</h3>
      <p className="tpo-note">
        Paste any campus drive or external job opening description to benchmark your readiness, extract skills, and get a tailored prep roadmap.
        {!resumeText && (
          <span style={{ color: "#b45309", display: "block", marginTop: 6 }}>
            ⚠️ Upload your resume in the <b>Resume & ATS</b> tab for a real keyword-match ATS score against your resume.
          </span>
        )}
      </p>

      <div className="st-jd-box">
        <textarea
          className="st-jd-area"
          rows={5}
          placeholder="Paste Job Description here (skills, eligibility, role responsibilities)..."
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
        />
        <div className="st-jd-presets">
          <span>Quick load sample JD:</span>
          {sampleJds.map((s) => (
            <button
              key={s.title}
              type="button"
              className="st-jd-btn-preset"
              onClick={() => {
                setJdText(s.text);
                runAnalysis(s.text);
              }}
            >
              {s.title}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="tpo-btn"
          style={{ width: "auto", padding: "0 32px", alignSelf: "flex-start" }}
          onClick={() => runAnalysis()}
        >
          Analyze Readiness
        </button>
      </div>

      {/* ── ATS Score Card (only when resume is available) ── */}
      {atsResult && (
        <div className="st-ats-card">
          <div className="st-ats-header">
            <div>
              <h4>🎯 ATS Resume Score</h4>
              <p style={{ margin: "4px 0 0", color: "#555b7e", fontSize: "0.88rem" }}>
                Keyword match between your resume and this JD ({atsResult.jdKeywordCount} JD keywords scanned)
              </p>
            </div>
            <div className="st-ats-score-ring" style={{ borderColor: gradeColor(atsResult.grade) }}>
              <span className="st-ats-score-num" style={{ color: gradeColor(atsResult.grade) }}>
                {atsResult.score}%
              </span>
              <span className="st-ats-grade" style={{ color: gradeColor(atsResult.grade) }}>
                Grade {atsResult.grade}
              </span>
            </div>
          </div>

          {/* Category bars */}
          <div className="st-ats-cats">
            {Object.entries(atsResult.categories).map(([cat, data]) => (
              <div key={cat} className="st-ats-cat-row">
                <div className="st-ats-cat-label">
                  <span>{cat}</span>
                  <span style={{ color: gradeColor(data.score >= 80 ? "A" : data.score >= 60 ? "B" : data.score >= 40 ? "C" : "D") }}>
                    {data.score}%
                  </span>
                </div>
                <div className="st-ats-bar-track">
                  <div
                    className="st-ats-bar-fill"
                    style={{
                      width: `${data.score}%`,
                      background: data.score >= 80 ? "#16a34a" : data.score >= 60 ? "#2563eb" : data.score >= 40 ? "#d97706" : "#dc2626"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Matched & Missing keyword chips */}
          <div className="st-skill-grid">
            <div className="st-skill-col">
              <h5>✅ Matched Keywords ({atsResult.matched.length})</h5>
              <div className="st-skill-tags">
                {atsResult.matched.length === 0 ? (
                  <span style={{ color: "#555b7e" }}>None matched yet</span>
                ) : (
                  atsResult.matched.map((e) => (
                    <span key={e.kw} className="st-skill-tag match" title={e.cat}>
                      ✓ {e.kw}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div className="st-skill-col">
              <h5>⚠️ Missing Keywords ({atsResult.missing.length})</h5>
              <div className="st-skill-tags">
                {atsResult.missing.length === 0 ? (
                  <span style={{ color: "#166534" }}>No critical gaps! Excellent match!</span>
                ) : (
                  atsResult.missing.map((e) => (
                    <span
                      key={e.kw}
                      className="st-skill-tag gap"
                      title={`${e.cat} — weight ${e.w}`}
                      style={{ opacity: e.w === 3 ? 1 : e.w === 2 ? 0.85 : 0.7 }}
                    >
                      ⚡ {e.kw}
                      {e.w === 3 && <sup style={{ color: "#dc2626" }}>★</sup>}
                    </span>
                  ))
                )}
              </div>
              {atsResult.missing.length > 0 && (
                <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "6px" }}>
                  ★ = high-priority | listed by importance
                </p>
              )}
            </div>
          </div>

          {/* Suggestions */}
          {atsResult.suggestions.length > 0 && (
            <div className="st-roadmap" style={{ marginTop: "18px" }}>
              <h5>🛠️ How to Improve Your ATS Score</h5>
              <ol className="st-roadmap-steps">
                {atsResult.suggestions.map((tip, i) => (
                  <li key={i}>
                    <span className="st-step-badge">{i + 1}</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* ── Classic profile match (always shown) ── */}
      {analysis && (
        <div className="st-jd-results">
          <div className="st-jd-scorecard">
            <div>
              <h4>Profile Match Score</h4>
              <p>Benchmarked against campus requirements and curriculum</p>
            </div>
            <div className="st-jd-match-num">{analysis.score}%</div>
          </div>

          <div className="st-skill-grid">
            <div className="st-skill-col">
              <h5>✅ Matched Skills ({analysis.matched.length})</h5>
              <div className="st-skill-tags">
                {analysis.matched.length === 0 ? (
                  <span style={{ color: "#555b7e" }}>None identified yet</span>
                ) : (
                  analysis.matched.map((m) => (
                    <span key={m} className="st-skill-tag match">
                      ✓ {m}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div className="st-skill-col">
              <h5>⚠️ High-Impact Skill Gaps ({analysis.gaps.length})</h5>
              <div className="st-skill-tags">
                {analysis.gaps.length === 0 ? (
                  <span style={{ color: "#166534" }}>No critical skill gaps identified! Excellent match!</span>
                ) : (
                  analysis.gaps.map((g) => (
                    <span key={g} className="st-skill-tag gap">
                      ⚡ {g}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="st-roadmap">
            <h5>🎯 Personalized Preparation Roadmap</h5>
            <ol className="st-roadmap-steps">
              {analysis.roadmap.map((step, idx) => (
                <li key={idx}>
                  <span className="st-step-badge">{idx + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div style={{ display: "flex", gap: "12px", marginTop: "18px", flexWrap: "wrap" }}>
              <button type="button" className="tpo-tab on" onClick={() => onSwitchTab("test")}>
                Start Proctored Practice Test
              </button>
              <button type="button" className="tpo-tab" onClick={() => onSwitchTab("materials")}>
                View Study Material
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
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

  const videoRef = useRef(null),
    streamRef = useRef(null),
    endAt = useRef(0);
  const phaseRef = useRef("intro"),
    answersRef = useRef({}),
    warnRef = useRef([]),
    finishRef = useRef(() => {});
  answersRef.current = answers;

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

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
      if (answersRef.current[i] === q.a) {
        score += 1;
        topics[q.t].c += 1;
      }
    });
    const res = {
      id: Date.now(),
      email: user.email,
      name: user.name,
      score,
      total: QUESTIONS.length,
      topics,
      warnings: warnRef.current.map((w) => w.msg),
      reason: reason || "Submitted",
      at: new Date().toISOString()
    };
    stopCamera();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    addResult(res);
    setReport(res);
    setPhase("done");
    setLocked(false);
  };
  finishRef.current = finish;

  const start = async () => {
    try {
      if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    } catch {
      /* ignore */
    }
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true });
      setCamera("on");
    } catch {
      setCamera("denied");
    }
    answersRef.current = {};
    warnRef.current = [];
    setAnswers({});
    setWarnings([]);
    setIdx(0);
    setLeft(TEST_MINUTES * 60);
    setFs(!!document.fullscreenElement);
    phaseRef.current = "running";
    setPhase("running");
    setLocked(true);
  };

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) warn("Switched tab or minimised the window");
    };
    const onFs = () => {
      const on = !!document.fullscreenElement;
      setFs(on);
      if (!on) warn("Exited full-screen mode");
    };
    const block = (e) => {
      if (phaseRef.current === "running") e.preventDefault();
    };
    document.addEventListener("visibilitychange", onVis);
    document.addEventListener("fullscreenchange", onFs);
    window.addEventListener("contextmenu", block);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("contextmenu", block);
    };
  }, []);

  useEffect(() => {
    if (camera === "on" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [camera, phase]);

  useEffect(() => {
    if (phase !== "running") return;
    endAt.current = Date.now() + left * 1000;
    const t = setInterval(() => {
      const rem = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(rem);
      if (rem <= 0) {
        clearInterval(t);
        finish("Time up");
      }
    }, 500);
    return () => clearInterval(t);
  }, [phase]);

  const submit = () => {
    const un = QUESTIONS.length - Object.keys(answers).length;
    if (un > 0 && !window.confirm("You have " + un + " unanswered question(s). Submit now?")) return;
    finish("Submitted by student");
  };

  if (phase === "intro") {
    return (
      <section className="tpo-panel">
        <h3>Proctored aptitude and technical test</h3>
        <p className="tpo-note">
          12 questions covering Aptitude, DSA, Java/OOP and DBMS/SQL. Time limit: {TEST_MINUTES} minutes.
        </p>
        <ul className="st-rules">
          <li>The test will open in full-screen mode. Do not exit full screen.</li>
          <li>Do not switch tabs or minimise the window. Each switch is recorded.</li>
          <li>After {MAX_WARNINGS} warnings, your test is submitted automatically.</li>
          <li>Camera is requested for local proctoring preview. Video stays in your browser.</li>
        </ul>
        <button className="tpo-btn st-start" onClick={start}>
          Start test
        </button>

        {results.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <h4 style={{ margin: "0 0 10px" }}>Your past attempts</h4>
            <div className="tpo-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Weak areas</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[...results].reverse().map((r) => {
                    const weak = weakTopics(r);
                    return (
                      <tr key={r.id}>
                        <td>{new Date(r.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                        <td>
                          <b>
                            {r.score} / {r.total}
                          </b>
                        </td>
                        <td>{pct(r.score, r.total)}%</td>
                        <td>{weak.length ? weak.join(", ") : "None"}</td>
                        <td>
                          {r.reason}
                          {r.warnings && r.warnings.length ? " (" + r.warnings.length + " warnings)" : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    );
  }

  if (phase === "done" && report) {
    const weak = weakTopics(report);
    return (
      <section className="tpo-panel">
        <h3>Test result</h3>
        <p className="tpo-note">{report.reason}</p>
        <div className="st-score">
          {report.score} / {report.total} <span>({pct(report.score, report.total)}%)</span>
        </div>
        <h4 style={{ margin: "16px 0 8px" }}>Topic breakdown</h4>
        <div className="tpo-scroll">
          <table>
            <thead>
              <tr>
                <th>Topic</th>
                <th>Correct</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(report.topics).map(([k, v]) => (
                <tr key={k}>
                  <td>{k}</td>
                  <td>
                    {v.c} of {v.t}
                  </td>
                  <td className="tpo-ratio">
                    <Bar value={pct(v.c, v.t)} label={k} />
                    <span>{pct(v.c, v.t)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {weak.length > 0 && (
          <p className="st-focus">
            Recommended focus: You scored below 50% in <b>{weak.join(", ")}</b>. Check the Senior feedback tab for interview questions in these
            areas.
          </p>
        )}
        {report.warnings.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <b>Warnings logged:</b>
            <ul style={{ margin: "6px 0 0", paddingLeft: 20 }}>
              {report.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        <div style={{ marginTop: 20 }}>
          <button className="tpo-tab on" onClick={() => setPhase("intro")}>
            Back to test overview
          </button>
        </div>
      </section>
    );
  }

  const q = QUESTIONS[idx];
  return (
    <div className="st-exam">
      <div className="st-topbar">
        <div className="st-timer">
          Time left: <b>{mmss(left)}</b>
        </div>
        <div className={"st-warn" + (warnings.length ? " on" : "")}>
          Warnings:{" "}
          <b>
            {warnings.length} / {MAX_WARNINGS}
          </b>
        </div>
        <div>
          Answered:{" "}
          <b>
            {Object.keys(answers).length} / {QUESTIONS.length}
          </b>
        </div>
        {camera === "on" ? (
          <video ref={videoRef} autoPlay playsInline muted className="st-cam" />
        ) : (
          <span className="st-nocam">Camera not active</span>
        )}
      </div>
      {!fs && (
        <div className="tpo-banner">
          You left full-screen mode.{" "}
          <button onClick={() => document.documentElement.requestFullscreen().catch(() => {})}>Return to full screen</button>
        </div>
      )}
      <section className="tpo-panel">
        <p className="tpo-note">
          Question {idx + 1} of {QUESTIONS.length} - {q.t}
        </p>
        <h3 className="st-q">{q.q}</h3>
        <div className="st-opts">
          {q.o.map((o, i) => (
            <button
              key={i}
              className={answers[idx] === i ? "st-opt on" : "st-opt"}
              onClick={() => setAnswers({ ...answers, [idx]: i })}
            >
              <b>{String.fromCharCode(65 + i)}.</b> {o}
            </button>
          ))}
        </div>
        <div className="st-nav">
          <button className="tpo-tab" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
            Previous
          </button>
          <button className="tpo-tab" disabled={idx === QUESTIONS.length - 1} onClick={() => setIdx(idx + 1)}>
            Next
          </button>
          <button className="tpo-btn st-submit" onClick={submit}>
            Submit test
          </button>
        </div>
        <div className="st-palette" aria-label="Question navigator">
          {QUESTIONS.map((_, i) => (
            <button
              key={i}
              className={(i === idx ? "cur " : "") + (answers[i] !== undefined ? "ans" : "")}
              onClick={() => setIdx(i)}
            >
              {i + 1}
            </button>
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
  const toggle = (a) =>
    setF({ ...f, areas: f.areas.includes(a) ? f.areas.filter((x) => x !== a) : [...f.areas, a] });

  const counts = AREAS.map((a) => ({ area: a, n: shown.filter((x) => x.areas.includes(a)).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const mine = weakTopics(latest);

  const add = (e) => {
    e.preventDefault();
    if (!f.company.trim() || !f.role.trim() || !f.questions.trim())
      return setMsg("Fill in company, role and the questions asked.");
    if (f.areas.length === 0) return setMsg("Select at least one area where you felt weak.");
    setData((d) => ({
      ...d,
      feedback: [
        ...(d.feedback || []),
        {
          id: Date.now(),
          email: user.email,
          by: user.name,
          dept: user.department,
          ...f,
          company: f.company.trim(),
          role: f.role.trim(),
          rounds: f.rounds.trim(),
          questions: f.questions.trim(),
          advice: f.advice.trim()
        }
      ]
    }));
    setF(empty);
    setMsg("");
  };
  const remove = (id) => setData((d) => ({ ...d, feedback: (d.feedback || []).filter((x) => x.id !== id) }));

  return (
    <>
      <section className="tpo-panel">
        <div className="tpo-filter">
          <h3>Where to focus your preparation</h3>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by company">
            <option value="all">All companies</option>
            {companies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <p className="tpo-note">
          Areas where seniors said they lacked in {filter === "all" ? "their interviews" : filter + " interviews"}. Longer bar = more
          seniors struggled there.
        </p>
        {counts.length === 0 ? (
          <p className="tpo-empty">No feedback yet.</p>
        ) : (
          <div className="tpo-scroll">
            <table>
              <tbody>
                {counts.map((c) => (
                  <tr key={c.area}>
                    <td style={{ width: 160 }}>{c.area}</td>
                    <td className="tpo-ratio">
                      <Bar value={pct(c.n, shown.length)} label={c.area} />
                      <span>
                        {c.n} of {shown.length} seniors
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {latest && (
          <p className="st-focus">
            {mine.length ? (
              <>
                From your last practice test, you are weak in <b>{mine.join(", ")}</b>. Start with these.
              </>
            ) : (
              <>Your last practice test had no weak topic. Keep practising the areas above.</>
            )}
          </p>
        )}
      </section>

      <div className="tpo-two">
        <form className="tpo-panel" onSubmit={add} noValidate>
          <h3>Share your interview experience</h3>
          <label className="tpo-f">
            <span>Company</span>
            <input value={f.company} onChange={set("company")} />
          </label>
          <label className="tpo-f">
            <span>Role</span>
            <input value={f.role} onChange={set("role")} />
          </label>
          <label className="tpo-f">
            <span>Rounds</span>
            <input value={f.rounds} onChange={set("rounds")} placeholder="e.g. Online test, technical, HR" />
          </label>
          <label className="tpo-f">
            <span>Questions asked</span>
            <textarea rows="4" value={f.questions} onChange={set("questions")} />
          </label>
          <div className="tpo-f">
            <span>Where did you lack?</span>
            <div className="st-checks">
              {AREAS.map((a) => (
                <label key={a}>
                  <input type="checkbox" checked={f.areas.includes(a)} onChange={() => toggle(a)} /> {a}
                </label>
              ))}
            </div>
          </div>
          <label className="tpo-f">
            <span>Advice for juniors</span>
            <textarea rows="3" value={f.advice} onChange={set("advice")} />
          </label>
          <div className="tpo-err" aria-live="polite">
            {msg}
          </div>
          <button className="tpo-btn" type="submit">
            Share
          </button>
        </form>

        <div>
          <h3 className="tpo-h">Senior experiences ({shown.length})</h3>
          {shown.length === 0 && <p className="tpo-empty">No experiences shared yet.</p>}
          {shown.map((x) => (
            <article className="tpo-drive" key={x.id}>
              <div className="tpo-drive-head">
                <div>
                  <b>{x.company}</b>
                  <span> - {x.role}</span>
                </div>
                {x.sample && <span className="tpo-badge done">Sample</span>}
              </div>
              <p className="tpo-by">
                Shared by {x.by}
                {x.dept ? ", " + x.dept : ""}
              </p>
              {x.rounds && (
                <p>
                  <b>Rounds:</b> {x.rounds}
                </p>
              )}
              <p>
                <b>Questions asked:</b> {x.questions}
              </p>
              <div className="st-tags">
                <span>Where they lacked:</span>
                {x.areas.map((a) => (
                  <em key={a}>{a}</em>
                ))}
              </div>
              {x.advice && (
                <p>
                  <b>Advice:</b> {x.advice}
                </p>
              )}
              {x.email === user.email && (
                <button className="tpo-del" onClick={() => remove(x.id)}>
                  Delete
                </button>
              )}
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
  const shown = list.filter(
    (m) =>
      (type === "all" || m.type === type) &&
      (company === "all" || m.company === company) &&
      (!q.trim() || (m.title + " " + m.content).toLowerCase().includes(q.trim().toLowerCase()))
  );

  return (
    <section className="tpo-panel">
      <h3>Previous year questions and study material</h3>
      <p className="tpo-note">Uploaded by your TPC.</p>
      <div className="st-filters">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search material" />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
          <option value="all">All types</option>
          <option>Previous year questions</option>
          <option>Study material</option>
        </select>
        <select value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Company">
          <option value="all">All companies</option>
          {companies.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      {shown.length === 0 && <p className="tpo-empty">No material found.</p>}
      {shown.map((m) => (
        <article className="tpo-drive" key={m.id}>
          <div className="tpo-drive-head">
            <div>
              <b>{m.title}</b>
              {m.company && <span> - {m.company}</span>}
            </div>
            <span className="tpo-badge done">{m.type}</span>
          </div>
          {m.content && (
            <details>
              <summary>View questions / notes</summary>
              <pre className="st-pre">{m.content}</pre>
            </details>
          )}
          {m.link && (
            <p>
              <a href={m.link} target="_blank" rel="noopener noreferrer">
                Open file / link
              </a>
            </p>
          )}
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
  const [jdToAnalyze, setJdToAnalyze] = useState("");
  const [profile, setProfile] = useState(null);
  const [resumeText, setResumeText] = useState(""); // extracted from PDF

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [data]);

  useEffect(() => {
    async function syncBackendData() {
      try {
        const liveDrives = await fetchStudentDrives();
        if (liveDrives && Array.isArray(liveDrives) && liveDrives.length > 0) {
          setData((d) => ({
            ...d,
            drives: liveDrives.map((ld) => ({
              id: ld.id,
              company: ld.company,
              role: ld.role,
              jd: ld.jd,
              dueDate: ld.dueDate,
              visitDate: ld.visitDate,
              ctc: ld.ctc,
              minCgpa: ld.minCgpa
            })),
            registrations: [
              ...(d.registrations || []).filter((r) => r.email !== user.email),
              ...liveDrives
                .filter((ld) => ld.registered)
                .map((ld) => ({ driveId: ld.id, email: user.email, name: user.name }))
            ]
          }));
        }

        const fetchedProfile = await fetchStudentProfile();
        if (fetchedProfile && fetchedProfile.rollNo) {
          setProfile(fetchedProfile);
        }
      } catch (err) {
        console.warn("Spring Boot sync fallback:", err.message);
      }
    }
    syncBackendData();
  }, [user.email]);

  const addResult = (r) => setData((d) => ({ ...d, testResults: [...(d.testResults || []), r] }));
  const results = (data.testResults || []).filter((r) => r.email === user.email);
  const latest = results[results.length - 1];

  const handleAnalyzeJd = (text) => {
    setJdToAnalyze(text);
    setTab("analyzer");
  };

  const handleResumeTextReady = (text) => {
    setResumeText(text);
  };

  const tabs = [
    ["profile", "Profile"],
    ["resume", "Resume & ATS"],
    ["drives", "Upcoming drives"],
    ["analyzer", "JD Analyzer"],
    ["test", "Proctored test"],
    ["feedback", "Senior feedback"],
    ["materials", "Previous year questions and material"]
  ];

  return (
    <div className="ja-page">
      <nav className="ja-nav">
        <div className="ja-logo">
          <span className="ja-logo-mark">JA</span>
          <span className="ja-logo-text">Job Analyzer</span>
        </div>
        <button className="ja-out" onClick={onLogout} disabled={locked}>
          Log out
        </button>
      </nav>
      <main className="tpo-wrap">
        <h2 className="tpo-title">Student dashboard</h2>
        <p className="tpo-welcome">Welcome, {user.name}</p>
        <div className="tpo-tabs" role="tablist">
          {tabs.map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              disabled={locked && k !== "test"}
              className={tab === k ? "tpo-tab on" : "tpo-tab"}
              onClick={() => setTab(k)}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "profile" && (
          <Profile
            user={
              profile
                ? {
                    ...user,
                    department: profile.department || user.department,
                    rollNo: profile.rollNo || user.rollNo,
                    cgpa: profile.cgpa ?? user.cgpa,
                    phone: profile.phone || user.phone
                  }
                : user
            }
          />
        )}
        {tab === "resume" && (
          <ResumeTab
            profile={profile}
            onResumeTextReady={handleResumeTextReady}
            onAnalyzeJd={handleAnalyzeJd}
          />
        )}
        {tab === "drives" && <DrivesTab data={data} user={user} setData={setData} onAnalyzeJd={handleAnalyzeJd} />}
        {tab === "analyzer" && (
          <JdAnalyzerTab initialText={jdToAnalyze} resumeText={resumeText} onSwitchTab={setTab} />
        )}
        {tab === "test" && <Test user={user} results={results} addResult={addResult} setLocked={setLocked} />}
        {tab === "feedback" && <Feedback data={data} user={user} setData={setData} latest={latest} />}
        {tab === "materials" && <Materials data={data} />}
      </main>
    </div>
  );
}
