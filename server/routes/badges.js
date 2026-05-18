// server/routes/badges.js
// Vercentic — Gamification & Achievements Engine
// 30 badges · 8 categories · 4 tiers · engagement feed

'use strict';
const express  = require('express');
const router   = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getStore, saveStore, query, insert } = require('../db/init');

// ─── Badge Catalogue ──────────────────────────────────────────────────────────
const BADGE_CATALOGUE = [
  // ── ONBOARDING ──────────────────────────────────────────────────────────────
  { id:'ob1', name:'First Steps',      category:'Onboarding',       tier:'bronze',   points:10,  icon:'user',        color:'#f59f00',
    desc:'Log in for the first time',                                 condition:{ metric:'login_count',            threshold:1   }},
  { id:'ob2', name:'Explorer',         category:'Onboarding',       tier:'silver',   points:25,  icon:'compass',     color:'#f59f00',
    desc:'Visit 5 different sections of the platform',               condition:{ metric:'sections_visited',        threshold:5   }},
  { id:'ob3', name:'Power User',       category:'Onboarding',       tier:'gold',     points:75,  icon:'zap',         color:'#f59f00',
    desc:'Log in on 10 different days',                               condition:{ metric:'login_days',              threshold:10  }},
  // ── RECORDS ─────────────────────────────────────────────────────────────────
  { id:'rc1', name:'Data Entry',       category:'Records',          tier:'bronze',   points:10,  icon:'database',    color:'#3b82f6',
    desc:'Create your first record',                                  condition:{ metric:'records_created',         threshold:1   }},
  { id:'rc2', name:'Cataloguer',       category:'Records',          tier:'silver',   points:30,  icon:'layers',      color:'#3b82f6',
    desc:'Create 25 records',                                         condition:{ metric:'records_created',         threshold:25  }},
  { id:'rc3', name:'Data Champion',    category:'Records',          tier:'gold',     points:100, icon:'star',        color:'#3b82f6',
    desc:'Create 100 records',                                        condition:{ metric:'records_created',         threshold:100 }},
  { id:'rc4', name:'Architect',        category:'Records',          tier:'platinum', points:250, icon:'box',         color:'#3b82f6',
    desc:'Create 500 records',                                        condition:{ metric:'records_created',         threshold:500 }},
  // ── RECRUITING ──────────────────────────────────────────────────────────────
  { id:'rr1', name:'First Hire',       category:'Recruiting',       tier:'bronze',   points:50,  icon:'users',       color:'#8b5cf6',
    desc:'Mark a candidate as Hired for the first time',             condition:{ metric:'hires_made',              threshold:1   }},
  { id:'rr2', name:'Talent Scout',     category:'Recruiting',       tier:'silver',   points:100, icon:'target',      color:'#8b5cf6',
    desc:'Add 50 candidates to the platform',                         condition:{ metric:'candidates_added',        threshold:50  }},
  { id:'rr3', name:'Pipeline Builder', category:'Recruiting',       tier:'gold',     points:200, icon:'git-branch',  color:'#8b5cf6',
    desc:'Add 200 candidates',                                        condition:{ metric:'candidates_added',        threshold:200 }},
  { id:'rr4', name:'Headhunter',       category:'Recruiting',       tier:'platinum', points:500, icon:'award',       color:'#8b5cf6',
    desc:'Make 25 hires',                                             condition:{ metric:'hires_made',              threshold:25  }},
  // ── INTERVIEWS ──────────────────────────────────────────────────────────────
  { id:'iv1', name:'Scheduler',        category:'Interviews',       tier:'bronze',   points:15,  icon:'calendar',    color:'#0891b2',
    desc:'Schedule your first interview',                            condition:{ metric:'interviews_scheduled',    threshold:1   }},
  { id:'iv2', name:'Interview Pro',    category:'Interviews',       tier:'silver',   points:60,  icon:'clipboard',   color:'#0891b2',
    desc:'Schedule 10 interviews',                                    condition:{ metric:'interviews_scheduled',    threshold:10  }},
  { id:'iv3', name:'Panel Master',     category:'Interviews',       tier:'gold',     points:150, icon:'users',       color:'#0891b2',
    desc:'Schedule 50 interviews',                                    condition:{ metric:'interviews_scheduled',    threshold:50  }},
  { id:'iv4', name:'Scorecard Ace',    category:'Interviews',       tier:'silver',   points:40,  icon:'check',       color:'#0891b2',
    desc:'Submit 5 interview scorecards',                            condition:{ metric:'scorecards_submitted',    threshold:5   }},
  // ── OFFERS ──────────────────────────────────────────────────────────────────
  { id:'of1', name:'Offer Maker',      category:'Offers',           tier:'bronze',   points:25,  icon:'dollar',      color:'#059669',
    desc:'Create your first offer',                                   condition:{ metric:'offers_created',          threshold:1   }},
  { id:'of2', name:'Deal Closer',      category:'Offers',           tier:'silver',   points:100, icon:'heart',       color:'#059669',
    desc:'Have 5 offers accepted',                                    condition:{ metric:'offers_accepted',         threshold:5   }},
  { id:'of3', name:'Revenue Driver',   category:'Offers',           tier:'gold',     points:300, icon:'trending-up', color:'#059669',
    desc:'Have 25 offers accepted',                                   condition:{ metric:'offers_accepted',         threshold:25  }},
  // ── COMMUNICATIONS ──────────────────────────────────────────────────────────
  { id:'cm1', name:'Connector',        category:'Communications',   tier:'bronze',   points:10,  icon:'mail',        color:'#dc2626',
    desc:'Send your first communication',                            condition:{ metric:'total_comms',             threshold:1   }},
  { id:'cm2', name:'Communicator',     category:'Communications',   tier:'silver',   points:40,  icon:'message',     color:'#dc2626',
    desc:'Send 50 communications',                                    condition:{ metric:'total_comms',             threshold:50  }},
  { id:'cm3', name:'Network Builder',  category:'Communications',   tier:'gold',     points:120, icon:'link',        color:'#dc2626',
    desc:'Send 250 communications',                                   condition:{ metric:'total_comms',             threshold:250 }},
  { id:'cm4', name:'Call Closer',      category:'Communications',   tier:'silver',   points:50,  icon:'phone',       color:'#dc2626',
    desc:'Log 25 phone calls',                                        condition:{ metric:'calls_logged',            threshold:25  }},
  // ── AI USAGE ────────────────────────────────────────────────────────────────
  { id:'ai1', name:'AI Pioneer',       category:'AI & Copilot',     tier:'bronze',   points:20,  icon:'sparkles',    color:'#7c3aed',
    desc:'Use the Vercentic Copilot for the first time',             condition:{ metric:'copilot_uses',            threshold:1   }},
  { id:'ai2', name:'AI Collaborator',  category:'AI & Copilot',     tier:'silver',   points:75,  icon:'sparkles',    color:'#7c3aed',
    desc:'Complete 25 Copilot interactions',                          condition:{ metric:'copilot_uses',            threshold:25  }},
  { id:'ai3', name:'AI Native',        category:'AI & Copilot',     tier:'gold',     points:200, icon:'sparkles',    color:'#7c3aed',
    desc:'Complete 100 Copilot interactions',                         condition:{ metric:'copilot_uses',            threshold:100 }},
  { id:'ai4', name:'Agent Builder',    category:'AI & Copilot',     tier:'silver',   points:80,  icon:'bot',         color:'#7c3aed',
    desc:'Create 3 AI agents',                                        condition:{ metric:'agents_created',          threshold:3   }},
  // ── PLATFORM MASTERY ────────────────────────────────────────────────────────
  { id:'pm1', name:'Workflow Wizard',  category:'Platform Mastery', tier:'silver',   points:60,  icon:'workflow',    color:'#ea580c',
    desc:'Create 3 workflows',                                        condition:{ metric:'workflows_created',       threshold:3   }},
  { id:'pm2', name:'Form Builder',     category:'Platform Mastery', tier:'silver',   points:60,  icon:'clipboard',   color:'#ea580c',
    desc:'Create 5 forms',                                            condition:{ metric:'forms_created',           threshold:5   }},
  { id:'pm3', name:'Report Guru',      category:'Platform Mastery', tier:'gold',     points:120, icon:'bar-chart-2', color:'#ea580c',
    desc:'Create and save 10 reports',                                condition:{ metric:'reports_saved',           threshold:10  }},
  { id:'pm4', name:'Vercentic Master', category:'Platform Mastery', tier:'platinum', points:500, icon:'award',       color:'#ea580c',
    desc:'Earn 1,000 total points',                                   condition:{ metric:'total_points_proxy',      threshold:1000}},
];

