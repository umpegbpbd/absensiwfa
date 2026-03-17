let gpsLoaded = false;
let stream = null;
let photoBase64 = "";
let absenType = ""; 
let currentLocation = { lat: null, lng: null, address: "" }; 

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

  // Perkecil resolusi foto agar ukuran JSON tidak cepat penuh
  canvas.width = 320; 
  canvas.height = 240;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Kompres kualitas JPEG ke 0.6 (60%)
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

// === FUNGSI MENGIRIM KE GITHUB ===
async function submitAbsensi() {
  const employeeName = document.getElementById("employee").value;
  const btnSubmit = document.getElementById("btnSubmit");
  
  btnSubmit.innerText = "⏳ Sedang Menyimpan...";
  btnSubmit.disabled = true;

  const newRecord = {
    id: Date.now(),
    waktu: new Date().toISOString(),
    nama: employeeName,
    tipe: absenType,
    lat: currentLocation.lat,
    lng: currentLocation.lng,
    lokasi: currentLocation.address,
    foto: photoBase64 
  };

  try {
    await saveToGitHub(newRecord);
    alert(`Sukses! Absen ${absenType.toUpperCase()} atas nama ${employeeName} berhasil disimpan.`);
    cancelAbsensi(); 
  } catch (error) {
    console.error(error);
    alert("Gagal menyimpan data! Pastikan Token GitHub di config.js sudah benar.");
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

  // 1. Ambil data absensi.json yang lama (jika ada)
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

  // 2. Tambahkan data absen baru ke tumpukan data lama
  existingData.push(newRecord);

  // 3. Ubah kembali ke format Base64 untuk dikirim ke GitHub
  const updatedContent = btoa(unescape(encodeURIComponent(JSON.stringify(existingData, null, 2))));

  // 4. Kirim / Update file di GitHub
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
    document.getElementById("adminPassword").value = "";
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
    const data = JSON.parse(decodedContent);
    
    const tbody = document.getElementById("adminTableBody");
    tbody.innerHTML = `
      <tr class="bg-blue-100 text-sm">
        <th class="p-2 border">Waktu</th>
        <th class="p-2 border">Nama</th>
        <th class="p-2 border">Tipe</th>
        <th class="p-2 border">Lokasi</th>
        <th class="p-2 border">Foto</th>
      </tr>
    `;
    
    // Reverse agar data terbaru ada di atas
    data.reverse().forEach(d => {
      const date = new Date(d.waktu).toLocaleString("id-ID");
      const fotoTag = d.foto ? `<img src="${d.foto}" class="w-10 h-10 object-cover rounded">` : "-";
      
      tbody.innerHTML += `
        <tr class="border-b text-sm hover:bg-gray-50">
          <td class="p-2 border">${date}</td>
          <td class="p-2 border font-semibold">${d.nama}</td>
          <td class="p-2 border text-center font-bold ${d.tipe === 'masuk' ? 'text-blue-600' : 'text-green-600'}">${d.tipe.toUpperCase()}</td>
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
