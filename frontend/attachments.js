(function () {
  const page = location.pathname.split("/").pop().replace(/\.html$/, "");
  const entity = ({ insiden:"insiden", observasi:"observasi", "izin-kerja":"izin", training:"training", apd:"apd", dokumen:"dokumen", audit:"audit", "tindakan-korektif":"tindakan", pelaporan:"pelaporan", risiko:"risiko", pengguna:"pengguna" })[page];
  if (!entity) return;
  const token = () => localStorage.getItem("token") || localStorage.getItem("authToken") || "";
  const allowedTypes = new Set(["image/png", "image/jpeg", "application/pdf"]);
  const allowedFile = file => file && allowedTypes.has(String(file.type).toLowerCase()) && /\.(png|jpe?g|pdf)$/i.test(file.name);
  const fileToBase64 = file => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); });
  const style = document.createElement("style");
  style.textContent = `.attachment-field{display:block!important;grid-column:1/-1;margin:4px 0 18px}.attachment-field>.attachment-label{display:block;color:#1e293b;font-size:14px;font-weight:700;margin-bottom:8px}.attachment-dropzone{display:flex;align-items:center;gap:14px;min-height:76px;padding:14px 16px;border:1.5px dashed #b7c7d8;border-radius:12px;background:#f8fafc;color:#64748b;cursor:pointer;transition:.2s}.attachment-dropzone:hover,.attachment-dropzone.is-dragover{border-color:#0d9f72;background:#effaf5}.attachment-dropzone input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.attachment-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:10px;background:#dff6ed;color:#079669;font-size:20px}.attachment-copy{min-width:0}.attachment-copy strong{display:block;color:#334155;font-size:14px}.attachment-copy small{display:block;margin-top:3px;color:#94a3b8;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.attachment-browse{margin-left:auto;padding:9px 13px;border:1px solid #0d9f72;border-radius:8px;background:#fff;color:#07865f;font-size:13px;font-weight:700;white-space:nowrap}.attachment-missing{color:#94a3b8;font-size:13px}.attachment-field.has-file .attachment-copy strong{color:#07865f}.record-action-cell{white-space:nowrap;min-width:130px}.record-action-cell button,.attachment-view-button{display:inline-flex!important;align-items:center;justify-content:center;min-height:32px;margin:2px;padding:6px 10px!important;border:1px solid #d7e1eb!important;border-radius:7px!important;background:#fff!important;color:#334155!important;font-size:12px!important;font-weight:700!important;line-height:1.2;cursor:pointer}.record-action-cell button:hover,.attachment-view-button:hover{background:#f1f5f9!important;border-color:#94a3b8!important}.record-action-cell button[data-edit],.record-action-cell button[data-user-edit],.record-action-cell button[data-action="edit"]{color:#2563eb!important}.record-action-cell button[data-delete],.record-action-cell button[data-user-delete],.record-action-cell button[data-action="delete"]{color:#dc2626!important}.attachment-view-button{color:#07865f!important;border-color:#9ad8c2!important;background:#f2fbf7!important}`;
  document.head.append(style);
  const formatSize = bytes => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
  const setupDropzone = field => {
    const input = field.querySelector("input[type=file]");
    const zone = field.querySelector(".attachment-dropzone");
    const name = field.querySelector(".attachment-copy small");
    const update = () => { const file = input.files?.[0]; field.classList.toggle("has-file", Boolean(file)); name.textContent = file ? `${file.name} · ${formatSize(file.size)}` : "Belum ada file dipilih · PNG, JPG/JPEG, atau PDF"; };
    zone.addEventListener("click", () => input.click());
    input.addEventListener("change", () => { if (input.files?.[0] && !allowedFile(input.files[0])) { alert("Format file harus PNG, JPG/JPEG, atau PDF."); input.value = ""; } update(); });
    ["dragenter", "dragover"].forEach(type => zone.addEventListener(type, event => { event.preventDefault(); zone.classList.add("is-dragover"); }));
    ["dragleave", "drop"].forEach(type => zone.addEventListener(type, event => { event.preventDefault(); zone.classList.remove("is-dragover"); }));
    zone.addEventListener("drop", event => { const file = event.dataTransfer.files?.[0]; if (file && allowedFile(file)) { input.files = event.dataTransfer.files; update(); } else if (file) alert("Format file harus PNG, JPG/JPEG, atau PDF."); });
    input.form?.addEventListener("reset", () => setTimeout(update, 0));
  };
  const originalFetch = window.fetch;
  const apiByEntity = { insiden:"/api/insiden", observasi:"/api/observasi", izin:"/api/izin", training:"/api/training", apd:"/api/apd", dokumen:"/api/dokumen", audit:"/api/audit", tindakan:"/api/tindakan", pelaporan:"/api/pelaporan", risiko:"/api/risiko", pengguna:"/api/pengguna" };
  const addButtonByEntity = { insiden:"#add-incident-button", observasi:"#add-observation-button", izin:"#add-permit-button", training:"#add-training-button", apd:"#add-apd-button", dokumen:"#add-document-button", audit:"#add-audit-button", tindakan:"#add-action-button", pelaporan:"#add-report-button", risiko:"#add-risk-button", pengguna:"#add-user-button" };
  window.fetch = async function (input, init = {}) {
    let method = String(init.method || "GET").toUpperCase();
    const forcedEdit = window.__recordEdit || window.__crudEditState;
    if (forcedEdit && method === "POST" && typeof input === "string") { const endpoint = forcedEdit.endpoint?.startsWith("/api/") ? forcedEdit.endpoint : `/api/${forcedEdit.endpoint || entity}`; if (input.includes(endpoint)) { input = `${endpoint}/${forcedEdit.id}`; init = { ...init, method: "PUT" }; method = "PUT"; } }
    const form = document.querySelector("form:not([hidden]) input[type=file]")?.form;
    const file = form?.querySelector("input[type=file]")?.files?.[0];
    if (file && (method === "POST" || method === "PUT") && init.body && typeof init.body === "string") {
      const body = JSON.parse(init.body);
      body.__attachment = { file_name: file.name, mime_type: file.type || "application/octet-stream", file_base64: await fileToBase64(file) };
      init.body = JSON.stringify(body);
    }
    const response = await originalFetch(input, init);
    if (file && (method === "POST" || method === "PUT") && response.ok) {
      const copy = response.clone(); const payload = await copy.json().catch(() => null); const id = payload?.data?.id;
      const attachmentId = id || window.__recordEdit?.id; if (attachmentId) { const upload = await originalFetch("/api/attachments", { method:"POST", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token()}`}, body:JSON.stringify({ entity_type:entity, record_id:attachmentId, ...({ file_name:file.name, mime_type:file.type || "application/octet-stream", file_base64:await fileToBase64(file) }) }) }); if (!upload.ok) alert("Record tersimpan, tetapi lampiran gagal diunggah."); }
      window.__recordEdit = null;
    }
    return response;
  };
  const ensureFileInputs = () => document.querySelectorAll("form").forEach(form => {
    const isLoginForm = form.id === "dashboardLoginForm" || form.id === "loginForm" || form.closest("#loginPopup");
    if (isLoginForm) { form.querySelector(".attachment-field")?.remove(); return; }
    if (form.querySelector(".attachment-field")) return;
    const field = document.createElement("label"); field.className = "attachment-field";
    const optional = entity === "dokumen" || entity === "audit";
    field.innerHTML = `<span class="attachment-label">Lampiran${optional ? " (opsional)" : ""}</span><span class="attachment-dropzone"><input type="file" name="attachment" accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf" ${optional ? "" : "required"}><span class="attachment-icon">↥</span><span class="attachment-copy"><strong>Pilih file atau tarik ke sini</strong><small>Belum ada file dipilih · PNG, JPG/JPEG, atau PDF</small></span><span class="attachment-browse">Pilih File</span></span>`;
    const submit = form.querySelector("button[type=submit]");
    const actions = submit?.closest("div");
    if (actions && actions.parentElement === form) form.insertBefore(field, actions); else form.append(field);
    setupDropzone(field);
  });
  ensureFileInputs();
  const ensureTableHeaders = () => document.querySelectorAll("table").forEach(table => { const header = table.querySelector("thead tr"); if (header && !header.querySelector("[data-attachment-header]")) { const th = document.createElement("th"); th.dataset.attachmentHeader = "true"; th.textContent = "Lampiran"; header.append(th); } });
  const normalizeActionCells = () => document.querySelectorAll("tbody tr").forEach(row => row.querySelectorAll("button").forEach(button => { if (button.matches("[data-view-attachment]")) return; const cell = button.closest("td"); if (cell) cell.classList.add("record-action-cell"); }));
  const addEditButtons = () => document.querySelectorAll("tbody tr").forEach(row => {
    // Modul-modul ini sudah memakai crud-edit.js atau editor khusus masing-masing.
    // Jangan menambahkan tombol Edit kedua dari komponen lampiran.
    if (!["tindakan", "pengguna"].includes(entity)) return;
    if (row.querySelector("[data-generic-edit], [data-edit], [data-user-edit], [data-action=\"edit\"]")) return;
    const sourceButton = row.querySelector("button"); const id = sourceButton && Object.values(sourceButton.dataset).find(v => /^\d+$/.test(v)); if (!id) return;
    const actionCell = sourceButton.closest("td"); if (!actionCell) return;
    const edit = document.createElement("button"); edit.type = "button"; edit.dataset.genericEdit = id; edit.textContent = "Edit"; edit.title = "Edit data"; actionCell.prepend(edit);
  });
  const render = () => document.querySelectorAll("tbody tr").forEach(async row => {
    if (row.querySelector("[data-attachment-status]")) return;
    const button = row.querySelector("button"); const id = button && Object.values(button.dataset).find(v => /^\d+$/.test(v)); if (!id) return;
    const cell = document.createElement("td"); cell.dataset.attachmentStatus = "checking"; cell.textContent = "Memeriksa..."; row.append(cell);
    try {
      const response = await originalFetch(`/api/attachments/check/${entity}/${id}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (response.status === 404) { cell.textContent = "Belum ada lampiran"; cell.className = "attachment-missing"; return; }
      if (response.status === 401) { cell.textContent = "Sesi berakhir"; return; }
      if (!response.ok) { cell.textContent = "Gagal memeriksa"; return; }
      const payload = await response.json(); const file = payload.data;
      cell.innerHTML = `<button type="button" class="attachment-view-button" data-view-attachment="${id}" title="${String(file.file_name).replace(/\"/g, "&quot;")}">Lampiran</button>`;
    } catch { cell.textContent = "Gagal memeriksa"; }
  });
  new MutationObserver(() => { ensureFileInputs(); ensureTableHeaders(); normalizeActionCells(); addEditButtons(); render(); }).observe(document.body, { childList:true, subtree:true }); ensureTableHeaders(); normalizeActionCells(); addEditButtons(); render();
  document.addEventListener("click", async e => {
    const edit = e.target.closest("[data-generic-edit]");
    if (edit) {
      const source = edit.closest("tr")?.dataset.recordSource;
      const editEndpoint = entity === "observasi" && source === "inspection" ? "/api/observasi/inspection" : apiByEntity[entity];
      const response = await originalFetch(`${editEndpoint}/${edit.dataset.genericEdit}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!response.ok) return alert("Data tidak dapat dimuat untuk diedit.");
      const payload = await response.json(); const record = payload.data || payload;
      document.querySelector(addButtonByEntity[entity])?.click();
      setTimeout(() => { const form = document.querySelector("form:not([hidden])"); if (!form) return; Object.entries(record).forEach(([key, value]) => { const field = form.elements[key]; if (field && field.type !== "file" && field.type !== "password") field.value = value == null ? "" : String(value).slice(0, field.type === "date" ? 10 : undefined); }); if (form.elements.attachment) form.elements.attachment.required = false; window.__recordEdit = { entity, id: edit.dataset.genericEdit, endpoint: editEndpoint }; }, 0);
      return;
    }
    const b=e.target.closest("[data-view-attachment]"); if(!b) return; const r=await originalFetch(`/api/attachments/${entity}/${b.dataset.viewAttachment}`, {headers:{Authorization:`Bearer ${token()}`}}); if(r.status===404) return alert("Lampiran belum tersedia untuk record ini."); if(r.status===401) return alert("Sesi login sudah berakhir. Silakan login kembali."); if(!r.ok) return alert("Gagal mengambil lampiran dari server."); const url=URL.createObjectURL(await r.blob()); window.open(url,"_blank");
  });
})();
