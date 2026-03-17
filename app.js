/**
 * APP.JS - SISTEM ABSENSI WFA (Presensi Kamera & GPS)
 * Optimasi: Hemat Memori, Auto-Stop Camera, & Validasi Lokasi
 */

// ================= INITIALIZATION =================
window.addEventListener("DOMContentLoaded", () => {
    startClock();
    loadEmployees();
    // Default: Pastikan dashboard terlihat
    showPage("dashboard");
});

// ================= JAM REALTIME =================
function startClock() {
    const clockEl = document.getElementById("clockDisplay");
    const dateEl = document.getElementById("currentDate");

    const update = () => {
        const now = new Date();
        if (clockEl) clockEl.textContent = now.toLocaleTimeString("id-ID", { hour12: false });
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString("id-ID", {
                weekday: "long", year: "numeric", month: "long", day: "numeric"
            });
        }
    };

    update();
    setInterval(update, 1000);
}

// ================= LOAD DAFTAR PEGAWAI =================
function loadEmployees() {
    const select = document.getElementById("employeeSelect");
    if (!select) return;

    // List default jika file employees.js eksternal tidak terbaca
    const list = (typeof employees !== "undefined") ? employees : ["Ahmad", "Budi", "Citra", "Dewi", "Eko"];
    
    // Bersihkan dropdown dan isi ulang
    select.innerHTML = '<option value="" disabled selected>-- Pilih Pegawai --</option>';
    list.forEach(nama => {
        const opt = document.createElement("option");
        opt.value = nama;
        opt.textContent = nama;
        select.appendChild(opt);
    });
}

// ================= NAVIGATION SYSTEM =================
function showPage(pageId) {
    // Sembunyikan semua section dengan class 'page'
    document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
    
    // Tampilkan page yang dipilih
    const target = document.getElementById("page-" + pageId);
    if (target) target.classList.remove("hidden");

    // Jika kembali ke dashboard, matikan kamera
    if (pageId === "dashboard") stopCamera();
}

// ================= STATE MANAGEMENT =================
let state = {
    currentType: "", // 'masuk' atau 'pulang'
    stream: null,
    photo: null,
    lat: null,
    lng: null,
    address: "Mencari lokasi..."
};

// ================= ABSENSI LOGIC =================
async function startAbsensi(type) {
    const name = document.getElementById("employeeSelect")?.value;
    if (!name) {
        alert("Pilih nama pegawai terlebih dahulu!");
        return;
    }

    state.currentType = type;
    showPage("absensi");
    
    await startCamera();
    getLocation();
}

// ================= CAMERA ENGINE =================
async function startCamera() {
    const video = document.getElementById("cameraPreview");
    try {
        state.stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false
        });
        video.srcObject = state.stream;
        video.play();
    } catch (err) {
        alert("Gagal akses kamera: " + err.message);
        showPage("dashboard");
    }
}

function stopCamera() {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        state.stream = null;
    }
}

function capturePhoto() {
    const video = document.getElementById("cameraPreview");
    const canvas = document.getElementById("cameraCanvas");
    const imgDisplay = document.getElementById("capturedPhoto");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    
    // Mirroring jika pakai kamera depan
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    // Kompresi 0.6 agar LocalStorage tidak cepat penuh
    state.photo = canvas.toDataURL("image/jpeg", 0.6); 
    
    imgDisplay.src = state.photo;
    imgDisplay.classList.remove("hidden");
    video.classList.add("hidden");

    document.getElementById("btnCapture").classList.add("hidden");
    document.getElementById("btnRetake").classList.remove("hidden");
}

function retakePhoto() {
    state.photo = null;
    document.getElementById("capturedPhoto").classList.add("hidden");
    document.getElementById("cameraPreview").classList.remove("hidden");
    document.getElementById("btnCapture").classList.remove("hidden");
    document.getElementById("btnRetake").classList.add("hidden");
}

// ================= GPS & LOCATION =================
function getLocation() {
    const info = document.getElementById("locationInfo");
    if (!navigator.geolocation) {
        state.address = "GPS tidak didukung";
        if (info) info.innerText = state.address;
        return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
        state.lat = pos.coords.latitude;
        state.lng = pos.coords.longitude;

        try {
            // Menggunakan Reverse Geocoding OSM (Gratis)
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${state.lat}&lon=${state.lng}`);
            const data = await res.json();
            const a = data.address;
            state.address = `${a.village || a.suburb || a.city_district || ''}, ${a.city || a.town || a.county || ''}`;
            if (info) info.innerText = "📍 " + state.address;
        } catch (e) {
            state.address = `${state.lat.toFixed(4)}, ${state.lng.toFixed(4)}`;
            if (info) info.innerText = "📍 Lokasi: " + state.address;
        }
    }, () => {
        if (info) info.innerText = "📍 Izin lokasi ditolak / GPS Mati";
    });
}

// ================= ANALISIS STATUS (LOGIKA JAM) =================
function getStatus() {
    const now = new Date();
    const day = now.getDay(); 
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timeValue = hours * 60 + minutes;

    if (state.currentType === "masuk") {
        // Aturan: Jumat masuk 07:00 (420 menit), Hari lain 07:30 (450 menit)
        const limit = (day === 5) ? 420 : 450;
        return (timeValue <= limit) ? "Hadir" : "Terlambat";
    } else {
        // Pulang mulai jam 15:30 (930 menit)
        return (timeValue >= 930) ? "Pulang" : "Pulang Awal";
    }
}

// ================= SIMPAN DATA =================
function submitAbsensi() {
    if (!state.photo) return alert("Ambil foto terlebih dahulu!");

    const data = {
        nama: document.getElementById("employeeSelect").value,
        tanggal: new Date().toLocaleDateString("id-ID"),
        jam: new Date().toLocaleTimeString("id-ID"),
        tipe: state.currentType.toUpperCase(),
        status: getStatus(),
        lokasi: state.address,
        foto: state.photo
    };

    // Ambil data lama dari LocalStorage
    const db = JSON.parse(localStorage.getItem("absensi_wfa") || "[]");
    db.push(data);
    
    try {
        localStorage.setItem("absensi_wfa", JSON.stringify(db));
        alert(`Absensi ${data.tipe} Berhasil Disimpan!`);
        cancelAbsensi();
    } catch (e) {
        alert("Gagal simpan! Memori browser penuh. Hubungi Admin.");
    }
}

function cancelAbsensi() {
    stopCamera();
    state.photo = null;
    retakePhoto();
    showPage("dashboard");
}

// ================= ADMIN PANEL LOGIC =================
function adminLogin() {
    const pass = document.getElementById("adminPass").value;
    if (pass === "admin123") { // Ubah password di sini
        document.getElementById("adminPanel").classList.remove("hidden");
        loadAdminTable();
    } else {
        alert("Password Salah!");
    }
}

function loadAdminTable() {
    const body = document.getElementById("adminTableBody");
    const db = JSON.
