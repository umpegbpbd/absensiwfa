let gpsLoaded = false;
let stream = null;
let photoBase64 = "";
let absenType = ""; // Menyimpan status masuk atau pulang
let currentLocation = { lat: null, lng: null }; // Menyimpan koordinat

window.onload = () => {
  initClock();
  initEmployees();
};

function initClock() {
  setInterval(() => {
    const now = new Date();
    document.getElementById("clock").textContent = now.toLocaleTimeString("id-ID");
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById("today").textContent = now.toLocaleDateString("id-ID", options);
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

async function startAbsensi(type) {
  const selectedEmployee = document.getElementById("employee").value;
  
  if (!selectedEmployee) {
    alert("Silakan pilih nama terlebih dahulu!");
    return;
  }

  absenType = type; // 'masuk' atau 'pulang'
  showPage("absen");
  startCamera();
  detectLocation();
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    document.getElementById("camera").srcObject = stream;
  } catch (err) {
    alert("Kamera tidak dapat diakses. Pastikan izin kamera sudah diberikan.");
    console.error(err);
  }
}

function detectLocation() {
  if (gpsLoaded) return;
  document.getElementById("locationText").textContent = "Mendeteksi lokasi...";
  
  navigator.geolocation.getCurrentPosition(
    pos => {
      gpsLoaded = true;
      currentLocation.lat = pos.coords.latitude;
      currentLocation.lng = pos.coords.longitude;
      document.getElementById("locationText").textContent = `Lokasi: Lat ${currentLocation.lat.toFixed(5)}, Lng ${currentLocation.lng.toFixed(5)}`;
    },
    err => {
      document.getElementById("locationText").textContent = "Gagal mendapatkan lokasi. Izinkan akses GPS.";
      console.error(err);
    }
  );
}

function capturePhoto() {
  const video = document.getElementById("camera");
  const canvas = document.getElementById("canvas");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  photoBase64 = canvas.toDataURL("image/jpeg");

  // Tampilkan foto, sembunyikan video
  document.getElementById("photo").src = photoBase64;
  document.getElementById("photo").classList.remove("hidden");
  document.getElementById("camera").classList.add("hidden");

  // Atur visibilitas tombol
  document.getElementById("btnCapture").classList.add("hidden");
  document.getElementById("postCapture").classList.remove("hidden");
}

function retakePhoto() {
  // Sembunyikan foto, tampilkan video lagi
  document.getElementById("photo").classList.add("hidden");
  document.getElementById("camera").classList.remove("hidden");
  
  // Atur visibilitas tombol
  document.getElementById("btnCapture").classList.remove("hidden");
  document.getElementById("postCapture").classList.add("hidden");
}

function cancelAbsensi() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
  }
  
  // Reset tampilan UI ke mode awal ambil foto
  document.getElementById("photo").classList.add("hidden");
  document.getElementById("camera").classList.remove("hidden");
  document.getElementById("btnCapture").classList.remove("hidden");
  document.getElementById("postCapture").classList.add("hidden");
  document.getElementById("locationText").textContent = "Mendeteksi lokasi...";
  
  gpsLoaded = false;
  showPage("dashboard");
}

function submitAbsensi() {
  const employeeName = document.getElementById("employee").value;
  alert(`Absen ${absenType.toUpperCase()} berhasil untuk ${employeeName}! (Dummy)`);
  
  // Balik ke dashboard setelah sukses
  cancelAbsensi(); 
}

// Dummy fungsi admin agar tidak error saat tombol login ditekan
function adminLogin() {
  const pass = document.getElementById("adminPassword").value;
  if(pass === CONFIG.ADMIN_PASSWORD) {
    alert("Login Admin Berhasil (Dummy)");
    // Disini logika ambil data absensi nanti dimasukkan
  } else {
    alert("Password salah!");
  }
}
