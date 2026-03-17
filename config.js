const CONFIG = {
    APP_NAME: "Absensi WFA",
    ORGANISASI: "BPBD KAB. TRENGGALEK",
    ADMIN_PASSWORD: "admin123",

    // GITHUB STORAGE
    OWNER: "umpegbpbd",
    REPO: "absensiwfa",
    BRANCH: "main",
    DATA_FILE: "data/absensi.json",

    // Kosongkan token default demi keamanan.
    // Token akan dibaca dari localStorage (lihat app.js) atau bisa diisi manual di sini.
    TOKEN: "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",

    // ATURAN ABSENSI
    JAM_MASUK_END: "07:30",
    JAM_PULANG_START: "15:30",

    // VALIDASI
    GPS_REQUIRED: true,
    MAX_GPS_ACCURACY: 100,
    IMAGE_QUALITY: 0.4,
    CAMERA_FACING_MODE: "user"
};
