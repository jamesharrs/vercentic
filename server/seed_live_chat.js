#!/usr/bin/env node
// seed_live_chat.js — run once to create demo conversations
// Usage: node seed_live_chat.js

const ENV_ID = 'c0c64e3b-113d-48b8-bc3c-684769849742';
const BASE   = 'http://localhost:3001';

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

const CONVERSATIONS = [
  {
    session_id: 'demo-sess-001',
    environment_id: ENV_ID,
    portal_id: null,
    source_url: '/careers',
    visitor_name: 'Sarah Chen',
    visitor_email: 'sarah.chen@gmail.com',
    initial_message: 'Hi, I saw the Senior Engineer role and wanted to ask a few questions before applying.',
    status: 'escalated',
    extra_messages: [
      { role: 'bot',     content: "Hi Sarah! I'm the Vercentic assistant. I can answer questions about the role or help you apply. What would you like to know?" },
      { role: 'visitor', content: "Is remote work available for this position? I'm based in London." },
      { role: 'bot',     content: 'Great question — this role is listed as hybrid. Let me connect you with a recruiter who can give you the exact details.' },
    ],
  },
  {
    session_id: 'demo-sess-002',
    environment_id: ENV_ID,
    portal_id: null,
    source_url: '/careers/product-manager',
    visitor_name: 'James Al-Farsi',
    visitor_email: null,
    initial_message: 'What is the salary range for the Product Manager role?',
    status: 'bot',
    extra_messages: [
      { role: 'bot',     content: "Hello! The Product Manager role is competitive and based on experience. The range is typically AED 25,000–35,000/month. Would you like more details or help applying?" },
      { role: 'visitor', content: 'That sounds good. Do I need PMP certification?' },
      { role: 'bot',     content: 'PMP is preferred but not required. Strong product experience is more important. Would you like me to connect you with someone from the team?' },
    ],
  },
  {
    session_id: 'demo-sess-003',
    environment_id: ENV_ID,
    portal_id: null,
    source_url: '/careers',
    visitor_name: null,
    visitor_email: null,
    initial_message: 'Do you have any graduate roles available?',
    status: 'bot',
    extra_messages: [
      { role: 'bot', content: "Yes! We currently have 3 graduate positions open in Engineering, Finance and Operations. Which area interests you most?" },
      { role: 'visitor', content: 'Engineering please.' },
    ],
  },
  {
    session_id: 'demo-sess-004',
    environment_id: ENV_ID,
    portal_id: null,
    source_url: '/hm-portal',
    visitor_name: 'Priya Sharma',
    visitor_email: 'priya.sharma@acme.com',
    initial_message: "I'm a hiring manager and I can't see the candidates for my role.",
    status: 'escalated',
    extra_messages: [
      { role: 'bot',     content: "Hi Priya! I can help with that. Could you confirm which role you're trying to review?" },
      { role: 'visitor', content: 'The Senior Data Analyst role — I need to provide feedback by end of day.' },
      { role: 'bot',     content: "I'm escalating this to a team member who can check your portal access right away." },
    ],
  },
  {
    session_id: 'demo-sess-005',
    environment_id: ENV_ID,
    portal_id: null,
    source_url: '/careers/devops-engineer',
    visitor_name: 'Marcus Williams',
    visitor_email: 'marcus@outlook.com',
    initial_message: "I applied last week and haven't heard back. Just checking in.",
    status: 'resolved',
    extra_messages: [
      { role: 'bot',     content: "Hi Marcus! Applications for that role are being reviewed this week. You should hear back by Friday. Is there anything else I can help with?" },
      { role: 'visitor', content: "No that's all, thanks!" },
      { role: 'agent',   content: "Thanks Marcus — I've flagged your application to the recruiter. Expect an email shortly." },
    ],
  },
];

async function seed() {
  console.log('Seeding live chat demo conversations...\n');

  for (const c of CONVERSATIONS) {
    const { extra_messages, status, ...convData } = c;

    // Create conversation
    const conv = await post('/api/live-chat/conversations', convData);
    console.log(`✓ Created: ${c.visitor_name || 'Anonymous'} (${status}) — ID: ${conv.id}`);

    // Add extra messages
    for (const msg of extra_messages) {
      await post(`/api/live-chat/conversations/${conv.id}/messages`, msg);
    }

    // Set status
    if (status === 'escalated') {
      await post(`/api/live-chat/conversations/${conv.id}/escalate`, {});
      console.log(`  → Escalated`);
    } else if (status === 'resolved') {
      await post(`/api/live-chat/conversations/${conv.id}/resolve`, {});
      console.log(`  → Resolved`);
    }
  }

  console.log('\n✅ Done! Refresh the Inbox → Live Chat tab to see conversations.');
}

seed().catch(console.error);
