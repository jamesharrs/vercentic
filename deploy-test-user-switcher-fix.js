#!/usr/bin/env node
const fs   = require('fs');
const path = require('path');

const root       = __dirname;
const usersPath  = path.join(root, 'server/routes/users.js');
const indexPath  = path.join(root, 'server/index.js');
const appPath    = path.join(root, 'client/src/App.jsx');

// ─── 1. Patch users.js ────────────────────────────────────────────────────────
let users = fs.readFileSync(usersPath, 'utf8');

const ENSURE_ROUTE = `
// ── POST /api/users/ensure-test-users ────────────────────────────────────────
// Idempotently creates the 5 role-based test/demo users.
router.post('/ensure-test-users', (req, res) => {
  try {
    const roles = query('roles', () => true);
    const findRole = slug => roles.find(r => r.slug === slug);

    const TEST_USERS = [
      { email:'admin@talentos.io',       first_name:'Admin',    last_name:'User',    role_slug:'super_admin',    password:'Admin1234!' },
      { email:'admin.test@talentos.io',  first_name:'Admin',    last_name:'Test',    role_slug:'admin',          password:'Admin1234!' },
      { email:'recruiter@talentos.io',   first_name:'Recruiter',last_name:'Test',    role_slug:'recruiter',      password:'Admin1234!' },
      { email:'manager@talentos.io',     first_name:'Hiring',   last_name:'Manager', role_slug:'hiring_manager', password:'Admin1234!' },
      { email:'readonly@talentos.io',    first_name:'Read',     last_name:'Only',    role_slug:'read_only',      password:'Admin1234!' },
    ];

    const created = [], existing = [];
    let changed = false;

    for (const tu of TEST_USERS) {
      const role = findRole(tu.role_slug);
      if (!role) continue;
      const already = findOne('users', u => u.email === tu.email);
      if (already) {
        if (!already.password_hash) {
          update('users', u => u.id === already.id, {
            password_hash: hashPassword(tu.password),
            must_change_password: 0,
            updated_at: new Date().toISOString(),
          });
          changed = true;
        }
        existing.push({ email: tu.email, role: role.name, password: tu.password });
      } else {
        insert('users', {
          id: uuidv4(), email: tu.email,
          first_name: tu.first_name, last_name: tu.last_name,
          password_hash: hashPassword(tu.password),
          role_id: role.id, status: 'active',
          auth_provider: 'local', mfa_enabled: 0, must_change_password: 0,
          last_login: null, last_login_ip: null, login_count: 0,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        });
        created.push({ email: tu.email, role: role.name, password: tu.password });
        changed = true;
      }
    }

    if (changed) {
      const { saveStoreNow } = require('../db/init');
      saveStoreNow();
    }

    const allUsers = [...created, ...existing];
    res.json({ ok: true, created: created.length, existing: existing.length, users: allUsers });
  } catch (err) {
    console.error('[ensure-test-users]', err);
    res.status(500).json({ error: err.message });
  }
});

`;

if (users.includes('ensure-test-users')) {
  console.log('ℹ️  ensure-test-users route already exists — skipping');
} else {
  users = users.replace('module.exports = router;', ENSURE_ROUTE + '\nmodule.exports = router;');
  fs.writeFileSync(usersPath, users);
  console.log('✅  Added ensure-test-users route to server/routes/users.js');
}

// ─── 2. Patch server/index.js — AUTH_EXEMPT ───────────────────────────────────
let idx = fs.readFileSync(indexPath, 'utf8');

if (idx.includes("'/users/ensure-test-users'")) {
  console.log('ℹ️  ensure-test-users already in AUTH_EXEMPT — skipping');
} else {
  idx = idx.replace(
    "'/users/login', '/users/auth/login',",
    "'/users/login', '/users/auth/login', '/users/ensure-test-users',"
  );
  fs.writeFileSync(indexPath, idx);
  console.log('✅  Added ensure-test-users to AUTH_EXEMPT_PATHS in server/index.js');
}

// ─── 3. Patch App.jsx — UserFooterMenu ───────────────────────────────────────
let app = fs.readFileSync(appPath, 'utf8');

const startMarker = '// ─── User footer menu (Settings / Help / Sign out) ───────────────────────────';
const startIdx = app.indexOf(startMarker);

if (startIdx === -1) {
  console.error('❌  Could not find UserFooterMenu marker in App.jsx');
  process.exit(1);
}

