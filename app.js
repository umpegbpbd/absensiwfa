 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/app.js b/app.js
index ce2882d8e6db0c85e140f882eb4cd6d6aa1df4ac..9aef942d499ef8ef81ea43edc7ef42036effd5f3 100644
--- a/app.js
+++ b/app.js
@@ -1,140 +1,331 @@
-let state = { currentType: "", stream: null, photo: null, lat: null, lng: null, address: "Mencari lokasi..." };
+let state = {
+    currentType: "",
+    stream: null,
+    photo: null,
+    lat: null,
+    lng: null,
+    address: "Mencari lokasi...",
+    isSubmitting: false,
+    tokenValidated: false
+};
+
+const DEFAULT_SUBMIT_LABEL = "✓ Kirim Data";
 
-// ================= INITIALIZATION =================
 window.addEventListener("DOMContentLoaded", () => {
     startClock();
     loadEmployees();
     showPage("dashboard");
 });
 
 function startClock() {
     setInterval(() => {
         const now = new Date();
-        document.getElementById("clockDisplay").textContent = now.toLocaleTimeString("id-ID", { hour12: false }).replace(/\./g, ':');
+        document.getElementById("clockDisplay").textContent = now.toLocaleTimeString("id-ID", { hour12: false }).replace(/\./g, ":");
         document.getElementById("currentDate").textContent = now.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
     }, 1000);
 }
 
 function showPage(pageId) {
-    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
-    document.getElementById("page-" + pageId).classList.add("active");
+    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
+    document.getElementById(`page-${pageId}`).classList.add("active");
     if (pageId === "dashboard") stopCamera();
 }
 
 function loadEmployees() {
     const select = document.getElementById("employeeSelect");
     const list = (typeof employees !== "undefined") ? employees : ["User Test"];
     select.innerHTML = '<option value="" disabled selected>-- Pilih Nama Anda --</option>';
-    list.forEach(n => { const o = document.createElement("option"); o.value = n; o.textContent = n; select.appendChild(o); });
+
+    list.forEach((n) => {
+        const o = document.createElement("option");
+        o.value = n;
+        o.textContent = n;
+        select.appendChild(o);
+    });
 }
 
-// ================= CAMERA & GPS =================
 async function startCamera() {
     const video = document.getElementById("cameraPreview");
     state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: CONFIG.CAMERA_FACING_MODE }, audio: false });
     video.srcObject = state.stream;
     video.play();
 }
 
-function stopCamera() { if (state.stream) state.stream.getTracks().forEach(t => t.stop()); }
+function stopCamera() {
+    if (state.stream) {
+        state.stream.getTracks().forEach((t) => t.stop());
+        state.stream = null;
+    }
+}
 
 function capturePhoto() {
     const v = document.getElementById("cameraPreview");
     const c = document.getElementById("cameraCanvas");
-    c.width = v.videoWidth; c.height = v.videoHeight;
+    c.width = v.videoWidth;
+    c.height = v.videoHeight;
+
     const ctx = c.getContext("2d");
-    ctx.translate(c.width, 0); ctx.scale(-1, 1); ctx.drawImage(v, 0, 0);
+    ctx.translate(c.width, 0);
+    ctx.scale(-1, 1);
+    ctx.drawImage(v, 0, 0);
+
     state.photo = c.toDataURL("image/jpeg", CONFIG.IMAGE_QUALITY);
     document.getElementById("capturedPhoto").src = state.photo;
     document.getElementById("capturedPhoto").classList.remove("hidden");
     v.classList.add("hidden");
     document.getElementById("btnCapture").classList.add("hidden");
     document.getElementById("postCaptureButtons").classList.remove("hidden");
 }
 
 function retakePhoto() {
+    state.photo = null;
     document.getElementById("capturedPhoto").classList.add("hidden");
     document.getElementById("cameraPreview").classList.remove("hidden");
     document.getElementById("btnCapture").classList.remove("hidden");
     document.getElementById("postCaptureButtons").classList.add("hidden");
 }
 
 function getLocation() {
     navigator.geolocation.getCurrentPosition(async (p) => {
-        state.lat = p.coords.latitude; state.lng = p.coords.longitude;
-        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${state.lat}&lon=${state.lng}`);
-        const d = await res.json();
-        state.address = d.display_name.split(',').slice(0, 3).join(',');
+        state.lat = p.coords.latitude;
+        state.lng = p.coords.longitude;
+        try {
+            const res = await fetchWithTimeout(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${state.lat}&lon=${state.lng}`, {}, 10000);
+            const d = await res.json();
+            state.address = d.display_name ? d.display_name.split(",").slice(0, 3).join(",") : `${state.lat}, ${state.lng}`;
+        } catch {
+            state.address = `${state.lat}, ${state.lng}`;
+        }
+        document.getElementById("locationText").innerText = state.address;
+    }, () => {
+        state.address = "Lokasi tidak tersedia";
         document.getElementById("locationText").innerText = state.address;
-    }, null, { enableHighAccuracy: true });
+    }, { enableHighAccuracy: true });
 }
 
 async function startAbsensi(t) {
     if (!document.getElementById("employeeSelect").value) return alert("Pilih Nama!");
+
     state.currentType = t;
     showPage("absensi");
     await startCamera();
     getLocation();
 }
 
