#!/usr/bin/env node
const fs   = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'client/src/Records.jsx');
let src = fs.readFileSync(FILE, 'utf8');

function replace(anchor, newText, label) {
  if (!src.includes(anchor)) {
    console.error(`✗ Could not find anchor for: ${label}`);
    return;
  }
  src = src.replace(anchor, newText);
  console.log(`✓ ${label}`);
}

// 1. Expand SYSTEM_COLS
replace(
`const SYSTEM_COLS = [
  { id: '_created', name: 'Created', apiKey: '_created', isSystem: true },
  { id: '_updated', name: 'Updated',  apiKey: '_updated', isSystem: true },
  { id: '_linked_job', name: 'Linked Job', apiKey: '_linked_job', isSystem: true },
  { id: '_stage',  name: 'Stage', apiKey: '_stage', isSystem: true },
];`,
`const SYSTEM_COLS = [
  { id: '_created',      name: 'Created',            apiKey: '_created',      isSystem: true },
  { id: '_updated',      name: 'Last Updated',       apiKey: '_updated',      isSystem: true },
  { id: '_created_by',   name: 'Created By',         apiKey: '_created_by',   isSystem: true },
  { id: '_days_old',     name: 'Age (Days)',          apiKey: '_days_old',     isSystem: true },
  { id: '_days_active',  name: 'Days Since Update',  apiKey: '_days_active',  isSystem: true },
  { id: '_linked_job',   name: 'Linked Job',         apiKey: '_linked_job',   isSystem: true },
  { id: '_stage',        name: 'Stage',              apiKey: '_stage',        isSystem: true },
  { id: '_linked_count', name: 'Linked People',      apiKey: '_linked_count', isSystem: true },
];`,
'SYSTEM_COLS expanded'
);

// 2. Replace getSystemValue
replace(
`function getSystemValue(record, col, linkedJobs) {
  if (col === '_created') return record.created_at ? new Date(record.created_at).toLocaleDateString() : '—';
  if (col === '_updated') return record.updated_at ? new Date(record.updated_at).toLocaleDateString() : '—';
  if (col === '_linked_job') {
    const job = linkedJobs?.[record.id];
    return job ? (job.title || '—') : '—';
  }
  if (col === '_stage') {
    const job = linkedJobs?.[record.id];
    return job?.stage || '—';
  }
  return '—';
}`,
`function getSystemValue(record, col, linkedJobs, linkedPeopleCounts) {
  if (col === '_created')    return record.created_at ? new Date(record.created_at).toLocaleDateString() : '—';
  if (col === '_updated')    return record.updated_at ? new Date(record.updated_at).toLocaleDateString() : '—';
  if (col === '_created_by') return record.created_by || '—';
  if (col === '_days_old') {
    if (!record.created_at) return '—';
    const d = Math.floor((Date.now() - new Date(record.created_at)) / 86400000);
    return d === 0 ? 'Today' : d + 'd';
  }
  if (col === '_days_active') {
    if (!record.updated_at) return '—';
    const d = Math.floor((Date.now() - new Date(record.updated_at)) / 86400000);
    return d === 0 ? 'Today' : d + 'd ago';
  }
  if (col === '_linked_job') {
    const job = linkedJobs?.[record.id];
    return job ? (job.title || '—') : '—';
  }
  if (col === '_stage') {
    const job = linkedJobs?.[record.id];
    return job?.stage || '—';
  }
  if (col === '_linked_count') {
    const info = linkedPeopleCounts?.[record.id];
    return info ? String(info.count) : null;
  }
  return '—';
}`,
'getSystemValue expanded'
);

