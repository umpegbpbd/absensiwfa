<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Absensi WFA</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
        }

        header {
            background: #1e3a8a;
            color: white;
            padding: 20px;
            text-align: center;
        }

        .clock-section {
            background: white;
            padding: 20px;
            margin: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }

        #clockDisplay {
            font-size: 48px;
            font-weight: bold;
            color: #1e3a8a;
            margin: 10px 0;
            font-family: 'Courier New', monospace;
        }

        #currentDate {
            font-size: 18px;
            color: #666;
            margin: 10px 0;
        }

        .employee-section {
            background: white;
            padding: 20px;
            margin: 0 20px 20px 20px;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .employee-section label {
            display: block;
            margin-bottom: 10px;
            font-weight: 600;
            color: #333;
        }

        #employeeSelect {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            transition: border-color 0.3s;
        }

        #employeeSelect:focus {
            outline: none;
            border-color: #1e3a8a;
        }

        .button-group {
            display: flex;
            gap: 10px;
            margin: 20px;
            flex-wrap: wrap;
        }

        button {
            flex: 1;
            min-width: 120px;
            padding: 12px 20px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }

        .btn-masuk {
            background: #2563eb;
            color: white;
        }

        .btn-masuk:hover {
            background: #1e40af;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
        }

        .btn-pulang {
            background: #16a34a;
            color: white;
        }

        .btn-pulang:hover {
            background: #15803d;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(22, 163, 74, 0.4);
        }

        .btn-cancel {
            background: #6b7280;
            color: white;
        }

        .btn-admin {
            background: #7c3aed;
            color: white;
            margin: 20px;
        }

        .page {
            display: none;
        }

        .page.active {
            display: block;
        }

        .hidden {
            display: none !important;
        }

        /* ===== ABSENSI PAGE ===== */
        .absensi-container {
            background: white;
            margin: 20px;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        video, canvas {
            width: 100%;
            max-width: 400px;
            border-radius: 10px;
            display: block;
            margin: 0 auto 20px;
        }

        #capturedPhoto {
            width: 100%;
            max-width: 400px;
            border-radius: 10px;
            display: block;
            margin: 0 auto 20px;
        }

        #locationInfo {
            background: #f0f9ff;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            color: #0c4a6e;
            font-size: 14px;
            border-left: 4px solid #0284c7;
        }

        .photo-thumb {
            width: 50px;
            height: 50px;
            border-radius: 4px;
            object-fit: cover;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        table th {
            background: #1e3a8a;
            color: white;
            padding: 12px;
            text-align: left;
        }

        table td {
            border-bottom: 1px solid #ddd;
            padding: 12px;
        }

        table tr:hover {
            background: #f9fafb;
        }

        /* ===== ADMIN PANEL ===== */
        .admin-login {
            background: white;
            padding: 40px;
            margin: 40px auto;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            max-width: 400px;
        }

        .admin-login input {
            width: 100%;
            padding: 12px;
            margin: 10px 0 20px;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
        }

        .admin-login button {
            width: 100%;
        }
    </style>
</head>
<body>

<!-- ========== HEADER ========== -->
<header>
    <h1>⏱️ Absensi WFA</h1>
</header>

<!-- ========== DASHBOARD PAGE ========== -->
<div id="page-dashboard" class="page active">
    
    <!-- Clock Display -->
    <div class="clock-section">
        <div style="font-size: 14px; color: #999;">Jam Saat Ini</div>
        <div id="clockDisplay">00:00:00</div>
        <div id="currentDate">-</div>
    </div>

    <!-- Employee Selection -->
    <div class="employee-section">
        <label for="employeeSelect">Pilih Pegawai:</label>
        <select id="employeeSelect">
            <option value="">-- Pilih Pegawai --</option>
        </select>
    </div>

    <!-- Action Buttons -->
    <div class="button-group">
        <button class="btn-masuk" onclick="startAbsensi('masuk')">✓ Masuk</button>
        <button class="btn-pulang" onclick="startAbsensi('pulang')">✓ Pulang</button>
        <button class="btn-admin" onclick="showPage('admin')">🔐 Admin</button>
    </div>

</div>

<!-- ========== ABSENSI PAGE ========== -->
<div id="page-absensi" class="page">
    
    <div class="absensi-container">
        <h2>📸 Ambil Foto Absensi</h2>
        
        <!-- Camera -->
        <video id="cameraPreview" autoplay playsinline></video>
        <canvas id="cameraCanvas" style="display:none;"></canvas>
        <img id="capturedPhoto" class="hidden" alt="Captured">

        <!-- Location Info -->
        <div id="locationInfo">📍 Mendeteksi lokasi...</div>

        <!-- Camera Controls -->
        <div class="button-group">
            <button id="btnCapture" class="btn-masuk" onclick="capturePhoto()">📸 Ambil Foto</button>
            <button id="btnRetake" class="btn-masuk hidden" onclick="retakePhoto()">🔄 Ambil Ulang</button>
        </div>

        <!-- Submit/Cancel -->
        <div class="button-group">
            <button class="btn-masuk" onclick="submitAbsensi()" style="flex:1">✓ Simpan Absensi</button>
            <button class="btn-cancel" onclick="cancelAbsensi()" style="flex:1">✕ Batal</button>
        </div>
    </div>

</div>

<!-- ========== ADMIN PAGE ========== -->
<div id="page-admin" class="page">
    
    <div class="admin-login">
        <h2>🔐 Admin Panel</h2>
        <input type="password" id="adminPass" placeholder="Masukkan Password">
        <button class="btn-admin" onclick="adminLogin()">Login</button>
        <button class="btn-cancel" onclick="showPage('dashboard')" style="margin-top:10px; background:#6b7280;">Kembali</button>
    </div>

    <div id="adminPanel" class="hidden" style="margin: 20px;">
        <h2>📊 Data Absensi</h2>
        
        <button class="btn-masuk" onclick="downloadCSV()" style="margin-bottom: 20px;">📥 Download CSV</button>
        
        <table>
            <thead>
                <tr>
                    <th>Nama</th>
                    <th>Tanggal</th>
                    <th>Jam</th>
                    <th>Status</th>
                    <th>Foto</th>
                </tr>
            </thead>
            <tbody id="adminTableBody">
            </tbody>
        </table>

        <button class="btn-cancel" onclick="showPage('dashboard')" style="margin-top: 20px;">Kembali</button>
    </div>

</div>

<!-- ========== SCRIPT ========== -->
<script src="script.js"></script>

</body>
</html>
