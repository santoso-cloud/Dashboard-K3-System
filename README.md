# K3 Safety — Tindakan Korektif (Real PostgreSQL CRUD)

Paket ini memperbaiki halaman Tindakan Korektif agar tidak lagi memakai angka/statistik hard-code dan mengaktifkan tombol **Tambah, Edit, Ubah Status, Hapus, Search, Filter, Pagination** melalui REST API PostgreSQL.

## Struktur

- `frontend/tindakan-korektif.html` — halaman
- `frontend/tindakan-korektif.css` — desain
- `frontend/action-script.js` — koneksi API + CRUD
- `backend/server.js` — Express API
- `backend/config/db.js` — koneksi PostgreSQL
- `backend/routes/tindakan.js` — CRUD `/api/tindakan`
- `backend/middleware/auth.js` — JWT middleware opsional
- `backend/sql/schema-corrective-actions.sql` — struktur tabel

## 1. Database

Buat database PostgreSQL, misalnya `k3_safety`, lalu jalankan:

```sql
-- PostgreSQL Query Tool / psql
\c k3_safety
\i backend/sql/schema-corrective-actions.sql
```

Jika tabel `corrective_actions` **sudah ada**, cek struktur terlebih dahulu:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'corrective_actions'
ORDER BY ordinal_position;
```

Jangan menjalankan `DROP TABLE` pada database yang sudah memiliki data produksi.

## 2. Backend

Masuk ke folder `backend`, salin `.env.example` menjadi `.env`, lalu isi password PostgreSQL.

```bash
cd backend
npm install
npm run dev
```

Tes:

`http://localhost:5000/api/health`

Harus menghasilkan JSON bahwa API dan PostgreSQL terhubung.

## 3. Frontend

Buka `frontend/tindakan-korektif.html` melalui Live Server/VS Code.

Frontend menggunakan:

`http://localhost:5000/api/tindakan`

Jika Live Server memakai port selain 5500, ubah `FRONTEND_URL` pada `.env`.

## 4. Tombol yang aktif

- **Buat Tindakan Korektif** → POST
- **Edit** → GET + PUT
- **Ubah status** → PUT
- **Hapus** → DELETE
- Search dan filter → membaca data PostgreSQL
- Statistik → `/api/tindakan/summary`
- Ringkasan status, prioritas, sumber, dan tindakan terlambat → PostgreSQL

## Catatan keamanan

`REQUIRE_AUTH=false` dibuat agar halaman bisa langsung dites. Untuk server produksi, ubah menjadi `REQUIRE_AUTH=true` dan gunakan JWT login yang sudah ada pada sistem K3 Safety.
