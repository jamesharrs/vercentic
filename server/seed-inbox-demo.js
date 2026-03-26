// seed-inbox-demo.js — run from /Users/james/projects/talentos/server
// Seeds realistic inbound messages matched to real person records
const path = require('path');
const fs   = require('fs');
const { v4: uuidv4 } = require('uuid');

// Write directly to the JSON file (avoids saveStore's async timer issue)
const DATA_FILE = path.join(__dirname, '../data/talentos.json');

const ENV_ID = 'c0c64e3b-113d-48b8-bc3c-684769849742';

const PEOPLE = [
  { id: '6a04b872-e7b0-405f-bcd5-9a9ca6b92aaa', name: 'James Keane',       email: 'james.keane@example.com' },
  { id: '6beb1840-1b0b-4a29-82e8-f07fd5cc86d7', name: 'Isabella Romano',   email: 'isabella.romano@example.com' },
  { id: '66bd292d-cb59-44f0-a278-63f718904345', name: 'Amira Khalil',       email: 'amira.khalil@example.com' },
  { id: '1b5e77c3-fd7d-40fb-8238-24aa9b764933', name: 'Olivia Wilson',      email: 'olivia.wilson@example.com' },
  { id: '07fb7deb-d419-45dd-a9c5-5dfa593427c2', name: 'Hassan Wilson',      email: 'hassan.wilson@example.com' },
  { id: '0af62e07-cf9d-40da-aeeb-c6b479c4c4d9', name: 'Priya Nair',         email: 'priya.nair@example.com' },
  { id: 'f4e74301-c97a-4ba9-9632-376af4366f31', name: 'Nora Andersen',      email: 'nora.andersen@example.com' },
  { id: '2f70d9e1-2f98-45a7-820d-c31ebc957621', name: 'Oliver Thompson',    email: 'oliver.thompson@example.com' },
  { id: '4b03fccc-1416-42ac-86ce-1eb061a79385', name: 'Sarah Al-Mansouri',  email: 'sarah.almansouri@example.com' },
  { id: '5eb42cf6-9fd0-44f8-b880-07b191bb6c02', name: 'Liam Brown',         email: 'liam.brown@example.com' },
];

const EXTERNAL = [
  { id: null, name: 'David Chen',      email: 'david.chen@techventures.ae' },
  { id: null, name: 'LinkedIn Alerts', email: 'noreply@linkedin.com' },
];

