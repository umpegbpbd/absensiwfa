let video=document.getElementById("camera")
let canvas=document.getElementById("canvas")

navigator.mediaDevices.getUserMedia({video:true})
.then(stream=>{
video.srcObject=stream
})

window.addEventListener("DOMContentLoaded",()=>{

let select=document.getElementById("pegawai")

EMPLOYEES.forEach(nama=>{

let opt=document.createElement("option")

opt.value=nama
opt.textContent=nama

select.appendChild(opt)

})

})

function capture(){

canvas.width=video.videoWidth
canvas.height=video.videoHeight

let ctx=canvas.getContext("2d")

ctx.drawImage(video,0,0)

return canvas.toDataURL("image/jpeg",0.3)

}

async function absen(){

let nama=document.getElementById("pegawai").value

let foto=capture()

let now=new Date()

let data={
nama:nama,
tanggal:now.toLocaleDateString(),
jam:now.toLocaleTimeString(),
status:"Hadir",
foto:foto
}

alert("Absensi berhasil")

}