if (app.includes('ensure-test-users') || app.includes('TEST USER SWITCHER')) {
  console.log('ℹ️  UserFooterMenu already patched — skipping');
} else {
  const afterStart = startIdx + startMarker.length;
  const candidates = [
    app.indexOf('\n// ─── ', afterStart),
    app.indexOf('\nfunction ', afterStart),
    app.indexOf('\nexport default function ', afterStart),
  ].filter(i => i > afterStart);
  const endIdx = Math.min(...candidates);

  if (endIdx === Infinity) {
    console.error('❌  Could not find end of UserFooterMenu');
    process.exit(1);
  }

  const NEW_MENU = `
// ─── User footer menu (Settings / Help / Sign out) ───────────────────────────
function UserFooterMenu({ session, activeNav, setActiveNav, clearSession, setSession, t }) {
  const [open, setOpen] = useState(false);
  const [testUsers,     setTestUsers]     = useState([]);
  const [switchLoading, setSwitchLoading] = useState(false);
  const [switchError,   setSwitchError]   = useState('');
  const [provisioning,  setProvisioning]  = useState(false);

  const ROLE_COLORS = {
    'Super Admin':'#e03131','Admin':'#f59f00','Recruiter':'#3b5bdb',
    'Hiring Manager':'#0ca678','Read Only':'#868e96',
  };
  const isSuperAdmin = session?.role?.slug === 'super_admin';
  const currentEmail = session?.user?.email;

  useEffect(() => {
    if (!open || !isSuperAdmin) return;
    (async () => {
      setProvisioning(true); setSwitchError('');
      try {
        const data = await api.post('/users/ensure-test-users', {});
        if (data?.users?.length) {
          setTestUsers(data.users.map(u => ({
            ...u,
            color:    ROLE_COLORS[u.role] || '#4361EE',
            initials: u.role.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2),
          })));
        }
      } catch { setSwitchError('Could not provision test users'); }
      setProvisioning(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const switchToUser = async (tu) => {
    if (switchLoading) return;
    setSwitchLoading(true); setSwitchError('');
    try {
      const data = await api.post('/users/login', { email: tu.email, password: tu.password });
      if (data?.error) { setSwitchError(data.error); setSwitchLoading(false); return; }
      const { role, permissions, tenant_slug, ...user } = data;
      const ns = { user, role, permissions, tenant_slug: tenant_slug || null };
      setSession(ns);
      localStorage.setItem('vercentic_session', JSON.stringify(ns));
      setOpen(false);
      window.location.reload();
    } catch (err) { setSwitchError('Login failed — ' + (err.message || 'unknown error')); }
    setSwitchLoading(false);
  };

  return (
    <div style={{ position:"relative" }}>
      {open && (
        <>
          <div onClick={()=>{setOpen(false);setSwitchError('');}} style={{position:"fixed",inset:0,zIndex:200}}/>
          <div style={{position:"absolute",bottom:"calc(100% + 6px)",left:0,right:0,
            background:"var(--t-surface)",border:"1px solid var(--t-border)",
            borderRadius:12,boxShadow:"0 8px 32px rgba(0,0,0,0.16)",zIndex:201,overflow:"hidden",minWidth:220}}>

            {isSuperAdmin && (
              <div style={{borderBottom:"1px solid var(--t-border)"}}>
                <div style={{padding:"8px 12px 4px",fontSize:9,fontWeight:700,color:"#f59f00",
                  textTransform:"uppercase",letterSpacing:"0.1em",display:"flex",alignItems:"center",gap:5}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:"#f59f00",display:"inline-block",flexShrink:0}}/>
                  TEST USER SWITCHER
                </div>
                {provisioning
                  ? <div style={{padding:"10px 12px",fontSize:11,color:"var(--t-text3)"}}>Provisioning users…</div>
                  : <div style={{padding:"4px 0"}}>
                      {testUsers.map(tu => {
                        const isActive = tu.email === currentEmail;
                        return (
                          <button key={tu.email} onClick={()=>!isActive&&switchToUser(tu)}
                            disabled={switchLoading||isActive}
                            style={{width:"100%",display:"flex",alignItems:"center",gap:10,
                              padding:"7px 12px",border:"none",cursor:isActive?"default":"pointer",
                              background:isActive?"var(--t-accentLight,#EEF2FF)":"transparent",
                              textAlign:"left",transition:"background .12s",
                              opacity:switchLoading&&!isActive?0.5:1}}
                            onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background="var(--t-surface2)";}}
                            onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background="transparent";}}>
                            <div style={{width:28,height:28,borderRadius:"50%",background:tu.color,
                              flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                              <span style={{color:"white",fontSize:10,fontWeight:700}}>{tu.initials}</span>
                            </div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:12,fontWeight:isActive?700:500,
                                color:isActive?"var(--t-accent)":"var(--t-text1)",
                                whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tu.role}</div>
                              <div style={{fontSize:10,color:"var(--t-text3)",
                                whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tu.email}</div>
                            </div>
                            {isActive && (
                              <span style={{fontSize:8,fontWeight:800,padding:"2px 6px",borderRadius:99,
                                background:"var(--t-accent,#4361EE)",color:"white",
                                textTransform:"uppercase",letterSpacing:"0.06em",flexShrink:0}}>ACTIVE</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                }
                {switchError && (
                  <div style={{margin:"4px 12px 8px",padding:"7px 10px",
                    background:"#FEF2F2",border:"1px solid #FECACA",
                    borderRadius:7,fontSize:11,color:"#DC2626"}}>{switchError}</div>
                )}
              </div>
            )}

            <div style={{padding:"4px 0"}}>
              {[
                {id:"settings",icon:"settings",label:t?t("nav.settings"):"Settings"},
                {id:"help",icon:"help-circle",label:"Help"},
              ].map(item => (
                <button key={item.id}
                  onClick={()=>{setActiveNav(item.id);setOpen(false);}}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:9,
                    padding:"9px 14px",border:"none",background:"transparent",
                    cursor:"pointer",fontFamily:"inherit",fontSize:13,
                    fontWeight:activeNav===item.id?700:500,
                    color:activeNav===item.id?"var(--t-accent)":"var(--t-text2)",textAlign:"left"}}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--t-surface2)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <Icon name={item.icon} size={14} color={activeNav===item.id?"var(--t-accent)":"var(--t-text3)"}/>
                  {item.label}
                </button>
              ))}
            </div>

            <div style={{height:1,background:"var(--t-border)"}}/>
            <div style={{padding:"4px 0"}}>
              <button onClick={()=>{clearSession();setOpen(false);}}
                style={{width:"100%",display:"flex",alignItems:"center",gap:9,
                  padding:"9px 14px",border:"none",background:"transparent",
                  cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:500,
                  color:"#e03131",textAlign:"left"}}
                onMouseEnter={e=>e.currentTarget.style.background="var(--t-surface2)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <Icon name="log-out" size={14} color="#e03131"/>
                Sign out
              </button>
            </div>
          </div>
        </>
      )}

      <button onClick={()=>{setOpen(v=>!v);setSwitchError('');}}
        style={{width:"100%",padding:"8px 10px",borderRadius:10,
          background:open?"var(--t-accentLight)":"var(--t-surface2)",
          border:\`1px solid \${open?"var(--t-accent)":"transparent"}\`,
          display:"flex",alignItems:"center",gap:8,cursor:"pointer",
          textAlign:"left",transition:"all .15s"}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--t-border)";}}
        onMouseLeave={e=>{if(!open)e.currentTarget.style.borderColor="transparent";}}>
        <div style={{width:28,height:28,borderRadius:"50%",
          background:session.role?.color||"#4f46e5",
          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{color:"white",fontSize:11,fontWeight:700}}>
            {(session.user.first_name?.[0]||"")+(session.user.last_name?.[0]||"")}
          </span>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:600,color:"var(--t-text1)",
            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:"1.4",paddingBottom:1}}>
            {session.user.first_name} {session.user.last_name}
          </div>
          <div style={{fontSize:10,color:"var(--t-text3)",
            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:"1.4"}}>
            {session.role?.name||""}
          </div>
        </div>
        <Icon name="chevron-up" size={12} color="var(--t-text3)"
          style={{transform:open?"rotate(0deg)":"rotate(180deg)",transition:"transform .2s",flexShrink:0}}/>
      </button>
    </div>
  );
}
`;

  app = app.slice(0, startIdx) + NEW_MENU + '\n' + app.slice(endIdx);
  fs.writeFileSync(appPath, app);
  console.log('✅  Replaced UserFooterMenu in client/src/App.jsx');
}

console.log('\n🎉  Test user switcher fix deployed.');
