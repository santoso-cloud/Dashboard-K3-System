const pool = require("../config/database");
const jwt = require("jsonwebtoken");
const { hashPassword, verifyPassword } = require("../services/passwordService");

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username dan password wajib diisi" });
    }

    const { rows } = await pool.query(
      `SELECT u.id, u.role_id, u.name, u.username, u.email, u.password_hash, u.status,
              r.name AS role
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE lower(u.username) = lower($1) OR lower(u.email) = lower($1)
       LIMIT 1`,
      [username.trim()]
    );
    const user = rows[0];

    if (!user || user.status !== "active") {
      return res.status(401).json({ success: false, message: "Username atau password salah" });
    }

    const verification = await verifyPassword(password, user.password_hash);
    if (!verification.matches) {
      return res.status(401).json({ success: false, message: "Username atau password salah" });
    }

    if (verification.needsRehash) {
      const passwordHash = await hashPassword(password);
      await pool.query(
        "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND password_hash = $3",
        [passwordHash, user.id, user.password_hash]
      );
    }

    await pool.query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1", [user.id]);
    const token = jwt.sign(
      { id: user.id, role_id: user.role_id, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    delete user.password_hash;
    res.json({ success: true, message: "Login berhasil", token, user });
  } catch (error) {
    next(error);
  }
};
