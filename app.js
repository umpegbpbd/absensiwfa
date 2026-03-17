const state = {
type: "",
stream: null,
photo: "",
};

window.addEventListener("DOMContentLoaded", () => {
initClock();
initEmployees();
showPage("dashboard");
});

/* ================= CLOCK ================= */
function initClock() {
setInterval(() => {
const now = new Date();
document.getElementById("clock").textContent =
now.toLocaleTimeString("id-ID");

```
document.getElementById("today").textContent =
  now.toLocaleDateString("id-ID");
```

}, 1000);
}

/* ================= EMPLOYEE ================= */
function initEmployees() {
const select = document.getElementById("employee");

if (!select) return;

select.innerHTML = '<option value="">-- Pilih Nama --</option>';

if (typeof EMPLOYEES !== "undefined") {
EMPLOYEES.forEach(n => {
const opt = document.createElement("option");
opt.value = n;
opt.textContent = n;
select.appendChild(opt);
});
}
}

/* ================= PAGE ================= */
function showPage(id) {
document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
document.getElementById("page-" + id).classList.add("active");
}

/* ================= ABSENSI ================= */
function startAbsensi(type) {
const name = document.getElementById("employee").value;

if (!name) {
alert("Pilih nama dulu");
return;
}

state.type = type;
showPage("absen");
startCamera();
}

/* ================= CAMERA ================= */
async function startCamera() {
try {
const stream = await navigator.mediaDevices.getUserMedia({ video: true });
const video = document.getElementById("camera");
video.srcObject = stream;
state.stream = stream;
} catch {
alert("Kamera tidak diizinkan");
}
}

function stopCamera() {
if (state.stream) {
state.stream.getTracks().forEach(t => t.stop());
}
}

function capturePhoto() {
const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");

canvas.width = video.videoWidth;
canvas.height = video.videoHeight;

const ctx = canvas.getContext("2d");
ctx.drawImage(video, 0, 0);

state.photo = canvas.toDataURL("image/jpeg");

document.getElementById("photo").src = state.photo;
document.getElementById("photo").classList.remove("hidden");
video.classList.add("hidden");

document.getElementById("postCapture").classList.remove("hidden");
}

function retakePhoto() {
document.getElementById("photo").classList.add("hidden");
document.getElementById("camera").classList.remove("hidden");
document.getElementById("postCapture").classList.add("hidden");
}

/* ================= SUBMIT ================= */
function submitAbsensi() {
alert("Absensi berhasil (mode offline dulu)");
cancelAbsensi();
}

/* ================= CANCEL ================= */
function cancelAbsensi() {
stopCamera();
showPage("dashboard");
}

/* ================= ADMIN ================= */
function adminLogin() {
const pass = document.getElementById("adminPassword").value;

if (pass !== CONFIG.ADMIN_PASSWORD) {
alert("Password salah");
return;
}

document.getElementById("adminPanel").classList.remove("hidden");
}

function loadAdminTable() {
alert("Data belum aktif (mode offline)");
}

function exportToCSV() {
alert("Export belum aktif");
}
