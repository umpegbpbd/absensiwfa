// =======================================
// KONFIGURASI APLIKASI
// =======================================

const CONFIG = {

APP_NAME : "Absensi WFA",

ORGANISASI : "BPBD KAB. TRENGGALEK",



// =======================================
// ADMIN
// =======================================

ADMIN_PASSWORD : "admin123",



// =======================================
// GITHUB STORAGE
// =======================================

OWNER : "umpegbpbd",

REPO : "absensiwfa",

BRANCH : "main",

DATA_FILE : "data/absensi.json",

TOKEN : "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",



// =======================================
// ATURAN ABSENSI
// =======================================

JAM_MASUK_START : "07:00",

JAM_MASUK_END : "07:30",

JAM_PULANG_START : "15:30",

JAM_PULANG_END : "17:30",



// =======================================
// GPS VALIDATION
// =======================================

GPS_REQUIRED : true,

MAX_GPS_ACCURACY : 100,



OFFICE_LOCATION : {

LAT : -7.795580,

LON : 110.369490,

RADIUS_METER : 500

},



// =======================================
// FOTO CAMERA
// =======================================

IMAGE_QUALITY : 0.4,

MAX_IMAGE_WIDTH : 640,

MAX_IMAGE_HEIGHT : 480,



CAMERA_FACING_MODE : "user",



// =======================================
// ABSENSI LIMIT
// =======================================

ALLOW_DOUBLE_ABSEN : false,



MAX_ABSEN_PER_DAY : 2,



// =======================================
// SECURITY
// =======================================

ANTI_FAKE_GPS : true,

ANTI_TIME_MANIPULATION : true,



// =======================================
// FITUR TAMBAHAN
// =======================================

ENABLE_STATISTICS : true,

ENABLE_EXPORT_CSV : true,

ENABLE_FACE_VERIFICATION : false,

ENABLE_OFFLINE_CACHE : false



}
