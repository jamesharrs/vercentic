const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'client/src/Interviews.jsx');
let src = fs.readFileSync(FILE, 'utf8');
let changes = 0;

function patch(description, from, to) {
  if (src.includes(from)) {
    src = src.replace(from, to);
    changes++;
    console.log('✅ ' + description);
  } else {
    console.log('⚠️  SKIP (not found): ' + description);
  }
}

// 1. Add allTypes prop to ScheduleModal
patch('Add allTypes prop',
  'const ScheduleModal = ({ interviewType, envId, onSave, onClose, initialValues }) => {',
  'const ScheduleModal = ({ interviewType, allTypes, envId, onSave, onClose, initialValues }) => {'
);

// 2. Add selectedType state after isEdit
patch('Add selectedType state',
  `  const isEdit = !!initialValues?.id;
  const [form, setForm] = useState({`,
  `  const isEdit = !!initialValues?.id;

  const [selectedTypeId, setSelectedTypeId] = useState(
    interviewType?.id || (allTypes?.length === 1 ? allTypes[0]?.id : null)
  );
  const activeType = selectedTypeId
    ? (allTypes || []).find(t => t.id === selectedTypeId) || interviewType
    : interviewType;

  const [form, setForm] = useState({`
);

// 3. Use activeType for interviewers default
patch('Use activeType for interviewers',
  '    interviewers: initialValues?.interviewers || interviewType?.interviewers || [],',
  '    interviewers: initialValues?.interviewers || activeType?.interviewers || [],');

// 4. Inject template picker before Candidate field
const ANCHOR = '{/* Candidate */}';
const PICKER = `{/* Template picker */}
          {!isEdit && allTypes && allTypes.length > 0 && (
            <div style={{marginBottom:20}}>
              <label style={labelSt}>Interview Template</label>
              <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:4}}>
                <label style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
                  borderRadius:10,border:\`1.5px solid \${selectedTypeId===null?"#8B7EC8":C.border}\`,
                  background:selectedTypeId===null?"#f7f4ff":C.surface,cursor:"pointer"}}>
                  <input type="radio" name="sched-type" checked={selectedTypeId===null}
                    onChange={()=>{setSelectedTypeId(null);set("interviewers",[]);}}
                    style={{accentColor:"#8B7EC8"}}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.text1}}>Manual (no template)</div>
                    <div style={{fontSize:11,color:C.text3}}>Set all details manually</div>
                  </div>
                </label>
                {allTypes.map(t => {
                  const ICONS = {"Video Call":"🎥","Phone":"📞","In Person":"🏢","Panel":"👥","Technical":"💻"};
                  const icon = ICONS[t.interview_format||t.format] || "📅";
                  const sel = selectedTypeId === t.id;
                  return (
                    <label key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
                      borderRadius:10,border:\`1.5px solid \${sel?"#8B7EC8":C.border}\`,
                      background:sel?"#f7f4ff":C.surface,cursor:"pointer"}}>
                      <input type="radio" name="sched-type" checked={sel}
                        onChange={()=>{setSelectedTypeId(t.id);set("interviewers",t.interviewers||[]);}}
                        style={{accentColor:"#8B7EC8"}}/>
                      <div style={{width:32,height:32,borderRadius:8,background:\`\${t.color||"#8B7EC8"}18\`,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                        {icon}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:C.text1}}>{t.name}</div>
                        <div style={{fontSize:11,color:C.text3,display:"flex",gap:8,marginTop:2}}>
                          {t.duration&&<span>⏱ {t.duration} min</span>}
                          {(t.interview_format||t.format)&&<span>· {t.interview_format||t.format}</span>}
                          {t.interviewers?.length>0&&<span>· {t.interviewers.length} interviewer{t.interviewers.length!==1?"s":""}</span>}
                        </div>
                      </div>
                      {sel&&<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#8B7EC8" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          `;
patch('Inject template picker UI', ANCHOR, PICKER + ANCHOR);

// 5. Use activeType in modal header
patch('Use activeType in header',
  `{interviewType?.name} · {interviewType?.duration||30} min`,
  `{activeType?.name ? \`\${activeType.name} · \` : ""}{activeType?.duration||30} min`
);

// 6. Pass allTypes to scheduleFor modal
patch('Pass allTypes to scheduleFor',
  '{scheduleFor && <ScheduleModal interviewType={scheduleFor} envId={envId} onSave={handleSchedule} onClose={()=>setScheduleFor(null)}/>}',
  '{scheduleFor && <ScheduleModal interviewType={scheduleFor} allTypes={types} envId={envId} onSave={handleSchedule} onClose={()=>setScheduleFor(null)}/>}'
);

// 7. Pass allTypes to editScheduled modal
patch('Pass allTypes to editScheduled',
  `onSave={handleUpdateScheduled}
        onClose={()=>setEditScheduled(null)}
      />}`,
  `allTypes={types}
        onSave={handleUpdateScheduled}
        onClose={()=>setEditScheduled(null)}
      />}`
);

// 8. Use activeType in onSave payload
patch('Use activeType in onSave payload',
  `interview_type_id:   interviewType?.id,
      interview_type_name: interviewType?.name,
      duration:            interviewType?.duration || 30,
      interview_format:    interviewType?.interview_format || interviewType?.format || "Video Call",`,
  `interview_type_id:   activeType?.id || null,
      interview_type_name: activeType?.name || "Interview",
      duration:            activeType?.duration || 30,
      interview_format:    activeType?.interview_format || activeType?.format || "Video Call",`
);

fs.writeFileSync(FILE, src, 'utf8');
console.log(`\nDone — ${changes} change(s) applied to Interviews.jsx`);
