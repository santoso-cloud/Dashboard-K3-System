# Dashboard K3 Safety — PT. JASIL

Frontend HTML/CSS/JavaScript berkomunikasi dengan REST API Node.js/Express. PostgreSQL diakses melalui backend.

## Backend utama

Gunakan backend/server.js dan backend/package.json milik Dashboard, dengan seluruh folder src dan sql yang sesuai. Isi backend/.env dari contoh lokal. Jalankan npm ci jika lockfile cocok, atau npm install jika belum ada. Periksa npm run untuk daftar script yang tersedia; gunakan npm start atau npm run dev hanya bila didefinisikan.

## Register

Modul Register menambahkan POST /api/auth/register. Simpan sumber modul di backend/src/jasil-register lalu panggil mount-register dari src/app.js setelah express.json dan sebelum autentikasi global/404. Gunakan pool PostgreSQL existing. Password disimpan sebagai bcrypt hash; role Staff dan status active dipilih server.

Salin register.html, register.css, register.js, config.js ke frontend. Sesuaikan registerUrl dan loginUrl pada config.js. Terapkan sql/01-register-existing.sql setelah backup dan precheck duplikat. Jangan membuat ulang database existing.

## Modul mandiri

Alternatifnya jalankan paket jasil-register lengkap di port 5001. package.json/server.js modul mandiri tidak boleh menimpa backend utama. Modul mandiri tidak menyediakan seluruh endpoint Dashboard atau login JWT.

## Git

Selesaikan konflik, periksa perubahan, commit file yang dipilih, fetch origin, rebase origin/master lalu push origin master. Jangan commit .env atau node_modules. Panduan lengkap tersedia di paket dokumentasi K3 Node Migration Push.
