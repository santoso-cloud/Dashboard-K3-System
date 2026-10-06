const express = require("express");
const router = express.Router();

const { auth } = require("../middleware/middleware");
const crud = require("../utils/crud");

// Nama tabel PostgreSQL
const TABLE = "ppe_equipment";

/*
|--------------------------------------------------------------------------
| GET /api/apd
| Ambil semua data APD & Peralatan
|--------------------------------------------------------------------------
*/
router.get("/", auth, async (req, res) => {
  try {
    const result = await crud.getAll(TABLE, req);

    res.json({
      success: true,
      message: "Data APD & Peralatan berhasil diambil",
      data: result
    });
  } catch (error) {
    console.error("GET APD ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Gagal mengambil data APD & Peralatan",
      error: error.message
    });
  }
});


/*
|--------------------------------------------------------------------------
| GET /api/apd/:id
| Ambil satu data APD berdasarkan ID
|--------------------------------------------------------------------------
*/
router.get("/:id", auth, async (req, res) => {
  try {
    const result = await crud.getOne(
      TABLE,
      req.params.id
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Data APD & Peralatan tidak ditemukan"
      });
    }

    res.json({
      success: true,
      message: "Data APD & Peralatan berhasil diambil",
      data: result
    });
  } catch (error) {
    console.error("GET APD BY ID ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Gagal mengambil data APD & Peralatan",
      error: error.message
    });
  }
});


/*
|--------------------------------------------------------------------------
| POST /api/apd
| Tambah APD & Peralatan
|--------------------------------------------------------------------------
*/
router.post("/", auth, async (req, res) => {
  try {
    const result = await crud.create(
      TABLE,
      req.body
    );

    res.status(201).json({
      success: true,
      message: "Data APD & Peralatan berhasil ditambahkan",
      data: result
    });
  } catch (error) {
    console.error("CREATE APD ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Gagal menambahkan data APD & Peralatan",
      error: error.message
    });
  }
});


/*
|--------------------------------------------------------------------------
| PUT /api/apd/:id
| Update APD & Peralatan
|--------------------------------------------------------------------------
*/
router.put("/:id", auth, async (req, res) => {
  try {
    const result = await crud.update(
      TABLE,
      req.params.id,
      req.body
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Data APD & Peralatan tidak ditemukan"
      });
    }

    res.json({
      success: true,
      message: "Data APD & Peralatan berhasil diperbarui",
      data: result
    });
  } catch (error) {
    console.error("UPDATE APD ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Gagal memperbarui data APD & Peralatan",
      error: error.message
    });
  }
});


/*
|--------------------------------------------------------------------------
| DELETE /api/apd/:id
| Hapus APD & Peralatan
|--------------------------------------------------------------------------
*/
router.delete("/:id", auth, async (req, res) => {
  try {
    const result = await crud.remove(
      TABLE,
      req.params.id
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Data APD & Peralatan tidak ditemukan"
      });
    }

    res.json({
      success: true,
      message: "Data APD & Peralatan berhasil dihapus",
      data: result
    });
  } catch (error) {
    console.error("DELETE APD ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Gagal menghapus data APD & Peralatan",
      error: error.message
    });
  }
});


module.exports = router;