function ago(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

const MESSAGES = [
  {
    person: PEOPLE[0], subject: 'Re: Senior Software Engineer — Interview Confirmation',
    body: `Hi,\n\nThanks for getting back to me. Thursday at 2pm works perfectly.\n\nJust to confirm — will this be a video call via Teams or a different platform? Also, should I prepare anything specific beforehand?\n\nLooking forward to it.\n\nBest regards,\nJames`,
    received_at: ago(25), read: true, context: 'application',
  },
  {
    person: PEOPLE[1], subject: 'Re: Your Application — Product Manager, Dubai',
    body: `Hello,\n\nThank you for reaching out. I'm very interested in the Product Manager role and would love to discuss further.\n\nI have 6 years of product experience, most recently at a fintech startup in Milan where I led a team of 8. I'm relocating to Dubai next month so the timing is ideal.\n\nWould you be available for a call this week?\n\nKind regards,\nIsabella`,
    received_at: ago(90), read: false, context: 'application',
  },
  {
    person: PEOPLE[2], subject: 'Quick question about the role',
    body: `Hi there,\n\nI hope you're well. I just wanted to follow up on my application — I sent it over last week but haven't heard back yet.\n\nAlso, I had a quick question: does the role involve any travel? I'm happy to travel within the GCC region but wanted to check before proceeding.\n\nThanks so much,\nAmira`,
    received_at: ago(180), read: false, context: 'general',
  },
  {
    person: PEOPLE[3], subject: 'Offer Letter — Finance Analyst Position',
    body: `Dear Hiring Team,\n\nI've reviewed the offer letter you sent and I'm delighted to accept! The terms look great.\n\nOne small thing — could you clarify the start date? The letter says "1st April" but I need to give 4 weeks notice at my current employer so the earliest I could join would be 15th April.\n\nPlease let me know if that works.\n\nBest,\nOlivia`,
    received_at: ago(320), read: true, context: 'application',
  },
  {
    person: PEOPLE[4], subject: 'Re: Background Check — Documents Needed',
    body: `Hi,\n\nThanks for the message. I've attached the following documents as requested:\n\n- Emirates ID (front and back)\n- Passport copy\n- Last 3 months payslips\n- NOC from current employer\n\nPlease let me know if you need anything else. I'm keen to get started as soon as possible!\n\nCheers,\nHassan`,
    received_at: ago(500), read: true, context: 'application',
  },
  {
    person: PEOPLE[5], subject: 'Interested in Opportunities',
    body: `Hello,\n\nI came across your profile on LinkedIn and I'm very interested in exploring opportunities at your organisation. I'm a senior data scientist with 8 years of experience in ML and analytics.\n\nI'm not actively looking but would be open to the right role — particularly anything in the AI/ML space.\n\nWould you have 20 minutes for a quick call?\n\nBest wishes,\nPriya`,
    received_at: ago(720), read: false, context: 'general',
  },
  {
    person: PEOPLE[6], subject: 'Re: Technical Assessment — Submission',
    body: `Hi,\n\nPlease find attached my completed technical assessment. I really enjoyed the problem — it took me about 3.5 hours and I focused particularly on the scalability section.\n\nI've included a README with my approach and some notes on what I'd improve with more time.\n\nHappy to walk through my solution on our next call.\n\nThanks,\nNora`,
    received_at: ago(1200), read: false, context: 'application',
  },
  {
    person: PEOPLE[7], subject: 'Re: Offer Update — Salary Negotiation',
    body: `Hi,\n\nThank you for the revised offer. I appreciate you going back to management on this.\n\nThe updated base salary works for me. Could we also discuss the sign-on bonus? My current employer is offering a retention bonus if I stay, so I'd need something to offset that.\n\nI'm genuinely excited about this role and I'm hoping we can make the numbers work.\n\nMany thanks,\nOliver`,
    received_at: ago(1500), read: true, context: 'application',
  },
  {
    person: PEOPLE[8], subject: 'Thank you — Interview Yesterday',
    body: `Dear Team,\n\nI just wanted to send a quick note to say thank you for the interview yesterday. I really enjoyed meeting everyone and learning more about the team's vision.\n\nThe role sounds like a fantastic fit and I'm very excited about the prospect of joining.\n\nPlease don't hesitate to reach out if you need any additional information from my side.\n\nWarmly,\nSarah`,
    received_at: ago(2000), read: true, context: 'general',
  },
  {
    person: PEOPLE[9], subject: 'Re: Reference Check — Permission',
    body: `Hi,\n\nOf course, happy for you to contact my references. Here are their details:\n\n1. Ahmed Al-Rashidi — Previous Manager — ahmed@techco.ae — +971 50 123 4567\n2. Dr. Sarah Mills — MBA Professor — s.mills@university.ac.uk\n\nBoth have been briefed and are expecting your call.\n\nLet me know if you need anything else!\n\nLiam`,
    received_at: ago(2800), read: false, context: 'application',
  },
  // Unmatched
  {
    person: EXTERNAL[0], subject: 'Enquiry About Executive Roles',
    body: `Hello,\n\nMy name is David Chen and I'm a CFO with 15 years of experience in financial services across APAC and MENA. I'm exploring senior leadership opportunities and was referred to your firm by a colleague.\n\nWould you have capacity to discuss potential opportunities?\n\nMany thanks,\nDavid Chen`,
    received_at: ago(200), read: false, context: 'general',
  },
  {
    person: EXTERNAL[1], subject: 'You have a new InMail from a potential candidate',
    body: `Hi,\n\nSomeone viewed your job posting for "Head of Engineering" and sent you a message on LinkedIn. Log in to LinkedIn to view and respond.\n\nThis is an automated notification.\n\nLinkedIn Talent Solutions`,
    received_at: ago(45), read: false, context: 'general',
  },
];

// ── Read the store, merge, write back synchronously ───────────────────────────
const store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
if (!store.inbound_messages) store.inbound_messages = [];
if (!store.communications)   store.communications   = [];

let added = 0, linked = 0;

for (const msg of MESSAGES) {
  const thread_id = uuidv4();
  const matched_record_id = msg.person.id || null;

  const inbound = {
    id: uuidv4(),
    environment_id:    ENV_ID,
    message_id:        `demo-${uuidv4()}`,
    thread_id,
    from_email:        msg.person.email,
    from_name:         msg.person.name,
    subject:           msg.subject,
    body_text:         msg.body,
    matched_record_id,
    context:           msg.context || 'general',
    related_record_id: null,
    read:              msg.read ?? false,
    assigned_to:       null,
    received_at:       msg.received_at,
    created_at:        msg.received_at,
    updated_at:        msg.received_at,
  };

  store.inbound_messages.push(inbound);
  added++;

  // Push to communications so it appears in the person's comms panel too
  if (matched_record_id) {
    store.communications.push({
      id: uuidv4(),
      record_id:         matched_record_id,
      environment_id:    ENV_ID,
      type:              'email',
      direction:         'inbound',
      subject:           msg.subject,
      body:              msg.body,
      from_email:        msg.person.email,
      from_name:         msg.person.name,
      status:            'received',
      thread_id,
      context:           msg.context || 'general',
      related_record_id: null,
      inbound_message_id: inbound.id,
      sent_at:           msg.received_at,
      created_at:        msg.received_at,
      updated_at:        msg.received_at,
    });
    linked++;
  }
}

// Write synchronously so the process doesn't exit before saving
fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));

console.log(`✅ Seeded ${added} inbox messages:`);
console.log(`   ${linked} auto-linked to person records`);
console.log(`   ${added - linked} unmatched`);
console.log(`   ${MESSAGES.filter(m => !m.read).length} unread`);
console.log(`   ${MESSAGES.filter(m => m.context === 'application').length} application context`);
console.log(`   ${MESSAGES.filter(m => m.context === 'general').length} general context`);
