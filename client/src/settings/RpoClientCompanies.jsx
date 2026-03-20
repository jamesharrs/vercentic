// client/src/settings/RpoClientCompanies.jsx
import { useState, useEffect } from "react";
import CompanySetupWizard from "../CompanySetupWizard";

const C = {
  bg:"#F0F2FF", card:"#FFFFFF", accent:"#4361EE", accentLight:"#EEF0FD",
  text1:"#0F1729", text2:"#374151", text3:"#9CA3AF", border:"#E5E7EB",
  green:"#0CAF77", amber:"#F59E0B", red:"#EF4444",
};
const F = "'DM Sans', -apple-system, sans-serif";

const PATHS = {
  plus:"M12 4v16m8-8H4", x:"M6 18L18 6M6 6l12 12",
  edit:"M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  trash:"M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  building:"M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  map:"M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
  sparkle:"M12 3v1m0 16v1M3 12h1m16 0h1m-2.222-6.364l-.707.707M4.929 19.071l.707-.707M4.929 4.929l.707.707m13.435 13.435l-.707-.707M9 12a3 3 0 116 0 3 3 0 01-6 0z",
  users:"M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  check:"M5 13l4 4L19 7",
};
const Ic = ({n,s=16,c="currentColor"})=>{const d=PATHS[n];if(!d)return null;return<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;};

const INDUSTRY_COLORS = {technology:"#4361EE",finance:"#0CAF77",healthcare:"#EF4444",legal:"#7C3AED",consulting:"#F59E0B",retail:"#EC4899",manufacturing:"#6B7280",media:"#8B5CF6",energy:"#F97316",other:"#9CA3AF"};

const ClientCard = ({ client, onEdit, onDelete, onSetup }) => {
  const color = INDUSTRY_COLORS[client.industry?.toLowerCase()] || INDUSTRY_COLORS.other;
  return (
    <div style={{background:C.card,borderRadius:16,border:`1.5px solid ${C.border}`,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
      <div style={{height:4,background:color}}/>
      <div style={{padding:"16px 20px"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:12}}>
          <div style={{width:48,height:48,borderRadius:12,border:`1.5px solid ${C.border}`,background:`${color}12`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
            {client.profile?.logo_url?<img src={client.profile.logo_url} alt="" style={{width:"100%",height:"100%",objectFit:"contain",padding:6}} onError={e=>e.target.style.display="none"}/>:<span style={{fontSize:18,fontWeight:800,color}}>{client.name?.[0]||"?"}</span>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text1,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{client.name}</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {client.industry&&<span style={{padding:"2px 8px",borderRadius:99,background:`${color}12`,color,fontSize:11,fontWeight:600}}>{client.industry}</span>}
              {client.profile?.size&&<span style={{padding:"2px 8px",borderRadius:99,background:"#F3F4F6",color:C.text3,fontSize:11}}>{client.profile.size}</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>onEdit(client)} style={{padding:6,borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",display:"flex"}}><Ic n="edit" s={14} c={C.text3}/></button>
            <button onClick={()=>onDelete(client.id)} style={{padding:6,borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer",display:"flex"}}><Ic n="trash" s={14} c={C.red}/></button>
          </div>
        </div>
        {client.profile?.evp?.headline&&<p style={{fontSize:12,color:C.text2,margin:"0 0 12px",fontStyle:"italic",lineHeight:1.4}}>"{client.profile.evp.headline}"</p>}
        {client.profile?.locations?.length>0&&(
          <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:12}}>
            {client.profile.locations.slice(0,3).map((loc,i)=>(
              <span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:99,background:loc.is_hq?`${color}12`:"#F3F4F6",color:loc.is_hq?color:C.text3,fontSize:11}}>
                <Ic n="map" s={9} c={loc.is_hq?color:C.text3}/>{loc.city}
              </span>
            ))}
            {client.profile.locations.length>3&&<span style={{fontSize:11,color:C.text3}}>+{client.profile.locations.length-3} more</span>}
          </div>
        )}
        {client.profile?(
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:7,height:7,borderRadius:"50%",background:C.green}}/><span style={{fontSize:11,color:C.text3}}>Profile complete</span></div>
            <button onClick={()=>onSetup(client)} style={{fontSize:12,color:C.accent,background:"none",border:"none",cursor:"pointer",fontFamily:F,fontWeight:600}}>Re-research →</button>
          </div>
        ):(
          <button onClick={()=>onSetup(client)} style={{width:"100%",padding:"8px",borderRadius:8,border:`1.5px dashed ${C.accent}`,background:C.accentLight,color:C.accent,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontFamily:F}}>
            <Ic n="sparkle" s={13} c={C.accent}/>Run AI Research
          </button>
        )}
      </div>
    </div>
  );
};

const ClientModal = ({ client, onSave, onClose }) => {
  const [form, setForm] = useState({ name:client?.name||"", industry:client?.industry||"", contact_name:client?.contact_name||"", contact_email:client?.contact_email||"", website:client?.website||"", notes:client?.notes||"" });
  const INDUSTRIES = ["Technology","Finance","Healthcare","Legal","Consulting","Retail","Manufacturing","Media","Energy","Other"];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:C.card,borderRadius:20,width:"90%",maxWidth:480,padding:32,boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
          <h3 style={{margin:0,fontSize:18,fontWeight:800,color:C.text1}}>{client?"Edit Client":"Add Client Company"}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",display:"flex"}}><Ic n="x" s={18} c={C.text3}/></button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:6}}>Company Name *</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Acme Corporation" style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,fontFamily:F,color:C.text1,outline:"none",boxSizing:"border-box"}}/>
          </div>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:6}}>Industry</label>
            <select value={form.industry} onChange={e=>setForm(f=>({...f,industry:e.target.value}))} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,fontFamily:F,color:C.text1,background:C.card}}>
              <option value="">Select industry…</option>
              {INDUSTRIES.map(i=><option key={i} value={i.toLowerCase()}>{i}</option>)}
            </select>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><label style={{fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:6}}>Contact Name</label><input value={form.contact_name} onChange={e=>setForm(f=>({...f,contact_name:e.target.value}))} placeholder="Name" style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,fontFamily:F,color:C.text1,boxSizing:"border-box"}}/></div>
            <div><label style={{fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:6}}>Contact Email</label><input value={form.contact_email} onChange={e=>setForm(f=>({...f,contact_email:e.target.value}))} placeholder="email@client.com" type="email" style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,fontFamily:F,color:C.text1,boxSizing:"border-box"}}/></div>
          </div>
          <div><label style={{fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:6}}>Website</label><input value={form.website} onChange={e=>setForm(f=>({...f,website:e.target.value}))} placeholder="https://www.client.com" style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,fontFamily:F,color:C.text1,boxSizing:"border-box"}}/></div>
          <div><label style={{fontSize:12,fontWeight:600,color:C.text2,display:"block",marginBottom:6}}>Notes</label><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={3} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,fontFamily:F,color:C.text1,resize:"vertical",boxSizing:"border-box"}}/></div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:24}}>
          <button onClick={onClose} style={{flex:1,padding:"11px",borderRadius:10,border:`1.5px solid ${C.border}`,background:"transparent",color:C.text2,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:F}}>Cancel</button>
          <button onClick={()=>onSave(form)} disabled={!form.name.trim()} style={{flex:2,padding:"11px",borderRadius:10,border:"none",background:form.name.trim()?C.accent:C.border,color:"white",fontSize:14,fontWeight:700,cursor:form.name.trim()?"pointer":"default",fontFamily:F}}>{client?"Save Changes":"Add Client"}</button>
        </div>
      </div>
    </div>
  );
};