// 3. Insert LinkedPeopleModal before /* ─── Table View
const MODAL_CODE = `
/* ─── LinkedPeopleModal ──────────────────────────────────────────────────── */
const LinkedPeopleModal = ({ record, linkedInfo, environment, onClose, onNavigate }) => {
  const [personRecords, setPersonRecords] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [activeStage, setActiveStage]     = useState(null);

  useEffect(() => {
    const links = linkedInfo?.links || [];
    if (!links.length || !environment?.id) { setLoadingPeople(false); return; }
    const ids = [...new Set(links.map(l => l.person_record_id).filter(Boolean))];
    api.get(\`/objects?environment_id=\${environment.id}\`).then(objs => {
      const personObj = (Array.isArray(objs) ? objs : []).find(o =>
        o.slug === 'people' || o.name === 'Person' || o.name === 'People'
      );
      if (!personObj) { setLoadingPeople(false); return; }
      api.get(\`/records?object_id=\${personObj.id}&environment_id=\${environment.id}&limit=500\`)
        .then(res => {
          setPersonRecords((res.records || []).filter(r => ids.includes(r.id)));
          setLoadingPeople(false);
        }).catch(() => setLoadingPeople(false));
    }).catch(() => setLoadingPeople(false));
  }, [linkedInfo, environment?.id]);

  const links    = linkedInfo?.links || [];
  const recTitle = record.data?.job_title || record.data?.name || record.data?.pool_name || record.data?.first_name || 'Record';
  const linkMap  = Object.fromEntries(links.map(l => [l.person_record_id, l]));

  const byStage = {};
  personRecords.forEach(pr => {
    const s = linkMap[pr.id]?.stage_name || 'No Stage';
    if (!byStage[s]) byStage[s] = [];
    byStage[s].push({ ...pr, _link: linkMap[pr.id] });
  });

  const orderedStages = (() => {
    const steps = links[0]?.workflow_steps || [];
    const names = steps.map(s => s.name);
    const extras = Object.keys(byStage).filter(s => !names.includes(s));
    return [...names.filter(s => byStage[s]), ...extras.filter(s => byStage[s])];
  })();

  const visiblePeople = activeStage ? (byStage[activeStage] || []) : personRecords;

  const personName = (pr) => {
    const d = pr.data || {};
    return [d.first_name, d.last_name].filter(Boolean).join(' ') || d.email || 'Unknown';
  };
  const personSub = (pr) => { const d = pr.data || {}; return d.current_title || d.job_title || d.email || ''; };
  const initials = (name) => name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || '?';

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1200, display:'flex', alignItems:'center',
      justifyContent:'center', background:'rgba(15,23,41,.45)', backdropFilter:'blur(2px)' }}
      onClick={onClose}>
      <div style={{ background:'white', borderRadius:18, width:680, maxHeight:'82vh',
        display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,.22)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding:'20px 24px 0', display:'flex', alignItems:'flex-start', gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:800, color:C.text1 }}>Linked People</div>
            <div style={{ fontSize:12, color:C.text3, marginTop:2 }}>{recTitle} · {links.length} {links.length===1?'person':'people'}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:C.text3, padding:4, borderRadius:6, display:'flex' }}>
            <Ic n="x" s={18}/>
          </button>
        </div>
        {orderedStages.length > 0 && (
          <div style={{ display:'flex', gap:0, padding:'14px 24px 0', borderBottom:\`1px solid \${C.border}\`, overflowX:'auto', scrollbarWidth:'none' }}>
            <button onClick={() => setActiveStage(null)}
              style={{ padding:'7px 16px', border:'none', borderBottom: activeStage===null ? \`2.5px solid \${C.accent}\` : '2.5px solid transparent',
                background:'transparent', fontSize:12, fontWeight: activeStage===null ? 700 : 500,
                color: activeStage===null ? C.accent : C.text2, cursor:'pointer', fontFamily:F, whiteSpace:'nowrap' }}>
              All ({links.length})
            </button>
            {orderedStages.map(stage => (
              <button key={stage} onClick={() => setActiveStage(stage)}
                style={{ padding:'7px 16px', border:'none', borderBottom: activeStage===stage ? \`2.5px solid \${C.accent}\` : '2.5px solid transparent',
                  background:'transparent', fontSize:12, fontWeight: activeStage===stage ? 700 : 500,
                  color: activeStage===stage ? C.accent : C.text2, cursor:'pointer', fontFamily:F, whiteSpace:'nowrap' }}>
                {stage} ({byStage[stage]?.length||0})
              </button>
            ))}
          </div>
        )}
        <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
          {loadingPeople ? (
            <div style={{ padding:'32px', textAlign:'center', color:C.text3, fontSize:13 }}>Loading people…</div>
          ) : visiblePeople.length === 0 ? (
            <div style={{ padding:'32px', textAlign:'center', color:C.text3, fontSize:13 }}>No people in this stage</div>
          ) : visiblePeople.map((pr, i) => {
            const name  = personName(pr);
            const sub   = personSub(pr);
            const stage = pr._link?.stage_name || '';
            return (
              <div key={pr.id}
                onClick={() => { onNavigate?.(pr.id); onClose(); }}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 24px', cursor:'pointer',
                  borderBottom: i < visiblePeople.length-1 ? \`1px solid \${C.border}\` : 'none', transition:'background .1s' }}
                onMouseEnter={e => e.currentTarget.style.background='#f8f9fc'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:C.accent,
                  display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:13, fontWeight:700, flexShrink:0 }}>
                  {pr.data?.profile_photo || pr.data?.photo_url
                    ? <img src={pr.data.profile_photo||pr.data.photo_url} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover' }}/>
                    : initials(name)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:C.text1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
                  {sub && <div style={{ fontSize:11, color:C.text3, marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sub}</div>}
                </div>
                {stage && (
                  <span style={{ padding:'3px 10px', borderRadius:99, background:\`\${C.accent}14\`, color:C.accent, fontSize:11, fontWeight:600, flexShrink:0 }}>{stage}</span>
                )}
                <Ic n="chevR" s={13} c={C.text3}/>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

`;

