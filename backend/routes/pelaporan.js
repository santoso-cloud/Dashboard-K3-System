const express = require('express');
const router = express.Router();
const pool = require('../config/db');

const TABLE_CANDIDATES = ['reports', 'report', 'pelaporan'];

let schemaCache = null;

const q = (name) => `"${String(name).replace(/"/g, '""')}"`;

async function getSchema() {
  if (schemaCache) return schemaCache;

  const { rows } = await pool.query(`
    SELECT table_schema, table_name, column_name, data_type,
           is_nullable, column_default, ordinal_position
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ANY($1::text[])
    ORDER BY table_name, ordinal_position
  `, [TABLE_CANDIDATES]);

  const byTable = {};
  for (const r of rows) (byTable[r.table_name] ||= []).push(r);
  const table = TABLE_CANDIDATES.find(t => byTable[t]?.length);
  if (!table) throw new Error(`Tabel laporan tidak ditemukan. Dicari: ${TABLE_CANDIDATES.join(', ')}`);

  schemaCache = { table, columns: byTable[table] };
  console.log(`[pelaporan] memakai tabel public.${table}`);
  console.log(`[pelaporan] kolom: ${schemaCache.columns.map(c=>c.column_name).join(', ')}`);
  return schemaCache;
}

function pick(columns, aliases) {
  const names = new Set(columns.map(c => c.column_name));
  return aliases.find(a => names.has(a)) || null;
}

function colInfo(columns, name) {
  return columns.find(c => c.column_name === name);
}

function mapColumns(columns) {
  return {
    id: pick(columns, ['id','report_id','laporan_id']),
    code: pick(columns, ['report_code','report_number','report_no','code','kode_laporan','nomor_laporan']),
    type: pick(columns, ['report_type','type','jenis_laporan','category','kategori']),
    description: pick(columns, ['description','title','report_title','judul','judul_laporan','detail']),
    location: pick(columns, ['location','incident_location','lokasi']),
    reporter: pick(columns, ['reporter','reporter_name','reported_by','pelapor','nama_pelapor']),
    report_date: pick(columns, ['report_date','reported_at','occurred_at','tanggal_laporan','tanggal','created_at']),
    status: pick(columns, ['status','report_status','state']),
    created_at: pick(columns, ['created_at','created_on']),
    updated_at: pick(columns, ['updated_at','updated_on'])
  };
}

function normalize(row, m) {
  const id = m.id ? row[m.id] : row.__id;
  return {
    id,
    code: m.code ? row[m.code] : `RPT-${new Date().getFullYear()}-${id}`,
    type: m.type ? row[m.type] : '-',
    description: m.description ? row[m.description] : '-',
    location: m.location ? row[m.location] : '-',
    reporter: m.reporter ? row[m.reporter] : '-',
    report_date: m.report_date ? row[m.report_date] : null,
    status: m.status ? row[m.status] : '-'
  };
}

function statusWhere(m, value, params) {
  if (!m.status || !value) return null;
  params.push(value);
  return `${q(m.status)} = $${params.length}`;
}

function buildWhere(m, query, params) {
  const where = [];
  if (query.search) {
    const searchable = [m.code,m.type,m.description,m.location,m.reporter].filter(Boolean);
    if (searchable.length) {
      params.push(`%${query.search}%`);
      const p = `$${params.length}`;
      where.push('(' + searchable.map(c=>`CAST(${q(c)} AS TEXT) ILIKE ${p}`).join(' OR ') + ')');
    }
  }
  if (m.type && query.type) { params.push(query.type); where.push(`${q(m.type)} = $${params.length}`); }
  if (m.location && query.location) { params.push(query.location); where.push(`${q(m.location)} = $${params.length}`); }
  if (m.status && query.status) { params.push(query.status); where.push(`${q(m.status)} = $${params.length}`); }
  if (m.report_date && query.from) { params.push(query.from); where.push(`${q(m.report_date)}::date >= $${params.length}::date`); }
  if (m.report_date && query.to) { params.push(query.to); where.push(`${q(m.report_date)}::date <= $${params.length}::date`); }
  return where.length ? 'WHERE ' + where.join(' AND ') : '';
}

router.get('/schema', async (req,res) => {
  try {
    const s=await getSchema();
    res.json({table:s.table, columns:s.columns});
  } catch(e) { res.status(500).json({error:e.message}); }
});

router.get('/locations', async (req,res) => {
  try {
    const s=await getSchema(), m=mapColumns(s.columns);
    if (!m.location) return res.json({data:[]});
    const {rows}=await pool.query(`SELECT DISTINCT ${q(m.location)} AS value FROM public.${q(s.table)} WHERE ${q(m.location)} IS NOT NULL AND TRIM(CAST(${q(m.location)} AS TEXT))<>'' ORDER BY 1`);
    res.json({data:rows.map(r=>r.value)});
  } catch(e) { res.status(500).json({error:e.message}); }
});

