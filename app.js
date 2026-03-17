let state = {
    currentType: "",
    stream: null,
    photo: null,
    lat: null,
    lng: null,
    address: "Mencari lokasi...",
    isSubmitting: false
};

const DEFAULT_SUBMIT_LABEL = "✓ Kirim Data";

// ================= INITIALIZATION =================
window.addEventListener("DOMContentLoaded", () => {
    startClock();
    loadEmployees();
    showPage("dashboard");
});

function startClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById("clockDisplay").textContent = now.toLocaleTimeString("id-ID", { hour12: false }).replace(/\./g, ":");
        document.getElementById("currentDate").textContent = now.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    }, 1000);
}

function showPage(pageId) {
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    document.getElementById(`page-${pageId}`).classList.add("active");
    if (pageId === "dashboard") stopCamera();
}

function loadEmployees() {
    const select = document.getElementById("employeeSelect");
    const list = (typeof employees !== "undefined") ? employees : ["User Test"];
    select.innerHTML = '<option value="" disabled selected>-- Pilih Nama Anda --</option>';
    list.forEach((n) => {
        const o = document.createElement("option");
        o.value = n;
        o.textContent = n;
        select.appendChild(o);
    });
}

// ================= CAMERA & GPS =================
async function startCamera() {
    const video = document.getElementById("cameraPreview");
    state.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: CONFIG.CAMERA_FACING_MODE }, audio: false });
    video.srcObject = state.stream;
    video.play();
}

function stopCamera() {
    if (state.stream) {
        state.stream.getTracks().forEach((t) => t.stop());
        state.stream = null;
    }
}

function capturePhoto() {
    const v = document.getElementById("cameraPreview");
    const c = document.getElementById("cameraCanvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;

    const ctx = c.getContext("2d");
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0);

    state.photo = c.toDataURL("image/jpeg", CONFIG.IMAGE_QUALITY);
    document.getElementById("capturedPhoto").src = state.photo;
    document.getElementById("capturedPhoto").classList.remove("hidden");
    v.classList.add("hidden");
    document.getElementById("btnCapture").classList.add("hidden");
    document.getElementById("postCaptureButtons").classList.remove("hidden");
}

function retakePhoto() {
    state.photo = null;
    document.getElementById("capturedPhoto").classList.add("hidden");
    document.getElementById("cameraPreview").classList.remove("hidden");
    document.getElementById("btnCapture").classList.remove("hidden");
    document.getElementById("postCaptureButtons").classList.add("hidden");
}

function getLocation() {
    navigator.geolocation.getCurrentPosition(async (p) => {
        state.lat = p.coords.latitude;
        state.lng = p.coords.longitude;
        try {
            const res = await fetchWithTimeout(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${state.lat}&lon=${state.lng}`, {}, 10000);
            const d = await res.json();
            state.address = d.display_name ? d.display_name.split(",").slice(0, 3).join(",") : `${state.lat}, ${state.lng}`;
        } catch {
            state.address = `${state.lat}, ${state.lng}`;
        }
        document.getElementById("locationText").innerText = state.address;
    }, () => {
        state.address = "Lokasi tidak tersedia";
        document.getElementById("locationText").innerText = state.address;
    }, { enableHighAccuracy: true });
}

async function startAbsensi(t) {
    if (!document.getElementById("employeeSelect").value) {
        return alert("Pilih Nama!");
    }
    state.currentType = t;
    showPage("absensi");
    await startCamera();
    getLocation();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error("Koneksi timeout. Cek internet lalu coba lagi.");
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

function parseGitHubError(status, message = "") {
    if (status === 401 || status === 403) {
        return `Akses ditolak GitHub (${status}). Pastikan token valid dan punya izin repo:contents. ${message}`.trim();
    }
    if (status === 404) {
        return "Repository/data file tidak ditemukan. Cek OWNER, REPO, dan DATA_FILE di config.js.";
    }
    if (status === 409) {
        return "Data sedang diperbarui dari perangkat lain. Silakan kirim ulang 2-3 detik lagi.";
    }
    return message || `Gagal menyimpan data ke GitHub (HTTP ${status}).`;
}

function decodeBase64Unicode(content) {
    return decodeURIComponent(escape(atob(content)));
}

function encodeBase64Unicode(content) {
    return btoa(unescape(encodeURIComponent(content)));
}

async function getGithubFile(url, headers) {
    const resGet = await fetchWithTimeout(url, { headers });

    if (resGet.ok) {
        const file = await resGet.json();
        return {
            sha: file.sha,
            rows: JSON.parse(decodeBase64Unicode(file.content))
        };
    }

    if (resGet.status === 404) {
        return { sha: "", rows: [] };
    }

    const err = await resGet.json().catch(() => ({}));
    throw new Error(parseGitHubError(resGet.status, err.message));
}

async function putGithubFile(url, headers, rows, sha, payloadName) {
    const resPut = await fetchWithTimeout(url, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
            message: `Absen: ${payloadName}`,
            content: encodeBase64Unicode(JSON.stringify(rows, null, 2)),
            ...(sha ? { sha } : {})
        })
    });

    if (!resPut.ok) {
        const err = await resPut.json().catch(() => ({}));
        throw new Error(parseGitHubError(resPut.status, err.message));
    }
}

async function saveWithRetry(url, headers, payload, retryCount = 1) {
    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
        try {
            const { sha, rows } = await getGithubFile(url, headers);
            rows.push(payload);
            await putGithubFile(url, headers, rows, sha, payload.nama);
            return;
        } catch (error) {
            const isConflict = typeof error.message === "string" && (error.message.includes("409") || error.message.includes("sedang diperbarui"));
            if (attempt < retryCount && isConflict) {
                await new Promise((resolve) => setTimeout(resolve, 1200));
                continue;
            }
            throw error;
        }
    }
}

// ================= GITHUB ENGINE =================
async function submitAbsensi() {
    const btn = document.getElementById("btnSubmitAbsen");

    if (state.isSubmitting) return;
    if (!state.photo) return alert("Ambil foto dulu sebelum kirim.");
    if (!CONFIG?.TOKEN || CONFIG.TOKEN.includes("GITHUB_TOKEN")) return alert("Token GitHub di config.js belum diisi.");

    state.isSubmitting = true;
    btn.disabled = true;
    btn.innerText = "⏳ Sedang Mengirim...";

    const payload = {
        nama: document.getElementById("employeeSelect").value,
        tanggal: new Date().toLocaleDateString("id-ID"),
        jam: new Date().toLocaleTimeString("id-ID"),
        tipe: state.currentType.toUpperCase(),
        status: (state.currentType === "masuk") ? (new Date().getHours() < 8 ? "Hadir" : "Terlambat") : "Pulang",
        lokasi: state.address,
        foto: state.photo
    };

    const url = `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.DATA_FILE}`;
    const headers = {
        Authorization: `token ${CONFIG.TOKEN}`,
        Accept: "application/vnd.github.v3+json"
    };

    try {
        await saveWithRetry(url, headers, payload, 1);
        alert("✅ Absensi Berhasil Disimpan!");
        location.reload();
    } catch (e) {
        console.error(e);
        alert(`❌ Error: ${e.message}`);
    } finally {
        state.isSubmitting = false;
        btn.disabled = false;
        btn.innerText = DEFAULT_SUBMIT_LABEL;
    }
}

function cancelAbsensi() {
    stopCamera();
    location.reload();
}