export default function RpoClientCompanies({ environment }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rpoMode, setRpoMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [wizardClient, setWizardClient] = useState(null);
  const [search, setSearch] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const envId = environment?.id;

  useEffect(() => {
    if (!envId) return;
    fetch(`/api/rpo-clients?environment_id=${envId}`)
      .then(r=>r.ok?r.json():{clients:[],rpo_mode:false})
      .then(data=>{setClients(data.clients||[]);setRpoMode(data.rpo_mode||false);})
      .catch(()=>setClients([]))
      .finally(()=>setLoading(false));
  }, [envId]);

  const saveAll = async (updatedClients, newRpoMode) => {
    await fetch('/api/rpo-clients',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({environment_id:envId,clients:updatedClients,rpo_mode:newRpoMode??rpoMode})});
  };

  const handleAdd = async (form) => {
    const newClient = {id:Date.now().toString(),...form,profile:null,created_at:new Date().toISOString()};
    const updated = [...clients,newClient]; setClients(updated); await saveAll(updated); setShowModal(false);
  };
  const handleEdit = async (form) => {
    const updated = clients.map(c=>c.id===editClient.id?{...c,...form}:c); setClients(updated); await saveAll(updated); setEditClient(null); setShowModal(false);
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Remove this client?")) return;
    const updated = clients.filter(c=>c.id!==id); setClients(updated); await saveAll(updated);
  };
  const handleToggleRpo = async () => { const next=!rpoMode; setRpoMode(next); await saveAll(clients,next); };

  const handleWizardComplete = async (clientId) => {
    const r = await fetch(`/api/company-research?environment_id=rpo_client_${clientId}`);
    const profileData = r.ok ? await r.json() : null;
    if (profileData) {
      const updated = clients.map(c=>c.id===clientId?{...c,profile:profileData,industry:profileData.industry}:c);
      setClients(updated); await saveAll(updated);
    }
    setWizardClient(null);
  };

  const filtered = clients.filter(c=>{
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterIndustry && c.industry!==filterIndustry) return false;
    return true;
  });
  const industries = [...new Set(clients.map(c=>c.industry).filter(Boolean))];

  if (wizardClient) return (
    <div style={{fontFamily:F}}>
      <div style={{padding:"16px 0 24px",borderBottom:`1px solid ${C.border}`,marginBottom:24,display:"flex",alignItems:"center",gap:12}}>
        <button onClick={()=>setWizardClient(null)} style={{padding:"6px 14px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"transparent",color:C.text2,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:F}}>← Back to clients</button>
        <div style={{fontSize:14,color:C.text3}}>Researching: <strong style={{color:C.text1}}>{wizardClient.name}</strong></div>
      </div>
      <CompanySetupWizard
        environmentId={`rpo_client_${wizardClient.id}`}
        environmentName={wizardClient.name}
        onComplete={()=>handleWizardComplete(wizardClient.id)}
        onSkip={()=>setWizardClient(null)}
      />
    </div>
  );

  return (
    <div style={{fontFamily:F}}>
      <div style={{marginBottom:24}}>
        <h2 style={{fontSize:20,fontWeight:800,color:C.text1,margin:"0 0 6px"}}>Client Companies</h2>
        <p style={{fontSize:14,color:C.text3,margin:0}}>Manage your RPO clients — each with their own AI-researched company profile, brand context, and email templates.</p>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderRadius:14,background:rpoMode?`${C.accent}08`:"#F9FAFB",border:`1.5px solid ${rpoMode?C.accent:C.border}`,marginBottom:28}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:36,height:36,borderRadius:10,background:rpoMode?C.accent:C.border,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic n="users" s={18} c="white"/></div>
          <div><div style={{fontSize:14,fontWeight:700,color:C.text1}}>RPO Mode</div><div style={{fontSize:12,color:C.text3}}>Manage multiple client company profiles from one environment</div></div>
        </div>
        <button onClick={handleToggleRpo} style={{width:48,height:26,borderRadius:99,border:"none",cursor:"pointer",background:rpoMode?C.accent:C.border,position:"relative",transition:"background 0.2s"}}>
          <div style={{width:20,height:20,borderRadius:"50%",background:"white",position:"absolute",top:3,left:rpoMode?25:3,transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
        </button>
      </div>
      {rpoMode&&(
        <>
          <div style={{display:"flex",gap:12,marginBottom:20,alignItems:"center"}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search clients…" style={{flex:1,padding:"9px 14px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,fontFamily:F,color:C.text1,outline:"none"}}/>
            {industries.length>0&&<select value={filterIndustry} onChange={e=>setFilterIndustry(e.target.value)} style={{padding:"9px 12px",borderRadius:10,border:`1.5px solid ${C.border}`,fontSize:14,fontFamily:F,color:C.text1,background:C.card}}><option value="">All industries</option>{industries.map(i=><option key={i} value={i}>{i.charAt(0).toUpperCase()+i.slice(1)}</option>)}</select>}
            <button onClick={()=>{setEditClient(null);setShowModal(true);}} style={{padding:"9px 18px",borderRadius:10,border:"none",background:C.accent,color:"white",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:F,display:"flex",alignItems:"center",gap:8}}><Ic n="plus" s={15} c="white"/>Add Client</button>
          </div>
          {clients.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
            {[{label:"Total Clients",value:clients.length},{label:"Profiles Complete",value:clients.filter(c=>c.profile).length},{label:"Pending Research",value:clients.filter(c=>!c.profile).length}].map((s,i)=>(
              <div key={i} style={{padding:"14px 18px",borderRadius:12,background:C.card,border:`1.5px solid ${C.border}`}}><div style={{fontSize:22,fontWeight:800,color:C.text1}}>{s.value}</div><div style={{fontSize:12,color:C.text3}}>{s.label}</div></div>
            ))}
          </div>}
          {loading?<div style={{textAlign:"center",padding:60,color:C.text3}}>Loading…</div>:filtered.length===0?(
            <div style={{textAlign:"center",padding:60,borderRadius:16,border:`2px dashed ${C.border}`}}>
              <div style={{width:56,height:56,borderRadius:16,background:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}><Ic n="building" s={26} c={C.accent}/></div>
              <div style={{fontSize:16,fontWeight:700,color:C.text1,marginBottom:8}}>{clients.length===0?"No clients yet":"No clients match your search"}</div>
              <div style={{fontSize:13,color:C.text3,marginBottom:20}}>{clients.length===0?"Add your first client company to get started":"Try a different search or filter"}</div>
              {clients.length===0&&<button onClick={()=>setShowModal(true)} style={{padding:"10px 20px",borderRadius:10,border:"none",background:C.accent,color:"white",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:F}}>+ Add First Client</button>}
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
              {filtered.map(client=><ClientCard key={client.id} client={client} onEdit={c=>{setEditClient(c);setShowModal(true);}} onDelete={handleDelete} onSetup={c=>setWizardClient(c)}/>)}
            </div>
          )}
        </>
      )}
      {!rpoMode&&<div style={{padding:"32px 0",textAlign:"center"}}><div style={{fontSize:14,color:C.text3,marginBottom:8}}>Enable RPO Mode to manage multiple client company profiles.</div></div>}
      {showModal&&<ClientModal client={editClient} onSave={editClient?handleEdit:handleAdd} onClose={()=>{setShowModal(false);setEditClient(null);}}/>}
    </div>
  );
}
