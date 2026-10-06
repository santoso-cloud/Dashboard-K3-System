const express = require("express");
const crud = require("../utils/crud");
const { auth } = require("../middleware/middleware");

const router = express.Router();

const TABLE = "incidents";

router.get("/", auth, async (req, res) => {

  try {

    const data = await crud.getAll(TABLE, req);

    res.json({
      success: true,
      data
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Gagal mengambil data insiden"
    });

  }

});

router.get("/:id", auth, async (req, res) => {

  try {

    const data = await crud.getOne(
      TABLE,
      req.params.id
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Insiden tidak ditemukan"
      });
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

});

router.post("/", auth, async (req, res) => {

  try {

    const data = await crud.create(
      TABLE,
      req.body
    );

    res.status(201).json({
      success: true,
      message: "Insiden berhasil dibuat",
      data
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

});

router.put("/:id", auth, async (req, res) => {

  try {

    const data = await crud.update(
      TABLE,
      req.params.id,
      req.body
    );

    res.json({
      success: true,
      message: "Insiden berhasil diperbarui",
      data
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

});

router.delete("/:id", auth, async (req, res) => {

  try {

    const data = await crud.remove(
      TABLE,
      req.params.id
    );

    res.json({
      success: true,
      message: "Insiden berhasil dihapus",
      data
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

});

module.exports = router;