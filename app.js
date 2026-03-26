let gpsLoaded = false;
let stream = null;
let photoBase64 = "";
let absenType = ""; 
let currentLocation = { lat: null, lng: null, address: "", accuracy: 0, fake_status: "Aman" }; 

let rawAdminData = []; // Menyimpan semua data asli dari GitHub
let adminDataGlobal = []; // Menyimpan data yang sudah di-filter untuk didownload

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

function evaluateTime(type) {
  const now = new Date();
  const day = now.getDay(); 
  const hours = now.getHours();
  const minutes = now.getMinutes();
  
  const timeFloat = hours + (minutes / 60);

  if (type === 'masuk') {
    if (timeFloat < 7.0) {
      return { allowed: false, msg: "Belum waktunya! Absen masuk baru dibuka jam 07.00 WIB." };
    }

    if (day !== 5) { 
      if (timeFloat <= 7.5) { 
        return { allowed: true, status: "Tepat Waktu" };
      } else { 
        return { allowed: true, status: "Terlambat" };
      }
    } else { 
      return { allowed: true, status: "Masuk (Jumat)" };
    }
  } 
  else if (type === 'pulang') {
    if (timeFloat > 17.5) {
      return { allowed: false, msg: "Absen pulang ditolak! Batas maksimal absen pulang adalah 17.30 WIB." };
    }
    
    if (timeFloat < 15.5) { 
      return { allowed: true, status: "Pulang Lebih Cepat" };
    } else { 
      return { allowed: true, status: "Tepat Waktu" };
    }
  }
  return { allowed: true, status: "-" };
}

