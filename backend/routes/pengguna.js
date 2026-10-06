const express = require("express");
const pool = require("../config/db");
const { auth, authorize } = require("../middleware/middleware");
const { hashPassword } = require("../src/services/passwordService");

const router = express.Router();

router.use(auth);

router.get("/roles", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name FROM roles ORDER BY id");
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        u.id,
        u.name,
        u.username,
        u.email,
        u.phone,
        u.department,
        u.last_login,
        u.status,
        u.role_id,
        u.created_at,
        r.name AS role
      FROM users u
      LEFT JOIN roles r
        ON r.id = u.role_id
      ORDER BY u.id DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

});

router.post(
  "/",
  authorize("Super Admin", "Admin"),
  async (req, res) => {

    try {

      const {
        name,
        username,
        email,
        password,
        role_id,
        phone,
        department,
        status
      } = req.body;

      if (!name || !username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Nama, username, email dan password wajib diisi"
        });
      }

      const hash = await hashPassword(password);

      const result = await pool.query(
        `
        INSERT INTO users
        (
          name,
          username,
          email,
          password_hash,
          role_id,
          phone,
          department,
          status
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING
          id,
          name,
          username,
          email,
          role_id,
          phone,
          department,
          status
        `,
        [
          name,
          username,
          email,
          hash,
          role_id,
          phone,
          department,
          status || "active"
        ]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0]
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        message: error.message
      });

    }

  }
);

router.put(
  "/:id",
  authorize("Super Admin", "Admin"),
  async (req, res) => {
    try {
      const { name, username, email, password, role_id, phone, department, status } = req.body;
      if (!name || !username || !email) {
        return res.status(400).json({ success: false, message: "Nama, username dan email wajib diisi" });
      }

      const values = [name, username, email, role_id || null, phone || null, department || null, status || "active"];
      let query = `
        UPDATE users
        SET name = $1, username = $2, email = $3, role_id = $4,
            phone = $5, department = $6, status = $7, updated_at = CURRENT_TIMESTAMP`;

      if (password) {
        values.push(await hashPassword(password));
        query += `, password_hash = $${values.length}`;
      }

      values.push(req.params.id);
      query += ` WHERE id = $${values.length}
        RETURNING id, name, username, email, role_id, phone, department, status`;

      const result = await pool.query(query, values);
      if (!result.rows[0]) return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan" });
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.delete(
  "/:id",
  authorize("Super Admin", "Admin"),
  async (req, res) => {
    try {
      if (Number(req.params.id) === Number(req.user.id)) {
        return res.status(400).json({ success: false, message: "Akun yang sedang digunakan tidak dapat dihapus" });
      }

      const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [req.params.id]);
      if (!result.rows[0]) return res.status(404).json({ success: false, message: "Pengguna tidak ditemukan" });
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;