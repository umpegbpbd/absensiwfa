// ================= START SYSTEM =================

window.addEventListener("load", function(){
    startClock()
    loadEmployees()
})

// ================= JAM REALTIME =================

function startClock(){
    const clock = document.getElementById("clockDisplay")
    const date = document.getElementById("currentDate")

    if(!clock || !date) return

    function update(){
        const now = new Date()

        const h = String(now.getHours()).padStart(2,"0")
        const m = String(now.getMinutes()).padStart(2,"0")
        const s = String(now.getSeconds()).padStart(2,"0")

        clock.textContent = `${h}:${m}:${s}`

        date.textContent = now.toLocaleDateString("id-ID",{
            weekday:"long",
            year:"numeric",
            month:"long",
            day:"numeric"
        })
    }

    update()
    setInterval(update,1000)
}

// ================= LOAD PEGAWAI =================

function loadEmployees(){
    const select = document.getElementById("employeeSelect")

    if(!select) return

    // jika employees.js ada
    if(typeof employees !== "undefined"){
        employees.forEach(nama=>{
            let opt=document.createElement("option")
            opt.value=nama
            opt.textContent=nama
            select.appendChild(opt)
        })
        return
    }

    // fallback jika employees.js tidak ada
    const defaultEmployees=[
        "Ahmad",
        "Budi",
        "Citra",
        "Dewi",
        "Eko"
    ]

    defaultEmployees.forEach(nama=>{
        let opt=document.createElement("option")
        opt.value=nama
        opt.textContent=nama
        select.appendChild(opt)
    })
}

// ================= PAGE NAV =================

function showPage(page){
    document.querySelectorAll(".page").forEach(p=>{
        p.classList.remove("active")
    })

    const el=document.getElementById("page-"+page)

    if(el) el.classList.add("active")
}

// ================= GLOBAL VAR =================

let currentType=""
let video=null
let canvas=null
let photo=null
let stream=null

let latitude=0
let longitude=0
let lokasiText=""

// ================= START ABSENSI =================

function startAbsensi(type){
    const select=document.getElementById("employeeSelect")

    if(!select || !select.value){
        alert("Pilih pegawai dulu")
        return
    }

    currentType=type

    showPage("absensi")

    startCamera()
    getLocation()
}

// ================= CAMERA =================

async function startCamera(){
    video=document.getElementById("cameraPreview")
    canvas=document.getElementById("cameraCanvas")

    if(!video || !canvas) return

    try{
        stream=await navigator.mediaDevices.getUserMedia({
            video:{facingMode:"user"}
        })

        video.srcObject=stream

    }catch(e){
        alert("Kamera tidak bisa diakses: " + e.message)
    }
}

function capturePhoto(){
    const ctx=canvas.getContext("2d")

    canvas.width=video.videoWidth
    canvas.height=video.videoHeight

    ctx.drawImage(video,0,0)

    photo=canvas.toDataURL("image/jpeg")

    const img=document.getElementById("capturedPhoto")

    if(img){
        img.src=photo
        img.classList.remove("hidden")
    }

    video.classList.add("hidden")

    document.getElementById("btnCapture")?.classList.add("hidden")
    document.getElementById("btnRetake")?.classList.remove("hidden")
}

function retakePhoto(){
    photo=null

    document.getElementById("capturedPhoto")?.classList.add("hidden")

    video.classList.remove("hidden")

    document.getElementById("btnCapture")?.classList.remove("hidden")
    document.getElementById("btnRetake")?.classList.add("hidden")
}

// ================= GPS =================

function getLocation(){
    const info=document.getElementById("locationInfo")

    if(!navigator.geolocation){
        if(info) info.innerText="Geolocation tidak didukung"
        return
    }

    navigator.geolocation.getCurrentPosition(async pos=>{
        latitude=pos.coords.latitude
        longitude=pos.coords.longitude

        try{
            let url=`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`

            let res=await fetch(url)

            let data=await res.json()

            let a=data.address || {}

            let desa=a.village||a.hamlet||"-"
            let kec=a.suburb||a.city_district||"-"
            let kota=a.city||a.town||a.county||"-"

            lokasiText=`${desa}, ${kec}, ${kota}`

            if(info) info.innerText="📍 Lokasi: "+lokasiText

        }catch(e){
            if(info) info.innerText="📍 Lokasi: Tidak ditemukan"
        }

    }, error => {
        if(info) info.innerText="📍 Lokasi: Izin ditolak"
    })
}

