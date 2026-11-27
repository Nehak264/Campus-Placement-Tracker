// ==========================================================================
// REST API Client for Spring Boot Backend Connection
// Base URL: http://localhost:8080
// Features: Automatic JWT token injection, role detection, offline fallback
// ==========================================================================

const API_BASE = "http://localhost:8080/api";

export const getToken = () => localStorage.getItem("ja_token") || "";

export const setAuthData = (token, user) => {
  if (token) localStorage.setItem("ja_token", token);
  if (user) localStorage.setItem("ja_user", JSON.stringify(user));
};

export const clearAuthData = () => {
  localStorage.removeItem("ja_token");
  localStorage.removeItem("ja_user");
};

export const getSavedUser = () => {
  try {
    return JSON.parse(localStorage.getItem("ja_user") || "null");
  } catch {
    return null;
  }
};

const isNetworkFailure = (err) =>
  err &&
  (err.name === "TypeError" ||
    /failed to fetch|networkerror|load failed|network request failed/i.test(err.message || ""));

// Generic authenticated fetch wrapper
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const isJson = res.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      let errorMsg = (typeof data === "object" && (data.message || data.error)) || res.statusText || "Request failed";
      if (typeof data === "object" && data.errors && typeof data.errors === "object") {
        const details = Object.values(data.errors).filter(Boolean).join("; ");
        if (details) errorMsg = details;
      }
      const err = new Error(errorMsg);
      err.status = res.status;
      throw err;
    }

    return data;
  } catch (err) {
    throw err;
  }
}

// ------------------- Authentication APIs -------------------

export async function loginUser(emailOrName, password) {
  try {
    const res = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: emailOrName, password })
    });

    // res: { token, role, name, email }
    const roleLower = (res.role || "student").toLowerCase();
    const user = {
      name: res.name,
      email: res.email,
      role: roleLower,
      token: res.token,
      isLive: true
    };

    setAuthData(res.token, user);
    return { success: true, user, isLive: true };
  } catch (err) {
    return { success: false, error: err.message, isNetworkError: isNetworkFailure(err) };
  }
}

export async function fetchCurrentUser() {
  return await apiFetch("/auth/me");
}

export async function registerStudent(regData) {
  try {
    const roleUpper = (regData.role || "student").toUpperCase();
    const res = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: regData.name,
        email: regData.email,
        password: regData.password,
        role: roleUpper,
        rollNo: regData.rollNo || (roleUpper !== "STUDENT" ? "N/A" : `CSE-${Date.now().toString().slice(-4)}`),
        branch: regData.department || regData.branch || "Computer Science",
        gradYear: parseInt(regData.gradYear || "2025", 10),
        cgpa: parseFloat(regData.cgpa || "8.5"),
        activeBacklogs: parseInt(regData.activeBacklogs || "0", 10)
      })
    });
    return { success: true, data: res, isLive: true };
  } catch (err) {
    return { success: false, error: err.message, isNetworkError: isNetworkFailure(err) };
  }
}

// ------------------- Student APIs -------------------

export async function fetchStudentProfile() {
  try {
    return await apiFetch("/student/profile");
  } catch (err) {
    console.warn("Could not fetch live student profile:", err.message);
    return null;
  }
}

export async function fetchStudentDrives() {
  try {
    return await apiFetch("/student/drives");
  } catch (err) {
    console.warn("Could not fetch live student drives:", err.message);
    return null;
  }
}

export async function applyToDrive(driveId) {
  return await apiFetch(`/student/drives/${driveId}/apply`, {
    method: "POST"
  });
}

export async function cancelDriveApplication(driveId) {
  return await apiFetch(`/student/drives/${driveId}/cancel`, {
    method: "DELETE"
  });
}

// ------------------- TPC APIs (Verification) -------------------

export async function fetchTpcStudents(status = "PENDING") {
  try {
    return await apiFetch(`/tpc/students?status=${status}`);
  } catch (err) {
    console.warn("Could not fetch TPC students from backend:", err.message);
    return null;
  }
}

export async function approveStudent(studentId) {
  return await apiFetch(`/tpc/students/${studentId}/approve`, {
    method: "PUT"
  });
}

export async function rejectStudent(studentId, reason) {
  return await apiFetch(`/tpc/students/${studentId}/reject`, {
    method: "PUT",
    body: JSON.stringify({ reason })
  });
}

// ------------------- TPO APIs (Drives & Stats) -------------------

export async function fetchAllDrives() {
  try {
    return await apiFetch("/drives");
  } catch (err) {
    console.warn("Could not fetch drives from backend:", err.message);
    return null;
  }
}

export async function createDrive(driveData) {
  return await apiFetch("/tpo/drives", {
    method: "POST",
    body: JSON.stringify({
      company: driveData.company,
      role: driveData.role,
      jd: driveData.jd,
      dueDate: driveData.dueDate,
      visitDate: driveData.visitDate,
      ctc: parseFloat(driveData.ctc || "6.5"),
      minCgpa: parseFloat(driveData.minCgpa || "6.0"),
      maxBacklogs: parseInt(driveData.maxBacklogs || "0", 10)
    })
  });
}

export async function deleteDrive(driveId) {
  return await apiFetch(`/tpo/drives/${driveId}`, {
    method: "DELETE"
  });
}

// ------------------- Resume APIs -------------------

/**
 * Upload a resume file (PDF/DOC/DOCX) to the backend.
 * Uses FormData — does NOT set Content-Type (let browser set multipart boundary).
 */
export async function uploadResume(file) {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/student/resume`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = (typeof data === "object" && (data.message || data.error)) || res.statusText || "Upload failed";
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data; // { message, resumePath }
}

/**
 * Returns the full URL to download/view the student's resume (opens in new tab).
 * Authentication is passed as a query param so the browser can open it directly.
 */
export function getResumeViewUrl() {
  const token = getToken();
  return `${API_BASE}/student/resume?token=${token}`;
}
