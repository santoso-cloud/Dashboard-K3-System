const CRUD_EDIT_CONFIG = {
  "apd.html": { endpoint: "apd", body: "#apd-table-body", form: "#apd-form", modal: "#apd-modal", add: "#add-apd-button", error: "#apd-form-error", delete: "[data-action=delete]" },
  "audit.html": { endpoint: "audit", body: "#audit-table-body", form: "#audit-form", modal: "#audit-modal", add: "#add-audit-button", error: "#audit-form-error", delete: "[data-delete-audit]" },
  "dokumen.html": { endpoint: "dokumen", body: "#document-table-body", form: "#document-form", modal: "#document-modal", add: "#add-document-button", error: "#document-form-error", delete: "[data-delete-document]" },
  "insiden.html": { endpoint: "insiden", body: "#incident-table-body", form: "#incident-form", modal: "#incident-modal", add: "#add-incident-button", error: "#incident-form-error", delete: "[data-delete-incident]" },
  "izin-kerja.html": { endpoint: "izin", body: "#permit-table-body", form: "#permit-form", modal: "#permit-modal", add: "#add-permit-button", error: "#permit-form-error", delete: "[data-delete-permit]" },
  "observasi.html": { endpoint: "observasi", body: "#observation-table-body", form: "#observation-form", modal: "#observation-modal", add: "#add-observation-button", error: "#observation-form-error", delete: "[data-delete-observation]" },
  "pelaporan.html": { endpoint: "pelaporan", body: "#report-table-body", form: "#report-form", modal: "#report-modal", add: "#add-report-button", error: "#report-form-error", delete: "[data-delete-report]" },
  "risiko.html": { endpoint: "risiko", body: "#risk-table-body", form: "#risk-form", modal: "#risk-modal", add: "#add-risk-button", error: "#risk-form-error", delete: "[data-delete-risk]" },
  "tindakan-korektif.html": { endpoint: "tindakan", body: "#action-table-body", form: "#action-form", modal: "#action-modal", add: "#add-action-button", error: "#action-form-error", delete: "[data-delete-action]" },
  "training.html": { endpoint: "training", body: "#training-table-body", form: "#training-form", modal: "#training-modal", add: "#add-training-button", error: "#training-form-error", delete: "[data-delete-training]" }
};

const pageName = location.pathname.split("/").pop();
const editConfig = CRUD_EDIT_CONFIG[pageName];
const editState = { id: null, form: null };

function editToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken");
}

function editId(button) {
  if (button.dataset.crudEdit) return button.dataset.crudEdit;
  const key = Object.keys(button.dataset).find((name) => {
    const normalized = name.toLowerCase();
    return normalized === "id" || normalized.startsWith("delete") || normalized.endsWith("id");
  });
  return button.dataset.id || (key ? button.dataset[key] : null);
}

function formatFieldValue(value, input) {
  if (value === null || value === undefined) return "";
  if (input.type === "date") return String(value).slice(0, 10);
  if (input.type === "datetime-local") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value).slice(0, 16) : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  return String(value);
}

async function openEdit(button) {
  const id = editId(button);
  if (!id || !editConfig) return;

  const response = await fetch(`http://localhost:5000/api/${editConfig.endpoint}/${id}`, {
    headers: { Authorization: `Bearer ${editToken()}` }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Data gagal dimuat");

  const form = document.querySelector(editConfig.form);
  const modal = document.querySelector(editConfig.modal);
  const data = payload.data || {};
  window.__openingCrudEdit = true;
  document.querySelector(editConfig.add)?.click();
  window.__openingCrudEdit = false;
  Object.entries(data).forEach(([name, value]) => {
    const input = form.elements.namedItem(name);
    if (input) input.value = formatFieldValue(value, input);
  });
  form.elements.status?.dispatchEvent(new Event("change", { bubbles: true }));

  editState.id = id;
  editState.form = form;
  window.__crudEditState = { id, endpoint: editConfig.endpoint };
  form.dataset.editing = "true";
  const attachmentEntity = editConfig.endpoint;
  const attachmentInput = form.elements.attachment;
  if (attachmentInput) {
    attachmentInput.required = false;
    const attachmentInfo = form.querySelector(".attachment-copy small");
    if (attachmentInfo) {
      try {
        const attachmentResponse = await fetch(`http://localhost:5000/api/attachments/check/${attachmentEntity}/${id}`, { headers: { Authorization: `Bearer ${editToken()}` } });
        const attachmentPayload = await attachmentResponse.json().catch(() => ({}));
        attachmentInfo.textContent = attachmentResponse.ok
          ? `File saat ini: ${attachmentPayload.data.file_name} · pilih file baru untuk mengganti`
          : "Belum ada file · pilih file jika ingin menambahkan";
      } catch { attachmentInfo.textContent = "File lama tidak dapat diperiksa · pilih file baru jika diperlukan"; }
    }
  }
  const heading = modal.querySelector("h2");
  if (heading) heading.textContent = "Edit Data";
}

async function submitEdit(event) {
  if (!editState.id || event.currentTarget !== editState.form) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  const form = event.currentTarget;
  const error = document.querySelector(editConfig.error);
  const button = form.querySelector("button[type=submit]");
  const data = Object.fromEntries(new FormData(form).entries());
  button.disabled = true;
  error.textContent = "";

  try {
    const response = await fetch(`http://localhost:5000/api/${editConfig.endpoint}/${editState.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${editToken()}` },
      body: JSON.stringify(data)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Data gagal diperbarui");
    window.__crudEditState = null;
    form.removeAttribute("data-editing");
    location.reload();
  } catch (requestError) {
    error.textContent = requestError.message;
    button.disabled = false;
  }
}

function addEditButtons() {
  if (!editConfig) return;
  document.querySelectorAll(`${editConfig.body} ${editConfig.delete}`).forEach((deleteButton) => {
    if (deleteButton.parentElement.querySelector("[data-crud-edit]")) return;
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.dataset.crudEdit = editId(deleteButton);
    editButton.textContent = "Edit";
    editButton.title = "Edit data";
    deleteButton.parentElement.insertBefore(editButton, deleteButton);
  });
}

if (editConfig) {
  const createTitles = {
    insiden: "Tambah Insiden", observasi: "Buat Observasi / Inspeksi", izin: "Buat Izin Kerja",
    training: "Buat Training Baru", apd: "Tambah APD / Peralatan", dokumen: "Tambah Dokumen",
    audit: "Jadwalkan Audit", pelaporan: "Buat Laporan Baru", risiko: "Tambah Risiko Baru"
  };
  document.querySelector(editConfig.add)?.addEventListener("click", () => {
    if (window.__openingCrudEdit) return;
    editState.id = null;
    editState.form = null;
    window.__crudEditState = null;
    const form = document.querySelector(editConfig.form);
    form?.removeAttribute("data-editing");
    const modal = document.querySelector(editConfig.modal);
    const heading = modal?.querySelector("h2");
    if (heading && createTitles[editConfig.endpoint]) heading.textContent = createTitles[editConfig.endpoint];
    if (form?.elements.attachment) {
      form.elements.attachment.required = !["dokumen", "audit"].includes(editConfig.endpoint);
      const info = form.querySelector(".attachment-copy small");
      if (info) info.textContent = "Belum ada file dipilih · PNG, JPG/JPEG, atau PDF";
    }
  }, true);
  const observer = new MutationObserver(addEditButtons);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-crud-edit]");
    if (!button) return;
    openEdit(button).catch((error) => window.alert(error.message));
  });
  document.addEventListener("submit", submitEdit, true);
  addEditButtons();
}