router.get('/stats', async (req,res) => {
  try {
    const s=await getSchema(), m=mapColumns(s.columns), table=`public.${q(s.table)}`;
    const params=[], where=buildWhere(m,req.query,params);
    if (!m.status) {
      const {rows}=await pool.query(`SELECT COUNT(*)::int AS total FROM ${table} ${where}`,params);
      return res.json({total:rows[0].total,incident:0,observation:0,near_miss:0,completed:0,in_progress:0,pending:0,rejected:0});
    }
    const typeExpr=m.type?`LOWER(COALESCE(CAST(${q(m.type)} AS TEXT),''))`:`''`;
    const statusExpr=`LOWER(COALESCE(CAST(${q(m.status)} AS TEXT),''))`;
    const sql=`SELECT
      COUNT(*)::int total,
      COUNT(*) FILTER (WHERE ${typeExpr} LIKE '%insiden%')::int incident,
      COUNT(*) FILTER (WHERE ${typeExpr} LIKE '%observ%')::int observation,
      COUNT(*) FILTER (WHERE ${typeExpr} LIKE '%near%')::int near_miss,
      COUNT(*) FILTER (WHERE ${statusExpr} IN ('selesai','closed','completed','complete'))::int completed,
      COUNT(*) FILTER (WHERE ${statusExpr} IN ('dalam proses','in progress','processing','process','open'))::int in_progress,
      COUNT(*) FILTER (WHERE ${statusExpr} IN ('belum ditindaklanjuti','pending','baru','open'))::int pending,
      COUNT(*) FILTER (WHERE ${statusExpr} IN ('ditolak','rejected','reject'))::int rejected
      FROM ${table} ${where}`;
    const {rows}=await pool.query(sql,params);
    res.json(rows[0]);
  } catch(e) { console.error(e); res.status(500).json({error:e.message}); }
});

router.get('/', async (req,res) => {
  try {
    const s=await getSchema(),m=mapColumns(s.columns),table=`public.${q(s.table)}`;
    const page=Math.max(parseInt(req.query.page||'1',10),1);
    const limit=Math.min(Math.max(parseInt(req.query.limit||'10',10),1),100);
    const offset=(page-1)*limit;
    const params=[],where=buildWhere(m,req.query,params);
    const order=m.report_date?`ORDER BY ${q(m.report_date)} DESC NULLS LAST`:(m.id?`ORDER BY ${q(m.id)} DESC`:'');
    const {rows}=await pool.query(`SELECT *, COUNT(*) OVER()::int AS __total FROM ${table} ${where} ${order} LIMIT ${limit} OFFSET ${offset}`,params);
    const total=rows[0]?.__total||0;
    res.json({data:rows.map(r=>normalize(r,m)),total,page,limit});
  } catch(e) { console.error(e); res.status(500).json({error:e.message}); }
});

router.get('/:id', async (req,res) => {
  try {
    const s=await getSchema(),m=mapColumns(s.columns),table=`public.${q(s.table)}`;
    if(!m.id) return res.status(500).json({error:'Tabel laporan tidak memiliki kolom ID.'});
    const {rows}=await pool.query(`SELECT * FROM ${table} WHERE ${q(m.id)}=$1 LIMIT 1`,[req.params.id]);
    if(!rows[0]) return res.status(404).json({error:'Laporan tidak ditemukan.'});
    res.json({data:normalize(rows[0],m)});
  } catch(e){res.status(500).json({error:e.message});}
});

function buildPayload(body,m,columns){
  const aliases = {
    type: body.type, description: body.description, location: body.location,
    reporter: body.reporter, report_date: body.report_date, status: body.status
  };
  const out={};
  for(const [key,val] of Object.entries(aliases)){
    const c=m[key];
    if(c && val!==undefined) out[c]=val;
  }
  return out;
}

async function insertRow(body,s,m){
  const payload=buildPayload(body,m,s.columns);
  if(m.code && !payload[m.code]) payload[m.code]=`RPT-${new Date().getFullYear()}-${Date.now()}`;
  const cols=Object.keys(payload);
  if(!cols.length) throw new Error('Tidak ada kolom yang cocok antara form Pelaporan dan tabel database.');
  const vals=cols.map((_,i)=>`$${i+1}`);
  const params=cols.map(c=>payload[c]);
  const sql=`INSERT INTO public.${q(s.table)} (${cols.map(q).join(',')}) VALUES (${vals.join(',')}) RETURNING *`;
  const {rows}=await pool.query(sql,params);
  return normalize(rows[0],m);
}

router.post('/', async (req,res) => {
  try {
    const s=await getSchema(),m=mapColumns(s.columns);
    const data=await insertRow(req.body,s,m);
    schemaCache=null;
    res.status(201).json({message:'Laporan berhasil dibuat.',data});
  } catch(e){ console.error(e); res.status(400).json({error:e.message, detail:e.detail}); }
});

router.put('/:id', async (req,res) => {
  try {
    const s=await getSchema(),m=mapColumns(s.columns);
    if(!m.id) return res.status(500).json({error:'Kolom ID tidak ditemukan.'});
    const payload=buildPayload(req.body,m,s.columns);
    const cols=Object.keys(payload);
    if(!cols.length) return res.status(400).json({error:'Tidak ada field yang dapat diperbarui.'});
    const params=cols.map(c=>payload[c]);
    const sets=cols.map((c,i)=>`${q(c)}=$${i+1}`).join(', ');
    params.push(req.params.id);
    const {rows}=await pool.query(`UPDATE public.${q(s.table)} SET ${sets}${m.updated_at?`, ${q(m.updated_at)}=NOW()`:''} WHERE ${q(m.id)}=$${params.length} RETURNING *`,params);
    if(!rows[0]) return res.status(404).json({error:'Laporan tidak ditemukan.'});
    res.json({message:'Laporan berhasil diperbarui.',data:normalize(rows[0],m)});
  } catch(e){ console.error(e); res.status(400).json({error:e.message,detail:e.detail}); }
});

router.delete('/:id', async (req,res) => {
  try {
    const s=await getSchema(),m=mapColumns(s.columns);
    if(!m.id) return res.status(500).json({error:'Kolom ID tidak ditemukan.'});
    const {rowCount}=await pool.query(`DELETE FROM public.${q(s.table)} WHERE ${q(m.id)}=$1`,[req.params.id]);
    if(!rowCount) return res.status(404).json({error:'Laporan tidak ditemukan.'});
    res.json({message:'Laporan berhasil dihapus.'});
  } catch(e){ console.error(e); res.status(400).json({error:e.message,detail:e.detail}); }
});

module.exports = router;
