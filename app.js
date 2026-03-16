// =======================
// LOAD DATA DARI GITHUB
// =======================

async function loadData(){

let url = `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.DATA_FILE}`

let res = await fetch(url)

let data = await res.json()

let content = JSON.parse(atob(data.content))

return content

}



// =======================
// SIMPAN DATA KE GITHUB
// =======================

async function saveData(data){

let url = `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.DATA_FILE}`

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



// =======================
// AKTIFKAN KAMERA
// =======================

let video = document.getElementById("camera")

navigator.mediaDevices.getUserMedia({video:true})
.then(stream=>{
video.srcObject = stream
})



// =======================
// AMBIL FOTO
// =======================

function capture(){

let canvas = document.getElementById("canvas")

canvas.width = video.videoWidth
canvas.height = video.videoHeight

let ctx = canvas.getContext("2d")

ctx.drawImage(video,0,0)

return canvas.toDataURL("image/jpeg",0.3)

}



// =======================
// AMBIL GPS
// =======================

function getLocation(){

return new Promise((resolve,reject)=>{

navigator.geolocation.getCurrentPosition(pos=>{

resolve({
lat:pos.coords.latitude,
lon:pos.coords.longitude
})

})

})

}



// =======================
// ABSENSI
// =======================

async function absen(){

let nama = document.getElementById("pegawai").value

let foto = capture()

let lokasi = await getLocation()

let data = await loadData()

data.push({

nama:nama,
tanggal:new Date().toISOString(),
foto:foto,
latitude:lokasi.lat,
longitude:lokasi.lon

})

saveData(data)

alert("Absensi berhasil")

}
