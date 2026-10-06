const express = require("express");
const pool = require("../config/db");
const { auth } = require("../middleware/middleware");

const router = express.Router();

router.get("/", auth, async (req, res) => {

  try {

    const incidents = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE LOWER(status) IN ('open', 'terbuka')
        )::int AS open,
        COUNT(*) FILTER (
          WHERE LOWER(status) IN ('closed', 'tertutup', 'selesai')
        )::int AS closed
      FROM incidents
    `);

    const observations = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM observations
    `);

    const audits = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE LOWER(status) IN ('selesai', 'closed', 'tertutup')
        )::int AS completed
      FROM audits
    `);

    const corrective = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM corrective_actions
      WHERE LOWER(status) NOT IN ('closed', 'tertutup', 'selesai')
    `);

    const risks = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM risk_register
    `);

    res.json({

      success: true,

      data: {

        incidents: incidents.rows[0],

        observations:
          observations.rows[0],

        audits:
          audits.rows[0],

        corrective_actions:
          corrective.rows[0],

        risks:
          risks.rows[0]

      }

    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Gagal mengambil dashboard"
    });

  }

});

module.exports = router;