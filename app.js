// ===============================
// GLOBAL STATE
// ===============================

let currentStream = null
let fotoBase64 = null
let lokasiData = null
let tipeAbsensi = null
let allData = []


// ===============================
// INIT EMPLOYEE LIST
// ===============================

window.addEventListener("DOMContentLoaded",()=>{

let select = document.getElementById("pegawai")

if(typeof EMPLOYEES !== "undefined"){

EMPLOYEES.forEach(nama=>{

let opt = document.createElement("option")
opt.value = nama
opt.textContent = nama

select.appendChild(opt)

})

}

loadData()

})


// ===============================
// START ABSENSI
// ===============================

function startAbsensi(type){

let nama = document.getElementById("pegawai").value

if(!nama){

alert("Pilih pegawai dulu")
return

}

tipeAbsensi = type

document.getElementById("judulAbsensi").innerText =
type === "masuk" ? "Absen Masuk" : "Absen Pulang"

document.getElementById("namaPegawai").innerText = nama

showPage("absensi")

startCamera()

ambilLokasi()

}


// ===============================
// CANCEL ABSENSI
// ===============================

function cancelAbsensi(){

stopCamera()

showPage("dashboard")

}


// ===============================
// CAMERA
// ===============================

async function startCamera(){

try{

currentStream = await navigator.mediaDevices.getUserMedia({
video:{facingMode:"user"},
audio:false
})

document.getElementById("camera").srcObject = currentStream

}catch(e){

alert("Kamera tidak dapat diakses")

}

}


function stopCamera(){

if(currentStream){

currentStream.getTracks().forEach(t=>t.stop())

currentStream = null

}

}


// ===============================
// CAPTURE FOTO
// ===============================

function capture(){

let video = document.getElementById("camera")
let canvas = document.getElementById("canvas")

canvas.width = video.videoWidth
canvas.height = video.videoHeight

let ctx = canvas.getContext("2d")

ctx.drawImage(video,0,0)

fotoBase64 = canvas.toDataURL("image/jpeg",0.25)

document.getElementById("previewFoto").src = fotoBase64

document.getElementById("previewFoto").classList.remove("hidden")

document.getElementById("camera").classList.add("hidden")

document.getElementById("btnFoto").classList.add("hidden")

document.getElementById("btnUlang").classList.remove("hidden")

stopCamera()

cekSubmit()

}


function ulangFoto(){

fotoBase64 = null

document.getElementById("previewFoto").classList.add("hidden")

document.getElementById("camera").classList.remove("hidden")

document.getElementById("btnFoto").classList.remove("hidden")

document.getElementById("btnUlang").classList.add("hidden")

startCamera()

}


// ===============================
// GPS
// ===============================

function ambilLokasi(){

if(!navigator.geolocation){

document.getElementById("lokasi").innerText =
"GPS tidak tersedia"

return

}

navigator.geolocation.getCurrentPosition(async(pos)=>{

let lat = pos.coords.latitude
let lon = pos.coords.longitude
let acc = pos.coords.accuracy

if(acc > 100){

document.getElementById("lokasi").innerText =
"Akurasi GPS rendah"

return

}

lokasiData = {
lat:lat,
lon:lon
}

document.getElementById("lokasi").innerText =
lat.toFixed(6)+" , "+lon.toFixed(6)

cekSubmit()

})

}


// ===============================
// CEK SUBMIT READY
// ===============================

function cekSubmit(){

if(fotoBase64 && lokasiData){

document.getElementById("btnSubmit").disabled = false

}

}


// ===============================
// VALIDASI JAM
// ===============================

function validasiJam(){

let now = new Date()

let jam = now.getHours()
let menit = now.getMinutes()

let total = jam*60+menit

if(tipeAbsensi === "masuk"){

if(total < 420){

alert("Belum waktunya absensi")

return false

}

}

if(tipeAbsensi === "pulang"){

if(total < 930){

alert("Belum waktunya pulang")

return false

}

if(total > 1050){

alert("Waktu pulang berakhir")

return false

}

}

return true

}


// ===============================
// SUBMIT ABSENSI
// ===============================

async function submitAbsensi(){

if(!validasiJam()) return

let nama = document.getElementById("pegawai").value

let now = new Date()

let status = "Hadir"

if(tipeAbsensi === "masuk"){

let terlambat =
now.getHours() > 7 ||
(now.getHours()==7 && now.getMinutes()>30)

if(terlambat) status="Terlambat"

}

if(tipeAbsensi === "pulang") status="Pulang"

let data = {

id:Date.now(),

nama:nama,

tanggal:now.toISOString().slice(0,10),

jam:now.toTimeString().slice(0,8),

status:status,

latitude:lokasiData.lat,

longitude:lokasiData.lon,

foto:fotoBase64

}

allData.push(data)

await saveData(allData)

alert("Absensi berhasil")

showPage("dashboard")

}


// ===============================
// LOAD DATA GITHUB
// ===============================

async function loadData(){

let url =
`https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.DATA_FILE}`

let res = await fetch(url)

let file = await res.json()

let content = JSON.parse(atob(file.content))

allData = content

}


// ===============================
// SAVE DATA GITHUB
// ===============================

async function saveData(data){

let url =
`https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.DATA_FILE}`

let get = await fetch(url)

let file = await get.json()

let sha = file.sha

let content = btoa(JSON.stringify(data,null,2))

await fetch(url,{
method:"PUT",
headers:{
Authorization:"token "+CONFIG.TOKEN
},
body:JSON.stringify({
message:"update absensi",
content:content,
sha:sha
})
})

}


// ===============================
// ADMIN LOGIN
// ===============================

function adminLogin(){

let pass = document.getElementById("adminPass").value

if(pass==="admin123"){

showPage("admin-panel")

renderAdmin()

}else{

alert("Password salah")

}

}


// ===============================
// RENDER ADMIN TABLE
// ===============================

function renderAdmin(){

let tbody = document.getElementById("dataAbsensi")

tbody.innerHTML=""

allData.forEach(d=>{

let tr=document.createElement("tr")

tr.innerHTML=`

<td class="p-2">${d.nama}</td>
<td class="p-2">${d.tanggal}</td>
<td class="p-2">${d.jam}</td>
<td class="p-2">${d.status}</td>
<td class="p-2">${d.latitude},${d.longitude}</td>
<td class="p-2">
<img src="${d.foto}" width="40">
</td>

`

tbody.appendChild(tr)

})

}


// ===============================
// DOWNLOAD CSV
// ===============================

function downloadCSV(){

let rows=[
["Nama","Tanggal","Jam","Status","Latitude","Longitude"]
]

allData.forEach(d=>{

rows.push([
d.nama,
d.tanggal,
d.jam,
d.status,
d.latitude,
d.longitude
])

})

let csv = rows.map(r=>r.join(",")).join("\n")

let blob=new Blob([csv])

let a=document.createElement("a")

a.href=URL.createObjectURL(blob)

a.download="absensi.csv"

a.click()

}
