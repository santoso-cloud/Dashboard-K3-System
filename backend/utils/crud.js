const pool = require("../config/db");

const allowedTables = [
  "incidents",
  "observations",
  "inspections",
  "work_permits",
  "trainings",
  "ppe_equipment",
  "documents",
  "audits",
  "corrective_actions",
  "risk_register",
  "reports",
  "settings"
];

function validateTable(table) {
  if (!allowedTables.includes(table)) {
    throw new Error("Table tidak diizinkan");
  }
}

async function getColumns(table) {

  validateTable(table);

  const result = await pool.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = $1
    `,
    [table]
  );

  return result.rows.map(row => row.column_name);
}

async function getAll(table, req) {

  const columns = await getColumns(table);

  let query = `SELECT * FROM "${table}"`;
  const values = [];

  const search = req.query.search;

  if (search) {

    const textColumns = columns.filter(column =>
      [
        "title",
        "name",
        "description",
        "location",
        "work_type",
        "type",
        "category",
        "trainer",
        "applicant",
        "assignee",
        "source",
        "owner",
        "code",
        "version",
        "status",
        "reporter",
        "notes"
      ].includes(column)
    );

    if (textColumns.length > 0) {

      const conditions = textColumns.map(
        (column, index) =>
          `"${column}"::text ILIKE $${index + 1}`
      );

      query += ` WHERE ${conditions.join(" OR ")}`;

      textColumns.forEach(() => {
        values.push(`%${search}%`);
      });

    }
  }

  query += " ORDER BY 1 DESC";

  const result = await pool.query(query, values);

  return result.rows;
}

async function getOne(table, id) {

  validateTable(table);

  const result = await pool.query(
    `SELECT * FROM "${table}" WHERE id = $1`,
    [id]
  );

  return result.rows[0];
}

async function create(table, body) {

  const columns = await getColumns(table);

  const keys = Object.keys(body)
    .filter(key => columns.includes(key))
    .filter(key => key !== "id");

  if (!keys.length) {
    throw new Error("Tidak ada field yang valid");
  }

  const values = keys.map(key => body[key]);

  const placeholders = keys.map(
    (_, index) => `$${index + 1}`
  );

  const query = `
    INSERT INTO "${table}"
    (${keys.map(key => `"${key}"`).join(", ")})
    VALUES (${placeholders.join(", ")})
    RETURNING *
  `;

  const result = await pool.query(query, values);

  return result.rows[0];
}

async function update(table, id, body) {

  const columns = await getColumns(table);

  const keys = Object.keys(body)
    .filter(key => columns.includes(key))
    .filter(key => key !== "id");

  if (!keys.length) {
    throw new Error("Tidak ada field yang valid");
  }

  const values = keys.map(key => body[key]);

  const sets = keys.map(
    (key, index) =>
      `"${key}" = $${index + 1}`
  );

  values.push(id);

  const query = `
    UPDATE "${table}"
    SET ${sets.join(", ")}
    WHERE id = $${values.length}
    RETURNING *
  `;

  const result = await pool.query(query, values);

  return result.rows[0];
}

async function remove(table, id) {

  validateTable(table);

  const result = await pool.query(
    `DELETE FROM "${table}" WHERE id = $1 RETURNING *`,
    [id]
  );

  return result.rows[0];
}

module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove
};
