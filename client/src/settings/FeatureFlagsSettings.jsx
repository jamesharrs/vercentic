import { useState, useEffect } from 'react';
import { invalidateFlagCache } from '../FeatureFlags.jsx';
import { useFeatures } from '../hooks/useFeature.jsx';
import { authHeaders } from '../apiClient.js';

const F = "'Geist', -apple-system, sans-serif";
const C = { accent:'#4361EE', text1:'#1a1a2e', text2:'#4b5563', text3:'#9ca3af', border:'#e5e7eb', surface:'#ffffff' };

const FLAG_GROUPS = {
  'Core Features':  ['ai_copilot','ai_matching','communications_panel','workflows','portals','reports','org_chart','interviews','offers','forms','bulk_actions','cv_parsing','duplicate_detection'],
  'Navigation':     ['access_calendar','access_search','access_chat','access_documents'],
  'Record Panels':  ['panel_notes','panel_files','panel_activity','panel_forms','panel_recommendations','panel_linked_records','panel_tasks','panel_assessments','panel_engagement','panel_reporting','panel_agents','panel_user','panel_insights','panel_questions'],
  'Beta Features':  ['linkedin_finder','document_extraction'],
  'Experimental':   ['voice_copilot','predictive_analytics','auto_screening'],
};

const FLAG_LABELS = {
  ai_copilot:'AI Copilot', ai_matching:'AI Matching', communications_panel:'Communications Panel',
  workflows:'Workflows & Pipeline', portals:'Portal Builder', reports:'Reports', org_chart:'Org Chart',
  interviews:'Interview Scheduling', offers:'Offer Management', forms:'Forms Builder',
  bulk_actions:'Bulk Actions', cv_parsing:'CV Parsing', duplicate_detection:'Duplicate Detection',
  access_calendar:'Calendar', access_search:'Search', access_chat:'Chat', access_documents:'Documents',
  panel_notes:'Notes Panel', panel_files:'Files & Attachments Panel', panel_activity:'Activity Log Panel',
  panel_forms:'Forms Responses Panel', panel_recommendations:'AI Recommendations Panel',
  panel_linked_records:'Linked Records Panel',
  panel_tasks:'Tasks & Reminders Panel', panel_assessments:'Assessments Panel',
  panel_engagement:'Engagement Score Panel', panel_reporting:'Reporting Panel',
  panel_agents:'AI Agents Panel', panel_user:'Platform User Panel',
  panel_insights:'Insights Panel', panel_questions:'Screening & Interview Questions Panel',
  linkedin_finder:'LinkedIn Finder', document_extraction:'Document AI Extraction',
  voice_copilot:'Voice Copilot', predictive_analytics:'Predictive Analytics', auto_screening:'Auto Screening',
};

const FLAG_DESC = {
  ai_copilot:'Chat assistant with record creation and AI actions',
  ai_matching:'AI-powered candidate-to-job matching scores',
  communications_panel:'Email, SMS, WhatsApp, and call logging on records',
  workflows:'Pipeline stages and automation workflows',
  portals:'Career site and external portal builder',
  reports:'Report builder with charts and formula support',
  org_chart:'Visual org chart with people and company structure',
  interviews:'Interview scheduling and scorecards',
  offers:'Offer letters with multi-step approval chains',
  forms:'Custom forms for screening and surveys',
  bulk_actions:'Select multiple records for bulk operations',
  cv_parsing:'Extract candidate data from uploaded CVs',
  duplicate_detection:'Detect and merge duplicate records',
  access_calendar:'Calendar view for interviews and tasks',
  access_search:'Global search across all records',
  access_chat:'Internal team chat and messaging',
  access_documents:'Document management and storage',
  panel_notes:'Notes and comments panel on all records',
  panel_files:'File attachments panel on all records',
  panel_activity:'Activity log and audit history on records',
  panel_forms:'Form responses panel on records',
  panel_recommendations:'AI-powered job/candidate recommendations panel (requires AI Matching)',
  panel_linked_records:'Linked records and relationships panel',
  panel_pipeline:'Pipeline stages and linked people panel',
  panel_tasks:'Tasks and reminders panel on records',
  panel_assessments:'Candidate assessments panel on person records',
  panel_engagement:'Engagement score and activity breakdown on person records',
  panel_reporting:'Reporting relationships panel on person records',
  panel_agents:'AI Agents panel for automated actions on records',
  panel_user:'Platform user account panel on person records',
  panel_insights:'Hiring insights and analytics panel on job records',
  panel_questions:'Screening and interview questions panel on job records',
  linkedin_finder:'Auto-search LinkedIn profiles for new candidates',
  document_extraction:'AI extraction from ID and passport documents',
  voice_copilot:'Voice-activated copilot (experimental)',
  predictive_analytics:'AI-powered hiring predictions',
  auto_screening:'Automatic candidate screening',
};

