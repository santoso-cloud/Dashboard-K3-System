const express = require("express");
const { auth } = require("../middleware/middleware");
const crud = require("../utils/crud");

const router = express.Router();
const TABLE = "documents";

router.get("/", auth, async (req, res) => {
	try {
		const result = await crud.getAll(TABLE, req);

		res.json({
			success: true,
			message: "Data dokumen berhasil diambil",
			data: result
		});
	} catch (error) {
		console.error("GET DOKUMEN ERROR:", error);
		res.status(500).json({
			success: false,
			message: "Gagal mengambil data dokumen",
			error: error.message
		});
	}
});

router.get("/:id", auth, async (req, res) => {
	try {
		const result = await crud.getOne(TABLE, req.params.id);

		if (!result) {
			return res.status(404).json({
				success: false,
				message: "Dokumen tidak ditemukan"
			});
		}

		res.json({
			success: true,
			message: "Dokumen berhasil diambil",
			data: result
		});
	} catch (error) {
		console.error("GET DOKUMEN BY ID ERROR:", error);
		res.status(500).json({
			success: false,
			message: "Gagal mengambil dokumen",
			error: error.message
		});
	}
});

router.post("/", auth, async (req, res) => {
	try {
		const result = await crud.create(TABLE, req.body);

		res.status(201).json({
			success: true,
			message: "Dokumen berhasil ditambahkan",
			data: result
		});
	} catch (error) {
		console.error("CREATE DOKUMEN ERROR:", error);
		res.status(500).json({
			success: false,
			message: "Gagal menambahkan dokumen",
			error: error.message
		});
	}
});

router.put("/:id", auth, async (req, res) => {
	try {
		const result = await crud.update(TABLE, req.params.id, req.body);

		if (!result) {
			return res.status(404).json({
				success: false,
				message: "Dokumen tidak ditemukan"
			});
		}

		res.json({
			success: true,
			message: "Dokumen berhasil diperbarui",
			data: result
		});
	} catch (error) {
		console.error("UPDATE DOKUMEN ERROR:", error);
		res.status(500).json({
			success: false,
			message: "Gagal memperbarui dokumen",
			error: error.message
		});
	}
});

router.delete("/:id", auth, async (req, res) => {
	try {
		const result = await crud.remove(TABLE, req.params.id);

		if (!result) {
			return res.status(404).json({
				success: false,
				message: "Dokumen tidak ditemukan"
			});
		}

		res.json({
			success: true,
			message: "Dokumen berhasil dihapus",
			data: result
		});
	} catch (error) {
		console.error("DELETE DOKUMEN ERROR:", error);
		res.status(500).json({
			success: false,
			message: "Gagal menghapus dokumen",
			error: error.message
		});
	}
});

module.exports = router;
