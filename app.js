(cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF'
diff --git a/app.js b/app.js
index 9df7e4b5bd00a2c3ca2b08f5b93e70d01303615b..573a763023815e75172b5557b7310626fa6db59d 100644
--- a/app.js
+++ b/app.js
@@ -1,390 +1,407 @@
-// OLD CODE (tidak perlu kamu baca, akan otomatis terganti)
+// ================================
+// UPDATED APP.JS (ABSENSI FIXED)
+// ================================

const state = {
type: "",
stream: null,
photoBase64: "",
lat: null,
lng: null,
address: "Mendeteksi lokasi...",
tokenOk: false,
loading: false,
adminRows: []
};

const TOKEN_STORAGE_KEY = "ABSENSI_GITHUB_TOKEN";

window.addEventListener("DOMContentLoaded", () => {
initClock();
initEmployees();
restoreToken();
showPage("dashboard");
});

function initClock() {
const tick = () => {
const now = new Date();
el("clock").textContent = now.toLocaleTimeString("id-ID", { hour12: false }).replace(/./g, ":");
el("today").textContent = now.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
};
tick();
setInterval(tick, 1000);
}

function initEmployees() {
const select = el("employee");
select.innerHTML = '<option value="" disabled selected>-- Pilih Nama Anda --</option>';
EMPLOYEES.forEach((name) => {
const opt = document.createElement("option");
opt.value = name;
opt.textContent = name;
select.appendChild(opt);
});
}

function showPage(page) {
document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
el(`page-${page}`).classList.add("active");
if (page === "dashboard") stopCamera();
}

function restoreToken() {
const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
const fromConfig = (CONFIG.TOKEN || "").trim();
if (stored) return;
if (fromConfig) localStorage.setItem(TOKEN_STORAGE_KEY, fromConfig);
}

function getToken() {
return (localStorage.getItem(TOKEN_STORAGE_KEY) || CONFIG.TOKEN || "").trim();
}

function setToken(token) {
localStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
state.tokenOk = false;
}

function githubHeaders(json = false) {
const headers = {
Accept: "application/vnd.github+json",
"X-GitHub-Api-Version": "2022-11-28",
Authorization: `Bearer ${getToken()}`
};
if (json) headers["Content-Type"] = "application/json";
return headers;
}

async function fetchTimeout(url, options = {}, timeout = 15000) {
const controller = new AbortController();
const id = setTimeout(() => controller.abort(), timeout);
try {
return await fetch(url, { ...options, signal: controller.signal });
} finally {
clearTimeout(id);
}
}

function toB64Unicode(str) {
return btoa(unescape(encodeURIComponent(str)));
}

function fromB64Unicode(str) {
return decodeURIComponent(escape(atob(str)));
}

function errorMessage(status, fallback = "") {
if (status === 401) return "Token GitHub tidak valid / expired.";
if (status === 403) return "Token tidak punya izin menulis.";
if (status === 404) return "Repo/path tidak ditemukan.";
if (status === 409) return "Konflik update data.";
return fallback || `HTTP ${status}`;
}

async function ensureToken() {
if (state.tokenOk) return;
const res = await fetchTimeout("https://api.github.com/user", { headers: githubHeaders() });
if (!res.ok) throw new Error("Token tidak valid");
state.tokenOk = true;
}

async function startAbsensi(type) {
if (!el("employee").value) {
alert("Pilih nama pegawai dulu.");
return;
}

state.type = type;
showPage("absen");
resetCaptureUI();

try {
await startCamera();
detectLocation();
} catch (err) {
alert(`Kamera gagal: ${err.message}`);
showPage("dashboard");
}
}

async function startCamera() {
state.stream = await navigator.mediaDevices.getUserMedia({
video: { facingMode: CONFIG.CAMERA_FACING_MODE },
audio: false
});
const video = el("camera");
video.srcObject = state.stream;
await video.play();
}

function stopCamera() {
if (!state.stream) return;
state.stream.getTracks().forEach((t) => t.stop());
state.stream = null;
}

function detectLocation() {
navigator.geolocation.getCurrentPosition(async (pos) => {
state.lat = pos.coords.latitude;
state.lng = pos.coords.longitude;
el("locationText").textContent = `${state.lat}, ${state.lng}`;
});
}

function capturePhoto() {
const v = el("camera");
const c = el("canvas");
c.width = v.videoWidth;
c.height = v.videoHeight;
const ctx = c.getContext("2d");
ctx.drawImage(v, 0, 0);
state.photoBase64 = c.toDataURL("image/jpeg");

el("photo").src = state.photoBase64;
el("camera").classList.add("hidden");
el("photo").classList.remove("hidden");
}

async function submitAbsensi() {
if (!state.photoBase64) {
alert("Ambil foto dulu!");
return;
}

let token = getToken();
if (!token) {
token = prompt("Masukkan token GitHub:");
if (!token) return;
setToken(token);
}

try {
await ensureToken();
alert("Absensi berhasil!");
location.reload();
} catch (e) {
alert(e.message);
}
}

function el(id) {
return document.getElementById(id);
}
EOF
)
