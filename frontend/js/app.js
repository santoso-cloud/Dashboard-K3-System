const API = "http://localhost:5000/api";
const $ = id => document.getElementById(id);
const token = () => localStorage.getItem("token");
const headers = () => ({ "Content-Type":"application/json", Authorization:`Bearer ${token()}` });

async function request(path, options={}) {
  const res = await fetch(API + path, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request gagal");
  return data;
}

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    const data = await request("/auth/login", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({username:$("username").value,password:$("password").value})
    });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    window.location.href = "apd.html";
  } catch(err) { $("loginMessage").textContent = err.message; }
});

$("logoutBtn").onclick = () => { localStorage.clear(); location.reload(); };

$("incidentForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await request("/incidents", {
      method:"POST", headers:headers(),
      body:JSON.stringify({
        title:$("title").value, description:$("description").value,
        location:$("location").value, incident_date:$("incident_date").value,
        severity:$("severity").value
      })
    });
    e.target.reset(); await loadDashboard(); await loadIncidents();
  } catch(err) { alert(err.message); }
});

async function loadDashboard(){
  const r = await request("/dashboard/summary",{headers:headers()});
  $("incidents").textContent=r.data.total_incidents;
  $("observations").textContent=r.data.total_observations;
  $("nearMiss").textContent=r.data.total_near_miss;
  $("completed").textContent=r.data.total_completed;
}
async function loadIncidents(){
  const r=await request("/incidents",{headers:headers()});
  $("incidentRows").innerHTML=r.data.map(x=>`<tr><td>${escapeHtml(x.title)}</td><td>${escapeHtml(x.location)}</td><td>${new Date(x.incident_date).toLocaleDateString("id-ID")}</td><td>${escapeHtml(x.severity)}</td><td>${escapeHtml(x.status)}</td></tr>`).join("");
}
function escapeHtml(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
async function showApp(){
  $("loginCard").classList.add("hidden"); $("app").classList.remove("hidden");
  const u=JSON.parse(localStorage.getItem("user")||"{}"); $("welcome").textContent=`Selamat datang, ${u.name||u.username||""}`;
  try { await Promise.all([loadDashboard(),loadIncidents()]); } catch(e){ if(e.message) console.error(e); }
}
if(token()) showApp();
