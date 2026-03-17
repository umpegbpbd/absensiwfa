 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/app.js b/app.js
index 9df7e4b5bd00a2c3ca2b08f5b93e70d01303615b..573a763023815e75172b5557b7310626fa6db59d 100644
--- a/app.js
+++ b/app.js
@@ -1,390 +1,407 @@
-let state = {
-    currentType: "",
-    stream: null,
-    photo: null,
-    lat: null,
-    lng: null,
-    address: "Mencari lokasi...",
-    isSubmitting: false,
-    tokenValidated: false,
-    runtimeToken: ""
+const state = {
+  type: "",
+  stream: null,
+  photoBase64: "",
+  lat: null,
+  lng: null,
+  address: "Mendeteksi lokasi...",
+  tokenOk: false,
+  loading: false,
+  adminRows: []
 };
 
-const DEFAULT_SUBMIT_LABEL = "✓ Kirim Data";
-const TOKEN_STORAGE_KEY = "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";
+const TOKEN_STORAGE_KEY = "ABSENSI_GITHUB_TOKEN";
 
 window.addEventListener("DOMContentLoaded", () => {
-    startClock();
-    loadEmployees();
-    loadRuntimeToken();
-    showPage("dashboard");
+  initClock();
+  initEmployees();
+  restoreToken();
+  showPage("dashboard");
 });
 
-function startClock() {
-    setInterval(() => {
-        const now = new Date();
-        document.getElementById("clockDisplay").textContent = now.toLocaleTimeString("id-ID", { hour12: false }).replace(/\./g, ":");
-        document.getElementById("currentDate").textContent = now.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
-    }, 1000);
+function initClock() {
+  const tick = () => {
+    const now = new Date();
+    el("clock").textContent = now.toLocaleTimeString("id-ID", { hour12: false }).replace(/\./g, ":");
+    el("today").textContent = now.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
+  };
+  tick();
+  setInterval(tick, 1000);
 }
 
-function showPage(pageId) {
-    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
-    document.getElementById(`page-${pageId}`).classList.add("active");
-    if (pageId === "dashboard") stopCamera();
+function initEmployees() {
+  const select = el("employee");
+  select.innerHTML = '<option value="" disabled selected>-- Pilih Nama Anda --</option>';
+  EMPLOYEES.forEach((name) => {
+    const opt = document.createElement("option");
+    opt.value = name;
+    opt.textContent = name;
+    select.appendChild(opt);
+  });
 }
 
-function loadEmployees() {
-    const select = document.getElementById("employeeSelect");
-    const list = (typeof employees !== "undefined") ? employees : ["User Test"];
-    select.innerHTML = '<option value="" disabled selected>-- Pilih Nama Anda --</option>';
+function showPage(page) {
+  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
+  el(`page-${page}`).classList.add("active");
+  if (page === "dashboard") stopCamera();
+}
 
-    list.forEach((n) => {
-        const o = document.createElement("option");
-        o.value = n;
-        o.textContent = n;
-        select.appendChild(o);
-    });
+function restoreToken() {
+  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
+  const fromConfig = (CONFIG.TOKEN || "").trim();
+  if (stored) return;
+  if (fromConfig) localStorage.setItem(TOKEN_STORAGE_KEY, fromConfig);
 }
 
-function loadRuntimeToken() {
-    const fromStorage = localStorage.getItem(TOKEN_STORAGE_KEY) || "";
-    const fromConfig = (CONFIG?.TOKEN || "").trim();
+function getToken() {
+  return (localStorage.getItem(TOKEN_STORAGE_KEY) || CONFIG.TOKEN || "").trim();
+}
 
-    state.runtimeToken = fromStorage || fromConfig;
+function setToken(token) {
+  localStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
+  state.tokenOk = false;
 }
 
-function getRuntimeToken() {
-    return (state.runtimeToken || "").trim();
+function githubHeaders(json = false) {
+  const headers = {
+    Accept: "application/vnd.github+json",
+    "X-GitHub-Api-Version": "2022-11-28",
+    Authorization: `Bearer ${getToken()}`
+  };
+  if (json) headers["Content-Type"] = "application/json";
+  return headers;
 }
 
-function setRuntimeToken(token) {
-    state.runtimeToken = (token || "").trim();
-    if (state.runtimeToken) {
-        localStorage.setItem(TOKEN_STORAGE_KEY, state.runtimeToken);
-    }
+async function fetchTimeout(url, options = {}, timeout = 15000) {
+  const controller = new AbortController();
+  const id = setTimeout(() => controller.abort(), timeout);
+  try {
+    return await fetch(url, { ...options, signal: controller.signal });
+  } finally {
+    clearTimeout(id);
+  }
 }
 
-function clearRuntimeToken() {
-    state.runtimeToken = "";
-    state.tokenValidated = false;
-    localStorage.removeItem(TOKEN_STORAGE_KEY);
+function toB64Unicode(str) {
+  return btoa(unescape(encodeURIComponent(str)));
 }
 
-async function startCamera() {
-    const video = document.getElementById("cameraPreview");
-    state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: CONFIG.CAMERA_FACING_MODE }, audio: false });
-    video.srcObject = state.stream;
-    video.play();
+function fromB64Unicode(str) {
+  return decodeURIComponent(escape(atob(str)));
 }
 
-function stopCamera() {
-    if (state.stream) {
-        state.stream.getTracks().forEach((t) => t.stop());
-        state.stream = null;
-    }
+function errorMessage(status, fallback = "") {
+  if (status === 401) return "Token GitHub tidak valid / expired.";
+  if (status === 403) return "Token tidak punya izin menulis (repo / Contents RW).";
+  if (status === 404) return "Repo/path tidak ditemukan atau akses ditolak.";
+  if (status === 409) return "Konflik update data, silakan ulangi.";
+  return fallback || `HTTP ${status}`;
 }
 
-function capturePhoto() {
-    const v = document.getElementById("cameraPreview");
-    const c = document.getElementById("cameraCanvas");
-    c.width = v.videoWidth;
-    c.height = v.videoHeight;
+async function ensureToken() {
+  if (state.tokenOk) return;
+  const res = await fetchTimeout("https://api.github.com/user", { headers: githubHeaders() });
+  if (!res.ok) {
+    const detail = await res.json().catch(() => ({}));
+    throw new Error(errorMessage(res.status, detail.message));
+  }
+  state.tokenOk = true;
+}
 
-    const ctx = c.getContext("2d");
-    ctx.translate(c.width, 0);
-    ctx.scale(-1, 1);
-    ctx.drawImage(v, 0, 0);
+async function startAbsensi(type) {
+  if (!el("employee").value) {
+    alert("Pilih nama pegawai dulu.");
+    return;
+  }
 
-    state.photo = c.toDataURL("image/jpeg", CONFIG.IMAGE_QUALITY);
-    document.getElementById("capturedPhoto").src = state.photo;
-    document.getElementById("capturedPhoto").classList.remove("hidden");
-    v.classList.add("hidden");
-    document.getElementById("btnCapture").classList.add("hidden");
-    document.getElementById("postCaptureButtons").classList.remove("hidden");
-}
+  state.type = type;
+  showPage("absen");
+  resetCaptureUI();
 
-function retakePhoto() {
-    state.photo = null;
-    document.getElementById("capturedPhoto").classList.add("hidden");
-    document.getElementById("cameraPreview").classList.remove("hidden");
-    document.getElementById("btnCapture").classList.remove("hidden");
-    document.getElementById("postCaptureButtons").classList.add("hidden");
-}
-
-function getLocation() {
-    navigator.geolocation.getCurrentPosition(async (p) => {
-        state.lat = p.coords.latitude;
-        state.lng = p.coords.longitude;
-
-        try {
-            const res = await fetchWithTimeout(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${state.lat}&lon=${state.lng}`, {}, 10000);
-            const d = await res.json();
-            state.address = d.display_name ? d.display_name.split(",").slice(0, 3).join(",") : `${state.lat}, ${state.lng}`;
-        } catch {
-            state.address = `${state.lat}, ${state.lng}`;
-        }
-
-        document.getElementById("locationText").innerText = state.address;
-    }, () => {
-        state.address = "Lokasi tidak tersedia";
-        document.getElementById("locationText").innerText = state.address;
-    }, { enableHighAccuracy: true });
-}
-
-async function startAbsensi(t) {
-    if (!document.getElementById("employeeSelect").value) return alert("Pilih Nama!");
-
-    state.currentType = t;
-    showPage("absensi");
+  try {
     await startCamera();
-    getLocation();
+    detectLocation();
+  } catch (err) {
+    alert(`Kamera gagal: ${err.message}`);
+    showPage("dashboard");
+  }
 }
 
-async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
-    const controller = new AbortController();
-    const timeout = setTimeout(() => controller.abort(), timeoutMs);
-
-    try {
-        return await fetch(url, { ...options, signal: controller.signal });
-    } catch (error) {
-        if (error.name === "AbortError") throw new Error("Koneksi timeout. Cek internet lalu coba lagi.");
-        throw error;
-    } finally {
-        clearTimeout(timeout);
-    }
+async function startCamera() {
+  state.stream = await navigator.mediaDevices.getUserMedia({
+    video: { facingMode: CONFIG.CAMERA_FACING_MODE },
+    audio: false
+  });
+  const video = el("camera");
+  video.srcObject = state.stream;
+  await video.play();
 }
 
-function getGitHubHeaders(withJson = false) {
-    const token = getRuntimeToken();
-    const headers = {
-        Accept: "application/vnd.github+json",
-        "X-GitHub-Api-Version": "2022-11-28",
-        Authorization: `Bearer ${token}`
-    };
-
-    if (withJson) headers["Content-Type"] = "application/json";
-    return headers;
+function stopCamera() {
+  if (!state.stream) return;
+  state.stream.getTracks().forEach((t) => t.stop());
+  state.stream = null;
 }
 
-function parseGitHubError(status, message = "") {
-    if (status === 401) {
-        return "Token GitHub tidak valid / expired (Bad credentials).";
-    }
-    if (status === 403) {
-        return "Token tidak punya izin menulis. Scope minimal: repo (classic) atau Contents: Read & Write (fine-grained).";
-    }
-    if (status === 404) {
-        return "Repo/path tidak ditemukan atau token tidak punya akses repo.";
-    }
-    if (status === 409) {
-        return "Terjadi konflik update data.";
+function detectLocation() {
+  navigator.geolocation.getCurrentPosition(async (pos) => {
+    state.lat = pos.coords.latitude;
+    state.lng = pos.coords.longitude;
+    try {
+      const r = await fetchTimeout(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${state.lat}&lon=${state.lng}`);
+      const j = await r.json();
+      state.address = j.display_name || `${state.lat}, ${state.lng}`;
+    } catch {
+      state.address = `${state.lat}, ${state.lng}`;
     }
-    return message || `Gagal menyimpan ke GitHub (HTTP ${status}).`;
+    el("locationText").textContent = state.address;
+  }, () => {
+    state.address = "Lokasi tidak tersedia";
+    el("locationText").textContent = state.address;
+  }, { enableHighAccuracy: true });
 }
 
-function decodeBase64Unicode(content) {
-    return decodeURIComponent(escape(atob(content)));
+function capturePhoto() {
+  const v = el("camera");
+  const c = el("canvas");
+  c.width = v.videoWidth;
+  c.height = v.videoHeight;
+  const ctx = c.getContext("2d");
+  ctx.translate(c.width, 0);
+  ctx.scale(-1, 1);
+  ctx.drawImage(v, 0, 0);
+  state.photoBase64 = c.toDataURL("image/jpeg", CONFIG.IMAGE_QUALITY);
+
+  const photo = el("photo");
+  photo.src = state.photoBase64;
+
+  el("camera").classList.add("hidden");
+  photo.classList.remove("hidden");
+  el("btnCapture").classList.add("hidden");
+  el("postCapture").classList.remove("hidden");
 }
 
-function encodeBase64Unicode(content) {
-    return btoa(unescape(encodeURIComponent(content)));
+function retakePhoto() {
+  state.photoBase64 = "";
+  resetCaptureUI();
 }
 
-function slugifyName(name) {
-    return name
-        .toLowerCase()
-        .normalize("NFD")
-        .replace(/[\u0300-\u036f]/g, "")
-        .replace(/[^a-z0-9]+/g, "-")
-        .replace(/^-+|-+$/g, "") || "pegawai";
+function resetCaptureUI() {
+  el("camera").classList.remove("hidden");
+  el("photo").classList.add("hidden");
+  el("btnCapture").classList.remove("hidden");
+  el("postCapture").classList.add("hidden");
 }
 
-function buildPayload() {
-    return {
-        nama: document.getElementById("employeeSelect").value,
-        tanggal: new Date().toLocaleDateString("id-ID"),
-        jam: new Date().toLocaleTimeString("id-ID"),
-        tipe: state.currentType.toUpperCase(),
-        status: (state.currentType === "masuk") ? (new Date().getHours() < 8 ? "Hadir" : "Terlambat") : "Pulang",
-        lokasi: state.address,
-        foto: state.photo,
-        createdAt: new Date().toISOString()
-    };
+function cancelAbsensi() {
+  stopCamera();
+  location.reload();
 }
 
-function getAggregateUrl() {
-    return `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.DATA_FILE}`;
+function buildPayload() {
+  const now = new Date();
+  return {
+    nama: el("employee").value,
+    tanggal: now.toLocaleDateString("id-ID"),
+    jam: now.toLocaleTimeString("id-ID"),
+    tipe: state.type.toUpperCase(),
+    status: state.type === "masuk" ? (now.getHours() < 8 ? "Hadir" : "Terlambat") : "Pulang",
+    lokasi: state.address,
+    latitude: state.lat,
+    longitude: state.lng,
+    foto: state.photoBase64,
+    createdAt: now.toISOString()
+  };
 }
 
-function getRecordUrl(payload) {
-    const now = new Date();
-    const y = now.getFullYear();
-    const m = String(now.getMonth() + 1).padStart(2, "0");
-    const d = String(now.getDate()).padStart(2, "0");
-    const ms = String(now.getTime());
-    const rand = Math.random().toString(36).slice(2, 8);
-    const safeName = slugifyName(payload.nama);
-    const path = `data/records/${y}/${m}/${d}/${ms}-${safeName}-${rand}.json`;
-    return `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${path}`;
-}
-
-async function validateGithubToken() {
-    if (state.tokenValidated) return;
-
-    const res = await fetchWithTimeout("https://api.github.com/user", {
-        headers: getGitHubHeaders(false)
-    }, 15000);
-
-    if (!res.ok) {
-        const err = await res.json().catch(() => ({}));
-        throw new Error(parseGitHubError(res.status, err.message));
-    }
+function aggregateUrl() {
+  return `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.DATA_FILE}`;
+}
 
-    state.tokenValidated = true;
+function recordUrl(payload) {
+  const now = new Date();
+  const y = now.getFullYear();
+  const m = String(now.getMonth() + 1).padStart(2, "0");
+  const d = String(now.getDate()).padStart(2, "0");
+  const slug = payload.nama.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "pegawai";
+  const path = `data/records/${y}/${m}/${d}/${Date.now()}-${slug}.json`;
+  return `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${path}`;
 }
 
-function askTokenIfNeeded(errorMessage) {
-    if (!errorMessage.includes("Bad credentials") && !errorMessage.includes("tidak valid") && !errorMessage.includes("expired")) {
-        return false;
-    }
+async function saveRecord(payload) {
+  const res = await fetchTimeout(recordUrl(payload), {
+    method: "PUT",
+    headers: githubHeaders(true),
+    body: JSON.stringify({
+      message: `Absensi record: ${payload.nama}`,
+      content: toB64Unicode(JSON.stringify(payload, null, 2)),
+      branch: CONFIG.BRANCH
+    })
+  }, 20000);
+
+  if (!res.ok) {
+    const detail = await res.json().catch(() => ({}));
+    throw new Error(errorMessage(res.status, detail.message));
+  }
+}
 
-    const token = prompt("Token GitHub invalid/expired. Paste token baru (scope: repo / Contents RW):");
-    if (!token || !token.trim()) return false;
-
-    setRuntimeToken(token.trim());
-    state.tokenValidated = false;
-    return true;
-}
-
-async function saveRecordFile(payload) {
-    const recordUrl = getRecordUrl(payload);
-    const response = await fetchWithTimeout(recordUrl, {
-        method: "PUT",
-        headers: getGitHubHeaders(true),
-        body: JSON.stringify({
-            message: `Absensi record: ${payload.nama}`,
-            content: encodeBase64Unicode(JSON.stringify(payload, null, 2)),
-            branch: CONFIG.BRANCH
-        })
-    }, 20000);
-
-    if (!response.ok) {
-        const err = await response.json().catch(() => ({}));
-        throw new Error(parseGitHubError(response.status, err.message));
-    }
+async function readAggregate() {
+  const res = await fetchTimeout(aggregateUrl(), { headers: githubHeaders() });
+  if (res.status === 404) return { sha: "", rows: [] };
+  if (!res.ok) {
+    const detail = await res.json().catch(() => ({}));
+    throw new Error(errorMessage(res.status, detail.message));
+  }
+  const file = await res.json();
+  return { sha: file.sha, rows: JSON.parse(fromB64Unicode(file.content)) };
 }
 
-async function getAggregateData(url) {
-    const resGet = await fetchWithTimeout(url, {
-        headers: getGitHubHeaders(false)
-    }, 15000);
+async function writeAggregate(rows, sha, name) {
+  const res = await fetchTimeout(aggregateUrl(), {
+    method: "PUT",
+    headers: githubHeaders(true),
+    body: JSON.stringify({
+      message: `Absen: ${name}`,
+      content: toB64Unicode(JSON.stringify(rows, null, 2)),
+      ...(sha ? { sha } : {}),
+      branch: CONFIG.BRANCH
+    })
+  }, 20000);
+
+  if (!res.ok) {
+    const detail = await res.json().catch(() => ({}));
+    throw new Error(errorMessage(res.status, detail.message));
+  }
+}
 
-    if (resGet.ok) {
-        const file = await resGet.json();
-        return {
-            sha: file.sha,
-            rows: JSON.parse(decodeBase64Unicode(file.content))
-        };
+async function saveAggregateRetry(payload, retries = 3) {
+  for (let i = 0; i <= retries; i += 1) {
+    try {
+      const { sha, rows } = await readAggregate();
+      rows.push(payload);
+      await writeAggregate(rows, sha, payload.nama);
+      return;
+    } catch (err) {
+      const msg = String(err.message || "");
+      if (!msg.includes("Konflik") || i === retries) throw err;
+      await new Promise((r) => setTimeout(r, 500 + i * 500));
     }
-
-    if (resGet.status === 404) return { sha: "", rows: [] };
-
-    const err = await resGet.json().catch(() => ({}));
-    throw new Error(parseGitHubError(resGet.status, err.message));
+  }
 }
 
-async function putAggregateData(url, rows, sha, payloadName) {
-    const resPut = await fetchWithTimeout(url, {
-        method: "PUT",
-        headers: getGitHubHeaders(true),
-        body: JSON.stringify({
-            message: `Absen: ${payloadName}`,
-            content: encodeBase64Unicode(JSON.stringify(rows, null, 2)),
-            ...(sha ? { sha } : {}),
-            branch: CONFIG.BRANCH
-        })
-    }, 20000);
-
-    if (!resPut.ok) {
-        const err = await resPut.json().catch(() => ({}));
-        throw new Error(parseGitHubError(resPut.status, err.message));
-    }
+async function submitAbsensi() {
+  if (state.loading) return;
+  if (!state.photoBase64) {
+    alert("Ambil foto dulu sebelum kirim.");
+    return;
+  }
+
+  const token = getToken();
+  if (!token) {
+    const fromPrompt = prompt("Token GitHub belum ada. Masukkan token:");
+    if (!fromPrompt) return;
+    setToken(fromPrompt);
+  }
+
+  state.loading = true;
+  el("btnSubmit").disabled = true;
+  el("btnSubmit").textContent = "⏳ Mengirim...";
+
+  const payload = buildPayload();
+
+  try {
+    await ensureToken();
+    await saveRecord(payload);
+    await saveAggregateRetry(payload);
+    alert("✅ Absensi berhasil disimpan ke GitHub.");
+    location.reload();
+  } catch (err) {
+    alert(`❌ ${err.message}`);
+  } finally {
+    state.loading = false;
+    el("btnSubmit").disabled = false;
+    el("btnSubmit").textContent = "✓ Kirim Data";
+  }
 }
 
-async function saveAggregateWithRetry(payload, retries = 3) {
-    const url = getAggregateUrl();
-
-    for (let attempt = 0; attempt <= retries; attempt += 1) {
-        try {
-            const { sha, rows } = await getAggregateData(url);
-            rows.push(payload);
-            await putAggregateData(url, rows, sha, payload.nama);
-            return;
-        } catch (err) {
-            const msg = String(err.message || "").toLowerCase();
-            const isConflict = msg.includes("konflik") || msg.includes("409");
-            if (isConflict && attempt < retries) {
-                await new Promise((resolve) => setTimeout(resolve, 700 + (attempt * 500)));
-                continue;
-            }
-            throw err;
-        }
-    }
+function adminLogin() {
+  const pass = el("adminPassword").value;
+  if (pass !== CONFIG.ADMIN_PASSWORD) {
+    alert("Password admin salah.");
+    return;
+  }
+  el("adminLogin").classList.add("hidden");
+  el("adminPanel").classList.remove("hidden");
+  loadAdminTable();
 }
 
-async function saveAbsensi(payload) {
-    await validateGithubToken();
-    await saveRecordFile(payload);
-    await saveAggregateWithRetry(payload, 3);
+function esc(s = "") {
+  return String(s)
+    .replaceAll("&", "&amp;")
+    .replaceAll("<", "&lt;")
+    .replaceAll(">", "&gt;")
+    .replaceAll('"', "&quot;")
+    .replaceAll("'", "&#39;");
 }
 
-async function submitAbsensi() {
-    const btn = document.getElementById("btnSubmitAbsen");
+async function loadAdminTable() {
+  const tbody = el("adminTableBody");
+  tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Memuat...</td></tr>';
 
-    if (state.isSubmitting) return;
-    if (!state.photo) return alert("Ambil foto dulu sebelum kirim.");
-    if (!getRuntimeToken() || getRuntimeToken().includes("GITHUB_TOKEN")) {
-        return alert("Token GitHub belum terpasang. Isi CONFIG.TOKEN atau simpan token di browser ini.");
-    }
+  try {
+    await ensureToken();
+    const { rows } = await readAggregate();
+    state.adminRows = rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
 
-    state.isSubmitting = true;
-    btn.disabled = true;
-    btn.innerText = "⏳ Sedang Mengirim...";
+    if (!state.adminRows.length) {
+      tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Belum ada data.</td></tr>';
+      return;
+    }
 
-    const payload = buildPayload();
+    tbody.innerHTML = state.adminRows.map((r) => {
+      const photo = r.foto
+        ? `<img class="photo-thumb mx-auto" src="${r.foto}" alt="foto" onclick="window.open('${r.foto}','_blank')">`
+        : "-";
+      return `
+        <tr class="border-b border-slate-100">
+          <td class="p-3">${esc(r.nama)}</td>
+          <td class="p-3">${esc(`${r.tanggal || ""} ${r.jam || ""}`)}</td>
+          <td class="p-3">${esc(r.tipe)}</td>
+          <td class="p-3">${esc(r.status)}</td>
+          <td class="p-3 text-center">${photo}</td>
+        </tr>`;
+    }).join("");
+  } catch (err) {
+    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-600">${esc(err.message)}</td></tr>`;
+  }
+}
 
-    try {
-        await saveAbsensi(payload);
-        alert("✅ Absensi berhasil disimpan ke GitHub.");
-        location.reload();
-    } catch (e) {
-        const canRetryWithNewToken = askTokenIfNeeded(String(e.message || ""));
-
-        if (canRetryWithNewToken) {
-            try {
-                await saveAbsensi(payload);
-                alert("✅ Absensi berhasil disimpan ke GitHub.");
-                location.reload();
-                return;
-            } catch (retryError) {
-                console.error(retryError);
-                if (String(retryError.message || "").includes("tidak valid")) clearRuntimeToken();
-                alert(`❌ Error: ${retryError.message}`);
-            }
-        } else {
-            console.error(e);
-            if (String(e.message || "").includes("tidak valid")) clearRuntimeToken();
-            alert(`❌ Error: ${e.message}`);
-        }
-    } finally {
-        state.isSubmitting = false;
-        btn.disabled = false;
-        btn.innerText = DEFAULT_SUBMIT_LABEL;
-    }
+function exportToCSV() {
+  if (!state.adminRows.length) {
+    alert("Data kosong.");
+    return;
+  }
+
+  const headers = ["Nama", "Tanggal", "Jam", "Tipe", "Status", "Lokasi", "Latitude", "Longitude", "CreatedAt"];
+  const rows = state.adminRows.map((r) => [
+    r.nama || "", r.tanggal || "", r.jam || "", r.tipe || "", r.status || "", r.lokasi || "", r.latitude ?? "", r.longitude ?? "", r.createdAt || ""
+  ]);
+
+  const csv = [headers, ...rows]
+    .map((line) => line.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
+    .join("\n");
+
+  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
+  const a = document.createElement("a");
+  const url = URL.createObjectURL(blob);
+  a.href = url;
+  a.download = `rekap-absensi-${new Date().toISOString().slice(0, 10)}.csv`;
+  document.body.appendChild(a);
+  a.click();
+  document.body.removeChild(a);
+  URL.revokeObjectURL(url);
 }
 
-function cancelAbsensi() {
-    stopCamera();
-    location.reload();
+function el(id) {
+  return document.getElementById(id);
 }
 
EOF
)