// Insert before the Table View comment
const TV_COMMENT = '/* ─── Table View ──────────────────────────────────────────────────────────── */';
if (src.includes(TV_COMMENT)) {
  src = src.replace(TV_COMMENT, MODAL_CODE + TV_COMMENT);
  console.log('✓ LinkedPeopleModal component inserted');
} else {
  console.error('✗ Could not find Table View comment to insert LinkedPeopleModal');
}

// 4. Add state vars
replace(
`  // Linked jobs for system columns (people_links)
  const [linkedJobs, setLinkedJobs] = useState({});`,
`  // Linked jobs for system columns (people_links)
  const [linkedJobs,          setLinkedJobs]          = useState({});
  const [linkedPeopleCounts,  setLinkedPeopleCounts]  = useState({});
  const [linkedPeopleModal,   setLinkedPeopleModal]   = useState(null);
  const [activeViewId,        setActiveViewId]        = useState(null);`,
'RecordsView state additions'
);

// 5. Update people-links useEffect to build reverse map
replace(
`  // Load linked jobs for system columns (people_links)
  useEffect(() => {
    if (!object || !environment) return;
    api.get(\`/workflows/people-links?environment_id=\${environment.id}\`)
      .then(links => {
        if (!Array.isArray(links)) return;
        const map = {};
        links.forEach(l => {
          const pid = l.person_record_id;
          if (pid && !map[pid]) {
            map[pid] = {
              title:    l.target_title || l.target_data?.job_title || l.target_data?.title || '',
              stage:    l.stage_name  || '',
              stage_id: l.stage_id    || null,
              link_id:  l.id          || null,
              steps:    l.workflow_steps || [],
            };
          }
        });
        setLinkedJobs(map);
      }).catch(() => {});
  }, [object?.id, environment?.id]);`,
`  // Load linked jobs for system columns (people_links)
  useEffect(() => {
    if (!object || !environment) return;
    api.get(\`/workflows/people-links?environment_id=\${environment.id}\`)
      .then(links => {
        if (!Array.isArray(links)) return;
        const fwd = {};
        const rev = {};
        links.forEach(l => {
          const pid = l.person_record_id;
          if (pid && !fwd[pid]) {
            fwd[pid] = {
              title:    l.target_title || l.target_data?.job_title || l.target_data?.title || '',
              stage:    l.stage_name  || '',
              stage_id: l.stage_id    || null,
              link_id:  l.id          || null,
              steps:    l.workflow_steps || [],
            };
          }
          const tid = l.target_record_id;
          if (tid) {
            if (!rev[tid]) rev[tid] = { count: 0, links: [] };
            rev[tid].count++;
            rev[tid].links.push(l);
          }
        });
        setLinkedJobs(fwd);
        setLinkedPeopleCounts(rev);
      }).catch(() => {});
  }, [object?.id, environment?.id]);`,
'people-links useEffect - reverse map'
);

