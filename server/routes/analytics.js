// server/routes/analytics.js — Predictive analytics engine
const express = require('express');
const router = express.Router();
const { query, getStore } = require('../db/init');

const daysBetween = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));
const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const percentile = (arr, p) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.max(0, Math.ceil((p / 100) * s.length) - 1)];
};

// GET /api/analytics/job-insights?job_id=xxx
router.get('/job-insights', (req, res) => {
  try {
    const { job_id, environment_id } = req.query;
    if (!job_id) return res.status(400).json({ error: 'job_id required' });
    const store = getStore();
    const records = store.records || [];
    const peopleLinks = store.people_links || [];
    const workflows = store.workflows || [];
    const workflowSteps = store.workflow_steps || [];
    const wfAssignments = store.record_workflow_assignments || [];
    const comms = store.communications || [];
    const offers = store.offers || [];
    const objects = store.object_definitions || store.objects || [];

    const job = records.find(r => r.id === job_id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const jobData = job.data || {};
    const envId = job.environment_id || environment_id;
    const peopleObj = objects.find(o => o.slug === 'people' && o.environment_id === envId);

    // ── 1. Time to Fill ─────────────────────────────────────────────
    const allJobs = records.filter(r => r.object_id === job.object_id && r.environment_id === envId && !r.deleted_at);
    const completedJobs = allJobs.filter(j => ['Filled','Closed'].includes(j.data?.status));
    const similarCompleted = completedJobs.filter(j => {
      let score = 0;
      if (j.data?.department === jobData.department) score += 3;
      if (j.data?.employment_type === jobData.employment_type) score += 1;
      if (j.data?.location === jobData.location) score += 1;
      return score >= 2;
    });
    const calcTtf = (jobs) => jobs.map(j => daysBetween(j.data?.open_date || j.created_at, j.updated_at || j.created_at)).filter(d => d > 0 && d < 365);
    const ttfDays = calcTtf(completedJobs);
    const similarTtfDays = calcTtf(similarCompleted);
    const useDays = similarTtfDays.length >= 3 ? similarTtfDays : ttfDays;
    const daysOpen = jobData.open_date ? daysBetween(jobData.open_date, new Date().toISOString()) : daysBetween(job.created_at, new Date().toISOString());
    const estDays = median(useDays);
    let onTrack = null;
    if (estDays && daysOpen) { const r = daysOpen / estDays; onTrack = r <= 0.7 ? 'ahead' : r <= 1.0 ? 'on_track' : r <= 1.3 ? 'at_risk' : 'overdue'; }
    const timeToFill = { estimated_days: estDays, p25: percentile(useDays, 25), p75: percentile(useDays, 75), sample_size: useDays.length, basis: similarTtfDays.length >= 3 ? 'similar_roles' : 'all_roles', confidence: useDays.length >= 10 ? 'high' : useDays.length >= 5 ? 'medium' : useDays.length >= 3 ? 'low' : 'insufficient', days_open: daysOpen, on_track: onTrack };

    // ── 2. Linked Person Process (candidates moving through stages) ──
    // Find people linked to this job via people_links
    const jobLinks = peopleLinks.filter(l => l.target_record_id === job_id);

    // Find the linked-person workflow assignment for this job
    // Assignment type is 'people_link' (not 'pipeline' which is for record status)
    const wfA = wfAssignments.find(a => a.record_id === job_id && a.type === 'people_link');
    const wf = wfA ? workflows.find(w => w.id === wfA.workflow_id) : null;

    // Steps are in the workflow_steps table, not inline on the workflow
    const steps = wf ? workflowSteps.filter(s => s.workflow_id === wf.id).sort((a,b) => a.order - b.order) : [];

    const stageCounts = {}, stageDurations = {};
    steps.forEach(s => { stageCounts[s.name] = 0; stageDurations[s.name] = []; });

    jobLinks.forEach(link => {
      // People links use stage_name (not current_step)
      const stage = link.stage_name || steps[0]?.name || 'Unknown';
      if (stageCounts[stage] !== undefined) stageCounts[stage]++;
      // Use updated_at as proxy for when they entered this stage
      const entered = link.updated_at || link.created_at;
      if (entered && stageDurations[stage]) stageDurations[stage].push(daysBetween(entered, new Date().toISOString()));
    });

    // Environment-wide stage duration averages for comparison
    const allEnvLinks = peopleLinks.filter(l => {
      const rec = records.find(r => r.id === l.target_record_id);
      return rec && rec.environment_id === envId;
    });
    const envStageDurations = {};
    allEnvLinks.forEach(link => {
      const stage = link.stage_name;
      if (!stage) return;
      const entered = link.updated_at || link.created_at;
      if (entered) {
        if (!envStageDurations[stage]) envStageDurations[stage] = [];
        envStageDurations[stage].push(daysBetween(entered, new Date().toISOString()));
      }
    });

    const processStages = steps.map(s => {
      const count = stageCounts[s.name] || 0;
      const durs = stageDurations[s.name] || [];
      const envDurs = envStageDurations[s.name] || [];
      const avgD = durs.length ? Math.round(durs.reduce((a,b)=>a+b,0)/durs.length) : null;
      const envAvgD = envDurs.length >= 3 ? Math.round(envDurs.reduce((a,b)=>a+b,0)/envDurs.length) : null;
      let health = 'normal';
      if (avgD && envAvgD) { if (avgD > envAvgD * 2) health = 'bottleneck'; else if (avgD > envAvgD * 1.5) health = 'slow'; else if (avgD < envAvgD * 0.5) health = 'fast'; }
      return { name: s.name, count, avg_days: avgD, env_avg_days: envAvgD, health };
    });

    // Conversion rates between stages
    const convRates = [];
    for (let i = 0; i < processStages.length - 1; i++) {
      const atOrPast = jobLinks.filter(l => {
        const si = steps.findIndex(s => s.name === (l.stage_name || steps[0]?.name));
        return si >= i;
      }).length;
      const pastTo = jobLinks.filter(l => {
        const si = steps.findIndex(s => s.name === (l.stage_name || steps[0]?.name));
        return si >= i + 1;
      }).length;
      convRates.push({ from: processStages[i].name, to: processStages[i+1].name, rate: atOrPast > 0 ? Math.round((pastTo/atOrPast)*100) : null });
    }
    const bottlenecks = processStages.filter(s => s.health==='bottleneck'||s.health==='slow').map(s => ({
      stage: s.name, severity: s.health, avg_days: s.avg_days, env_avg_days: s.env_avg_days,
      message: `${s.name} averaging ${s.avg_days}d vs ${s.env_avg_days}d norm`
    }));
    const process_flow = { total_candidates: jobLinks.length, workflow_name: wf?.name || null, stages: processStages, conversion_rates: convRates, bottlenecks };

    // ── 3. Candidate Drop-off Risk ──────────────────────────────────
    const candidateRisk = jobLinks.map(link => {
      const person = records.find(r => r.id === link.person_record_id);
      if (!person) return null;
      const pData = person.data || {};
      const name = [pData.first_name, pData.last_name].filter(Boolean).join(' ') || pData.email || 'Unknown';
      const lastComm = comms.filter(c => c.record_id === link.person_record_id).sort((a,b) => new Date(b.created_at)-new Date(a.created_at))[0];
      const daysSinceComm = lastComm ? daysBetween(lastComm.created_at, new Date().toISOString()) : 999;
      const entered = link.updated_at || link.created_at;
      const daysInStage = entered ? daysBetween(entered, new Date().toISOString()) : 0;
      const curStage = link.stage_name || steps[0]?.name || 'Unknown';
      const envAvg = envStageDurations[curStage] ? median(envStageDurations[curStage]) : null;
      let rs = 0; const factors = [];
      if (daysSinceComm > 14) { rs += 35; factors.push('No contact for ' + daysSinceComm + ' days'); }
      else if (daysSinceComm > 7) { rs += 20; factors.push('Last contact ' + daysSinceComm + ' days ago'); }
      if (envAvg && daysInStage > envAvg * 2) { rs += 30; factors.push(`${daysInStage}d in ${curStage} (avg ${Math.round(envAvg)}d)`); }
      else if (envAvg && daysInStage > envAvg * 1.5) { rs += 15; factors.push(`Slightly long in ${curStage}`); }
      if (!lastComm) { rs += 20; factors.push('No communications recorded'); }
      const inb = comms.filter(c => c.record_id === link.person_record_id && c.direction === 'inbound');
      if (inb.length === 0 && daysSinceComm < 999) { rs += 10; factors.push('No inbound responses'); }
      return { person_id: link.person_record_id, name, stage: curStage, risk_score: Math.min(100, rs), risk_level: rs >= 60 ? 'high' : rs >= 30 ? 'medium' : 'low', factors, days_in_stage: daysInStage, days_since_contact: daysSinceComm === 999 ? null : daysSinceComm };
    }).filter(Boolean).sort((a, b) => b.risk_score - a.risk_score);

    // ── 4. Source Effectiveness ──────────────────────────────────────
    const sourceStats = {};
    if (peopleObj) {
      records.filter(r => r.object_id === peopleObj.id && r.environment_id === envId && !r.deleted_at).forEach(p => {
        const src = p.data?.source || 'Unknown';
        if (!sourceStats[src]) sourceStats[src] = { source: src, total: 0, linked: 0, interviewed: 0, hired: 0 };
        sourceStats[src].total++;
        if (peopleLinks.some(l => l.person_record_id === p.id)) sourceStats[src].linked++;
        peopleLinks.filter(l => l.person_record_id === p.id).forEach(l => {
          const si = steps.findIndex(s => s.name === l.stage_name);
          if (si >= 2) sourceStats[src].interviewed++;
          if (l.stage_name === 'Hired' || l.stage_name === 'Placed') sourceStats[src].hired++;
        });
      });
    }
    const sourceEffectiveness = Object.values(sourceStats).map(s => ({ ...s, link_rate: s.total > 0 ? Math.round((s.linked/s.total)*100) : 0, hire_rate: s.linked > 0 ? Math.round((s.hired/s.linked)*100) : 0 })).sort((a,b) => b.total - a.total);

    // ── 5. Offer Insights ───────────────────────────────────────────
    const jobOffers = offers.filter(o => o.job_id === job_id);
    const offerInsights = { total: jobOffers.length, accepted: jobOffers.filter(o=>o.status==='accepted').length, declined: jobOffers.filter(o=>o.status==='declined').length, pending: jobOffers.filter(o=>['draft','pending_approval','sent'].includes(o.status)).length, avg_salary: jobOffers.length > 0 ? Math.round(jobOffers.reduce((s,o)=>s+(o.base_salary||0),0)/jobOffers.length) : null, acceptance_rate: jobOffers.length > 0 ? Math.round((jobOffers.filter(o=>o.status==='accepted').length/jobOffers.length)*100) : null };

    // ── 6. Summary ──────────────────────────────────────────────────
    const summaryPoints = [];
    if (onTrack === 'overdue') summaryPoints.push(`This role has been open for ${daysOpen} days — ${Math.round((daysOpen/estDays-1)*100)}% longer than typical.`);
    else if (onTrack === 'ahead') summaryPoints.push(`Progressing well — ${daysOpen} days open vs estimated ${estDays} days.`);
    else if (onTrack === 'on_track' && estDays) summaryPoints.push(`On track — ${daysOpen} of estimated ${estDays} days.`);
    if (bottlenecks.length > 0) summaryPoints.push(`Bottleneck: ${bottlenecks[0].message}.`);
    const highRisk = candidateRisk.filter(c => c.risk_level === 'high');
    if (highRisk.length > 0) summaryPoints.push(`${highRisk.length} candidate${highRisk.length>1?'s':''} at high drop-off risk.`);
    if (process_flow.total_candidates === 0) summaryPoints.push('No candidates currently linked to this role.');
    else summaryPoints.push(`${process_flow.total_candidates} candidate${process_flow.total_candidates>1?'s':''} in the ${wf?.name || 'hiring'} process.`);

    res.json({
      job_id,
      job_title: jobData.job_title || 'Untitled',
      department: jobData.department,
      status: jobData.status,
      time_to_fill: timeToFill,
      process: process_flow,
      candidate_risk: candidateRisk,
      source_effectiveness: sourceEffectiveness,
      offers: offerInsights,
      summary: summaryPoints,
      generated_at: new Date().toISOString(),
    });
  } catch (err) { console.error('[analytics]', err); res.status(500).json({ error: err.message }); }
});

module.exports = router;