async function startAbsensi(type) {
  const selectedEmployee = document.getElementById("employee").value;
  
  if (!selectedEmployee) {
    alert("Silakan pilih nama terlebih dahulu!");
    return;
  }

  const timeCheck = evaluateTime(type);
  if (!timeCheck.allowed) {
    alert(timeCheck.msg);
    return;
  }

  absenType = type; 
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
  const locText = document.getElementById("locationText");
  locText.innerHTML = "Menghubungkan ke Satelit GPS (Menghindari Fake GPS)...";
  
  const geoOptions = {
    enableHighAccuracy: true, 
    maximumAge: 0,            
    timeout: 15000            
  };

  navigator.geolocation.getCurrentPosition(
    async pos => {
      gpsLoaded = true;
      currentLocation.lat = pos.coords.latitude;
      currentLocation.lng = pos.coords.longitude;
      currentLocation.accuracy = pos.coords.accuracy;

      if (pos.coords.altitude === null && pos.coords.accuracy < 5) {
        currentLocation.fake_status = "⚠️ Terindikasi Fake GPS";
      } else {
        currentLocation.fake_status = "Aman";
      }
      
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLocation.lat}&lon=${currentLocation.lng}&zoom=18&addressdetails=1`);
        const data = await response.json();
        
        if (data && data.address) {
          const addr = data.address;
          const dusun = addr.hamlet || addr.neighbourhood || "";
          const desa = addr.village || addr.suburb || addr.residential || "";
          const kecamatan = addr.town || addr.city_district || "";
          const kota = addr.city || addr.county || addr.state_district || "";
          
          const addressParts = [dusun, desa, kecamatan, kota].filter(part => part !== "");
          currentLocation.address = addressParts.join(", ");
        } else {
          currentLocation.address = "Alamat detail tidak ditemukan";
        }
      } catch (error) {
        console.error("Gagal mengambil alamat:", error);
        currentLocation.address = "Gagal memuat alamat dari server";
      }

      let statusHtml = currentLocation.fake_status === "Aman" 
          ? `<span class="text-green-600 font-bold">✓ GPS Asli (Akurasi: ${Math.round(currentLocation.accuracy)}m)</span>`
          : `<span class="text-red-600 font-bold bg-red-100 p-1 rounded block mt-1">${currentLocation.fake_status} - Absen Ditangguhkan</span>`;

      locText.innerHTML = `
        <span class="font-bold text-blue-900">Lat: ${currentLocation.lat.toFixed(5)}, Lng: ${currentLocation.lng.toFixed(5)}</span><br>
        <span class="text-xs text-gray-600 mt-1 block">${currentLocation.address}</span>
        <div class="mt-2 text-xs">${statusHtml}</div>
      `;
    },
    err => {
      locText.innerHTML = `<span class="text-red-600 font-bold">Gagal mendapatkan lokasi. Pastikan GPS HP menyala (High Accuracy) dan izinkan akses di Browser.</span>`;
      console.error(err);
    },
    geoOptions 
  );
}

function capturePhoto() {
  const video = document.getElementById("camera");
  const canvas = document.getElementById("canvas");

  canvas.width = 320; 
  canvas.height = 240;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  photoBase64 = canvas.toDataURL("image/jpeg", 0.6);

  document.getElementById("photo").src = photoBase64;
  document.getElementById("photo").classList.remove("hidden");
  document.getElementById("camera").classList.add("hidden");

  document.getElementById("btnCapture").classList.add("hidden");
  document.getElementById("postCapture").classList.remove("hidden");
}

function retakePhoto() {
  document.getElementById("photo").classList.add("hidden");
  document.getElementById("camera").classList.remove("hidden");
  
  document.getElementById("btnCapture").classList.remove("hidden");
  document.getElementById("postCapture").classList.add("hidden");
}

function cancelAbsensi() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
  }
  
  document.getElementById("photo").classList.add("hidden");
  document.getElementById("camera").classList.remove("hidden");
  document.getElementById("btnCapture").classList.remove("hidden");
  document.getElementById("postCapture").classList.add("hidden");
  document.getElementById("locationText").innerHTML = "Mendeteksi lokasi...";
  
  gpsLoaded = false;
  showPage("dashboard");
}

async function submitAbsensi() {
  const employeeName = document.getElementById("employee").value;
  const btnSubmit = document.getElementById("btnSubmit");
  
  const timeCheck = evaluateTime(absenType);
  if (!timeCheck.allowed) {
    alert(timeCheck.msg);
    return;
  }

  if (!currentLocation.lat) {
    alert("Titik GPS belum ditemukan! Tunggu sebentar atau pastikan GPS HP menyala.");
    return;
  }

  if (currentLocation.fake_status !== "Aman") {
    alert("🚫 AKSES DITOLAK!\n\nSistem mendeteksi penggunaan Fake GPS / Mock Location.\nSilakan matikan aplikasi pemalsu lokasi, muat ulang halaman ini, dan gunakan GPS asli perangkat Anda untuk melakukan absensi.");
    return; 
  }

  btnSubmit.innerText = "⏳ Sedang Menyimpan...";
  btnSubmit.disabled = true;

  const newRecord = {
    id: Date.now(),
    waktu: new Date().toISOString(),
    nama: employeeName,
    tipe: absenType,
    status_waktu: timeCheck.status,
    lat: currentLocation.lat,
    lng: currentLocation.lng,
    lokasi: currentLocation.address,
    gps_status: currentLocation.fake_status, 
    foto: photoBase64 
  };

  try {
    await saveToGitHub(newRecord);
    alert(`Berhasil! Absen ${absenType.toUpperCase()} atas nama ${employeeName} tersimpan.`);
    cancelAbsensi(); 
  } catch (error) {
    console.error(error);
    alert("Gagal menyimpan data! Pastikan Token GitHub di config.js sudah benar dan aktif.");
  } finally {
    btnSubmit.innerText = "✈️ Kirim Absen";
    btnSubmit.disabled = false;
  }
}

async function saveToGitHub(newRecord) {
  if (!CONFIG.TOKEN) throw new Error("Token belum diisi!");

  const url = `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.DATA_FILE}`;
  const headers = {
    "Authorization": `token ${CONFIG.TOKEN}`,
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json"
  };

  let sha = "";
  let existingData = [];

  try {
    const getRes = await fetch(url, { method: "GET", headers });
    if (getRes.ok) {
      const fileData = await getRes.json();
      sha = fileData.sha;
      const decodedContent = decodeURIComponent(escape(atob(fileData.content)));
      existingData = JSON.parse(decodedContent);
    }
  } catch (e) {
    console.log("Membuat file baru karena file belum ada.");
  }

  existingData.push(newRecord);

  const updatedContent = btoa(unescape(encodeURIComponent(JSON.stringify(existingData, null, 2))));

  const body = {
    message: `Absen ${newRecord.tipe.toUpperCase()} - ${newRecord.nama}`,
    content: updatedContent,
    branch: CONFIG.BRANCH
  };

  if (sha) body.sha = sha;

  const putRes = await fetch(url, { method: "PUT", headers, body: JSON.stringify(body) });
  if (!putRes.ok) throw new Error("Gagal push ke GitHub");
}

// === FUNGSI ADMIN ===
async function adminLogin() {
  const pass = document.getElementById("adminPassword").value;
  if(pass === CONFIG.ADMIN_PASSWORD) {
    document.getElementById("adminPassword").value = "Memuat data dari GitHub...";
    await loadAdminData();
    
    document.getElementById("adminLoginArea").classList.add("hidden");
    document.getElementById("adminControls").classList.remove("hidden");
    document.getElementById("adminControls").classList.add("flex");
  } else {
    alert("Password salah!");
  }
}

async function loadAdminData() {
  const url = `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.DATA_FILE}`;
  const headers = {
    "Authorization": `token ${CONFIG.TOKEN}`,
    "Accept": "application/vnd.github.v3+json"
  };

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Gagal load data");
    const fileData = await res.json();
    const decodedContent = decodeURIComponent(escape(atob(fileData.content)));
    
    const parsedData = JSON.parse(decodedContent);
    rawAdminData = parsedData.reverse(); 
    adminDataGlobal = [...rawAdminData]; 
    
    renderAdminTable();
  } catch (e) {
    console.error(e);
    alert("Belum ada data absensi atau gagal memuat data.");
  }
}

// === FUNGSI FILTER TANGGAL ===
function applyFilter() {
  const startDate = document.getElementById("filterStart").value;
  const endDate = document.getElementById("filterEnd").value;

  if (!startDate && !endDate) {
    alert("Silakan pilih minimal satu tanggal untuk melakukan filter!");
    return;
  }

  adminDataGlobal = rawAdminData.filter(d => {
    const dateStr = d.waktu.split('T')[0]; 
    
    if (startDate && endDate) {
      return dateStr >= startDate && dateStr <= endDate;
    } else if (startDate) {
      return dateStr >= startDate;
    } else if (endDate) {
      return dateStr <= endDate;
    }
    return true;
  });

  renderAdminTable();
}

function resetFilter() {
  document.getElementById("filterStart").value = "";
  document.getElementById("filterEnd").value = "";
  adminDataGlobal = [...rawAdminData];
  renderAdminTable();
}

// === FUNGSI RENDER TABEL ===
function renderAdminTable() {
  const tbody = document.getElementById("adminTableBody");
  tbody.innerHTML = `
    <tr class="bg-blue-100 text-sm">
      <th class="p-2 border">Waktu</th>
      <th class="p-2 border">Nama</th>
      <th class="p-2 border">Tipe</th>
      <th class="p-2 border">Status Kehadiran</th>
      <th class="p-2 border">Validasi GPS</th>
      <th class="p-2 border">Lokasi</th>
      <th class="p-2 border text-center">Foto</th>
    </tr>
  `;
  
  if (adminDataGlobal.length === 0) {
    tbody.innerHTML += `<tr><td colspan="7" class="text-center p-4 text-gray-500 font-bold">Tidak ada data absensi pada rentang tanggal tersebut.</td></tr>`;
    return;
  }

  adminDataGlobal.forEach(d => {
    const date = new Date(d.waktu).toLocaleString("id-ID");
    const fotoTag = d.foto ? `<img src="${d.foto}" class="w-10 h-10 object-cover rounded hover:scale-150 transition mx-auto cursor-pointer">` : "-";
    
    let statusColor = "text-gray-700";
    if (d.status_waktu === "Tepat Waktu") statusColor = "text-green-600";
    if (d.status_waktu === "Terlambat") statusColor = "text-red-600";
    if (d.status_waktu === "Pulang Lebih Cepat") statusColor = "text-orange-500";

    let gpsColor = d.gps_status === "Aman" ? "text-green-600" : "text-red-600 font-bold bg-red-100 p-1 rounded";
    
    tbody.innerHTML += `
      <tr class="border-b text-sm hover:bg-gray-50">
        <td class="p-2 border whitespace-nowrap">${date}</td>
        <td class="p-2 border font-semibold whitespace-nowrap">${d.nama}</td>
        <td class="p-2 border text-center font-bold ${d.tipe === 'masuk' ? 'text-blue-600' : 'text-emerald-600'}">${d.tipe.toUpperCase()}</td>
        <td class="p-2 border text-center font-bold ${statusColor} whitespace-nowrap">${d.status_waktu || "-"}</td>
        <td class="p-2 border text-xs text-center ${gpsColor} whitespace-nowrap">${d.gps_status || "Aman"}</td>
        <td class="p-2 border text-xs text-gray-600 min-w-[200px]">${d.lokasi}</td>
        <td class="p-2 border text-center">${fotoTag}</td>
      </tr>
    `;
  });
}

// === HELPER EXPORT ===
function formatDateTimeIndonesia(dateString) {
  const d = new Date(dateString);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).replace(/\./g, ":");
}

function formatPeriodeText(startStr, endStr) {
  if (startStr && endStr) return `Periode: ${startStr} s.d. ${endStr}`;
  if (startStr) return `Periode: ${startStr} s.d. ${startStr}`;
  return "Periode: Semua Waktu";
}

function getExportFileSuffix() {
  const startStr = document.getElementById("filterStart").value;
  const endStr = document.getElementById("filterEnd").value;

  let fileSuffix = new Date().toLocaleDateString("id-ID").replace(/\//g, "-");
  if (startStr) fileSuffix = `${startStr}_sd_${endStr || startStr}`;
  return fileSuffix;
}

// === EXPORT EXCEL DENGAN FOTO (FORMAT BARU A4) ===
async function downloadExcel() {
  if (adminDataGlobal.length === 0) return alert("Tidak ada data untuk diunduh!");

  const btn = document.querySelector('button[onclick="downloadExcel()"]');
  const originalText = btn.innerText;
  btn.innerText = "⏳ Memproses Excel...";
  btn.disabled = true;

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Rekap Absensi WFA");

    worksheet.pageSetup = {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2
      }
    };

    worksheet.properties.defaultRowHeight = 20;
    worksheet.views = [{ showGridLines: true }];

    worksheet.columns = [
      { key: "waktu", width: 22 },
      { key: "nama", width: 34 },
      { key: "tipe", width: 14 },
      { key: "status", width: 20 },
      { key: "gps", width: 16 },
      { key: "lokasi", width: 42 },
      { key: "foto", width: 16 }
    ];

    worksheet.mergeCells("A1:G1");
    worksheet.getCell("A1").value = "REKAP ABSENSI WFA";
    worksheet.getCell("A1").font = { name: "Arial", size: 14, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

    worksheet.mergeCells("A2:G2");
    worksheet.getCell("A2").value = "Badan Penanggulangan Bencana Daerah (BPBD) Trenggalek";
    worksheet.getCell("A2").font = { name: "Arial", size: 11 };
    worksheet.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

    const startStr = document.getElementById("filterStart").value;
    const endStr = document.getElementById("filterEnd").value;

    worksheet.mergeCells("A3:G3");
    worksheet.getCell("A3").value = formatPeriodeText(startStr, endStr);
    worksheet.getCell("A3").font = { name: "Arial", size: 10 };
    worksheet.getCell("A3").alignment = { horizontal: "left", vertical: "middle" };

    const headerRowNumber = 5;
    const headers = [
      "Waktu Absen",
      "Nama Pegawai",
      "Tipe Absen",
      "Status Kehadiran",
      "Validasi GPS",
      "Lokasi (GPS)",
      "Foto Wajah"
    ];

    const headerRow = worksheet.getRow(headerRowNumber);
    headers.forEach((h, i) => {
      headerRow.getCell(i + 1).value = h;
    });
    headerRow.height = 24;

    for (let col = 1; col <= 7; col++) {
      const cell = headerRow.getCell(col);
      cell.font = { name: "Arial", size: 10, bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "D9EAF7" }
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };
    }

    let currentRow = headerRowNumber + 1;

    adminDataGlobal.forEach((d) => {
      const row = worksheet.getRow(currentRow);

      row.getCell(1).value = formatDateTimeIndonesia(d.waktu);
      row.getCell(2).value = d.nama || "";
      row.getCell(3).value = (d.tipe || "").toUpperCase();
      row.getCell(4).value = d.status_waktu || "-";
      row.getCell(5).value = d.gps_status || "Aman";
      row.getCell(6).value = d.lokasi || "";
      row.getCell(7).value = "";

      row.height = 52;

      for (let col = 1; col <= 7; col++) {
        const cell = row.getCell(col);
        cell.font = { name: "Arial", size: 10 };
        cell.alignment = {
          horizontal: col === 6 ? "left" : "center",
          vertical: "middle",
          wrapText: true
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
      }

      if (d.status_waktu === "Tepat Waktu") {
        row.getCell(4).font = { name: "Arial", size: 10, bold: true, color: { argb: "008000" } };
      } else if (d.status_waktu === "Terlambat") {
        row.getCell(4).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0000" } };
      } else if (d.status_waktu === "Pulang Lebih Cepat") {
        row.getCell(4).font = { name: "Arial", size: 10, bold: true, color: { argb: "E67E22" } };
      } else {
        row.getCell(4).font = { name: "Arial", size: 10, bold: true };
      }

      if ((d.gps_status || "Aman") !== "Aman") {
        row.getCell(5).font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0000" } };
        row.getCell(5).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE5E5" }
        };
      }

      if (d.foto) {
        try {
          const imageId = workbook.addImage({
            base64: d.foto,
            extension: "jpeg"
          });

          worksheet.addImage(imageId, {
            tl: { col: 6.15, row: currentRow - 0.85 },
            ext: { width: 55, height: 40 }
          });
        } catch (err) {
          console.error("Gagal menambahkan foto di Excel:", err);
        }
      }

      currentRow++;
    });

    const signStartRow = currentRow + 2;

    worksheet.mergeCells(`E${signStartRow}:G${signStartRow}`);
    worksheet.getCell(`E${signStartRow}`).value = "Trenggalek, ........";
    worksheet.getCell(`E${signStartRow}`).font = { name: "Arial", size: 11 };
    worksheet.getCell(`E${signStartRow}`).alignment = { horizontal: "center", vertical: "middle" };

    worksheet.mergeCells(`E${signStartRow + 1}:G${signStartRow + 1}`);
    worksheet.getCell(`E${signStartRow + 1}`).value = "Kepala Pelaksana";
    worksheet.getCell(`E${signStartRow + 1}`).font = { name: "Arial", size: 11 };
    worksheet.getCell(`E${signStartRow + 1}`).alignment = { horizontal: "center", vertical: "middle" };

    worksheet.mergeCells(`E${signStartRow + 2}:G${signStartRow + 2}`);
    worksheet.getCell(`E${signStartRow + 2}`).value = "Badan Penanggulangan Bencana Daerah";
    worksheet.getCell(`E${signStartRow + 2}`).font = { name: "Arial", size: 11 };
    worksheet.getCell(`E${signStartRow + 2}`).alignment = { horizontal: "center", vertical: "middle" };

    worksheet.mergeCells(`E${signStartRow + 3}:G${signStartRow + 3}`);
    worksheet.getCell(`E${signStartRow + 3}`).value = "Kabupaten Trenggalek";
    worksheet.getCell(`E${signStartRow + 3}`).font = { name: "Arial", size: 11 };
    worksheet.getCell(`E${signStartRow + 3}`).alignment = { horizontal: "center", vertical: "middle" };

    worksheet.getRow(signStartRow + 4).height = 18;
    worksheet.getRow(signStartRow + 5).height = 18;
    worksheet.getRow(signStartRow + 6).height = 18;
    worksheet.getRow(signStartRow + 7).height = 18;

    worksheet.mergeCells(`E${signStartRow + 8}:G${signStartRow + 8}`);
    worksheet.getCell(`E${signStartRow + 8}`).value = "Drs. STEFANUS TRIADI ATMONO, M.Si";
    worksheet.getCell(`E${signStartRow + 8}`).font = { name: "Arial", size: 11, bold: true, underline: true };
    worksheet.getCell(`E${signStartRow + 8}`).alignment = { horizontal: "center", vertical: "middle" };

    worksheet.mergeCells(`E${signStartRow + 9}:G${signStartRow + 9}`);
    worksheet.getCell(`E${signStartRow + 9}`).value = "Pembina Utama Muda";
    worksheet.getCell(`E${signStartRow + 9}`).font = { name: "Arial", size: 11 };
    worksheet.getCell(`E${signStartRow + 9}`).alignment = { horizontal: "center", vertical: "middle" };

    worksheet.mergeCells(`E${signStartRow + 10}:G${signStartRow + 10}`);
    worksheet.getCell(`E${signStartRow + 10}`).value = "NIP. 19700907 199003 1 006";
    worksheet.getCell(`E${signStartRow + 10}`).font = { name: "Arial", size: 11 };
    worksheet.getCell(`E${signStartRow + 10}`).alignment = { horizontal: "center", vertical: "middle" };

    const fileSuffix = getExportFileSuffix();
    const fileName = `Rekap_Absensi_BPBD_${fileSuffix}.xlsx`;

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), fileName);

  } catch (error) {
    console.error("Gagal export Excel:", error);
    alert("Terjadi kesalahan saat membuat file Excel.");
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
}

// === EXPORT PDF DENGAN FOTO (FORMAT BARU A4) ===
function downloadPDF() {
  if (adminDataGlobal.length === 0) return alert("Tidak ada data untuk diunduh!");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 10;
  const marginRight = 10;

  const startStr = document.getElementById("filterStart").value;
  const endStr = document.getElementById("filterEnd").value;
  const periodeTxt = formatPeriodeText(startStr, endStr);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("REKAP ABSENSI WFA", pageWidth / 2, 12, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Badan Penanggulangan Bencana Daerah (BPBD) Trenggalek", pageWidth / 2, 18, { align: "center" });

  doc.setFontSize(10);
  doc.text(periodeTxt, marginLeft, 26);

  const tableColumn = [
    "Waktu Absen",
    "Nama Pegawai",
    "Tipe Absen",
    "Status Kehadiran",
    "Validasi GPS",
    "Lokasi (GPS)",
    "Foto Wajah"
  ];

  const tableRows = adminDataGlobal.map(d => {
    const row = [
      formatDateTimeIndonesia(d.waktu),
      d.nama || "",
      (d.tipe || "").toUpperCase(),
      d.status_waktu || "-",
      d.gps_status || "Aman",
      d.lokasi || "",
      ""
    ];
    row.fotoBase64 = d.foto || "";
    return row;
  });

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 30,
    margin: { left: marginLeft, right: marginRight },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      valign: "middle",
      textColor: [0, 0, 0],
      overflow: "linebreak"
    },
    headStyles: {
      fillColor: [217, 234, 247],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.2
    },
    bodyStyles: {
      halign: "center",
      valign: "middle"
    },
    columnStyles: {
      0: { cellWidth: 27 },
      1: { cellWidth: 42 },
      2: { cellWidth: 18 },
      3: { cellWidth: 23 },
      4: { cellWidth: 18 },
      5: { cellWidth: 86, halign: "left" },
      6: { cellWidth: 22 }
    },
    didParseCell: function (data) {
      if (data.section === "body") {
        data.row.height = 18;

        if (data.column.index === 3) {
          const value = String(data.cell.raw || "");
          if (value === "Tepat Waktu") {
            data.cell.styles.textColor = [0, 128, 0];
            data.cell.styles.fontStyle = "bold";
          } else if (value === "Terlambat") {
            data.cell.styles.textColor = [255, 0, 0];
            data.cell.styles.fontStyle = "bold";
          } else if (value === "Pulang Lebih Cepat") {
            data.cell.styles.textColor = [230, 126, 34];
            data.cell.styles.fontStyle = "bold";
          }
        }

        if (data.column.index === 4) {
          const value = String(data.cell.raw || "");
          if (value !== "Aman") {
            data.cell.styles.textColor = [255, 0, 0];
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [255, 230, 230];
          }
        }
      }
    },
    didDrawCell: function (data) {
      if (data.section === "body" && data.column.index === 6) {
        const imgBase64 = data.row.raw.fotoBase64;
        if (imgBase64) {
          try {
            doc.addImage(
              imgBase64,
              "JPEG",
              data.cell.x + 1.5,
              data.cell.y + 1.5,
              18,
              14
            );
          } catch (e) {
            console.error("Gagal menambahkan foto PDF:", e);
          }
        }
      }
    }
  });

  let finalY = doc.lastAutoTable.finalY + 12;

  if (finalY + 40 > pageHeight) {
    doc.addPage();
    finalY = 20;
  }

  const signX = 220;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Trenggalek, ........", signX, finalY);
  doc.text("Kepala Pelaksana", signX, finalY + 6);
  doc.text("Badan Penanggulangan Bencana Daerah", signX, finalY + 12);
  doc.text("Kabupaten Trenggalek", signX, finalY + 18);

  doc.text("Drs. STEFANUS TRIADI ATMONO, M.Si", signX, finalY + 42);
  const nameWidth = doc.getTextWidth("Drs. STEFANUS TRIADI ATMONO, M.Si");
  doc.line(signX, finalY + 43, signX + nameWidth, finalY + 43);

  doc.text("Pembina Utama Muda", signX, finalY + 48);
  doc.text("NIP. 19700907 199003 1 006", signX, finalY + 54);

  const fileSuffix = getExportFileSuffix();
  const fileName = `Rekap_Absensi_BPBD_${fileSuffix}.pdf`;
  doc.save(fileName);
}