// 6. Track active view id in handleLoadView
replace(
`  const handleLoadView = (view) => {    if (view.filters)           setActiveFilters(view.filters);`,
`  const handleLoadView = (view) => {
    setActiveViewId(view.id);
    if (view.filters)           setActiveFilters(view.filters);`,
'handleLoadView - activeViewId tracking'
);

// 7. SavedViewsDropdown signature
replace(
`const SavedViewsDropdown = ({ objectId, environmentId, userId, currentFilters, currentVisibleFieldIds, currentViewMode, fields, onLoad, onClose }) => {`,
`const SavedViewsDropdown = ({ objectId, environmentId, userId, currentFilters, currentVisibleFieldIds, currentViewMode, fields, onLoad, onClose, activeViewId, onViewUpdated }) => {`,
'SavedViewsDropdown - new props signature'
);

// 8. Add edit states to SavedViewsDropdown
replace(
`  const [deleting, setDeleting] = useState(null);`,
`  const [deleting,   setDeleting]   = useState(null);
  const [editingId,  setEditingId]  = useState(null);
  const [editName,   setEditName]   = useState('');
  const [updating,   setUpdating]   = useState(false);`,
'SavedViewsDropdown - edit states'
);

// 9. Add rename/update handlers before ibs
replace(
`  const ibs = { padding:"6px 9px", borderRadius:7, border:\`1px solid \${C.border}\`, fontSize:12, fontFamily:F, color:C.text1, background:"white", width:"100%", boxSizing:"border-box" };`,
`  const handleRename = async (view) => {
    if (!editName.trim() || editName === view.name) { setEditingId(null); return; }
    await api.patch(\`/saved-views/\${view.id}\`, { name: editName.trim(), sharing: view.sharing });
    setEditingId(null);
    load();
  };

  const handleUpdateList = async (view) => {
    setUpdating(true);
    await api.patch(\`/saved-views/\${view.id}\`, {
      filters:           currentFilters,
      visible_field_ids: currentVisibleFieldIds || [],
      view_mode:         currentViewMode,
      sharing:           view.sharing,
    });
    setUpdating(false);
    load();
    onViewUpdated?.();
  };

  const ibs = { padding:"6px 9px", borderRadius:7, border:\`1px solid \${C.border}\`, fontSize:12, fontFamily:F, color:C.text1, background:"white", width:"100%", boxSizing:"border-box" };`,
'SavedViewsDropdown - rename/update handlers'
);

// 10. Update SavedViewsDropdown call to pass new props
replace(
`            <SavedViewsDropdown
              objectId={object.id}
              environmentId={environment.id}
              userId={userId}
              currentFilters={activeFilters}
              currentVisibleFieldIds={visibleFieldIds}
              currentViewMode={view}
              fields={fields}
              onLoad={handleLoadView}
              onClose={() => setShowViewsMenu(false)}
            />`,
`            <SavedViewsDropdown
              objectId={object.id}
              environmentId={environment.id}
              userId={userId}
              currentFilters={activeFilters}
              currentVisibleFieldIds={visibleFieldIds}
              currentViewMode={view}
              fields={fields}
              onLoad={handleLoadView}
              onClose={() => setShowViewsMenu(false)}
              activeViewId={activeViewId}
              onViewUpdated={() => {}}
            />`,
'SavedViewsDropdown - activeViewId prop'
);

