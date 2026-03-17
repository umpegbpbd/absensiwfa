const state = {
  type: "",
  stream: null,
  photoBase64: "",
  lat: null,
  lng: null,
  address: "Mendeteksi lokasi...",
  tokenOk: false,
  loading: false,
  adminRows: []
};

const TOKEN_STORAGE_KEY = "ABSENSI_GITHUB_TOKEN";
let clockTimer = null;

window.addEventListener("DOMContentLoaded", () => {
  safeBoot();
});

function safeBoot() {
  try {
    initClock();
    initEmployees();
    restoreToken();
    resetCaptureUI();
    showPage("dashboard");
  } catch (error) {
    console.error(error);
    alert(`Terjadi error saat memuat aplikasi: ${error.message}`);
  }
}

function initClock() {
  const tick = () => {
    const now = new Date();
    const clockEl = el("clock");
    const todayEl = el("today");

    if (!clockEl || !todayEl) return;

    clockEl.textContent = now
      .toLocaleTimeString("id-ID", { hour12: false })
      .replace(/\./g, ":");

    todayEl.textContent = now.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }).toUpperCase();
  };

  tick();

  if (clockTimer) clearInterval(clockTimer);
  clockTimer = setInterval(tick, 1000);
}

function initEmployees() {
  const select = el("employee");
  if (!select) return;

  const list = (typeof EMPLOYEES !== "undefined" && Array.isArray(EMPLOYEES)) ? EMPLOYEES : [];

  select.innerHTML = '<option value="" disabled selected>-- Pilih Nama Anda --</option>';
  list.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

function showPage(page) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));

  const target = el(`page-${page}`);
  if (target) target.classList.add("active");

  if (page === "dashboard") stopCamera();
}

function restoreToken() {
  const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
  const fromConfig = (typeof CONFIG !== "undefined" ? (CONFIG.TOKEN || "") : "").trim();
  if (!stored && fromConfig) localStorage.setItem(TOKEN_STORAGE_KEY, fromConfig);
}

function getToken() {
  return (localStorage.getItem(TOKEN_STORAGE_KEY) || (typeof CONFIG !== "undefined" ? CONFIG.TOKEN : "") || "").trim();
}

function setToken(token) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
  state.tokenOk = false;
}

function githubHeaders(json = false) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    Authorization: `Bearer ${getToken()}`
  };

  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function fetchTimeout(url, options = {}, timeout = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function toB64Unicode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function fromB64Unicode(str) {
  return decodeURIComponent(escape(atob(str)));
}

function errorMessage(status, fallback = "") {
  if (status === 401) return "Token GitHub tidak valid / expired.";
  if (status === 403) return "Token tidak punya izin menulis (repo / Contents RW).";
  if (status === 404) return "Repo/path tidak ditemukan atau akses ditolak.";
  if (status === 409) return "Konflik update data, silakan ulangi.";
  return fallback || `HTTP ${status}`;
}

async function ensureToken() {
  if (state.tokenOk) return;

  const res = await fetchTimeout("https://api.github.com/user", {
    headers: githubHeaders()
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(errorMessage(res.status, detail.message));
  }

  state.tokenOk = true;
}

async function startAbsensi(type) {
  if (!el("employee")?.value) {
    alert("Pilih nama pegawai dulu.");
    return;
  }

  state.type = type;
  showPage("absen");
  resetCaptureUI();

  await Promise.allSettled([startCamera(), detectLocation()]);
}

async function startCamera() {
  const video = el("camera");
  if (!video) return;

  stopCamera();

  const constraintsList = [
    { video: { facingMode: (typeof CONFIG !== "undefined" ? CONFIG.CAMERA_FACING_MODE : "user") || "user" }, audio: false },
    { video: true, audio: false }
  ];

  let stream = null;
  let lastErr = null;

  for (const constraints of constraintsList) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      break;
    } catch (err) {
      lastErr = err;
    }
  }

  if (!stream) {
    alert(`Kamera gagal dibuka: ${lastErr?.message || "Izin kamera ditolak"}`);
    return;
  }

  state.stream = stream;
  video.srcObject = stream;

  try {
    await video.play();
  } catch {
    // ignore autoplay issue on some browsers
  }
}