// ─── Compute per-user metrics live from store ─────────────────────────────────
function computeMetrics(userId, store) {
  const activity   = store.activity_log        || [];
  const records    = store.records             || [];
  const interviews = store.interviews          || [];
  const scorecards = store.scorecards          || [];
  const offers     = store.offers              || [];
  const comms      = store.communications      || [];
  const workflows  = store.workflows           || [];
  const forms      = store.forms               || [];
  const savedViews = store.saved_views         || [];
  const agents     = store.agents              || [];
  const aiLogs     = store.ai_logs             || [];
  const users      = store.users               || [];
  const user       = users.find(u => u.id === userId);

  const myActivity = activity.filter(a => a.user_id === userId);
  const myRecords  = records.filter(r => r.created_by === userId && !r.deleted_at);

  const candidatesAdded = myRecords.filter(r => {
    const obj = (store.object_definitions || store.objects || []).find(o => o.id === r.object_id);
    return obj && (obj.slug === 'people' || obj.name?.toLowerCase() === 'person');
  }).length;

  const hires = myRecords.filter(r => {
    const s = (r.data?.status || r.data?.candidate_status || '').toLowerCase();
    return s === 'hired' || s === 'placement';
  }).length;

  const myInterviews  = interviews.filter(i =>
    (i.created_by === userId || (i.interviewers || []).includes(userId)) && !i.deleted_at
  );
  const myScorecards  = scorecards.filter(s => s.interviewer_id === userId || s.created_by === userId);
  const myOffers      = offers.filter(o => o.created_by === userId && !o.deleted_at);
  const myAccepted    = myOffers.filter(o => o.status === 'accepted').length;
  const myComms       = comms.filter(c => c.created_by === userId && !c.deleted_at);
  const calls         = myComms.filter(c => c.type === 'call').length;
  const copilotUses   = aiLogs.filter(a => a.user_id === userId && a.feature === 'copilot').length
    || myActivity.filter(a => a.action === 'copilot_message').length;
  const myAgents      = agents.filter(a => a.created_by === userId && !a.deleted_at).length;
  const myWorkflows   = workflows.filter(w => w.created_by === userId && !w.deleted_at).length;
  const myForms       = forms.filter(f => f.created_by === userId && !f.deleted_at).length;
  const myReports     = savedViews.filter(v => v.created_by === userId).length;
  const loginDays     = new Set(myActivity.filter(a => a.action === 'login').map(a => (a.created_at||'').slice(0,10))).size;
  const sections      = new Set(myActivity.filter(a => a.action === 'nav').map(a => a.detail)).size;

  const currentBadges = (store.user_badges || []).filter(b => b.user_id === userId);
  const pointsProxy   = currentBadges.reduce((s, b) => {
    const def = BADGE_CATALOGUE.find(d => d.id === b.badge_id);
    return s + (def?.points || 0);
  }, 0);

  return {
    login_count:            user?.login_count || Math.max(1, myActivity.filter(a=>a.action==='login').length),
    login_days:             loginDays || (user?.login_count ? Math.ceil(user.login_count/2) : 1),
    sections_visited:       sections  || 3,
    records_created:        myRecords.length,
    candidates_added:       candidatesAdded,
    hires_made:             hires,
    interviews_scheduled:   myInterviews.length,
    scorecards_submitted:   myScorecards.length,
    offers_created:         myOffers.length,
    offers_accepted:        myAccepted,
    total_comms:            myComms.length,
    calls_logged:           calls,
    copilot_uses:           copilotUses,
    agents_created:         myAgents,
    workflows_created:      myWorkflows,
    forms_created:          myForms,
    reports_saved:          myReports,
    total_points_proxy:     pointsProxy,
  };
}

