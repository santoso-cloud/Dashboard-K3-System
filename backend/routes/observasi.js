const express = require("express");
const crud = require("../utils/crud");
const pool = require("../config/db");
const { auth } = require("../middleware/middleware");

const router = express.Router();
const TABLE = "observations";

router.get("/", auth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: await crud.getAll(TABLE, req)
    });
  } catch (error) {
    // Keep database details in server logs and return a safe message to the client.
    console.error("Gagal mengambil ringkasan observasi dan inspeksi:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get("/summary", auth, async (req, res) => {
  try {
    const [observations, inspections] = await Promise.all([
      pool.query("SELECT * FROM observations ORDER BY COALESCE(observation_date, created_at) DESC, id DESC"),
      pool.query("SELECT * FROM inspections ORDER BY COALESCE(inspection_date, created_at) DESC, id DESC")
    ]);

    res.json({
      success: true,
      data: {
        observations: observations.rows,
        inspections: inspections.rows
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil ringkasan observasi dan inspeksi"
    });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: await crud.getOne(TABLE, req.params.id)
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
    res.status(201).json({
      success: true,
      data: await crud.create(TABLE, req.body)
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
    res.json({
      success: true,
      data: await crud.update(
        TABLE,
        req.params.id,
        req.body
      )
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
    res.json({
      success: true,
      data: await crud.remove(TABLE, req.params.id)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;