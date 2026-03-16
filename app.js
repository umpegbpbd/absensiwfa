let latitudeInput = document.getElementById("latitude");
let longitudeInput = document.getElementById("longitude");

let kotaInput = document.getElementById("kota");
let kecamatanInput = document.getElementById("kecamatan");
let desaInput = document.getElementById("desa");

let statusGPS = document.getElementById("statusGPS");

// Ambil GPS
function ambilGPS() {

    statusGPS.innerHTML = "Mengambil GPS...";

    if (!navigator.geolocation) {
        alert("Browser tidak mendukung GPS");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function(position) {

            let lat = position.coords.latitude;
            let lon = position.coords.longitude;

            latitudeInput.value = lat;
            longitudeInput.value = lon;

            statusGPS.innerHTML = "GPS ditemukan";

            // Ambil alamat
            ambilAlamat(lat, lon);

        },
        function(error) {

            statusGPS.innerHTML = "GPS gagal";
            console.log(error);

        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}


// Reverse geocoding
function ambilAlamat(lat, lon) {

    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
    .then(response => response.json())
    .then(data => {

        let address = data.address;

        let kota =
            address.city ||
            address.town ||
            address.county ||
            "";

        let kecamatan =
            address.suburb ||
            address.city_district ||
            "";

        let desa =
            address.village ||
            address.hamlet ||
            "";

        kotaInput.value = kota;
        kecamatanInput.value = kecamatan;
        desaInput.value = desa;

        console.log("Kota:", kota);
        console.log("Kecamatan:", kecamatan);
        console.log("Desa:", desa);

    })
    .catch(err => {
        console.log("Gagal ambil alamat", err);
    });
}


// Jalankan otomatis saat halaman dibuka
window.onload = function () {

    ambilGPS();

};