-// ================= GITHUB ENGINE (ANTI-LAG) =================
-async function submitAbsensi() {
-    const btn = document.getElementById("btnSubmitAbsen");
-    btn.disabled = true;
-    btn.innerText = "⏳ Sedang Mengirim...";
+async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
+    const controller = new AbortController();
+    const timeout = setTimeout(() => controller.abort(), timeoutMs);
+
+    try {
+        return await fetch(url, { ...options, signal: controller.signal });
+    } catch (error) {
+        if (error.name === "AbortError") throw new Error("Koneksi timeout. Cek internet lalu coba lagi.");
+        throw error;
+    } finally {
+        clearTimeout(timeout);
+    }
+}
+
+function getGitHubHeaders(withJson = false) {
+    const token = (CONFIG.TOKEN || "").trim();
+    const headers = {
+        Accept: "application/vnd.github+json",
+        "X-GitHub-Api-Version": "2022-11-28",
+        Authorization: `Bearer ${token}`
+    };
 
-    const payload = {
+    if (withJson) headers["Content-Type"] = "application/json";
+    return headers;
+}
+
+function parseGitHubError(status, message = "") {
+    if (status === 401) {
+        return "Token GitHub tidak valid / expired (Bad credentials). Buat token baru lalu update CONFIG.TOKEN.";
+    }
+    if (status === 403) {
+        return "Token tidak punya izin menulis. Pastikan scope: repo (classic) atau Contents: Read & Write (fine-grained).";
+    }
+    if (status === 404) {
+        return "Repo/path tidak ditemukan atau token tidak punya akses repo tersebut.";
+    }
+    if (status === 409) {
+        return "Terjadi konflik update data. Sedang retry otomatis...";
+    }
+    return message || `Gagal menyimpan ke GitHub (HTTP ${status}).`;
+}
+
+function decodeBase64Unicode(content) {
+    return decodeURIComponent(escape(atob(content)));
+}
+
+function encodeBase64Unicode(content) {
+    return btoa(unescape(encodeURIComponent(content)));
+}
+
+function slugifyName(name) {
+    return name
+        .toLowerCase()
+        .normalize("NFD")
+        .replace(/[\u0300-\u036f]/g, "")
+        .replace(/[^a-z0-9]+/g, "-")
+        .replace(/^-+|-+$/g, "") || "pegawai";
+}
+
+function buildPayload() {
+    return {
         nama: document.getElementById("employeeSelect").value,
         tanggal: new Date().toLocaleDateString("id-ID"),
         jam: new Date().toLocaleTimeString("id-ID"),
         tipe: state.currentType.toUpperCase(),
-        status: (state.currentType === 'masuk') ? (new Date().getHours() < 8 ? "Hadir" : "Terlambat") : "Pulang",
+        status: (state.currentType === "masuk") ? (new Date().getHours() < 8 ? "Hadir" : "Terlambat") : "Pulang",
         lokasi: state.address,
-        foto: state.photo
+        foto: state.photo,
+        createdAt: new Date().toISOString()
     };
+}
 
-    const url = `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.DATA_FILE}`;
+function getAggregateUrl() {
+    return `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.DATA_FILE}`;
+}
 
-    try {
-        // 1. Ambil file SHA terbaru
-        const resGet = await fetch(url, { headers: { "Authorization": `token ${CONFIG.TOKEN}`, "Accept": "application/vnd.github.v3+json" } });
-        
-        let sha = "";
-        let currentData = [];
-
-        if (resGet.ok) {
-            const file = await resGet.json();
-            sha = file.sha;
-            currentData = JSON.parse(decodeURIComponent(escape(atob(file.content))));
-        }
+function getRecordUrl(payload) {
+    const now = new Date();
+    const y = now.getFullYear();
+    const m = String(now.getMonth() + 1).padStart(2, "0");
+    const d = String(now.getDate()).padStart(2, "0");
+    const ms = String(now.getTime());
+    const rand = Math.random().toString(36).slice(2, 8);
+    const safeName = slugifyName(payload.nama);
+    const path = `data/records/${y}/${m}/${d}/${ms}-${safeName}-${rand}.json`;
+    return `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${path}`;
+}
 
-        // 2. Tambah Data Baru
-        currentData.push(payload);
-
-        // 3. Kirim Balik
-        const resPut = await fetch(url, {
-            method: "PUT",
-            headers: { "Authorization": `token ${CONFIG.TOKEN}`, "Content-Type": "application/json" },
-            body: JSON.stringify({
-                message: `Absen: ${payload.nama}`,
-                content: btoa(unescape(encodeURIComponent(JSON.stringify(currentData, null, 2)))),
-                sha: sha
-            })
-        });
-
-        if (resPut.ok) {
-            alert("✅ Absensi Berhasil Disimpan!");
-            location.reload();
-        } else {
-            const err = await resPut.json();
-            throw new Error(err.message);
+async function validateGithubToken() {
+    if (state.tokenValidated) return;
+
+    const res = await fetchWithTimeout("https://api.github.com/user", {
+        headers: getGitHubHeaders(false)
+    }, 15000);
+
+    if (!res.ok) {
+        const err = await res.json().catch(() => ({}));
+        throw new Error(parseGitHubError(res.status, err.message));
+    }
+
+    state.tokenValidated = true;
+}
+
+async function saveRecordFile(payload) {
+    const recordUrl = getRecordUrl(payload);
+    const response = await fetchWithTimeout(recordUrl, {
+        method: "PUT",
+        headers: getGitHubHeaders(true),
+        body: JSON.stringify({
+            message: `Absensi record: ${payload.nama}`,
+            content: encodeBase64Unicode(JSON.stringify(payload, null, 2)),
+            branch: CONFIG.BRANCH
+        })
+    }, 20000);
+
+    if (!response.ok) {
+        const err = await response.json().catch(() => ({}));
+        throw new Error(parseGitHubError(response.status, err.message));
+    }
+}
+
+async function getAggregateData(url) {
+    const resGet = await fetchWithTimeout(url, {
+        headers: getGitHubHeaders(false)
+    });
+
+    if (resGet.ok) {
+        const file = await resGet.json();
+        return {
+            sha: file.sha,
+            rows: JSON.parse(decodeBase64Unicode(file.content))
+        };
+    }
+
+    if (resGet.status === 404) return { sha: "", rows: [] };
+
+    const err = await resGet.json().catch(() => ({}));
+    throw new Error(parseGitHubError(resGet.status, err.message));
+}
+
+async function putAggregateData(url, rows, sha, payloadName) {
+    const resPut = await fetchWithTimeout(url, {
+        method: "PUT",
+        headers: getGitHubHeaders(true),
+        body: JSON.stringify({
+            message: `Absen: ${payloadName}`,
+            content: encodeBase64Unicode(JSON.stringify(rows, null, 2)),
+            ...(sha ? { sha } : {}),
+            branch: CONFIG.BRANCH
+        })
+    }, 20000);
+
+    if (!resPut.ok) {
+        const err = await resPut.json().catch(() => ({}));
+        throw new Error(parseGitHubError(resPut.status, err.message));
+    }
+}
+
+async function saveAggregateWithRetry(payload, retries = 3) {
+    const url = getAggregateUrl();
+
+    for (let attempt = 0; attempt <= retries; attempt += 1) {
+        try {
+            const { sha, rows } = await getAggregateData(url);
+            rows.push(payload);
+            await putAggregateData(url, rows, sha, payload.nama);
+            return;
+        } catch (err) {
+            const isConflict = typeof err.message === "string" && err.message.toLowerCase().includes("konflik");
+            if (isConflict && attempt < retries) {
+                await new Promise((resolve) => setTimeout(resolve, 700 + (attempt * 500)));
+                continue;
+            }
+            throw err;
         }
+    }
+}
+
+async function submitAbsensi() {
+    const btn = document.getElementById("btnSubmitAbsen");
+
+    if (state.isSubmitting) return;
+    if (!state.photo) return alert("Ambil foto dulu sebelum kirim.");
+    if (!CONFIG?.TOKEN || CONFIG.TOKEN.includes("GITHUB_TOKEN")) return alert("Token GitHub di config.js belum diisi.");
+
+    state.isSubmitting = true;
+    btn.disabled = true;
+    btn.innerText = "⏳ Sedang Mengirim...";
+
+    const payload = buildPayload();
+
+    try {
+        // 1) Validasi token sekali
+        await validateGithubToken();
+
+        // 2) Simpan record unik dulu (anti bentrok antar user)
+        await saveRecordFile(payload);
+
+        // 3) Update file rekap utama (tetap dipakai admin/table lama)
+        await saveAggregateWithRetry(payload, 3);
+
+        alert("✅ Absensi berhasil disimpan ke GitHub.");
+        location.reload();
     } catch (e) {
         console.error(e);
-        alert("❌ Error: " + e.message + "\n\nPastikan Token GitHub benar & Repositori Private.");
+        alert(`❌ Error: ${e.message}`);
+    } finally {
+        state.isSubmitting = false;
         btn.disabled = false;
-        btn.innerText = "Coba Kirim Lagi";
+        btn.innerText = DEFAULT_SUBMIT_LABEL;
     }
 }
 
-function cancelAbsensi() { stopCamera(); location.reload(); }
+function cancelAbsensi() {
+    stopCamera();
+    location.reload();
+}
 
EOF
)
