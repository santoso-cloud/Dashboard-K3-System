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
app.use(express.json({ limit: "32kb" }));

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

require("../../src/mount-register")(app, pool);

app.get("/", (req, res) => res.sendFile(path.join(frontendPath, "index.html")));
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
