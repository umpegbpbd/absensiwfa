 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/config.js b/config.js
index 004c7a0881964781f05fc53d7e53d3d2a373c844..147194737f99e3044e40e9820d044e0909239697 100644
--- a/config.js
+++ b/config.js
@@ -1,25 +1,20 @@
 const CONFIG = {
-    APP_NAME: "Absensi WFA",
-    ORGANISASI: "BPBD KAB. TRENGGALEK",
-    ADMIN_PASSWORD: "admin123",
+  APP_NAME: "Absensi WFA",
+  ORGANISASI: "BPBD KAB. TRENGGALEK",
+  ADMIN_PASSWORD: "admin123",
 
-    // GITHUB STORAGE
-    OWNER: "umpegbpbd",
-    REPO: "absensiwfa",
-    BRANCH: "main",
-    DATA_FILE: "data/absensi.json",
+  // GitHub storage
+  OWNER: "umpegbpbd",
+  REPO: "absensiwfa",
+  BRANCH: "main",
+  DATA_FILE: "data/absensi.json",
 
-    // Kosongkan token default demi keamanan.
-    // Token akan dibaca dari localStorage (lihat app.js) atau bisa diisi manual di sini.
-    TOKEN: "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",
+  // Sesuai permintaan user
+  TOKEN: "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",
 
-    // ATURAN ABSENSI
-    JAM_MASUK_END: "07:30",
-    JAM_PULANG_START: "15:30",
-
-    // VALIDASI
-    GPS_REQUIRED: true,
-    MAX_GPS_ACCURACY: 100,
-    IMAGE_QUALITY: 0.4,
-    CAMERA_FACING_MODE: "user"
+  // Pengaturan absensi
+  JAM_MASUK_END: "07:30",
+  JAM_PULANG_START: "15:30",
+  IMAGE_QUALITY: 0.45,
+  CAMERA_FACING_MODE: "user"
 };
 
EOF
)
