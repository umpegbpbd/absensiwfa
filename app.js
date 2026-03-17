let gpsLoaded = false;
let stream = null;
let photoBase64 = "";

window.onload = () => {
  initClock();
  initEmployees();
};

function initClock() {
  setInterval(() => {
    const now = new Date();
    document.getElementById("clock").textContent =
      now.toLocaleTimeString("id-ID");
    document.getElementById("today").textContent =
      now.toLocaleDateString("id-ID");
  }, 1000);
}

function initEmployees() {
  const select = document.getElementById("employee");

  select.innerHTML = '<option value="">-- Pilih Nama --</option>';

  if (typeof EMPLOYEES === "undefined") return;

  EMPLOYEES.forEach(n => {
    const o = document.createElement("option");
    o.value = n;
    o.textContent = n;
    select.appendChild(o);
  });
}

function showPage(p) {
  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  document.getElementById("page-" + p).classList.add("active");
}

async function startAbsensi() {
  showPage("absen");
  startCamera();
  detectLocation();
}

async function startCamera() {
  stream = await navigator.mediaDevices.getUserMedia({ video: true });
  document.getElementById("camera").srcObject = stream;
}

function detectLocation() {
  if (gpsLoaded) return;
  gpsLoaded = true;

  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    document.getElementById("locationText").textContent =
      `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
  });
}

function capturePhoto() {
  const video = document.getElementById("camera");
  const canvas = document.getElementById("canvas");

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

function cancelAbsensi() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  showPage("dashboard");
}

function submitAbsensi() {
  alert("Absensi berhasil (dummy dulu)");
}
