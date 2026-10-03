#!/usr/bin/env bash
set -euo pipefail
# Jalankan dari root repository. Tidak otomatis commit, stash, atau force push.
git rev-parse --show-toplevel >/dev/null
cd "$(git rev-parse --show-toplevel)"
for state in rebase-merge rebase-apply MERGE_HEAD CHERRY_PICK_HEAD; do
  if [ -e "$(git rev-parse --git-path "$state")" ]; then
    echo "STOP: operasi Git masih berjalan. Jalankan git status dan selesaikan dahulu." >&2; exit 1
  fi
done
if [ -n "$(git status --porcelain)" ]; then
  echo "STOP: working tree belum bersih. Review lalu commit perubahan terlebih dahulu." >&2
  git status --short; exit 1
fi
if git grep -I -l -E '^(<<<<<<< |=======$|>>>>>>> )' -- .; then
  echo "STOP: ditemukan penanda konflik. Periksa file di atas." >&2; exit 1
fi
# Pemeriksaan nama file, bukan jaminan bahwa semua rahasia telah terdeteksi.
while IFS= read -r -d '' file; do
  case "$file" in
    .env.example|*/.env.example|.env.*.example|*/.env.*.example) ;;
    .env|*/.env|.env.*|*/.env.*|.env\(*|*/.env\(*|*.pem|*.key|*.dump|node_modules/*|*/node_modules/*)
      echo "STOP: file sensitif/dependency masih tracked: $file" >&2; exit 1 ;;
  esac
done < <(git ls-files -z)
expected="${K3_EXPECTED_ORIGIN:-https://github.com/Falmines/dashboard-k3-system.git}"
mapfile -t urls < <(git remote get-url --push --all origin)
[ "${#urls[@]}" -eq 1 ] && [ "${urls[0]}" = "$expected" ] || { echo "STOP: push URL origin berbeda dari repository tujuan." >&2; exit 1; }
[ "$(git remote get-url origin)" = "$expected" ] || { echo "STOP: fetch URL origin berbeda dari tujuan." >&2; exit 1; }
[ "$(git branch --show-current)" = master ] || { echo "STOP: pilih branch master dahulu. Baca dokumentasi untuk migrasi main." >&2; exit 1; }
git branch "backup/master-$(date +%Y%m%d-%H%M%S)-$$"
git fetch origin
if git show-ref --verify --quiet refs/remotes/origin/master; then
  if ! git merge-base HEAD origin/master >/dev/null; then
    echo "STOP: riwayat lokal dan remote tidak berhubungan. Ikuti alur clone baru di dokumentasi." >&2; exit 1
  fi
  if ! git rebase origin/master; then
    echo "STOP: rebase belum selesai. Perbaiki konflik, git add file, git rebase --continue." >&2
    echo "Atau batalkan dengan git rebase --abort. Tidak ada push yang dijalankan." >&2; exit 1
  fi
fi
git push -u origin master
git status --short --branch
