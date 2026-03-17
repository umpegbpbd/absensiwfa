const state = {
type: "",
stream: null,
photo: "",
};

let gpsLoaded = false;

window.addEventListener("DOMContentLoaded", () => {
initClock();
initEmployees();
showPage("dashboard");
});

/* ================= CLOCK ================= */
function initClock() {
setInterval(() => {
const now = new Date();
const clock = document.getElementById("clock");
const today = document.getElementById("today");

```
if (clock) clock.textContent = now.toLocaleTimeString("id-ID");
if (today) today.textContent = now.toLocaleDateString("id-ID");
```

}, 1000);
}

/* ================= EMPLOYEE ================= */
function initEmployees() {
const select = document.getElementById("employee");
if (!select) return;

select.innerHTML = '<option value="">-- Pilih Nama --</option>';

if (typeof EMPLOYEES !== "undefined") {
EMPLOYEES.forEach(name => {
const opt = document.createElement("option");
opt.value = name;
opt.textContent = name;
select.appendChild(opt);
});
}
}

/* ================= PAGE ================= */
function showPage(page) {
document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
const el = document.getElementById("page-" + page);
if (el) el.classList.add("active");
}

/* ================= START ABSEN ================= */
function startAbsensi(type) {
const name = document.getElementById("employee")?.value;

if (!name) {
alert("Pilih nama dulu");
return;
}

state.type = type;
showPage("absen");

startCamera();
detectLocation();
}

/* ================= CAMERA ================= */
async function startCamera() {
try {
const stream = await navigator.mediaDevices.getUserMedia({ video: true });
const video = document.getElementById("camera");

```
if (video) {
  video.srcObject = stream;
}

state.stream = stream;
```

} catch {
alert("Kamera tidak diizinkan");
}
}

function stopCamera() {
if (state.stream) {
state.stream.getTracks().forEach(t => t.stop());
state.stream = null;
}
}

function capturePhoto() {
const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");

if (!video || !canvas) return;

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

/* ================= GPS FIX ================= */
function detectLocation() {
if (gpsLoaded) return;
gpsLoaded = true;

const label = document.getElementById("locationText");

if (!navigator.geolocation) {
label.textContent = "GPS tidak didukung";
return;
}

label.textContent = "Mendeteksi lokasi...";

navigator.geolocation.getCurrentPosition(
async (pos) => {
const lat = pos.coords.latitude;
const lng = pos.coords.longitude;

```
  label.textContent = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await res.json();

    if (data.display_name) {
      label.textContent = data.display_name;
    }
  } catch {
    // fallback tetap koordinat
  }
},
(err) => {
  if (err.code === 1) {
    label.textContent = "Izin lokasi ditolak";
  } else if (err.code === 2) {
    label.textContent = "Lokasi tidak tersedia";
  } else {
    label.textContent = "GPS error";
  }
},
{
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0
}
```

);
}

/* ================= SUBMIT ================= */
function submitAbsensi() {
if (!state.photo) {
alert("Ambil foto dulu");
return;
}

alert("✅ Absensi berhasil (mode stabil)");
cancelAbsensi();
}

/* ================= CANCEL ================= */
function cancelAbsensi() {
stopCamera();

gpsLoaded = false;

const label = document.getElementById("locationText");
if (label) label.textContent = "Mendeteksi lokasi...";

showPage("dashboard");
}

/* ================= ADMIN ================= */
function adminLogin() {
const pass = document.getElementById("adminPassword")?.value;

if (pass !== CONFIG.ADMIN_PASSWORD) {
alert("Password salah");
return;
}

document.getElementById("adminPanel")?.classList.remove("hidden");
}

function loadAdminTable() {
alert("Belum aktif (mode aman)");
}

function exportToCSV() {
alert("Belum aktif");
}