// 11. Add LinkedPeopleModal render before slide-out panel
replace(
`      {/* Slide-out panel */}
      {selected && (`,
`      {/* Linked People Modal */}
      {linkedPeopleModal && (
        <LinkedPeopleModal
          record={linkedPeopleModal.record}
          linkedInfo={linkedPeopleModal.linkedInfo}
          environment={environment}
          onClose={() => setLinkedPeopleModal(null)}
          onNavigate={(personId) => { setLinkedPeopleModal(null); onOpenRecord?.(personId); }}
        />
      )}

      {/* Slide-out panel */}
      {selected && (`,
'LinkedPeopleModal render'
);

// 12. TableView signature - add linkedPeopleCounts + onLinkedCountClick
replace(
`const TableView = ({
  fields, records, object, selectedIds, onToggleSelect, onToggleAll,
  onProfile, onSelect, onEdit, onDelete, onStageChange, onStatusUpdate,
  linkedJobs, colWidths, onResizeCol, onSort, sortBy, sortDir, statusOptions,
  session, environment, onColumnFilter,
}) => {`,
`const TableView = ({
  fields, records, object, selectedIds, onToggleSelect, onToggleAll,
  onProfile, onSelect, onEdit, onDelete, onStageChange, onStatusUpdate,
  linkedJobs, linkedPeopleCounts, onLinkedCountClick,
  colWidths, onResizeCol, onSort, sortBy, sortDir, statusOptions,
  session, environment, onColumnFilter,
}) => {`,
'TableView signature - linkedPeopleCounts'
);

// 13. _linked_count cell rendering in TableView
replace(
`                      : f.apiKey === '_stage'
                          ? <StagePill
                              linkInfo={linkedJobs?.[record.id]}
                              onStageChange={updated => onStageChange?.(record.id, updated)}
                            />
                          : f.isSystem`,
`                      : f.apiKey === '_linked_count'
                          ? (() => {
                              const info = linkedPeopleCounts?.[record.id];
                              if (!info || info.count === 0) return <span style={{ fontSize:12, color:C.text3 }}>—</span>;
                              return (
                                <button
                                  onClick={e => { e.stopPropagation(); onLinkedCountClick?.(record); }}
                                  style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px',
                                    borderRadius:99, border:'none', background:\`\${C.accent}14\`, color:C.accent,
                                    fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:F, transition:'background .12s' }}
                                  onMouseEnter={e => e.currentTarget.style.background=\`\${C.accent}28\`}
                                  onMouseLeave={e => e.currentTarget.style.background=\`\${C.accent}14\`}
                                  title="Click to see people by stage">
                                  <Ic n="users" s={11} c={C.accent}/>
                                  {info.count}
                                </button>
                              );
                            })()
                          : f.apiKey === '_stage'
                          ? <StagePill
                              linkInfo={linkedJobs?.[record.id]}
                              onStageChange={updated => onStageChange?.(record.id, updated)}
                            />
                          : f.isSystem`,
'TableView - _linked_count cell'
);

// 14. Pass linkedPeopleCounts + onLinkedCountClick to TableView
replace(
`              linkedJobs={linkedJobs}
              colWidths={colWidths}`,
`              linkedJobs={linkedJobs}
              linkedPeopleCounts={linkedPeopleCounts}
              onLinkedCountClick={(record) => {
                const info = linkedPeopleCounts[record.id];
                if (info?.count) setLinkedPeopleModal({ record, linkedInfo: info });
              }}
              colWidths={colWidths}`,
'TableView call - inject linkedPeopleCounts props'
);

