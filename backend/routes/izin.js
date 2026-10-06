const express = require("express");
const crud = require("../utils/crud");
const { auth } = require("../middleware/middleware");

const router = express.Router();
const TABLE = "work_permits";

router.use(auth);

router.get("/", async (req, res) => {
  try {
    res.json({ success: true, data: await crud.getAll(TABLE, req) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    res.json({ success: true, data: await crud.getOne(TABLE, req.params.id) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    res.status(201).json({
      success: true,
      data: await crud.create(TABLE, req.body)
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    res.json({
      success: true,
      data: await crud.update(TABLE, req.params.id, req.body)
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    res.json({
      success: true,
      data: await crud.remove(TABLE, req.params.id)
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;