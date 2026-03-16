let stream=null
let photoData=null
let gpsData=null
let addressData=null

let records = JSON.parse(localStorage.getItem("records")) || []

// CLOCK

function getWIB(){
const now=new Date()
const utc=now.getTime()+now.getTimezoneOffset()*60000
return new Date(utc+7*3600000)
}

function updateClock(){

const d=getWIB()

const h=String(d.getHours()).padStart(2,'0')
const m=String(d.getMinutes()).padStart(2,'0')
const s=String(d.getSeconds()).padStart(2,'0')

document.getElementById("clockDisplay").innerText=`${h}:${m}:${s}`

document.getElementById("currentDate").innerText=
d.toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"})

}

setInterval(updateClock,1000)


// LOAD EMPLOYEES

window.onload=function(){

const select=document.getElementById("employeeSelect")

EMPLOYEES.forEach(n=>{

let opt=document.createElement("option")
opt.value=n
opt.textContent=n

select.appendChild(opt)

})

updateClock()

}


// NAVIGATION

function showPage(p){

document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"))

document.getElementById("page-"+p).classList.add("active")

}


// START ABSENSI

function startAbsensi(type){

const name=document.getElementById("employeeSelect").value

if(!name){
alert("Pilih pegawai")
return
}

const today=getWIB().toISOString().split("T")[0]

const sudahAbsen=records.find(r=>r.nama===name && r.tanggal===today)

if(sudahAbsen){
alert("Anda sudah absen hari ini")
return
}

showPage("absensi")

startCamera()

getGPS()

}


// CAMERA

async function startCamera(){

const video=document.getElementById("cameraPreview")

stream=await navigator.mediaDevices.getUserMedia({video:true})

video.srcObject=stream

}

function stopCamera(){
if(stream){
stream.getTracks().forEach(t=>t.stop())
}
}

function capturePhoto(){

const video=document.getElementById("cameraPreview")
const canvas=document.getElementById("cameraCanvas")

canvas.width=video.videoWidth
canvas.height=video.videoHeight

const ctx=canvas.getContext("2d")

ctx.drawImage(video,0,0)

photoData=canvas.toDataURL("image/jpeg",0.5)

document.getElementById("capturedPhoto").src=photoData
document.getElementById("capturedPhoto").classList.remove("hidden")

video.classList.add("hidden")

document.getElementById("btnRetake").classList.remove("hidden")
document.getElementById("btnCapture").classList.add("hidden")

stopCamera()

}

function retakePhoto(){

photoData=null

document.getElementById("capturedPhoto").classList.add("hidden")
document.getElementById("cameraPreview").classList.remove("hidden")

document.getElementById("btnRetake").classList.add("hidden")
document.getElementById("btnCapture").classList.remove("hidden")

startCamera()

}

function cancelAbsensi(){
stopCamera()
showPage("dashboard")
}


// GPS

function getGPS(){

navigator.geolocation.getCurrentPosition(async pos=>{

gpsData={
lat:pos.coords.latitude,
lon:pos.coords.longitude
}

document.getElementById("locationInfo").innerText="Mengambil alamat..."

await getAddress()

})

}


// REVERSE GEOCODING

async function getAddress(){

const url=`https://nominatim.openstreetmap.org/reverse?format=json&lat=${gpsData.lat}&lon=${gpsData.lon}`

const res=await fetch(url)

const data=await res.json()

const addr=data.address

addressData={
kabupaten: addr.county || addr.city || "",
kecamatan: addr.suburb || addr.city_district || "",
desa: addr.village || addr.town || addr.hamlet || "",
rt: "-",
rw: "-"
}

document.getElementById("locationInfo").innerText=`
${addressData.desa}
${addressData.kecamatan}
${addressData.kabupaten}
`

}


// SUBMIT

function submitAbsensi(){

const name=document.getElementById("employeeSelect").value

if(!photoData){
alert("Ambil foto dulu")
return
}

if(!gpsData){
alert("GPS belum didapat")
return
}

const now=getWIB()

const data={

nama:name,
tanggal:now.toISOString().split("T")[0],
jam:now.toTimeString().slice(0,8),
status:"Hadir",
foto:photoData,
lat:gpsData.lat,
lon:gpsData.lon,
kabupaten:addressData.kabupaten,
kecamatan:addressData.kecamatan,
desa:addressData.desa

}

records.push(data)

localStorage.setItem("records",JSON.stringify(records))

alert("Absensi berhasil")

showPage("dashboard")

}


// ADMIN

function adminLogin(){

const pass=document.getElementById("adminPass").value

if(pass==="admin123"){

document.getElementById("adminPanel").classList.remove("hidden")

loadAdmin()

}else{

alert("Password salah")

}

}


function loadAdmin(){

const tbody=document.getElementById("adminTableBody")

tbody.innerHTML=""

records.forEach(r=>{

let tr=document.createElement("tr")

tr.innerHTML=`

<td class="p-2">${r.nama}</td>
<td class="p-2">${r.tanggal}</td>
<td class="p-2">${r.jam}</td>
<td class="p-2">${r.status}</td>
<td class="p-2"><img src="${r.foto}" class="photo-thumb"></td>

`

tbody.appendChild(tr)

})

}


// CSV

function downloadCSV(){

let csv="Nama,Tanggal,Jam,Status,Kabupaten,Kecamatan,Desa\n"

records.forEach(r=>{

csv+=`${r.nama},${r.tanggal},${r.jam},${r.status},${r.kabupaten},${r.kecamatan},${r.desa}\n`

})

const blob=new Blob([csv])

const a=document.createElement("a")

a.href=URL.createObjectURL(blob)

a.download="absensi.csv"

a.click()

}
