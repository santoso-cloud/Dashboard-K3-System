const express = require("express");
const pool = require("../config/db");
const { auth } = require("../middleware/middleware");
const router = express.Router();

router.use(auth);

const entityTables = {
  insiden: "incidents", observasi: "observations", izin: "work_permits",
  training: "trainings", apd: "ppe_equipment", dokumen: "documents",
  audit: "audits", tindakan: "corrective_actions", pelaporan: "reports",
  risiko: "risk_register", pengguna: "users"
};
const allowedMimeTypes = new Set(["image/png", "image/jpeg", "application/pdf"]);
const allowedExtensions = /\.(png|jpe?g|pdf)$/i;

router.get("/check/:entityType/:recordId", async (req, res) => {
  try {
    const result = await pool.query(`SELECT id,file_name,mime_type,octet_length(file_data) AS bytes,created_at FROM record_attachments WHERE entity_type=$1 AND record_id=$2`, [req.params.entityType, req.params.recordId]);
    if (!result.rows[0]) return res.status(404).json({ success: false, has_attachment: false, message: "Belum ada lampiran" });
    res.json({ success: true, has_attachment: true, data: result.rows[0] });
  } catch (error) { res.status(500).json({ success: false, message: "Gagal memeriksa lampiran" }); }
});

router.post("/", async (req, res) => {
  try {
    const { entity_type, record_id, file_name, mime_type, file_base64 } = req.body || {};
    if (!entity_type || !record_id || !file_name || !mime_type || !file_base64) {
      return res.status(400).json({ success: false, message: "Lampiran wajib diisi" });
    }
    const raw = String(file_base64).replace(/^data:[^;]+;base64,/, "");
    const data = Buffer.from(raw, "base64");
    if (!data.length) return res.status(400).json({ success: false, message: "File tidak valid" });
    if (!allowedMimeTypes.has(String(mime_type).toLowerCase()) || !allowedExtensions.test(String(file_name))) {
      return res.status(400).json({ success: false, message: "Format file harus PNG, JPG/JPEG, atau PDF" });
    }
    const table = entityTables[String(entity_type)];
    if (!table) return res.status(400).json({ success: false, message: "Jenis record tidak valid" });
    const record = await pool.query(`SELECT id FROM "${table}" WHERE id=$1`, [record_id]);
    if (!record.rows[0]) return res.status(404).json({ success: false, message: "Record tujuan tidak ditemukan" });
    const result = await pool.query(`
      INSERT INTO record_attachments(entity_type,record_id,file_name,mime_type,file_data)
      VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(entity_type,record_id) DO UPDATE SET file_name=EXCLUDED.file_name,
      mime_type=EXCLUDED.mime_type,file_data=EXCLUDED.file_data,created_at=CURRENT_TIMESTAMP
      RETURNING id,file_name,mime_type,created_at`,
      [String(entity_type).slice(0, 80), Number(record_id), String(file_name), String(mime_type), data]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
});

router.get("/:entityType/:recordId", async (req, res) => {
  try {
    const result = await pool.query(`SELECT file_name,mime_type,file_data FROM record_attachments WHERE entity_type=$1 AND record_id=$2`, [req.params.entityType, req.params.recordId]);
    if (!result.rows[0]) return res.status(404).json({ success: false, message: "Lampiran tidak ditemukan" });
    const file = result.rows[0];
    const originalName = String(file.file_name || "lampiran");
    // Header fallback harus ASCII; filename* tetap mempertahankan nama UTF-8.
    const safeName = originalName.normalize("NFKD").replace(/[^\x20-\x7E]/g, "_").replace(/[\"\\\r\n]/g, "_") || "lampiran";
    const encodedName = encodeURIComponent(originalName).replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
    res.setHeader("Content-Type", file.mime_type || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${safeName}"; filename*=UTF-8''${encodedName}`);
    res.send(file.file_data);
  } catch (error) {
    console.error("Gagal membuka lampiran:", error.code || error.message);
    res.status(500).json({ success: false, message: "Gagal membuka lampiran" });
  }
});

module.exports = router;
