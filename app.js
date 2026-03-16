// ============================
// GLOBAL STATE
// ============================

let allRecords = []
let currentStream = null
let capturedImage = null
let currentLocation = null
let currentType = null


// ============================
// LOAD EMPLOYEES
// ============================

window.addEventListener("DOMContentLoaded",()=>{

const select=document.getElementById("employeeSelect")

EMPLOYEES.forEach(name=>{

const opt=document.createElement("option")
opt.value=name
opt.textContent=name

select.appendChild(opt)

})

updateClock()

})


// ============================
// CLOCK
// ============================

function getWIB(){

const now=new Date()

const utc=now.getTime()+now.getTimezoneOffset()*60000

return new Date(utc+7*3600000)

}

function updateClock(){

const now=getWIB()

const h=String(now.getHours()).padStart(2,"0")
const m=String(now.getMinutes()).padStart(2,"0")
const s=String(now.getSeconds()).padStart(2,"0")

document.getElementById("clockDisplay").innerText=`${h}:${m}:${s}`

const date=now.toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"})

document.getElementById("currentDate").innerText=date

}

setInterval(updateClock,1000)


// ============================
// PAGE NAV
// ============================

function showPage(page){

document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"))

document.getElementById("page-"+page).classList.add("active")

if(page!=="absensi") stopCamera()

}


// ============================
// START ABSENSI
// ============================

function startAbsensi(type){

const name=document.getElementById("employeeSelect").value

if(!name){
alert("Pilih pegawai terlebih dahulu")
return
}

const now=getWIB()

const minutes=now.getHours()*60+now.getMinutes()

if(type==="masuk"){

if(minutes<420){
alert("Belum waktunya absensi")
return
}

}

if(type==="pulang"){

if(minutes<930){
alert("Belum waktunya absensi pulang")
return
}

if(minutes>1050){
alert("Waktu absensi pulang telah berakhir")
return
}

}

currentType=type

capturedImage=null
currentLocation=null

showPage("absensi")

startCamera()

getLocation()

}


// ============================
// CAMERA
// ============================

async function startCamera(){

const video=document.getElementById("cameraPreview")

try{

currentStream=await navigator.mediaDevices.getUserMedia({

video:{facingMode:"user"},
audio:false

})

video.srcObject=currentStream

}catch(e){

alert("Kamera tidak dapat diakses")

}

}

function stopCamera(){

if(currentStream){

currentStream.getTracks().forEach(t=>t.stop())

currentStream=null

}

}

function capturePhoto(){

const video=document.getElementById("cameraPreview")
const canvas=document.getElementById("cameraCanvas")
const photo=document.getElementById("capturedPhoto")

canvas.width=video.videoWidth
canvas.height=video.videoHeight

const ctx=canvas.getContext("2d")

ctx.translate(canvas.width,0)
ctx.scale(-1,1)

ctx.drawImage(video,0,0)

capturedImage=canvas.toDataURL("image/jpeg",0.4)

photo.src=capturedImage

photo.classList.remove("hidden")

video.classList.add("hidden")

document.getElementById("btnCapture").classList.add("hidden")

document.getElementById("btnRetake").classList.remove("hidden")

stopCamera()

checkReady()

}

function retakePhoto(){

capturedImage=null

document.getElementById("capturedPhoto").classList.add("hidden")

document.getElementById("cameraPreview").classList.remove("hidden")

document.getElementById("btnCapture").classList.remove("hidden")

document.getElementById("btnRetake").classList.add("hidden")

startCamera()

}


// ============================
// GPS
// ============================

function getLocation(){

if(!navigator.geolocation){

alert("GPS tidak didukung")

return

}

navigator.geolocation.getCurrentPosition(

async pos=>{

const lat=pos.coords.latitude
const lon=pos.coords.longitude

currentLocation={
lat:lat,
lon:lon
}

document.getElementById("locationInfo").innerText=`${lat.toFixed(6)}, ${lon.toFixed(6)}`

checkReady()

},

err=>{

alert("Aktifkan GPS")

}

)

}


// ============================
// CHECK READY
// ============================

function checkReady(){

if(capturedImage && currentLocation){

document.getElementById("btnSubmitAbsensi").disabled=false

}

}


// ============================
// GITHUB SAVE
// ============================

async function saveToGitHub(){

const content=JSON.stringify(allRecords,null,2)

const base64=btoa(unescape(encodeURIComponent(content)))

await fetch(`https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/data/absensi.json`,{

method:"PUT",

headers:{
Authorization:`token ${CONFIG.TOKEN}`,
Accept:"application/vnd.github.v3+json"
},

body:JSON.stringify({

message:"update absensi",

content:base64,

branch:CONFIG.BRANCH

})

})

}


// ============================
// SUBMIT ABSENSI
// ============================

async function submitAbsensi(){

const name=document.getElementById("employeeSelect").value

const now=getWIB()

const record={

id:Date.now(),

nama:name,

tanggal:now.toISOString().split("T")[0],

jam:now.toTimeString().slice(0,8),

status:currentType==="masuk"?"Hadir":"Pulang",

foto:capturedImage,

latitude:currentLocation.lat,

longitude:currentLocation.lon

}

allRecords.push(record)

await saveToGitHub()

alert("Absensi berhasil")

showPage("dashboard")

}


// ============================
// ADMIN LOGIN
// ============================

function adminLogin(){

const pass=document.getElementById("adminPass").value

if(pass===CONFIG.ADMIN_PASSWORD){

document.getElementById("adminPanel").classList.remove("hidden")

loadAdminData()

}else{

alert("Password salah")

}

}


// ============================
// ADMIN TABLE
// ============================

function loadAdminData(){

const tbody=document.getElementById("adminTableBody")

tbody.innerHTML=""

allRecords.forEach(r=>{

const tr=document.createElement("tr")

tr.innerHTML=`

<td>${r.nama}</td>
<td>${r.tanggal}</td>
<td>${r.jam}</td>
<td>${r.status}</td>
<td><img src="${r.foto}" width="40"></td>

`

tbody.appendChild(tr)

})

}


// ============================
// CSV EXPORT
// ============================

function downloadCSV(){

let csv="Nama,Tanggal,Jam,Status\n"

allRecords.forEach(r=>{

csv+=`${r.nama},${r.tanggal},${r.jam},${r.status}\n`

})

const blob=new Blob([csv],{type:"text/csv"})

const url=URL.createObjectURL(blob)

const a=document.createElement("a")

a.href=url
a.download="absensi.csv"

a.click()

}
