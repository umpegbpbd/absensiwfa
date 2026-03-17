let gpsLoaded = false;
let stream = null;
let photoBase64 = "";
let absenType = ""; 
let currentLocation = { lat: null, lng: null, address: "" }; 
let adminDataGlobal = []; 

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
  locText.innerHTML = "Mendeteksi koordinat dan alamat...";
  
  navigator.geolocation.getCurrentPosition(
    async pos => {
      gpsLoaded = true;
      currentLocation.lat = pos.coords.latitude;
      currentLocation.lng = pos.coords.longitude;
      
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

      locText.innerHTML = `
        <span class="font-bold text-blue-900">Lat: ${currentLocation.lat.toFixed(5)}, Lng: ${currentLocation.lng.toFixed(5)}</span><br>
        <span class="text-xs text-gray-600 mt-1 block">${currentLocation.address}</span>
      `;
    },
    err => {
      locText.textContent = "Gagal mendapatkan lokasi. Izinkan akses GPS.";
      console.error(err);
    }
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
    foto: photoBase64 
  };

  try {
    await saveToGitHub(newRecord);
    alert(`Berhasil! Absen ${absenType.toUpperCase()} atas nama ${employeeName} tersimpan.\nStatus: ${timeCheck.status}`);
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

// === FUNGSI ADMIN & DOWNLOAD ===
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
    
    const rawData = JSON.parse(decodedContent);
    adminDataGlobal = rawData.reverse(); 
    
    const tbody = document.getElementById("adminTableBody");
    tbody.innerHTML = `
      <tr class="bg-blue-100 text-sm">
        <th class="p-2 border">Waktu</th>
        <th class="p-2 border">Nama</th>
        <th class="p-2 border">Tipe</th>
        <th class="p-2 border">Status</th>
        <th class="p-2 border">Lokasi</th>
        <th class="p-2 border text-center">Foto</th>
      </tr>
    `;
    
    adminDataGlobal.forEach(d => {
      const date = new Date(d.waktu).toLocaleString("id-ID");
      const fotoTag = d.foto ? `<img src="${d.foto}" class="w-10 h-10 object-cover rounded hover:scale-150 transition mx-auto">` : "-";
      
      let statusColor = "text-gray-700";
      if (d.status_waktu === "Tepat Waktu") statusColor = "text-green-600";
      if (d.status_waktu === "Terlambat") statusColor = "text-red-600";
      if (d.status_waktu === "Pulang Lebih Cepat") statusColor = "text-orange-500";
      
      tbody.innerHTML += `
        <tr class="border-b text-sm hover:bg-gray-50">
          <td class="p-2 border">${date}</td>
          <td class="p-2 border font-semibold whitespace-nowrap">${d.nama}</td>
          <td class="p-2 border text-center font-bold ${d.tipe === 'masuk' ? 'text-blue-600' : 'text-emerald-600'}">${d.tipe.toUpperCase()}</td>
          <td class="p-2 border text-center font-bold ${statusColor} whitespace-nowrap">${d.status_waktu || "-"}</td>
          <td class="p-2 border text-xs text-gray-600">${d.lokasi}</td>
          <td class="p-2 border text-center">${fotoTag}</td>
        </tr>
      `;
    });
  } catch (e) {
    console.error(e);
    alert("Belum ada data absensi atau gagal memuat data.");
  }
}

// === EXPORT EXCEL DENGAN FOTO (Memakai ExcelJS) ===
async function downloadExcel() {
  if (adminDataGlobal.length === 0) return alert("Belum ada data absensi untuk diunduh!");

  // Bikin tombol jadi loading
  const btn = document.querySelector('button[onclick="downloadExcel()"]');
  const originalText = btn.innerText;
  btn.innerText = "⏳ Memproses Excel...";
  btn.disabled = true;

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Data Absensi");

    // Setup Header Kolom
    worksheet.columns = [
      { header: "Waktu Absen", key: "waktu", width: 22 },
      { header: "Nama Pegawai", key: "nama", width: 35 },
      { header: "Tipe Absen", key: "tipe", width: 15 },
      { header: "Status Kehadiran", key: "status", width: 20 },
      { header: "Lokasi (GPS)", key: "lokasi", width: 50 },
      { header: "Foto Wajah", key: "foto", width: 15 }
    ];

    // Styling Header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Masukkan Data
    adminDataGlobal.forEach((d, index) => {
      const row = worksheet.addRow({
        waktu: new Date(d.waktu).toLocaleString("id-ID"),
        nama: d.nama,
        tipe: d.tipe.toUpperCase(),
        status: d.status_waktu || "-",
        lokasi: d.lokasi
      });
      
      // Kasih tinggi baris agak besar buat tempat foto
      row.height = 65;
      row.alignment = { vertical: 'middle' };

      // Sisipkan gambar ke sel Excel
      if (d.foto) {
        const imageId = workbook.addImage({
          base64: d.foto,
          extension: 'jpeg',
        });
        
        worksheet.addImage(imageId, {
          tl: { col: 5, row: index + 1 }, // Posisi kolom (5 = Kolom F) dan baris
          ext: { width: 80, height: 60 }  // Ukuran gambar di Excel
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Rekap_Absensi_BPBD_${new Date().toLocaleDateString("id-ID").replace(/\//g, "-")}.xlsx`;
    saveAs(new Blob([buffer]), fileName);

  } catch (error) {
    console.error("Gagal export Excel:", error);
    alert("Terjadi kesalahan saat membuat file Excel.");
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
}

// === EXPORT PDF DENGAN FOTO (Memakai jsPDF) ===
function downloadPDF() {
  if (adminDataGlobal.length === 0) return alert("Belum ada data absensi untuk diunduh!");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4'); 

  // Judul
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("REKAP ABSENSI WFA", 105, 15, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Badan Penanggulangan Bencana Daerah (BPBD) Trenggalek", 105, 20, { align: "center" });
  doc.text(`Dicetak pada: ${new Date().toLocaleString("id-ID")}`, 14, 30);

  const tableColumn = ["Waktu", "Nama Pegawai", "Tipe", "Status", "Lokasi", "Foto"];
  const tableRows = [];

  adminDataGlobal.forEach(d => {
    tableRows.push([
      new Date(d.waktu).toLocaleString("id-ID"),
      d.nama,
      d.tipe.toUpperCase(),
      d.status_waktu || "-",
      d.lokasi,
      "" // Kosongkan teksnya, karena kita akan isi pakai gambar di hook didDrawCell
    ]);
  });

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 35,
    styles: { fontSize: 8, cellPadding: 2, minCellHeight: 18, valign: 'middle' },
    headStyles: { fillColor: [30, 58, 138] },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 35 },
      2: { cellWidth: 15 },
      3: { cellWidth: 20 },
      4: { cellWidth: 65 },
      5: { cellWidth: 25 } // Lebar kolom foto
    },
    // Hook untuk merender gambar di dalam tabel
    didDrawCell: function(data) {
      if (data.column.index === 5 && data.cell.section === 'body') {
        const imgBase64 = adminDataGlobal[data.row.index].foto;
        if (imgBase64) {
          // Posisi (X, Y) dan Ukuran (Width, Height) gambar
          doc.addImage(imgBase64, 'JPEG', data.cell.x + 2, data.cell.y + 2, 20, 15);
        }
      }
    }
  });

  const fileName = `Rekap_Absensi_A4_${new Date().toLocaleDateString("id-ID").replace(/\//g, "-")}.pdf`;
  doc.save(fileName);
}
