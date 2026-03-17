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
    // Simpan data asli ke rawAdminData
    rawAdminData = parsedData.reverse(); 
    // Duplikat ke adminDataGlobal untuk dirender
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
    // d.waktu formatnya "2026-03-17T08:00:00.000Z"
    // Kita ambil cuma tanggalnya aja (YYYY-MM-DD)
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
  adminDataGlobal = [...rawAdminData]; // Kembalikan ke data asli
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

// === EXPORT EXCEL DENGAN FOTO ===
async function downloadExcel() {
  if (adminDataGlobal.length === 0) return alert("Tidak ada data untuk diunduh!");

  const btn = document.querySelector('button[onclick="downloadExcel()"]');
  const originalText = btn.innerText;
  btn.innerText = "⏳ Memproses Excel...";
  btn.disabled = true;

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data Absensi");

    worksheet.columns = [
      { header: "Waktu Absen", key: "waktu", width: 22 },
      { header: "Nama Pegawai", key: "nama", width: 35 },
      { header: "Tipe Absen", key: "tipe", width: 15 },
      { header: "Status Kehadiran", key: "status", width: 20 },
      { header: "Validasi GPS", key: "gps", width: 25 },
      { header: "Lokasi (GPS)", key: "lokasi", width: 50 },
      { header: "Foto Wajah", key: "foto", width: 15 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    adminDataGlobal.forEach((d, index) => {
      const row = worksheet.addRow({
        waktu: new Date(d.waktu).toLocaleString("id-ID"),
        nama: d.nama,
        tipe: d.tipe.toUpperCase(),
        status: d.status_waktu || "-",
        gps: d.gps_status || "Aman",
        lokasi: d.lokasi
      });
      
      row.height = 65;
      row.alignment = { vertical: 'middle' };

      if (d.gps_status && d.gps_status !== "Aman") {
         row.getCell('gps').fill = {
           type: 'pattern',
           pattern: 'solid',
           fgColor: { argb: 'FFFFCCCC' } 
         };
         row.getCell('gps').font = { color: { argb: 'FFFF0000' }, bold: true };
      }

      if (d.foto) {
        const imageId = workbook.addImage({ base64: d.foto, extension: 'jpeg' });
        worksheet.addImage(imageId, {
          tl: { col: 6, row: index + 1 }, 
          ext: { width: 80, height: 60 }
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    
    // Penamaan file dinamis berdasarkan filter
    const startStr = document.getElementById("filterStart").value;
    const endStr = document.getElementById("filterEnd").value;
    let fileSuffix = new Date().toLocaleDateString("id-ID").replace(/\//g, "-");
    if(startStr) fileSuffix = `${startStr}_sd_${endStr || startStr}`;

    const fileName = `Rekap_Absensi_BPBD_${fileSuffix}.xlsx`;
    saveAs(new Blob([buffer]), fileName);

  } catch (error) {
    console.error("Gagal export Excel:", error);
    alert("Terjadi kesalahan saat membuat file Excel.");
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
}

// === EXPORT PDF DENGAN FOTO (VERSI BARU - SUDAH DIPERBAIKI) ===
function downloadPDF() {
  if (adminDataGlobal.length === 0) return alert("Tidak ada data untuk diunduh!");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'mm', 'a4'); 

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("REKAP ABSENSI WFA", 148, 15, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Badan Penanggulangan Bencana Daerah (BPBD) Trenggalek", 148, 20, { align: "center" });

  const startStr = document.getElementById("filterStart").value;
  const endStr = document.getElementById("filterEnd").value;
  let periodeTxt = startStr ? `Periode: ${startStr} s.d. ${endStr || startStr}` : "Periode: Semua Waktu";
  doc.text(periodeTxt, 14, 30);

  const tableColumn = ["Waktu", "Nama Pegawai", "Tipe", "Kehadiran", "GPS", "Lokasi", "Foto"];
  const tableRows = [];

  adminDataGlobal.forEach(d => {
    // Menyusun baris tabel dan menitipkan data foto
    let rowData = [
      new Date(d.waktu).toLocaleString("id-ID"),
      d.nama,
      d.tipe.toUpperCase(),
      d.status_waktu || "-",
      d.gps_status || "Aman",
      d.lokasi,
      "" // Sel ini dibiarkan kosong untuk tempat gambar nanti
    ];
    
    // Titipkan base64 foto ke objek array ini (tidak akan ikut tercetak sebagai teks)
    rowData.fotoBase64 = d.foto; 
    tableRows.push(rowData);
  });

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 35,
    styles: { fontSize: 8, cellPadding: 2, minCellHeight: 18, valign: 'middle' },
    headStyles: { fillColor: [30, 58, 138] },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 40 },
      2: { cellWidth: 15 },
      3: { cellWidth: 22 },
      4: { cellWidth: 25 }, 
      5: { cellWidth: 90 }, 
      6: { cellWidth: 25 }  
    },
    didDrawCell: function(data) {
      // Mengambil foto dari "titipan" di data.row.raw
      if (data.column.index === 6 && data.cell.section === 'body') {
        const imgBase64 = data.row.raw.fotoBase64; 
        
        if (imgBase64) {
          try {
            // Pasang gambar ke dalam sel
            doc.addImage(imgBase64, 'JPEG', data.cell.x + 2, data.cell.y + 2, 20, 15);
          } catch (e) {
            console.error("Gagal melampirkan foto pada nama: " + data.row.raw[1], e);
          }
        }
      }
    }
  });

  let fileSuffix = new Date().toLocaleDateString("id-ID").replace(/\//g, "-");
  if(startStr) fileSuffix = `${startStr}_sd_${endStr || startStr}`;
  const fileName = `Rekap_Absensi_BPBD_${fileSuffix}.pdf`;
  doc.save(fileName);
}
