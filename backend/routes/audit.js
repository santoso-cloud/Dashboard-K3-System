const express = require("express");
const { auth } = require("../middleware/middleware");
const crud = require("../utils/crud");

const router = express.Router();
const TABLE = "audits";
function normalizedStatus(status) {
	const value = String(status || "").trim().toLowerCase();
	if (/selesai|completed|closed/.test(value)) return "Selesai";
	if (/berjalan|progress|ongoing|in progress/.test(value)) return "Berjalan";
	return "Direncanakan";
}
function applyProgressRule(status, progress) {
	const normalized = normalizedStatus(status);
	if (normalized === "Direncanakan") return 0;
	if (normalized === "Selesai") return 100;
	const value = Number(progress);
	if (!Number.isInteger(value) || value < 20 || value > 70) throw new Error("Progress audit saat berjalan harus antara 20% sampai 70%");
	return value;
}

router.get("/", auth, async (req, res) => {
	try {
		const data = await crud.getAll(TABLE, req);

		res.json({
			success: true,
			message: "Data audit berhasil diambil",
			data
		});
	} catch (error) {
		console.error("GET AUDIT ERROR:", error);
		res.status(500).json({
			success: false,
			message: "Gagal mengambil data audit",
			error: error.message
		});
	}
});

router.get("/:id", auth, async (req, res) => {
	try {
		const data = await crud.getOne(TABLE, req.params.id);

		if (!data) {
			return res.status(404).json({
				success: false,
				message: "Data audit tidak ditemukan"
			});
		}

		res.json({ success: true, data });
	} catch (error) {
		console.error("GET AUDIT BY ID ERROR:", error);
		res.status(500).json({
			success: false,
			message: "Gagal mengambil data audit",
			error: error.message
		});
	}
});

router.post("/", auth, async (req, res) => {
	try {
		const body = { ...req.body, status: normalizedStatus(req.body.status), progress: applyProgressRule(req.body.status, req.body.progress ?? 0) };
		const data = await crud.create(TABLE, body);
		res.status(201).json({
			success: true,
			message: "Data audit berhasil ditambahkan",
			data
		});
	} catch (error) {
		console.error("CREATE AUDIT ERROR:", error);
		res.status(500).json({
			success: false,
			message: "Gagal menambahkan data audit",
			error: error.message
		});
	}
});

router.put("/:id", auth, async (req, res) => {
	try {
		const current = await crud.getOne(TABLE, req.params.id);
		if (!current) return res.status(404).json({ success: false, message: "Data audit tidak ditemukan" });
		const body = { ...req.body, status: normalizedStatus(req.body.status ?? current.status), progress: applyProgressRule(req.body.status ?? current.status, req.body.progress ?? current.progress ?? 0) };
		const data = await crud.update(TABLE, req.params.id, body);

		if (!data) {
			return res.status(404).json({
				success: false,
				message: "Data audit tidak ditemukan"
			});
		}

		res.json({
			success: true,
			message: "Data audit berhasil diperbarui",
			data
		});
	} catch (error) {
		console.error("UPDATE AUDIT ERROR:", error);
		res.status(500).json({
			success: false,
			message: "Gagal memperbarui data audit",
			error: error.message
		});
	}
});

router.delete("/:id", auth, async (req, res) => {
	try {
		const data = await crud.remove(TABLE, req.params.id);

		if (!data) {
			return res.status(404).json({
				success: false,
				message: "Data audit tidak ditemukan"
			});
		}

		res.json({
			success: true,
			message: "Data audit berhasil dihapus",
			data
		});
	} catch (error) {
		console.error("DELETE AUDIT ERROR:", error);
		res.status(500).json({
			success: false,
			message: "Gagal menghapus data audit",
			error: error.message
		});
	}
});

module.exports = router;
