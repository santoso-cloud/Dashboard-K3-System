const express = require("express");
const jwt = require("jsonwebtoken");

const pool = require("../config/db");
const { auth } = require("../middleware/middleware");
const { hashPassword, verifyPassword } = require("../src/services/passwordService");

const router = express.Router();


// =====================================================
// LOGIN
// POST /api/auth/login
// =====================================================

router.post("/login", async (req, res) => {

    try {

        const {
            username,
            password
        } = req.body;

        // Validasi
        if (!username || !password) {

            return res.status(400).json({
                success: false,
                message: "Username dan password wajib diisi"
            });

        }


        // Cari user
        const result = await pool.query(`
            SELECT
                u.id,
                u.employee_number,
                u.name,
                u.username,
                u.email,
                u.password_hash,
                u.phone,
                u.department,
                u.position,
                u.photo_url,
                u.status,
                u.last_login,

                r.id AS role_id,
                r.name AS role_name

            FROM users u

            LEFT JOIN roles r
                ON r.id = u.role_id

            WHERE
                LOWER(u.username) = LOWER($1)
                OR LOWER(u.email) = LOWER($1)

            LIMIT 1
        `, [username]);


        // User tidak ditemukan
        if (result.rows.length === 0) {

            return res.status(401).json({
                success: false,
                message: "Username atau password salah"
            });

        }


        const user = result.rows[0];


        // Cek status
        if (user.status !== "active") {

            return res.status(403).json({
                success: false,
                message: `Akun ${user.status}`
            });

        }


        // Cek password
        const verification = await verifyPassword(password, user.password_hash);


        if (!verification.matches) {

            return res.status(401).json({
                success: false,
                message: "Username atau password salah"
            });

        }

        if (verification.needsRehash) {
            const passwordHash = await hashPassword(password);
            await pool.query(
                "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                [passwordHash, user.id]
            );
        }


        // Update last login
        await pool.query(`
            UPDATE users
            SET
                last_login = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [user.id]);


        // JWT
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role_name,
                role_id: user.role_id
            },
            process.env.JWT_SECRET,
            {
                expiresIn:
                    process.env.JWT_EXPIRES_IN || "1d"
            }
        );


        // Response
        res.json({
            success: true,
            message: "Login berhasil",

            token,

            user: {
                id: user.id,
                employee_number:
                    user.employee_number,
                name: user.name,
                username: user.username,
                email: user.email,
                phone: user.phone,
                department: user.department,
                position: user.position,
                photo_url: user.photo_url,
                status: user.status,
                role_id: user.role_id,
                role: user.role_name
            }
        });

    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Terjadi kesalahan pada server"
        });

    }

});


// =====================================================
// GET CURRENT USER
// GET /api/auth/me
// =====================================================

router.get("/me", auth, async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                u.id,
                u.employee_number,
                u.name,
                u.username,
                u.email,
                u.phone,
                u.department,
                u.position,
                u.photo_url,
                u.status,
                u.last_login,

                r.id AS role_id,
                r.name AS role_name

            FROM users u

            LEFT JOIN roles r
                ON r.id = u.role_id

            WHERE u.id = $1
        `, [req.user.id]);


        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "User tidak ditemukan"
            });

        }


        const user = result.rows[0];


        res.json({
            success: true,
            user: {
                id: user.id,
                employee_number:
                    user.employee_number,
                name: user.name,
                username: user.username,
                email: user.email,
                phone: user.phone,
                department: user.department,
                position: user.position,
                photo_url: user.photo_url,
                status: user.status,
                role_id: user.role_id,
                role: user.role_name,
                last_login: user.last_login
            }
        });

    } catch (error) {

        console.error(
            "ME ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Gagal mengambil data user"
        });

    }

});


module.exports = router;