function stopCamera() {
  if (!state.stream) return;
  state.stream.getTracks().forEach((track) => track.stop());
  state.stream = null;
}

function detectLocation() {
  return new Promise((resolve) => {
    const label = el("locationText");

    if (!navigator.geolocation) {
      state.address = "GPS tidak didukung browser ini";
      if (label) label.textContent = state.address;
      resolve();
      return;
    }

    const timeoutId = setTimeout(() => {
      state.address = "GPS timeout, cek izin lokasi";
      if (label) label.textContent = state.address;
      resolve();
    }, 12000);

    navigator.geolocation.getCurrentPosition(async (pos) => {
      clearTimeout(timeoutId);
      state.lat = pos.coords.latitude;
      state.lng = pos.coords.longitude;

      try {
        const r = await fetchTimeout(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${state.lat}&lon=${state.lng}`,
          {},
          10000
        );
        const j = await r.json();
        state.address = j.display_name || `${state.lat}, ${state.lng}`;
      } catch {
        state.address = `${state.lat}, ${state.lng}`;
      }

      if (label) label.textContent = state.address;
      resolve();
    }, () => {
      clearTimeout(timeoutId);
      state.address = "Izin lokasi ditolak / lokasi tidak tersedia";
      if (label) label.textContent = state.address;
      resolve();
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  });
}

function capturePhoto() {
  const video = el("camera");
  const canvas = el("canvas");

  if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
    alert("Kamera belum siap, tunggu sebentar lalu coba lagi.");
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0);

  state.photoBase64 = canvas.toDataURL("image/jpeg", (typeof CONFIG !== "undefined" ? CONFIG.IMAGE_QUALITY : 0.45) || 0.45);

  const photo = el("photo");
  if (photo) {
    photo.src = state.photoBase64;
    photo.classList.remove("hidden");
  }

  video.classList.add("hidden");
  el("btnCapture")?.classList.add("hidden");
  el("postCapture")?.classList.remove("hidden");
}

function retakePhoto() {
  state.photoBase64 = "";
  resetCaptureUI();
}

function resetCaptureUI() {
  el("camera")?.classList.remove("hidden");
  el("photo")?.classList.add("hidden");
  el("btnCapture")?.classList.remove("hidden");
  el("postCapture")?.classList.add("hidden");
}

function cancelAbsensi() {
  stopCamera();
  state.photoBase64 = "";
  state.type = "";
  state.lat = null;
  state.lng = null;
  state.address = "Mendeteksi lokasi...";
  if (el("locationText")) el("locationText").textContent = state.address;
  showPage("dashboard");
}

function buildPayload() {
  const now = new Date();
  return {
    nama: el("employee")?.value || "",
    tanggal: now.toLocaleDateString("id-ID"),
    jam: now.toLocaleTimeString("id-ID"),
    tipe: state.type.toUpperCase(),
    status: state.type === "masuk" ? (now.getHours() < 8 ? "Hadir" : "Terlambat") : "Pulang",
    lokasi: state.address,
    latitude: state.lat,
    longitude: state.lng,
    foto: state.photoBase64,
    createdAt: now.toISOString()
  };
}

function aggregateUrl() {
  return `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.DATA_FILE}`;
}

function recordUrl(payload) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const slug = payload.nama.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "pegawai";
  const path = `data/records/${y}/${m}/${d}/${Date.now()}-${slug}.json`;
  return `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${path}`;
}

async function saveRecord(payload) {
  const res = await fetchTimeout(recordUrl(payload), {
    method: "PUT",
    headers: githubHeaders(true),
    body: JSON.stringify({
      message: `Absensi record: ${payload.nama}`,
      content: toB64Unicode(JSON.stringify(payload, null, 2)),
      branch: CONFIG.BRANCH
    })
  }, 20000);

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(errorMessage(res.status, detail.message));
  }
}

async function readAggregate() {
  const res = await fetchTimeout(aggregateUrl(), { headers: githubHeaders() });
  if (res.status === 404) return { sha: "", rows: [] };

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(errorMessage(res.status, detail.message));
  }

  const file = await res.json();
  return { sha: file.sha, rows: JSON.parse(fromB64Unicode(file.content)) };
}

async function writeAggregate(rows, sha, name) {
  const res = await fetchTimeout(aggregateUrl(), {
    method: "PUT",
    headers: githubHeaders(true),
    body: JSON.stringify({
      message: `Absen: ${name}`,
      content: toB64Unicode(JSON.stringify(rows, null, 2)),
      ...(sha ? { sha } : {}),
      branch: CONFIG.BRANCH
    })
  }, 20000);

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(errorMessage(res.status, detail.message));
  }
}

async function saveAggregateRetry(payload, retries = 3) {
  for (let i = 0; i <= retries; i += 1) {
    try {
      const { sha, rows } = await readAggregate();
      rows.push(payload);
      await writeAggregate(rows, sha, payload.nama);
      return;
    } catch (err) {
      const msg = String(err.message || "");
      if (!msg.includes("Konflik") || i === retries) throw err;
      await new Promise((r) => setTimeout(r, 500 + i * 500));
    }
  }
}

async function submitAbsensi() {
  if (state.loading) return;
  if (!state.photoBase64) {
    alert("Ambil foto dulu sebelum kirim.");
    return;
  }

  const token = getToken();
  if (!token) {
    const fromPrompt = prompt("Token GitHub belum ada. Masukkan token:");
    if (!fromPrompt) return;
    setToken(fromPrompt);
  }

  state.loading = true;
  el("btnSubmit").disabled = true;
  el("btnSubmit").textContent = "⏳ Mengirim...";

  const payload = buildPayload();

  try {
    await ensureToken();
    await saveRecord(payload);
    await saveAggregateRetry(payload);
    alert("✅ Absensi berhasil disimpan ke GitHub.");
    cancelAbsensi();
  } catch (err) {
    alert(`❌ ${err.message}`);
  } finally {
    state.loading = false;
    el("btnSubmit").disabled = false;
    el("btnSubmit").textContent = "✓ Kirim Data";
  }
}

function adminLogin() {
  const pass = el("adminPassword")?.value;
  if (pass !== CONFIG.ADMIN_PASSWORD) {
    alert("Password admin salah.");
    return;
  }

  el("adminLogin")?.classList.add("hidden");
  el("adminPanel")?.classList.remove("hidden");
  loadAdminTable();
}

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function loadAdminTable() {
  const tbody = el("adminTableBody");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Memuat...</td></tr>';

  try {
    await ensureToken();
    const { rows } = await readAggregate();
    state.adminRows = rows.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    if (!state.adminRows.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Belum ada data.</td></tr>';
      return;
    }

    tbody.innerHTML = state.adminRows.map((r) => {
      const photo = r.foto
        ? `<img class="photo-thumb mx-auto" src="${r.foto}" alt="foto" onclick="window.open('${r.foto}','_blank')">`
        : "-";

      return `
        <tr class="border-b border-slate-100">
          <td class="p-3">${esc(r.nama)}</td>
          <td class="p-3">${esc(`${r.tanggal || ""} ${r.jam || ""}`)}</td>
          <td class="p-3">${esc(r.tipe)}</td>
          <td class="p-3">${esc(r.status)}</td>
          <td class="p-3 text-center">${photo}</td>
        </tr>`;
    }).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-600">${esc(err.message)}</td></tr>`;
  }
}

function exportToCSV() {
  if (!state.adminRows.length) {
    alert("Data kosong.");
    return;
  }

  const headers = ["Nama", "Tanggal", "Jam", "Tipe", "Status", "Lokasi", "Latitude", "Longitude", "CreatedAt"];
  const rows = state.adminRows.map((r) => [
    r.nama || "",
    r.tanggal || "",
    r.jam || "",
    r.tipe || "",
    r.status || "",
    r.lokasi || "",
    r.latitude ?? "",
    r.longitude ?? "",
    r.createdAt || ""
  ]);

  const csv = [headers, ...rows]
    .map((line) => line.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);

  a.href = url;
  a.download = `rekap-absensi-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function el(id) {
  return document.getElementById(id);
}
