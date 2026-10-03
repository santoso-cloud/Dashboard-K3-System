K3 SAFETY - PATCH PELAPORAN
===========================

Tujuan
------
Patch ini memperbaiki halaman Pelaporan agar:
- mengambil data dari PostgreSQL, bukan angka dummy;
- statistik dihitung dari database;
- tabel laporan tampil dari database;
- tombol Lihat/Edit/Hapus aktif;
- tombol "Buat Laporan Baru" benar-benar INSERT;
- Edit melakukan UPDATE;
- Hapus melakukan DELETE;
- kode laporan tidak membutuhkan kolom `action_code`;
- backend TIDAK mengasumsikan kolom `source` atau `action_code`.

Catatan penting
---------------
Route pelaporan menggunakan introspeksi information_schema dan mencari salah satu tabel:
reports, report, pelaporan.

Kemudian route mencari nama kolom yang tersedia dari alias umum:
ID, kode laporan, jenis, deskripsi, lokasi, pelapor, tanggal, status.

Jadi patch ini sengaja tidak memakai `action_code` dan tidak memakai `source`.

1. BACKEND
----------
Salin:
backend/routes/pelaporan.js
backend/config/db.js

Pastikan server utama memiliki:
app.use(express.json());
app.use(cors());
app.use('/api/pelaporan', require('./routes/pelaporan'));

Jika project Anda sudah punya config/db.js yang benar, JANGAN menggantinya.
Cukup gunakan routes/pelaporan.js.

2. .ENV
-------
Buat/cek backend/.env:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nama_database_anda
DB_USER=postgres
DB_PASSWORD=password_postgres
PORT=5000

3. FRONTEND
-----------
Ganti report-script.js dengan versi patch di folder frontend.

Jika frontend dibuka dari Live Server (127.0.0.1:5500), script akan
mengarah ke:
http://localhost:5000/api/pelaporan

4. TES
------
Jalankan backend:
npm install
node server.js

Buka:
http://localhost:5000/api/pelaporan/schema

Jika berhasil, endpoint akan mengembalikan tabel dan kolom yang ditemukan.

Lalu buka:
http://localhost:5000/api/pelaporan
http://localhost:5000/api/pelaporan/stats

5. JIKA INSERT MASIH GAGAL
---------------------------
Lihat error PostgreSQL di terminal. Kemungkinan tabel mempunyai kolom
NOT NULL tambahan atau foreign key yang wajib diisi. Jalankan diagnose.sql
dan kirim hasil struktur tabel tersebut.

Jangan menjalankan ALTER TABLE secara acak sebelum struktur database diperiksa.
