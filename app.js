```javascript
// ================= JAM REALTIME =================

function updateClock(){

let clock = document.getElementById("clockDisplay")
let date = document.getElementById("currentDate")

if(!clock || !date) return

let now = new Date()

clock.innerText = now.toLocaleTimeString("id-ID")

date.innerText = now.toLocaleDateString("id-ID",{
weekday:"long",
year:"numeric",
month:"long",
day:"numeric"
})

}

setInterval(updateClock,1000)

document.addEventListener("DOMContentLoaded",updateClock)


// ================= PAGE NAV =================

function showPage(page){

document.querySelectorAll(".page").forEach(p=>{
p.classList.remove("active")
})

let el = document.getElementById("page-"+page)

if(el) el.classList.add("active")

}



// ================= VAR GLOBAL =================

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

let select=document.getElementById("employeeSelect")

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

alert("Kamera tidak bisa diakses")

}

}


function capturePhoto(){

let ctx=canvas.getContext("2d")

canvas.width=video.videoWidth
canvas.height=video.videoHeight

ctx.drawImage(video,0,0)

photo=canvas.toDataURL("image/jpeg")

let img=document.getElementById("capturedPhoto")

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

let info=document.getElementById("locationInfo")

if(!navigator.geolocation) return

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

if(info) info.innerText="Lokasi : "+lokasiText

}catch(e){

if(info) info.innerText="Lokasi tidak ditemukan"

}

})

}



// ================= CEK STATUS JAM =================

function getStatus(){

let now=new Date()

let day=now.getDay()

let jam=now.getHours()
let menit=now.getMinutes()

let waktu=jam*60+menit



// MASUK

if(currentType==="masuk"){

if(day===5){

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

let select=document.getElementById("employeeSelect")

let nama=select.options[select.selectedIndex].text

let now=new Date()

let tanggal=now.toLocaleDateString("id-ID")
let jam=now.toLocaleTimeString("id-ID")

let status=getStatus()

if(status==="Tidak tercatat"){

alert("Jam pulang sudah lewat batas")

return

}

let data={
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

alert("Absensi berhasil")

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

let pass=document.getElementById("adminPass").value

if(pass==="admin123"){

document.getElementById("adminPanel").classList.remove("hidden")

loadAdmin()

}else{

alert("Password salah")

}

}


function loadAdmin(){

let body=document.getElementById("adminTableBody")

body.innerHTML=""

let list=JSON.parse(localStorage.getItem("absensi")||"[]")

list.forEach(d=>{

let tr=document.createElement("tr")

tr.innerHTML=`
<td class="p-2">${d.nama}</td>
<td class="p-2">${d.tanggal}</td>
<td class="p-2">${d.jam}</td>
<td class="p-2">${d.status}</td>
<td class="p-2"><img src="${d.foto}" class="photo-thumb"></td>
`

body.appendChild(tr)

})

}



// ================= DOWNLOAD CSV =================

function downloadCSV(){

let list=JSON.parse(localStorage.getItem("absensi")||"[]")

let csv="Nama,Tanggal,Jam,Status,Lokasi\n"

list.forEach(d=>{
csv+=`${d.nama},${d.tanggal},${d.jam},${d.status},${d.lokasi}\n`
})

let blob=new Blob([csv])

let a=document.createElement("a")

a.href=URL.createObjectURL(blob)

a.download="absensi.csv"

a.click()

}
```
