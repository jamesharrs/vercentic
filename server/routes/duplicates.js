'use strict';
const express = require('express');
const router  = express.Router();
const { query, findOne } = require('../db/init');

function similarity(a, b) {
  if (!a || !b) return 0;
  a = String(a).toLowerCase().trim(); b = String(b).toLowerCase().trim();
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const longer = a.length > b.length ? a : b, shorter = a.length > b.length ? b : a;
  if (longer.includes(shorter)) return shorter.length / longer.length;
  let m = 0; for (let i = 0; i < shorter.length; i++) if (longer.includes(shorter[i])) m++;
  return m / longer.length;
}

function duplicateScore(a, b) {
  const ad = a.data||{}, bd = b.data||{};
  let score = 0; const reasons = [];
  if (ad.email && bd.email && ad.email.toLowerCase() === bd.email.toLowerCase()) { score += 90; reasons.push('Same email'); }
  const aP = (ad.phone||'').replace(/\D/g,''), bP = (bd.phone||'').replace(/\D/g,'');
  if (aP.length >= 7 && aP === bP) { score += 70; reasons.push('Same phone'); }
  const aN = `${ad.first_name||''} ${ad.last_name||''}`.trim().toLowerCase();
  const bN = `${bd.first_name||''} ${bd.last_name||''}`.trim().toLowerCase();
  if (aN && bN) { const s = similarity(aN, bN); if (s===1){score+=40;reasons.push('Identical name');}else if(s>0.8){score+=20;reasons.push('Similar name');} }
  const aL=(ad.linkedin_url||'').toLowerCase().replace(/\/$/,''), bL=(bd.linkedin_url||'').toLowerCase().replace(/\/$/,'');
  if (aL && bL && aL===bL) { score+=80; reasons.push('Same LinkedIn'); }
  return { score: Math.min(score, 100), reasons };
}

router.get('/check', (req, res) => {
  try {
    const { record_id, environment_id, threshold=40 } = req.query;
    if (!record_id) return res.status(400).json({ error:'record_id required' });
    const record = findOne('records', r => r.id === record_id);
    if (!record) return res.status(404).json({ error:'Not found' });
    const candidates = query('records', r => r.id !== record_id && r.object_id === record.object_id && (!environment_id || r.environment_id === environment_id) && !r.deleted_at);
    const results = candidates.map(c => ({ ...duplicateScore(record, c), record:c })).filter(r => r.score >= Number(threshold)).sort((a,b)=>b.score-a.score).slice(0,10).map(({score,reasons,record:r})=>({id:r.id,score,reasons,data:r.data,created_at:r.created_at}));
    res.json({ record_id, duplicates:results });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

router.post('/scan', (req, res) => {
  try {
    const { environment_id, object_id, threshold=50 } = req.body;
    if (!environment_id || !object_id) return res.status(400).json({ error:'environment_id and object_id required' });
    const records = query('records', r => r.object_id===object_id && r.environment_id===environment_id && !r.deleted_at);
    const pairs = []; const seen = new Set();
    for (let i=0;i<records.length;i++) for (let j=i+1;j<records.length;j++) {
      const k=[records[i].id,records[j].id].sort().join('|');
      if (seen.has(k)) continue; seen.add(k);
      const { score, reasons } = duplicateScore(records[i], records[j]);
      if (score >= Number(threshold)) pairs.push({ score, reasons, record_a:records[i], record_b:records[j] });
    }
    pairs.sort((a,b)=>b.score-a.score);
    res.json({ total:pairs.length, pairs:pairs.slice(0,100) });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

router.post('/merge', (req, res) => {
  try {
    const { keep_id, discard_id, merge_strategy='keep_primary' } = req.body;
    if (!keep_id || !discard_id) return res.status(400).json({ error:'keep_id and discard_id required' });
    const { getStore, saveStore } = require('../db/init');
    const store = getStore();
    const ki = store.records.findIndex(r=>r.id===keep_id), di = store.records.findIndex(r=>r.id===discard_id);
    if (ki<0||di<0) return res.status(404).json({ error:'Record(s) not found' });
    if (merge_strategy==='fill_missing') store.records[ki].data = { ...store.records[di].data, ...store.records[ki].data };
    ['communications','record_notes','attachments','people_links','offers','interviews'].forEach(t=>{
      if (!store[t]) return;
      store[t].forEach((item,idx)=>{
        if(item.record_id===discard_id) store[t][idx].record_id=keep_id;
        if(item.candidate_id===discard_id) store[t][idx].candidate_id=keep_id;
        if(item.person_record_id===discard_id) store[t][idx].person_record_id=keep_id;
      });
    });
    store.records[di].deleted_at=new Date().toISOString(); store.records[di].merged_into=keep_id;
    if (!store.record_notes) store.record_notes=[];
    store.record_notes.push({ id:require('crypto').randomUUID(), record_id:keep_id, content:`Merged with duplicate (ID: ${discard_id}). Strategy: ${merge_strategy}.`, created_by:'system', created_at:new Date().toISOString() });
    saveStore(store);
    res.json({ ok:true, kept:keep_id, discarded:discard_id });
  } catch(err) { res.status(500).json({ error:err.message }); }
});

module.exports = router;
