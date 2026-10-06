const express = require("express");
const { auth } = require("../middleware/middleware");
const crud = require("../utils/crud");

const router = express.Router();
const TABLE = "risk_register";

router.get("/", auth, async (req, res) => {
	try {
		const result = await crud.getAll(TABLE, req);

		res.json({
			success: true,
			message: "Data risiko berhasil diambil",
			data: result
		});
	} catch (error) {
		console.error("GET RISIKO ERROR:", error);
		res.status(500).json({
			success: false,
			message: "Gagal mengambil data risiko",
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
				message: "Risiko tidak ditemukan"
			});
		}

		res.json({
			success: true,
			message: "Risiko berhasil diambil",
			data: result
		});
	} catch (error) {
		console.error("GET RISIKO BY ID ERROR:", error);
		res.status(500).json({
			success: false,
			message: "Gagal mengambil risiko",
			error: error.message
		});
	}
});

router.post("/", auth, async (req, res) => {
	try {
		const result = await crud.create(TABLE, req.body);

		res.status(201).json({
			success: true,
			message: "Risiko berhasil ditambahkan",
			data: result
		});
	} catch (error) {
		console.error("CREATE RISIKO ERROR:", error);
		res.status(500).json({
			success: false,
			message: "Gagal menambahkan risiko",
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
				message: "Risiko tidak ditemukan"
			});
		}

		res.json({
			success: true,
			message: "Risiko berhasil diperbarui",
			data: result
		});
	} catch (error) {
		console.error("UPDATE RISIKO ERROR:", error);
		res.status(500).json({
			success: false,
			message: "Gagal memperbarui risiko",
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
				message: "Risiko tidak ditemukan"
			});
		}

		res.json({
			success: true,
			message: "Risiko berhasil dihapus",
			data: result
		});
	} catch (error) {
		console.error("DELETE RISIKO ERROR:", error);
		res.status(500).json({
			success: false,
			message: "Gagal menghapus risiko",
			error: error.message
		});
	}
});

module.exports = router;