// ================= STATUS ABSEN =================

function getStatus(){
    const now=new Date()

    const day=now.getDay()

    const jam=now.getHours()
    const menit=now.getMinutes()

    const waktu=jam*60+menit

    // MASUK
    if(currentType==="masuk"){
        if(day===5){ // Jumat
            if(waktu>=390 && waktu<=420) return "Hadir"
            if(waktu>420) return "Terlambat"
        }else{
            if(waktu>=420 && waktu<=450) return "Hadir"
            if(waktu>450) return "Terlambat"
        }
    }

    // PULANG
    if(currentType==="pulang"){
        if(waktu>=930 && waktu<=1050) return "Pulang"
        if(waktu>1050) return "Tidak tercatat"
    }

    return "-"
}

// ================= SUBMIT =================

function submitAbsensi(){
    if(!photo){
        alert("Ambil foto dulu")
        return
    }

    const select=document.getElementById("employeeSelect")

    const nama=select.options[select.selectedIndex].text

    const now=new Date()

    const tanggal=now.toLocaleDateString("id-ID")
    const jam=now.toLocaleTimeString("id-ID")

    const status=getStatus()

    if(status==="Tidak tercatat"){
        alert("Jam pulang sudah lewat batas")
        return
    }

    const data={
        nama:nama,
        tanggal:tanggal,
        jam:jam,
        status:status,
        lokasi:lokasiText,
        foto:photo
    }

    let list=JSON.parse(localStorage.getItem("absensi")||"[]")

    list.push(data)

    localStorage.setItem("absensi",JSON.stringify(list))

    alert("Absensi berhasil disimpan!")

    cancelAbsensi()
}

// ================= CANCEL =================

function cancelAbsensi(){
    showPage("dashboard")

    if(stream){
        stream.getTracks().forEach(t=>t.stop())
    }

    photo=null
}

// ================= ADMIN =================

function adminLogin(){
    const pass=document.getElementById("adminPass").value

    if(pass==="admin123"){
        document.getElementById("adminPanel").classList.remove("hidden")
        document.getElementById("adminPass").value=""
        loadAdmin()
    }else{
        alert("Password salah")
        document.getElementById("adminPass").value=""
    }
}

function loadAdmin(){
    const body=document.getElementById("adminTableBody")

    body.innerHTML=""

    let list=JSON.parse(localStorage.getItem("absensi")||"[]")

    if(list.length === 0){
        body.innerHTML="<tr><td colspan='5' class='text-center p-3'>Belum ada data absensi</td></tr>"
        return
    }

    list.forEach(d=>{
        let tr=document.createElement("tr")
        tr.innerHTML=`
            <td class="p-2 border-b">${d.nama}</td>
            <td class="p-2 border-b">${d.tanggal}</td>
            <td class="p-2 border-b">${d.jam}</td>
            <td class="p-2 border-b"><span class="px-2 py-1 rounded text-xs font-semibold ${d.status === 'Hadir' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}">${d.status}</span></td>
            <td class="p-2 border-b"><img src="${d.foto}" class="photo-thumb cursor-pointer" onclick="viewPhoto('${d.foto}')"></td>
        `
        body.appendChild(tr)
    })
}

function viewPhoto(photoData){
    const img=new Image()
    img.src=photoData
    const newTab=window.open()
    newTab.document.body.innerHTML=`<img src="${photoData}" style="width:100%; height:auto;">`
}

// ================= DOWNLOAD CSV =================

function downloadCSV(){
    let list=JSON.parse(localStorage.getItem("absensi")||"[]")

    if(list.length === 0){
        alert("Tidak ada data untuk diunduh")
        return
    }

    let csv="Nama,Tanggal,Jam,Status,Lokasi\n"

    list.forEach(d=>{
        csv+=`"${d.nama}","${d.tanggal}","${d.jam}","${d.status}","${d.lokasi}"\n`
    })

    let blob=new Blob([csv], {type: 'text/csv;charset=utf-8;'})

    let link=document.createElement("a")

    link.href=URL.createObjectURL(blob)

    link.download="absensi.csv"

    link.click()

    alert("CSV berhasil diunduh!")
}
