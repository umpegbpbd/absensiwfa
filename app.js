/**
 * APP.JS - SISTEM ABSENSI BPBD TRENGGALEK
 * Integrasi: GitHub API Storage, Validasi GPS Radius, & Anti-Fake GPS
 */

// ================= STATE MANAGEMENT =================
let state = {
    currentType: "", 
    stream: null,
    photo: null,
    lat: null,
    lng: null,
    accuracy: null,
    address: "Mencari lokasi..."
};

// ================= INITIALIZATION =================
window.addEventListener("DOMContentLoaded", () => {
    startClock();
    loadEmployees();
    showPage("dashboard");
    console.log(`${CONFIG.APP_NAME} - ${CONFIG.ORGANISASI} Ready.`);
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

    // Mengambil list dari file external employees.js atau fallback
    const list = (typeof employees !== "undefined") ? employees : ["Admin Test"];
    
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
    document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
    const target = document.getElementById("page-" + pageId);
    if (target) target.classList.remove("hidden");

    if (pageId === "dashboard") stopCamera();
}

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
            video: { 
                facingMode: CONFIG.CAMERA_FACING_MODE, 
                width: { ideal: CONFIG.MAX_IMAGE_WIDTH }, 
                height: { ideal: CONFIG.MAX_IMAGE_HEIGHT } 
            },
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
    
    // Mirroring untuk kamera depan
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    state.photo = canvas.toDataURL("image/jpeg", CONFIG.IMAGE_QUALITY);
    
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

// ================= GPS & VALIDATION =================
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
}

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
        state.accuracy = pos.coords.accuracy;

        // Validasi Akurasi (Anti-Fake GPS)
        if (CONFIG.ANTI_FAKE_GPS && state.accuracy > CONFIG.MAX_GPS_ACCURACY) {
            info.innerHTML = "<span style='color:red'>❌ Akurasi Rendah. Matikan Mock Location!</span>";
            return;
        }

        // Validasi Radius (WFO vs WFA)
        const dist = getDistance(state.lat, state.lng, CONFIG.OFFICE_LOCATION.LAT, CONFIG.OFFICE_LOCATION.LON);
        const isNearOffice = dist <= CONFIG.OFFICE_LOCATION.RADIUS_METER;

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${state.lat}&lon=${state.lng}`);
            const data = await res.json();
            const a = data.address;
            state.address = `${a.village || a.suburb || ''}, ${a.city_district || ''}`;
            
            let statusLoc = isNearOffice ? " (📍 Kantor)" : " (🏠 Luar Kantor)";
            if (info) info.innerText = "📍 " + state.address + statusLoc;
        } catch (e) {
            state.address = `${state.lat.toFixed(4)}, ${state.lng.toFixed(4)}`;
            if (info) info.innerText = "📍 Lokasi terdeteksi";
        }
    }, () => {
        if (info) info.innerText = "📍 Izin lokasi ditolak";
    }, { enableHighAccuracy: true });
}

// ================= ANALISIS STATUS =================
function getStatus() {
    const now = new Date();
    const timeValue = now.getHours() * 60 + now.getMinutes();

    const parseTime = (t) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
    };

    if (state.currentType === "masuk") {
        return (timeValue <= parseTime(CONFIG.JAM_MASUK_END)) ? "Hadir" : "Terlambat";
    } else {
        return (timeValue >= parseTime(CONFIG.JAM_PULANG_START)) ? "Pulang" : "Pulang Awal";
    }
}

// ================= GITHUB SAVE LOGIC =================
async function submitAbsensi() {
    if (!state.photo) return alert("Ambil foto terlebih dahulu!");
    if (CONFIG.GPS_REQUIRED && !state.lat) return alert("Tunggu GPS mengunci lokasi!");

    const btn = document.getElementById("btnSubmitAbsen");
    btn.disabled = true;
    btn.innerText = "Proses Menyimpan...";

    const data = {
        nama: document.getElementById("employeeSelect").value,
        tanggal: new Date().toLocaleDateString("id-ID"),
        jam: new Date().toLocaleTimeString("id-ID"),
        tipe: state.currentType.toUpperCase(),
        status: getStatus(),
        lokasi: state.address,
        koordinat: `${state.lat},${state.lng}`,
        foto: state.photo
    };

    const url = `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.DATA_FILE}`;

    try {
        let sha = "";
        let currentContent = [];

        // 1. Ambil data yang sudah ada di GitHub
        const resGet = await fetch(url, {
            headers: { "Authorization": `token ${CONFIG.TOKEN}` }
        });

        if (resGet.ok) {
            const fileData = await resGet.json();
            sha = fileData.sha;
            // Decode Base64 UTF-8 secara aman
            currentContent = JSON.parse(decodeURIComponent(escape(atob(fileData.content))));
        }

        // 2. Tambahkan data baru
        currentContent.push(data);

        // 3. Update kembali ke GitHub
        const resPut = await fetch(url, {
            method: "PUT",
            headers: {
                "Authorization": `token ${CONFIG.TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: `Absensi: ${data.nama} - ${data.tanggal}`,
                content: btoa(unescape(encodeURIComponent(JSON.stringify(currentContent, null, 2)))),
                sha: sha,
                branch: CONFIG.BRANCH
            })
        });

        if (resPut.ok) {
            alert(`Berhasil! Data ${data.tipe} Anda telah tersimpan di sistem.`);
            cancelAbsensi();
        } else {
            throw new Error("Gagal push ke GitHub API");
        }

    } catch (e) {
        alert("Gagal Simpan: " + e.message);
        console.error(e);
    } finally {
        btn.disabled = false;
        btn.innerText = "Kirim Absensi";
    }
}

function cancelAbsensi() {
    stopCamera();
    state.photo = null;
    retakePhoto();
    showPage("dashboard");
}

// ================= ADMIN PANEL =================
function adminLogin() {
    const pass = document.getElementById("adminPass").value;
    if (pass === CONFIG.ADMIN_PASSWORD) {
        document.getElementById("adminPanel").classList.remove("hidden");
        loadAdminTable();
    } else {
        alert("Password Salah!");
    }
}

async function loadAdminTable() {
    const body = document.getElementById("adminTableBody");
    if (!body) return;
    
    body.innerHTML = "<tr><td colspan='6'>Memuat data...</td></tr>";

    try {
        const url = `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.DATA_FILE}`;
        const res = await fetch(url, {
            headers: { "Authorization": `token ${CONFIG.TOKEN}` }
        });

        if (res.ok) {
            const fileData = await res.json();
            const db = JSON.parse(decodeURIComponent(escape(atob(fileData.content))));
            
            body.innerHTML = "";
            db.reverse().forEach(row => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${row.nama}</td>
                    <td>${row.tanggal} ${row.jam}</td>
                    <td>${row.tipe}</td>
                    <td>${row.status}</td>
                    <td>${row.lokasi}</td>
                    <td><button onclick="viewPhoto('${row.foto}')">Lihat</button></td>
                `;
                body.appendChild(tr);
            });
        }
    } catch (e) {
        body.innerHTML = "<tr><td colspan='6'>Gagal memuat data.</td></tr>";
    }
}

function viewPhoto(base64) {
    const win = window.open();
    win.document.write(`<img src="${base64}" style="width:100%">`);
}
