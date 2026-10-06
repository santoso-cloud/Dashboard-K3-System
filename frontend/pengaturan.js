const API="http://localhost:5000/api/pengaturan";
const form=document.getElementById("settings-form");
const toast=document.getElementById("toast");
const boolKeys=["notify_incident","notify_overdue","notify_permit","notify_training","email_notification","strong_password","account_lock"];

function notify(msg,error=false){toast.textContent=msg;toast.style.background=error?"#b91c1c":"#065f46";toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2600)}
function setForm(data){Object.entries(data||{}).forEach(([k,v])=>{const x=form.elements[k];if(!x)return;if(x.type==="checkbox")x.checked=v===true||v==="true";else x.value=v??""})}
function getForm(){const out={};new FormData(form).forEach((v,k)=>out[k]=v);boolKeys.forEach(k=>out[k]=!!form.elements[k]?.checked);["session_timeout","min_password_length","items_per_page"].forEach(k=>{if(out[k]!==undefined)out[k]=Number(out[k])});return out}

async function loadSettings(){
 try{const r=await fetch(API);const j=await r.json();if(!r.ok)throw new Error(j.message);setForm(j.data||j);document.getElementById("save-indicator").textContent="Tersinkron dengan database"}
 catch(e){notify("Gagal memuat pengaturan: "+e.message,true)}
}
form.addEventListener("submit",async e=>{
 e.preventDefault();
 try{const r=await fetch(API,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(getForm())});const j=await r.json();if(!r.ok)throw new Error(j.message);setForm(j.data||{});notify("Pengaturan berhasil disimpan");}
 catch(e){notify("Gagal menyimpan: "+e.message,true)}
});
document.querySelectorAll(".tab").forEach(btn=>btn.onclick=()=>{
 document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));btn.classList.add("active");
 document.querySelectorAll(".panel").forEach(x=>x.classList.toggle("active",x.dataset.panel===btn.dataset.tab));
});
document.getElementById("reset-btn").onclick=async()=>{
 if(!confirm("Reset seluruh pengaturan ke nilai default?"))return;
 try{const r=await fetch(API+"/reset",{method:"POST"});const j=await r.json();if(!r.ok)throw new Error(j.message);setForm(j.data);notify("Pengaturan dikembalikan ke default")}
 catch(e){notify(e.message,true)}
};
document.getElementById("check-db").onclick=async()=>{
 const s=document.getElementById("db-status");s.textContent="Memeriksa...";
 try{const r=await fetch(API+"/health");const j=await r.json();if(!r.ok)throw new Error(j.message);s.textContent=`Terhubung • ${j.database} • ${j.time}`;notify("Database terhubung")}
 catch(e){s.textContent="Tidak terhubung";notify(e.message,true)}
};
document.getElementById("export-settings").onclick=()=>{
 const blob=new Blob([JSON.stringify(getForm(),null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="k3-settings.json";a.click();URL.revokeObjectURL(a.href)
};
document.getElementById("import-settings").onchange=async e=>{
 try{const obj=JSON.parse(await e.target.files[0].text());setForm(obj);notify("File dimuat. Klik Simpan Perubahan untuk menyimpan ke database")}
 catch(err){notify("File JSON tidak valid",true)}finally{e.target.value=""}
};
loadSettings();