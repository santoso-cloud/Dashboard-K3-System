-- Jalankan ini di PostgreSQL/pgAdmin untuk melihat DATABASE REAL.
SELECT current_database(), current_user;

SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema='public'
ORDER BY table_name;

-- Fokus tabel pelaporan:
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN ('reports','report','pelaporan')
ORDER BY table_name, ordinal_position;

-- Cek isi:
SELECT * FROM public.reports LIMIT 5;
