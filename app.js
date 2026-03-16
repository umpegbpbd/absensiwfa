```javascript
// ================= GPS ELEMENT =================

let latitudeInput = document.getElementById("latitude")
let longitudeInput = document.getElementById("longitude")

let kotaInput = document.getElementById("kota")
let kecamatanInput = document.getElementById("kecamatan")
let desaInput = document.getElementById("desa")

let kotaText = document.getElementById("kotaText")
let kecamatanText = document.getElementById("kecamatanText")
let desaText = document.getElementById("desaText")

let statusGPS = document.getElementById("gpsStatus")

// ================= CAMERA =================

let video = document.getElementById("video")
let canvas = document.getElementById("canvas")
let foto = null

async function startCamera(){

try{

let stream = await navigator.mediaDevices.getUserMedia({
video:{facingMode:"user"}
})

video.srcObject = stream

}catch(e){

alert("Kamera tidak bisa diakses")

}

}

function ambilFoto(){

let ctx = canvas.getContext("2d")

canvas.width = video.videoWidth
canvas.height = video.videoHeight

ctx.drawImage(video,0,0)

foto = canvas.toDataURL("image/jpeg")

alert("Foto berhasil diambil")

}

// ================= GPS =================

function ambilGPS(){

statusGPS.innerHTML = "Mengambil GPS..."

if(!navigator.geolocation){
alert("Browser tidak mendukung GPS")
return
}

navigator.geolocation.getCurrentPosition(

function(position){

let lat = position.coords.latitude
let lon = position.coords.longitude

latitudeInput.value = lat
longitudeInput.value = lon

statusGPS.innerHTML = "GPS ditemukan"

ambilAlamat(lat,lon)

},

function(error){

statusGPS.innerHTML = "GPS gagal"

console.log(error)

},

{
enableHighAccuracy:true,
timeout:15000,
maximumAge:0
}

)

}

// ================= REVERSE GEOCODING =================

function ambilAlamat(lat,lon){

fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)

.then(res=>res.json())

.then(data=>{

let a = data.address

let kota =
a.city ||
a.town ||
a.county ||
"-"

let kec =
a.suburb ||
a.city_district ||
"-"

let desa =
a.village ||
a.hamlet ||
"-"

kotaInput.value = kota
kecamatanInput.value = kec
desaInput.value = desa

kotaText.innerText = kota
kecamatanText.innerText = kec
desaText.innerText = desa

})

}

// ================= STATUS ABSENSI =================

function cekStatusAbsensi(tipe){

let now = new Date()

let day = now.getDay() // 5 = Jumat

let jam = now.getHours()
let menit = now.getMinutes()

let waktu = jam*60 + menit

// ================= ABSEN MASUK =================

if(tipe == "masuk"){

// ===== JUMAT =====
if(day == 5){

let mulai = 6*60 + 30 // 06:30
let batas = 7*60      // 07:00

if(waktu >= mulai && waktu <= batas){
return "Hadir"
}

if(waktu > batas){
return "Terlambat"
}

}

// ===== HARI BIASA =====
else{

let mulai = 7*60      // 07:00
let batas = 7*60 + 30 // 07:30

if(waktu >= mulai && waktu <= batas){
return "Hadir"
}

if(waktu > batas){
return "Terlambat"
}

}

}

// ================= ABSEN PULANG =================

if(tipe == "pulang"){

let mulai = 15*60 + 30 // 15:30
let batas = 17*60 + 30 // 17:30

if(waktu >= mulai && waktu <= batas){
return "Pulang"
}

if(waktu > batas){
return "Ditolak"
}

}

return "-"

}

// ================= KIRIM ABSENSI =================

function kirimAbsensi(tipe){

if(!foto){
alert("Ambil foto terlebih dahulu")
return
}

let status = cekStatusAbsensi(tipe)

if(status == "Ditolak"){
alert("Jam absensi sudah lewat")
return
}

let now = new Date()

let tanggal = now.toLocaleDateString("id-ID")
let jam = now.toLocaleTimeString("id-ID")

let data = {
tanggal:tanggal,
jam:jam,
status:status,
foto:foto,
desa:desaInput.value,
kecamatan:kecamatanInput.value,
kota:kotaInput.value
}

let list = JSON.parse(localStorage.getItem("absensi") || "[]")

list.push(data)

localStorage.setItem("absensi",JSON.stringify(list))

alert("Absensi berhasil")

console.log(data)

}

// ================= AUTO LOAD =================

window.onload = function(){

startCamera()

ambilGPS()

}
```
