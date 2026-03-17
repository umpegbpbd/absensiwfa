let state = {
    currentType: "", 
    stream: null,
    photo: null,
    lat: null,
    lng: null,
    address: "Mencari lokasi..."
};

// ================= INITIALIZATION =================
window.addEventListener("DOMContentLoaded", () => {
    startClock();
    loadEmployees();
    showPage("dashboard");
});

// ================= JAM REALTIME =================
function startClock() {
    const clockEl = document.getElementById("clockDisplay");
    const dateEl = document.getElementById("currentDate");

    setInterval(() => {
        const now = new Date();
        if (clockEl) clockEl.textContent = now.toLocaleTimeString("id-ID", { hour12: false }).replace(/\./g, ':');
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString("id-ID", {
                weekday: "long", year: "numeric", month: "long", day: "numeric"
            });
        }
    }, 1000);
}

// ================= NAVIGATION =================
function showPage(pageId) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const target = document.getElementById("page-" + pageId);
    if (target) target.classList.add("active");
    if (pageId === "dashboard") stopCamera();
}

// ================= LOAD EMPLOYEES =================
function loadEmployees() {
    const select = document.getElementById("employeeSelect");
    const list = (typeof employees !== "undefined") ? employees : ["Andi", "Budi", "Caca"];
    
    select.innerHTML = '<option value="" disabled selected>-- Pilih Nama Anda --</option>';
    list.forEach(nama => {
        const opt = document.createElement("option");
        opt.value = nama;
        opt.textContent = nama;
        select.appendChild(opt);
    });
}

// ================= CAMERA ENGINE =================
async function startCamera() {
    const video = document.getElementById("cameraPreview");
    try {
        state.stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: CONFIG.CAMERA_FACING_MODE },
            audio: false
        });
        video.srcObject = state.stream;
        video.play();
    } catch (err) {
        alert("Kamera tidak diizinkan atau tidak ditemukan.");
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
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    state.photo = canvas.toDataURL("image/jpeg", CONFIG.IMAGE_QUALITY);
    imgDisplay.src = state.photo;
    imgDisplay.style.display = "block";
    video.style.display = "none";
    
    document.getElementById("btnCapture").classList.add("hidden");
    document.getElementById("postCaptureButtons").classList.remove("hidden");
}

function retakePhoto() {
    state.photo = null;
    document.getElementById("capturedPhoto").style.display = "none";
    document.getElementById("cameraPreview").style.display = "block";
    document.getElementById("btnCapture").classList.remove("hidden");
    document.getElementById("postCaptureButtons").classList.add("hidden");
}

// ================= GPS =================
function getLocation() {
    const info = document.getElementById("locationText");
    navigator.geolocation.getCurrentPosition(async (pos) => {
        state.lat = pos.coords.latitude;
        state.lng = pos.coords.longitude;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${state.lat}&lon=${state.lng}`);
            const data = await res.json();
            state.address = data.display_name.split(',').slice(0, 3).join(',');
            info.innerText = state.address;
        } catch (e) {
            info.innerText = `${state.lat}, ${state.lng}`;
        }
    }, () => { info.innerText = "GPS Aktifkan!"; }, { enableHighAccuracy: true });
}

async function startAbsensi(type) {
    if (!document.getElementById("employeeSelect").value) return alert("Pilih Nama!");
    state.currentType = type;
    showPage("absensi");
    await startCamera();
    getLocation();
}

// ================= SAVE TO GITHUB =================
async function submitAbsensi() {
    const btn = document.getElementById("btnSubmitAbsen");
    btn.disabled = true;
    btn.innerText = "Mengirim...";

    const dataAbsen = {
        nama: document.getElementById("employeeSelect").value,
        tanggal: new Date().toLocaleDateString("id-ID"),
        jam: new Date().toLocaleTimeString("id-ID"),
        tipe: state.currentType.toUpperCase(),
        status: (state.currentType === 'masuk') ? (new Date().getHours() < 8 ? "Hadir" : "Terlambat") : "Pulang",
        lokasi: state.address,
        foto: state.photo
    };

    const url = `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.DATA_FILE}`;

    try {
        const resGet = await fetch(url, { headers: { "Authorization": `token ${CONFIG.TOKEN}` } });
        let sha = "";
        let currentData = [];

        if (resGet.ok) {
            const file = await resGet.json();
            sha = file.sha;
            currentData = JSON.parse(atob(file.content));
        }

        currentData.push(dataAbsen);

        const resPut = await fetch(url, {
            method: "PUT",
            headers: { "Authorization": `token ${CONFIG.TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Absen ${dataAbsen.nama}`,
                content: btoa(unescape(encodeURIComponent(JSON.stringify(currentData, null, 2)))),
                sha: sha
            })
        });

        if (resPut.ok) {
            alert("✅ Absensi Berhasil Terkirim ke GitHub!");
            location.reload();
        }
    } catch (e) {
        alert("Gagal kirim. Cek koneksi/token.");
        btn.disabled = false;
    }
}

function cancelAbsensi() {
    stopCamera();
    showPage("dashboard");
    retakePhoto();
}