// 15. SavedViewsDropdown view row - add rename + active badge + update button
replace(
`          <div key={view.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px",
            borderBottom:\`1px solid \${C.border}\`, cursor:"pointer", transition:"background .1s" }}
            onMouseEnter={e => e.currentTarget.style.background="#f8f9fc"}
            onMouseLeave={e => e.currentTarget.style.background="transparent"}>
            {/* Load button */}
            <div onClick={() => { onLoad(view); onClose(); }} style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:C.text1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{view.name}</div>`,
`          <div key={view.id} style={{ display:"flex", flexDirection:"column", padding:"9px 12px",
            borderBottom:\`1px solid \${C.border}\`, transition:"background .1s" }}
            onMouseEnter={e => e.currentTarget.style.background="#f8f9fc"}
            onMouseLeave={e => e.currentTarget.style.background="transparent"}>
            {editingId === view.id ? (
              <div style={{ display:"flex", gap:6, marginBottom:4 }}>
                <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key==="Enter") handleRename(view); if (e.key==="Escape") setEditingId(null); }}
                  style={{ ...ibs, flex:1 }} placeholder="List name…"/>
                <button onClick={() => handleRename(view)} style={{ padding:"4px 10px", borderRadius:7, border:"none", background:C.accent, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:F }}>Save</button>
                <button onClick={() => setEditingId(null)} style={{ padding:"4px 8px", borderRadius:7, border:\`1px solid \${C.border}\`, background:"transparent", fontSize:12, cursor:"pointer", fontFamily:F, color:C.text2 }}>✕</button>
              </div>
            ) : (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {/* Load button */}
            <div onClick={() => { onLoad(view); onClose(); }} style={{ flex:1, minWidth:0, cursor:"pointer" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ fontSize:13, fontWeight:600, color: activeViewId===view.id ? C.accent : C.text1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{view.name}</div>
                {activeViewId===view.id && <span style={{ fontSize:10, fontWeight:700, color:C.accent, background:\`\${C.accent}14\`, padding:"1px 6px", borderRadius:99, flexShrink:0 }}>active</span>}
              </div>`,
'SavedViewsDropdown - view row start'
);

replace(
`                {(view.created_by === userId) && (
                  <button onClick={e => { e.stopPropagation(); handleDelete(view.id); }}
                    style={{ background:"none", border:"none", padding:4, borderRadius:6, cursor:"pointer",
                      color:deleting===view.id ? "#ef4444" : C.text3, display:"flex" }}
                    disabled={deleting===view.id}>
                    <Ic n="trash" s={12}/>
                  </button>
                )}
            </div>
          </div>`,
`                {/* Rename */}
                <button onClick={e => { e.stopPropagation(); setEditingId(view.id); setEditName(view.name); }}
                  style={{ background:"none", border:"none", padding:4, borderRadius:6, cursor:"pointer", color:C.text3, display:"flex" }} title="Rename">
                  <Ic n="edit" s={12}/>
                </button>
                {(view.created_by === userId) && (
                  <button onClick={e => { e.stopPropagation(); handleDelete(view.id); }}
                    style={{ background:"none", border:"none", padding:4, borderRadius:6, cursor:"pointer",
                      color:deleting===view.id ? "#ef4444" : C.text3, display:"flex" }}
                    disabled={deleting===view.id}>
                    <Ic n="trash" s={12}/>
                  </button>
                )}
            </div>
            </div>
            )}
            {activeViewId === view.id && !editingId && (
              <button onClick={e => { e.stopPropagation(); handleUpdateList(view); }} disabled={updating}
                style={{ marginTop:6, width:"100%", padding:"5px 10px", borderRadius:8,
                  border:\`1.5px solid \${C.accent}\`, background:\`\${C.accent}08\`, color:C.accent,
                  fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:F,
                  display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                <Ic n="save" s={11} c={C.accent}/>
                {updating ? "Saving…" : "Update list with current filters & columns"}
              </button>
            )}
          </div>`,
'SavedViewsDropdown - view row end + update button'
);

fs.writeFileSync(FILE, src, 'utf8');
console.log('\n✅ Records.jsx patched successfully.');
