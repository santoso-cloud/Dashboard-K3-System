'use strict';
const { validate } = require('./validation');
// Dependencies diterima dari app agar memakai pool PostgreSQL yang sudah ada.
module.exports = function createRegisterController({ pool, bcrypt, passwordService }) {
  return async function register(req, res) {
    const { data, errors } = validate(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ success: false, message: 'Periksa kembali formulir Anda.', errors });
    try {
      // Tidak pernah menggunakan role_id, status, atau password_hash dari client.
      const role = await pool.query("SELECT id FROM roles WHERE name = 'Staff' LIMIT 1");
      if (!role.rows.length) return res.status(503).json({ success: false, message: 'Pendaftaran belum tersedia. Hubungi administrator.' });
      const duplicate = await pool.query('SELECT id FROM users WHERE lower(username) = $1 OR lower(email) = $2 LIMIT 1', [data.username, data.email]);
      if (duplicate.rows.length) return res.status(409).json({ success: false, message: 'Username atau email sudah terdaftar.' });
      const hash = passwordService
        ? await passwordService.hashPassword(data.password)
        : await bcrypt.hash(data.password, 12);
      const result = await pool.query(`INSERT INTO users
        (role_id, employee_number, name, username, email, password_hash, phone, department, position, status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active')
        RETURNING id, name, username, email`,
        [role.rows[0].id, data.employee_number, data.name, data.username, data.email, hash, data.phone, data.department, data.position]);
      return res.status(201).json({ success: true, message: 'Akun berhasil dibuat. Silakan masuk ke Dashboard K3 Safety.', user: result.rows[0] });
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ success: false, message: 'Username, email, atau nomor karyawan sudah digunakan.' });
      // Hanya kode error; jangan mencetak query, password, atau data pribadi.
      console.error('Register gagal:', error.code || 'INTERNAL_ERROR');
      return res.status(500).json({ success: false, message: 'Pendaftaran gagal diproses. Hubungi administrator.' });
    }
  };
};
