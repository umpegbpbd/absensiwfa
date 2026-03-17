let gpsLoaded = false;
let stream = null;
let photoBase64 = "";
let currentType = "";

window.addEventListener("DOMContentLoaded", () => {
initClock();
initEmployees();
});

/* ================= CLOCK ================= */
function initClock() {
const clock = document.getElementById("clock");
const today = document.getElementById("today");

if (!clock || !today) return;

setInterval(() => {
const now = new Date();
clock.textContent = now.toLocaleTimeString("id-ID");
today.textContent = now.toLocaleDateString("id-ID");
}, 1000);
}

/* ================= EMPLOYEE ================= */
function initEmployees() {
const select = document.getElementById("employee");
if (!select) return;

select.innerHTML = '<option value="">-- Pilih Nama --</option>';

if (typeof EMPLOYEES === "undefined") {
console.error("EMPLOYEES tidak ditemukan");
return;
}

EMPLOYEES.forEach(n => {
const o = document.createElement("option");
o.value = n;
o.textContent = n;
select.appendChild(o);
});
}

/* ================= PAGE ================= */
function showPage(p) {
document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
const page = document.getElementById("page-" + p);
if (page) page.classList.add("active");
}

/* ================= START ABSEN ================= */
function startAbsensi(type) {
const name = document.getElementById("employee")?.value;

if (!name) {
alert("Pilih nama dulu");
return;
}

currentType = type;
showPage("absen");

startCamera();
detectLocation();
}

/* ================= CAMERA ================= */
async function startCamera() {
try {
stream = await navigator.mediaDevices.getUserMedia({ video: true });
const video = document.getElementById("camera");

```
if (video) video.srcObject = stream;
```

} catch {
alert("Kamera tidak diizinkan");
}
}

/* ================= GPS ================= */
function detectLocation() {
if (gpsLoaded) return;
gpsLoaded = true;

const label = document.getElementById("locationText");
if (!label) return;

if (!navigator.geolocation) {
label.textContent = "GPS tidak didukung";
return;
}

label.textContent = "Mendeteksi lokasi...";

navigator.geolocation.getCurrentPosition(
(pos) => {
const lat = pos.coords.latitude;
const lng = pos.coords.longitude;

```
  label.textContent = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
},
() => {
  label.textContent = "GPS error / tidak diizinkan";
}
```

);
}

/* ================= FOTO ================= */
function capturePhoto() {
const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");

if (!video || !canvas) return;

canvas.width = video.videoWidth;
canvas.height = video.videoHeight;

const ctx = canvas.getContext("2d");
ctx.drawImage(video, 0, 0);

photoBase64 = canvas.toDataURL("image/jpeg");

document.getElementById("photo").src = photoBase64;
document.getElementById("photo").classList.remove("hidden");

document.getElementById("btnCapture").classList.add("hidden");
document.getElementById("postCapture").classList.remove("hidden");
}

function retakePhoto() {
document.getElementById("photo").classList.add("hidden");
document.getElementById("btnCapture").classList.remove("hidden");
document.getElementById("postCapture").classList.add("hidden");
}

/* ================= CANCEL ================= */
function cancelAbsensi() {
if (stream) stream.getTracks().forEach(t => t.stop());

gpsLoaded = false;

showPage("dashboard");
}

/* ================= SUBMIT ================= */
function submitAbsensi() {
if (!photoBase64) {
alert("Ambil foto dulu");
return;
}

alert("✅ Absensi berhasil (FIXED)");
cancelAbsensi();
}

/* ================= ADMIN ================= */
function adminLogin() {
const pass = document.getElementById("adminPassword")?.value;

if (pass !== CONFIG.ADMIN_PASSWORD) {
alert("Password salah");
return;
}

alert("Login berhasil");
}
