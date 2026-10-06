const express = require("express");
const crud = require("../utils/crud");
const { auth } = require("../middleware/middleware");

const router = express.Router();

const TABLE = "trainings";

router.use(auth);

router.get("/", async (req, res) => {

  try {

    const data = await crud.getAll(TABLE, req);

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

router.get("/:id", async (req, res) => {

  try {

    const data = await crud.getOne(
      TABLE,
      req.params.id
    );

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

router.post("/", async (req, res) => {

  try {

    const data = await crud.create(
      TABLE,
      req.body
    );

    res.status(201).json({
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

router.put("/:id", async (req, res) => {

  try {

    const data = await crud.update(
      TABLE,
      req.params.id,
      req.body
    );

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

router.delete("/:id", async (req, res) => {

  try {

    const data = await crud.remove(
      TABLE,
      req.params.id
    );

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

module.exports = router;