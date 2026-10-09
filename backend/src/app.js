const express = require("express");
const cors = require("cors");
const path = require("node:path");
const pool = require("./config/database");
const { auth } = require("../middleware/middleware");

const app = express();
const workspaceRoot = path.resolve(__dirname, "../..");
const frontendPath = path.join(workspaceRoot, "frontend");
const publicPath = path.join(workspaceRoot, "public");
const allowedOrigins = (process.env.FRONTEND_URL || "")
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);

app.disable("x-powered-by");
app.use(cors({
	origin(origin, callback) {
		if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
			return callback(null, true);
		}
		return callback(new Error("Origin tidak diizinkan"));
	}
}));
app.use(express.json({ limit: process.env.MAX_UPLOAD_SIZE || "50mb" }));

// Lampiran wajib untuk seluruh record K3. Tabel dibuat aman saat startup agar
// instalasi existing dapat langsung memakai fitur ini.
app.use(async (req, res, next) => {
	try {
		if (!app.locals.attachmentsReady) {
			await pool.query(`CREATE TABLE IF NOT EXISTS record_attachments (
				id BIGSERIAL PRIMARY KEY, entity_type VARCHAR(80) NOT NULL,
				record_id BIGINT NOT NULL, file_name TEXT NOT NULL,
				mime_type VARCHAR(255) NOT NULL, file_data BYTEA NOT NULL,
				created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
				UNIQUE(entity_type, record_id)
			)`);
			app.locals.attachmentsReady = true;
		}
		if (!app.locals.auditProgressReady) {
			await pool.query("ALTER TABLE audits ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0");
			app.locals.auditProgressReady = true;
		}
		next();
	} catch (error) { next(error); }
});

app.use((req, res, next) => {
	const attachmentRequired = ["/api/insiden", "/api/observasi", "/api/izin", "/api/training", "/api/apd", "/api/tindakan", "/api/pelaporan", "/api/risiko", "/api/pengguna"];
	if (req.method === "POST" && attachmentRequired.some(prefix => req.path === prefix || req.path.startsWith(`${prefix}/`)) && !req.body?.__attachment) {
		return res.status(400).json({ success: false, message: "Lampiran wajib diunggah" });
	}
	next();
});

app.get("/api/health", async (req, res, next) => {
	try {
		const { rows } = await pool.query("SELECT current_database() AS database");
		res.json({ success: true, message: "JASIL SAFETY API aktif", database: rows[0].database });
	} catch (error) {
		next(error);
	}
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/incidents", require("./routes/incidentRoutes"));
app.use("/api/observations", require("./routes/observationRoutes"));
app.use("/api/near-miss", require("./routes/nearMissRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));

app.use("/api/apd", require("../routes/apd"));
app.use("/api/audit", require("../routes/audit"));
app.use("/api/dokumen", require("../routes/dokumen"));
app.use("/api/izin", auth, require("../routes/izin"));
app.use("/api/insiden", require("../routes/insiden"));
app.use("/api/observasi", require("../routes/observasi"));
app.use("/api/pelaporan", auth, require("../routes/pelaporan"));
app.use("/api/pengaturan", auth, require("../routes/pengaturan"));
app.use("/api/pengguna", require("../routes/pengguna"));
app.use("/api/risiko", require("../routes/risiko"));
app.use("/api/tindakan", auth, require("../routes/tindakan"));
app.use("/api/training", auth, require("../routes/training"));
app.use("/api/attachments", require("../routes/attachments"));

require("../../src/mount-register")(app, pool);

app.get("/", (req, res) => res.sendFile(path.join(frontendPath, "login.html")));
app.use("/assets", express.static(path.join(workspaceRoot, "assets")));
app.use(express.static(frontendPath, { index: false }));
app.use(express.static(publicPath, { index: false }));

app.use((req, res) => {
	res.status(404).json({ success: false, message: "Endpoint atau halaman tidak ditemukan" });
});

app.use((error, req, res, next) => {
	console.error("Request gagal:", error.code || error.message || "INTERNAL_ERROR");
	res.status(500).json({ success: false, message: "Terjadi kesalahan server" });
});

module.exports = app;
