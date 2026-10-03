(() => {
  const API = window.K3_API_BASE || 'http://localhost:5000/api/pelaporan';

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[c]));

  const state = { page: 1, limit: 10, search: '', type: '', location: '', status: '', from: '', to: '' };

  function statusClass(status='') {
    const s = status.toLowerCase();
    if (s.includes('selesai') || s.includes('closed') || s.includes('completed')) return 'closed';
    if (s.includes('proses') || s.includes('progress') || s.includes('process')) return 'process';
    if (s.includes('tolak') || s.includes('rejected')) return 'open';
    return 'open';
  }

  function typeIcon(type='') {
    const t = type.toLowerCase();
    if (t.includes('observ')) return '<i class="fa-solid fa-eye"></i>';
    if (t.includes('near')) return '<i class="fa-solid fa-person-running"></i>';
    return '<i class="fa-solid fa-triangle-exclamation"></i>';
  }

  function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return esc(value);
    return d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
  }

  function setText(id, value) {
    const el = $(id); if (el) el.textContent = value ?? 0;
  }

  function renderStats(s) {
    setText('report-stat-total', s.total);
    setText('report-stat-incident', s.incident);
    setText('report-stat-observation', s.observation);
    setText('report-stat-near-miss', s.near_miss);
    setText('report-stat-completed', s.completed);

    const donut = document.querySelector('.right .side-card .donut > span');
    if (donut) donut.innerHTML = `${s.total}<small>Total</small>`;

    const side = document.querySelectorAll('.right .side-card:first-child p strong');
    if (side.length >= 4) {
      side[0].textContent = `${s.completed} (${s.total ? ((s.completed/s.total)*100).toFixed(1) : '0.0'}%)`;
      side[1].textContent = `${s.in_progress} (${s.total ? ((s.in_progress/s.total)*100).toFixed(1) : '0.0'}%)`;
      side[2].textContent = `${s.pending} (${s.total ? ((s.pending/s.total)*100).toFixed(1) : '0.0'}%)`;
      side[3].textContent = `${s.rejected} (${s.total ? ((s.rejected/s.total)*100).toFixed(1) : '0.0'}%)`;
    }
  }

  function renderRows(items, total) {
    const tbody = $('report-table-body');
    if (!tbody) return;

    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px">Tidak ada data laporan.</td></tr>';
    } else {
      tbody.innerHTML = items.map((r, i) => `
        <tr>
          <td>${((state.page-1)*state.limit)+i+1}</td>
          <td><b>${esc(r.code)}</b></td>
          <td>${typeIcon(r.type)} ${esc(r.type)}</td>
          <td>${esc(r.description)}</td>
          <td>${esc(r.location)}</td>
          <td>${esc(r.reporter)}</td>
          <td>${formatDate(r.report_date)}</td>
          <td><span class="status ${statusClass(r.status)}">${esc(r.status)}</span></td>
          <td class="report-actions">
            <button type="button" title="Lihat" data-action="view" data-id="${esc(r.id)}"><i class="fa-regular fa-eye"></i></button>
            <button type="button" title="Edit" data-action="edit" data-id="${esc(r.id)}"><i class="fa-solid fa-pen"></i></button>
            <button type="button" title="Hapus" data-action="delete" data-id="${esc(r.id)}"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>
      `).join('');
    }

    const head = document.querySelector('.table-card .card-head p');
    if (head) {
      const start = total ? ((state.page-1)*state.limit)+1 : 0;
      const end = Math.min(state.page*state.limit, total);
      head.textContent = `Menampilkan ${start} - ${end} dari ${total} data`;
    }
  }

  async function api(url='', options={}) {
    const res = await fetch(API + url, {
      headers: { 'Content-Type':'application/json', ...(options.headers || {}) },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
    return data;
  }

  async function load() {
    const qs = new URLSearchParams();
    Object.entries(state).forEach(([k,v]) => { if (v !== '' && v != null && k !== 'page') qs.set(k,v); });
    qs.set('page', state.page);
    qs.set('limit', state.limit);

    try {
      const [list, stats] = await Promise.all([
        api('?' + qs.toString()),
        api('/stats')
      ]);
      renderRows(list.data || [], list.total || 0);
      renderStats(stats);
      renderLatest(list.data || []);
    } catch (err) {
      console.error('Pelaporan API:', err);
      const tbody = $('report-table-body');
      if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="color:#dc2626;text-align:center;padding:25px">Gagal memuat data: ${esc(err.message)}</td></tr>`;
    }
  }

  function renderLatest(items) {
    const side = document.querySelectorAll('.right .side-card')[1];
    if (!side) return;
    const title = side.querySelector('h3');
    side.innerHTML = '';
    if (title) side.appendChild(title); else side.innerHTML = '<h3>Laporan Terbaru</h3>';

    items.slice(0,5).forEach(r => {
      const row = document.createElement('div');
      row.className = 'latest-row';
      row.innerHTML = `
        <i class="fa-solid ${String(r.type).toLowerCase().includes('observ') ? 'fa-eye success' : String(r.type).toLowerCase().includes('near') ? 'fa-person-running warning' : 'fa-triangle-exclamation danger'}"></i>
        <p><b>${esc(r.code)}</b><br><small>${esc(r.description)}</small></p>
        <span>${formatDate(r.report_date)}</span>
        <em class="${statusClass(r.status)==='closed' ? 'done' : statusClass(r.status)==='process' ? '' : 'bad'}">${esc(r.status)}</em>
      `;
      side.appendChild(row);
    });
    const link = document.createElement('a');
    link.className = 'view-all';
    link.href = '#';
    link.textContent = 'Lihat Semua Laporan →';
    link.addEventListener('click', e => { e.preventDefault(); state.page = 1; load(); });
    side.appendChild(link);
  }

  function modal() { return $('report-modal'); }

  function openModal(data=null) {
    const m = modal(); if (!m) return;
    m.hidden = false;
    const form = $('report-form');
    if (!form) return;
    form.dataset.id = data?.id || '';
    form.querySelector('[name="type"]').value = data?.type || 'Insiden';
    form.querySelector('[name="description"]').value = data?.description || '';
    form.querySelector('[name="location"]').value = data?.location || '';
    form.querySelector('[name="reporter"]').value = data?.reporter || '';
    form.querySelector('[name="report_date"]').value = data?.report_date ? new Date(data.report_date).toISOString().slice(0,16) : new Date().toISOString().slice(0,16);
    form.querySelector('[name="status"]').value = data?.status || 'Dalam Proses';
    const h = form.querySelector('h2'); if (h) h.textContent = data ? 'Edit Laporan' : 'Buat Laporan Baru';
    const err = $('report-form-error'); if (err) err.textContent = '';
  }

  function closeModal() { const m=modal(); if(m) m.hidden=true; }

  async function save(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const err = $('report-form-error');
    if (err) err.textContent = 'Menyimpan...';
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      const id = form.dataset.id;
      await api(id ? `/${encodeURIComponent(id)}` : '', { method:id ? 'PUT':'POST', body:JSON.stringify(body) });
      closeModal();
      await load();
    } catch (ex) {
      if (err) err.textContent = ex.message;
    }
  }

  async function onTableClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    try {
      if (btn.dataset.action === 'delete') {
        if (!confirm('Hapus laporan ini?')) return;
        await api('/' + encodeURIComponent(id), { method:'DELETE' });
        await load();
        return;
      }
      const result = await api('/' + encodeURIComponent(id));
      if (btn.dataset.action === 'view') {
        const r=result.data;
        alert(`ID: ${r.code}\nJenis: ${r.type}\nDeskripsi: ${r.description}\nLokasi: ${r.location}\nPelapor: ${r.reporter}\nTanggal: ${formatDate(r.report_date)}\nStatus: ${r.status}`);
      } else {
        openModal(result.data);
      }
    } catch (ex) { alert(ex.message); }
  }

  function wireFilters() {
    const search=$('report-search');
    if (search) {
      let timer;
      search.addEventListener('input', () => { clearTimeout(timer); timer=setTimeout(()=>{state.search=search.value.trim();state.page=1;load();},300); });
    }
    const buttons=[...document.querySelectorAll('.filter > button')];
    // Existing UI uses buttons as visual filters. Convert the first 3 into real selects.
    const defs=[['type','Semua Jenis Laporan',['Insiden','Observasi','Near Miss']],['location','Semua Lokasi',[]],['status','Semua Status',['Selesai','Dalam Proses','Belum Ditindaklanjuti','Ditolak']]];
    defs.forEach((d,idx)=>{
      const b=buttons[idx]; if(!b) return;
      const sel=document.createElement('select'); sel.className='report-filter-select';
      sel.innerHTML=`<option value="">${d[1]}</option>`+d[2].map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
      b.replaceWith(sel);
      if(d[0]==='location') {
        api('/locations').then(x=>{ (x.data||[]).forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;sel.appendChild(o);}); }).catch(()=>{});
      }
      sel.addEventListener('change',()=>{state[d[0]]=sel.value;state.page=1;load();});
    });
    const reset=buttons[4];
    if(reset) reset.addEventListener('click',()=>{ state.page=1;state.search='';state.type='';state.location='';state.status=''; if(search)search.value=''; document.querySelectorAll('.report-filter-select').forEach(s=>s.value=''); load(); });
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('add-report-button')?.addEventListener('click',()=>openModal());
    $('close-report-modal')?.addEventListener('click',closeModal);
    $('cancel-report-modal')?.addEventListener('click',closeModal);
    $('report-form')?.addEventListener('submit',save);
    $('report-table-body')?.addEventListener('click',onTableClick);
    modal()?.addEventListener('click',e=>{ if(e.target===modal()) closeModal(); });
    wireFilters();
    load();
  });
})();
