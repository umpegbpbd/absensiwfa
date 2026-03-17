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
detectLocation(); // ✅ FIX GPS
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

/* ================= GPS FIX TOTAL ================= */
function detectLocation() {
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
  // tampilkan koordinat dulu
  label.textContent = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;

  // ambil alamat (optional)
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

alert("✅ Absensi berhasil (mode aman)");
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
alert("Belum aktif");
}

function exportToCSV() {
alert("Belum aktif");
}
