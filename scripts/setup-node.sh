#!/usr/bin/env bash
set -euo pipefail
# Argumen wajib: direktori backend yang benar, bukan root dokumentasi.
[ "$#" -eq 1 ] || { echo 'Usage: bash setup-node.sh /path/to/backend'; exit 1; }
cd "$1"
[ -f package.json ] && [ -f server.js ] || { echo 'STOP: package.json/server.js tidak ditemukan.'; exit 1; }
node -e 'const p=require("./package.json");if(!p.scripts?.start)throw Error("Script start belum ada");console.log("Package:",p.name);if(Number(process.versions.node.split(".")[0])<22)throw Error("Gunakan Node LTS yang masih didukung, minimal 22 untuk panduan ini");'
if grep -nE '^(<<<<<<< |=======$|>>>>>>> )' package.json server.js; then
  echo 'STOP: selesaikan konflik sebelum instalasi.'; exit 1
fi
if [ ! -f .env ]; then
  [ -f .env.example ] || { echo 'STOP: siapkan .env.example tersanitasi dahulu.'; exit 1; }
  cp .env.example .env
  echo '.env dibuat; isi konfigurasi lokal sebelum menjalankan server.'
fi
if [ -f package-lock.json ]; then npm ci; else npm install; fi
node --check server.js
echo 'Instalasi selesai. Jalankan pengujian yang tersedia, lalu npm start.'