function totalPoints(userId, store) {
  return (store.user_badges || [])
    .filter(b => b.user_id === userId)
    .reduce((sum, b) => {
      const def = BADGE_CATALOGUE.find(d => d.id === b.badge_id);
      return sum + (def?.points || 0);
    }, 0);
}

function checkAndAward(userId, store) {
  if (!store.user_badges) store.user_badges = [];
  const metrics      = computeMetrics(userId, store);
  const newlyAwarded = [];
  for (const badge of BADGE_CATALOGUE) {
    if (store.user_badges.some(b => b.user_id === userId && b.badge_id === badge.id)) continue;
    if ((metrics[badge.condition.metric] || 0) >= badge.condition.threshold) {
      const award = { id: uuidv4(), user_id: userId, badge_id: badge.id, awarded_at: new Date().toISOString() };
      store.user_badges.push(award);
      newlyAwarded.push({ ...badge, awarded_at: award.awarded_at });
    }
  }
  if (newlyAwarded.length > 0) saveStore(store);
  return newlyAwarded;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.get('/catalogue', (_req, res) => res.json(BADGE_CATALOGUE));

router.get('/leaderboard', (req, res) => {
  const store = getStore();
  const users = (store.users || []).filter(u => u.status !== 'deactivated');
  const ranked = users.map(u => {
    checkAndAward(u.id, store);
    const pts    = totalPoints(u.id, store);
    const badges = (store.user_badges || []).filter(b => b.user_id === u.id);
    const recentBadges = badges
      .sort((a,b) => new Date(b.awarded_at) - new Date(a.awarded_at)).slice(0,5)
      .map(b => { const def = BADGE_CATALOGUE.find(d => d.id === b.badge_id); return { ...def, awarded_at: b.awarded_at }; });
    return {
      id: u.id,
      name: `${u.first_name||''} ${u.last_name||''}`.trim() || u.email,
      email: u.email,
      role: u.role?.name || 'User',
      role_color: u.role?.color || '#6b7280',
      avatar_initials: `${(u.first_name||'?')[0]}${(u.last_name||'?')[0]}`.toUpperCase(),
      points: pts,
      badge_count: badges.length,
      recent_badges: recentBadges,
      metrics: computeMetrics(u.id, store),
      last_login: u.last_login || null,
    };
  });
  ranked.sort((a,b) => b.points - a.points);
  res.json(ranked);
});

router.get('/user/:userId', (req, res) => {
  const store  = getStore();
  const userId = req.params.userId;
  checkAndAward(userId, store);
  const awarded  = (store.user_badges || []).filter(b => b.user_id === userId);
  const metrics  = computeMetrics(userId, store);
  const result   = BADGE_CATALOGUE.map(badge => {
    const earn = awarded.find(b => b.badge_id === badge.id);
    const cur  = metrics[badge.condition.metric] || 0;
    const pct  = Math.min(100, Math.round((cur / badge.condition.threshold) * 100));
    return { ...badge, earned: !!earn, awarded_at: earn?.awarded_at || null, progress: { current: cur, threshold: badge.condition.threshold, pct } };
  });
  res.json({ user_id: userId, total_points: totalPoints(userId, store), badge_count: awarded.length, metrics, badges: result });
});

router.get('/engagement', (req, res) => {
  const { environment_id, limit = 50 } = req.query;
  const store = getStore();
  const users = store.users || [];
  const getUserName     = id => { const u = users.find(u=>u.id===id); return u ? `${u.first_name||''} ${u.last_name||''}`.trim()||u.email : 'Someone'; };
  const getUserInitials = id => { const u = users.find(u=>u.id===id); return u ? `${(u.first_name||'?')[0]}${(u.last_name||'?')[0]}`.toUpperCase() : '?'; };

  const events = [];

  (store.user_badges||[]).forEach(ub => {
    const badge = BADGE_CATALOGUE.find(b => b.id === ub.badge_id);
    if (!badge) return;
    events.push({ id: ub.id, type:'badge', user_id: ub.user_id, user_name: getUserName(ub.user_id), user_initials: getUserInitials(ub.user_id),
      timestamp: ub.awarded_at, title: `Earned "${badge.name}"`, subtitle: badge.desc,
      meta: { badge_id: badge.id, tier: badge.tier, points: badge.points, color: badge.color, icon: badge.icon } });
  });

  (store.records||[]).filter(r => !r.deleted_at && (!environment_id||r.environment_id===environment_id)).slice(-100).forEach(r => {
    const d   = r.data||{};
    const name = [d.first_name,d.last_name].filter(Boolean).join(' ')||d.job_title||d.name||d.pool_name||'a record';
    const obj  = (store.object_definitions||store.objects||[]).find(o=>o.id===r.object_id);
    events.push({ id:`rec_${r.id}`, type:'record', user_id: r.created_by||'', user_name: getUserName(r.created_by), user_initials: getUserInitials(r.created_by),
      timestamp: r.created_at, title: `Added ${name}`, subtitle: obj?.plural_name||'Record', meta: { color: obj?.color||'#4361EE' } });
  });

  (store.interviews||[]).filter(i=>!i.deleted_at&&(!environment_id||i.environment_id===environment_id)).slice(-50).forEach(i => {
    events.push({ id:`iv_${i.id}`, type:'interview', user_id: i.created_by||'', user_name: getUserName(i.created_by), user_initials: getUserInitials(i.created_by),
      timestamp: i.created_at, title: `Scheduled interview${i.candidate_name?` with ${i.candidate_name}`:''}`, subtitle: i.job_name||i.interview_type_name||'Interview', meta: { color:'#0891b2' } });
  });

  (store.offers||[]).filter(o=>!o.deleted_at&&(!environment_id||o.environment_id===environment_id)).slice(-30).forEach(o => {
    const action = o.status==='accepted'?'Offer accepted':'Offer sent';
    events.push({ id:`of_${o.id}`, type:'offer', user_id: o.created_by||'', user_name: getUserName(o.created_by), user_initials: getUserInitials(o.created_by),
      timestamp: o.updated_at||o.created_at, title: `${action}${o.candidate_name?` — ${o.candidate_name}`:''}`, subtitle: o.job_title||'Offer', meta: { color:'#059669', status: o.status } });
  });

  events.sort((a,b) => new Date(b.timestamp)-new Date(a.timestamp));
  res.json(events.slice(0, Number(limit)));
});

router.post('/check', (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  const store   = getStore();
  const awarded = checkAndAward(user_id, store);
  res.json({ awarded });
});

module.exports = router;
