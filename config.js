/**
 * CONFIG.JS - KONFIGURASI SISTEM ABSENSI BPBD TRENGGALEK
 * Pastikan file ini dipanggil sebelum app.js di index.html
 */

const CONFIG = {
    // =======================================
    // IDENTITAS APLIKASI
    // =======================================
    APP_NAME: "Absensi WFA",
    ORGANISASI: "BPBD KAB. TRENGGALEK",

    // =======================================
    // KEAMANAN & ADMIN
    // =======================================
    ADMIN_PASSWORD: "admin123", // Segera ganti saat production

    // =======================================
    // GITHUB STORAGE SETTINGS
    // =======================================
    // Catatan: Jika repo Publik, Token ini rawan di-disable otomatis oleh GitHub
    OWNER: "umpegbpbd",
    REPO: "absensiwfa",
    BRANCH: "main",
    DATA_FILE: "data/absensi.json",
    TOKEN: "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",

    // =======================================
    // ATURAN WAKTU (JAM KERJA)
    // =======================================
    // Format HH:mm
    JAM_MASUK_START: "07:00",
    JAM_MASUK_END: "07:30",
    JAM_PULANG_START: "15:30",
    JAM_PULANG_END: "17:30",

    // =======================================
    // GPS & VALIDASI LOKASI
    // =======================================
    GPS_REQUIRED: true,
    MAX_GPS_ACCURACY: 100, // Dalam meter, semakin kecil semakin ketat

    // Titik Pusat Kantor (Contoh: Kantor BPBD)
    OFFICE_LOCATION: {
        LAT: -7.795580,
        LON: 110.369490,
        RADIUS_METER: 500 // Jarak maksimal dari kantor untuk dianggap WFO
    },

    // =======================================
    // PENGATURAN KAMERA & FOTO
    // =======================================
    IMAGE_QUALITY: 0.4,       // 0.1 s/d 1.0 (Semakin kecil semakin hemat storage)
    MAX_IMAGE_WIDTH: 640,     // Resolusi lebar
    MAX_IMAGE_HEIGHT: 480,    // Resolusi tinggi
    CAMERA_FACING_MODE: "user", // "user" untuk kamera depan, "environment" untuk belakang

    // =======================================
    // PEMBATASAN ABSENSI
    // =======================================
    ALLOW_DOUBLE_ABSEN: false, // Jika false, user tidak bisa absen masuk 2x di hari yang sama
    MAX_ABSEN_PER_DAY: 2,      // 1 Masuk, 1 Pulang

    // =======================================
    // SECURITY FEATURES
    // =======================================
    ANTI_FAKE_GPS: true,           // Deteksi berdasarkan akurasi sinyal
    ANTI_TIME_MANIPULATION: true,  // Mengabaikan jam HP jika terdeteksi tidak sinkron

    // =======================================
    // MODUL FITUR (TRUE/FALSE)
    // =======================================
    ENABLE_STATISTICS: true,
    ENABLE_EXPORT_CSV: true,
    ENABLE_FACE_VERIFICATION: false, // Membutuhkan library tambahan (face-api.js)
    ENABLE_OFFLINE_CACHE: false      // Simpan di local dulu jika internet mati
};

// Bekukan objek agar tidak bisa diubah lewat konsol browser secara sengaja
Object.freeze(CONFIG);