export default function FeatureFlagsSettings({ environment }) {
  const [flags, setFlags]   = useState([]);
  const [saving, setSaving] = useState(null);
  const [loading, setLoading] = useState(true);
  const { refresh: refreshFeatureCtx } = useFeatures(); // live context refresh

  const load = async (silent = false) => {
    if (!environment?.id) return;
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/feature-flags/all?environment_id=${environment.id}`, { headers: authHeaders() });
      if (res.ok) setFlags((await res.json()).flags || []);
    } finally { if (!silent) setLoading(false); }
  };
  useEffect(() => { load(); }, [environment?.id]);

  const toggle = async (key, currentlyEnabled) => {
    // Optimistic update — flip immediately so the toggle feels instant and scroll doesn't jump
    setFlags(prev => prev.map(f => f.key === key
      ? { ...f, enabled: !currentlyEnabled, overridden: true }
      : f
    ));
    setSaving(key);
    try {
      const res = await fetch(`/api/feature-flags/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', ...authHeaders() },
        body: JSON.stringify({ environment_id: environment.id, enabled: !currentlyEnabled }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Feature flag toggle failed:', err);
        // Revert optimistic update on failure
        setFlags(prev => prev.map(f => f.key === key
          ? { ...f, enabled: currentlyEnabled }
          : f
        ));
        setSaving(null);
        return;
      }
      invalidateFlagCache();
      // Silent background refresh to sync server state — no loading flash, no scroll reset
      load(true);
      try { await refreshFeatureCtx(); } catch {}
    } catch (e) {
      console.error('Feature flag toggle error:', e);
      // Revert on error
      setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: currentlyEnabled } : f));
    }
    setSaving(null);
  };

  const reset = async (key) => {
    setSaving(key);
    await fetch(`/api/feature-flags/${key}?environment_id=${environment.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    invalidateFlagCache();
    await load();
    await refreshFeatureCtx();
    setSaving(null);
  };

  const flagMap = Object.fromEntries(flags.map(f => [f.key, f]));
  if (loading) return <div style={{ padding:32, color:C.text3, fontFamily:F }}>Loading flags…</div>;

  // Bulk toggle — set all keys in a group (or all keys) to enabled/disabled
  const [bulkSaving, setBulkSaving] = useState(false);
  const toggleAll = async (keys, enable) => {
    setBulkSaving(true);
    // Optimistic update
    setFlags(prev => prev.map(f => keys.includes(f.key) ? { ...f, enabled: enable, overridden: true } : f));
    try {
      await Promise.all(keys.map(key =>
        fetch(`/api/feature-flags/${key}`, {
          method: 'PUT',
          headers: { 'Content-Type':'application/json', ...authHeaders() },
          body: JSON.stringify({ environment_id: environment.id, enabled: enable }),
        })
      ));
      invalidateFlagCache();
      load(true);
      try { await refreshFeatureCtx(); } catch {}
    } catch (e) {
      console.error('Bulk toggle error:', e);
      load(true); // revert to server state on error
    }
    setBulkSaving(false);
  };

  const allKeys = Object.values(FLAG_GROUPS).flat();
  const allEnabled  = allKeys.every(k => (flagMap[k]?.enabled ?? true));
  const allDisabled = allKeys.every(k => !(flagMap[k]?.enabled ?? true));

  const BulkBtn = ({ onClick, children, danger }) => (
    <button type="button" onClick={onClick} disabled={bulkSaving}
      style={{ padding:'4px 10px', borderRadius:6, border:`1px solid ${danger ? '#fca5a5' : C.border}`,
        background: danger ? '#fef2f2' : '#f8f9fc', color: danger ? '#dc2626' : C.text2,
        fontSize:11, fontWeight:600, cursor: bulkSaving ? 'not-allowed' : 'pointer',
        fontFamily:F, transition:'all .15s', opacity: bulkSaving ? 0.5 : 1 }}>
      {children}
    </button>
  );

  return (
    <div style={{ maxWidth:760, fontFamily:F }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
          <div>
            <h2 style={{ margin:'0 0 6px', fontSize:18, fontWeight:700, color:C.text1 }}>Feature Flags</h2>
            <p style={{ margin:0, fontSize:13, color:C.text2, lineHeight:1.6 }}>
              Control which features are enabled for <strong>{environment?.name || 'this environment'}</strong>.
              Changes take effect immediately across the app.
            </p>
          </div>
          <div style={{ display:'flex', gap:6, flexShrink:0, paddingTop:2 }}>
            <BulkBtn onClick={() => toggleAll(allKeys, true)} disabled={allEnabled}>Enable all</BulkBtn>
            <BulkBtn onClick={() => toggleAll(allKeys, false)} danger disabled={allDisabled}>Disable all</BulkBtn>
          </div>
        </div>
      </div>
      {Object.entries(FLAG_GROUPS).map(([group, keys]) => {
        const groupEnabled  = keys.every(k => (flagMap[k]?.enabled ?? true));
        const groupDisabled = keys.every(k => !(flagMap[k]?.enabled ?? true));
        return (
        <div key={group} style={{ marginBottom:28 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.text3, textTransform:'uppercase', letterSpacing:'0.08em' }}>{group}</div>
            <div style={{ display:'flex', gap:5 }}>
              <BulkBtn onClick={() => toggleAll(keys, true)} disabled={groupEnabled}>Enable all</BulkBtn>
              <BulkBtn onClick={() => toggleAll(keys, false)} danger disabled={groupDisabled}>Disable all</BulkBtn>
            </div>
          </div>
          <div style={{ background:C.surface, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden' }}>
            {keys.map((key, i) => {
              const f = flagMap[key];
              const enabled    = f?.enabled    ?? true;
              const overridden = f?.overridden  ?? false;
              const isSaving   = saving === key;
              return (
                <div key={key} style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 18px',
                  borderBottom: i < keys.length - 1 ? `1px solid ${C.border}` : 'none',
                  opacity: isSaving ? 0.6 : 1, transition:'opacity .15s' }}>
                  <button type="button" onClick={() => toggle(key, enabled)} disabled={isSaving}
                    style={{ width:40, height:22, borderRadius:11, border:'none', cursor:isSaving?'not-allowed':'pointer',
                      background: enabled ? C.accent : '#d1d5db', position:'relative', flexShrink:0, transition:'background .2s' }}>
                    <span style={{ position:'absolute', top:3, left: enabled ? 21 : 3, width:16, height:16,
                      borderRadius:8, background:'white', boxShadow:'0 1px 3px rgba(0,0,0,.2)', transition:'left .2s' }}/>
                  </button>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:14, fontWeight:600, color:C.text1 }}>{FLAG_LABELS[key] || key}</span>
                      {overridden && (
                        <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:99,
                          background:'#eff6ff', color:'#3b82f6', border:'1px solid #bfdbfe' }}>CUSTOM</span>
                      )}
                    </div>
                    <div style={{ fontSize:12, color:C.text3, marginTop:2 }}>{FLAG_DESC[key] || ''}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99,
                      background: enabled ? '#ecfdf5' : '#f9fafb',
                      color: enabled ? '#059669' : C.text3 }}>
                      {enabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}
