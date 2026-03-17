let state = { currentType: "", stream: null, photo: null, lat: null, lng: null, address: "Mencari lokasi..." };

// ================= INITIALIZATION =================
window.addEventListener("DOMContentLoaded", () => {
    startClock();
    loadEmployees();
    showPage("dashboard");
});

function startClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById("clockDisplay").textContent = now.toLocaleTimeString("id-ID", { hour12: false }).replace(/\./g, ':');
        document.getElementById("currentDate").textContent = now.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    }, 1000);
}

function showPage(pageId) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById("page-" + pageId).classList.add("active");
    if (pageId === "dashboard") stopCamera();
}

function loadEmployees() {
    const select = document.getElementById("employeeSelect");
    const list = (typeof employees !== "undefined") ? employees : ["User Test"];
    select.innerHTML = '<option value="" disabled selected>-- Pilih Nama Anda --</option>';
    list.forEach(n => { const o = document.createElement("option"); o.value = n; o.textContent = n; select.appendChild(o); });
}

// ================= CAMERA & GPS =================
async function startCamera() {
    const video = document.getElementById("cameraPreview");
    state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: CONFIG.CAMERA_FACING_MODE }, audio: false });
    video.srcObject = state.stream;
    video.play();
}

function stopCamera() { if (state.stream) state.stream.getTracks().forEach(t => t.stop()); }

function capturePhoto() {
    const v = document.getElementById("cameraPreview");
    const c = document.getElementById("cameraCanvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    ctx.translate(c.width, 0); ctx.scale(-1, 1); ctx.drawImage(v, 0, 0);
    state.photo = c.toDataURL("image/jpeg", CONFIG.IMAGE_QUALITY);
    document.getElementById("capturedPhoto").src = state.photo;
    document.getElementById("capturedPhoto").classList.remove("hidden");
    v.classList.add("hidden");
    document.getElementById("btnCapture").classList.add("hidden");
    document.getElementById("postCaptureButtons").classList.remove("hidden");
}

function retakePhoto() {
    document.getElementById("capturedPhoto").classList.add("hidden");
    document.getElementById("cameraPreview").classList.remove("hidden");
    document.getElementById("btnCapture").classList.remove("hidden");
    document.getElementById("postCaptureButtons").classList.add("hidden");
}

function getLocation() {
    navigator.geolocation.getCurrentPosition(async (p) => {
        state.lat = p.coords.latitude; state.lng = p.coords.longitude;
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${state.lat}&lon=${state.lng}`);
        const d = await res.json();
        state.address = d.display_name.split(',').slice(0, 3).join(',');
        document.getElementById("locationText").innerText = state.address;
    }, null, { enableHighAccuracy: true });
}

async function startAbsensi(t) {
    if (!document.getElementById("employeeSelect").value) return alert("Pilih Nama!");
    state.currentType = t;
    showPage("absensi");
    await startCamera();
    getLocation();
}

// ================= GITHUB ENGINE (ANTI-LAG) =================
async function submitAbsensi() {
    const btn = document.getElementById("btnSubmitAbsen");
    btn.disabled = true;
    btn.innerText = "⏳ Sedang Mengirim...";

    const payload = {
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
        // 1. Ambil file SHA terbaru
        const resGet = await fetch(url, { headers: { "Authorization": `token ${CONFIG.TOKEN}`, "Accept": "application/vnd.github.v3+json" } });
        
        let sha = "";
        let currentData = [];

        if (resGet.ok) {
            const file = await resGet.json();
            sha = file.sha;
            currentData = JSON.parse(decodeURIComponent(escape(atob(file.content))));
        }

        // 2. Tambah Data Baru
        currentData.push(payload);

        // 3. Kirim Balik
        const resPut = await fetch(url, {
            method: "PUT",
            headers: { "Authorization": `token ${CONFIG.TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `Absen: ${payload.nama}`,
                content: btoa(unescape(encodeURIComponent(JSON.stringify(currentData, null, 2)))),
                sha: sha
            })
        });

        if (resPut.ok) {
            alert("✅ Absensi Berhasil Disimpan!");
            location.reload();
        } else {
            const err = await resPut.json();
            throw new Error(err.message);
        }
    } catch (e) {
        console.error(e);
        alert("❌ Error: " + e.message + "\n\nPastikan Token GitHub benar & Repositori Private.");
        btn.disabled = false;
        btn.innerText = "Coba Kirim Lagi";
    }
}

function cancelAbsensi() { stopCamera(); location.reload(); }
