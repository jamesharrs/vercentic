// ─── Portal Templates ──────────────────────────────────────────────────────────
// 12 complete, fully-populated portal templates — 3 per portal type.

const uid = (() => { let n = 0; return () => `tpl_${++n}`; })();

const UNSPLASH = {
  office1: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
  office2: 'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=1200&q=80',
  office3: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&q=80',
  team1:   'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
  team2:   'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80',
  team3:   'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80',
  person1: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
  person2: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80',
  person3: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80',
  person4: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
  cityscape: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
  abstract1: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1200&q=80',
  abstract2: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
  nature1:  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80',
  welcome:  'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&q=80',
  handshake:'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&q=80',
  laptop:   'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
  meeting:  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
  culture:  'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80',
};

const row = (cells, opts = {}) => ({
  id: uid(), cells, padding: opts.padding || 'md',
  bgColor: opts.bgColor || '', bgImage: opts.bgImage || '',
  overlayOpacity: opts.overlayOpacity || 0, preset: opts.preset || '',
  anchorId: opts.anchorId || '',
});

const cell = (widgetType, widgetConfig = {}) => ({
  id: uid(), widgetType, widgetConfig,
});

// ─── CAREER SITE: MODERN ────────────────────────────────────────────────────────
const careerModern = {
  id: 'career_modern',
  name: 'Modern',
  description: 'Full-bleed hero with video, bold typography, card-based job grid, and employee testimonials.',
  thumbnail: UNSPLASH.abstract1,
  type: 'career_site',
  tags: ['bold', 'video', 'cards'],
  theme: {
    primaryColor: '#4361EE', secondaryColor: '#7C3AED', accentColor: '#06D6A0',
    bgColor: '#FAFBFF', textColor: '#0F1729', fontFamily: 'Plus Jakarta Sans',
    buttonStyle: 'filled', buttonRadius: '12px', maxWidth: '1200px',
  },
  nav: {
    logoText: 'Acme Corp', sticky: true,
    bgColor: '#ffffff', textColor: '#0F1729',
    links: [
      { label: 'Open Roles', href: '#jobs' },
      { label: 'Life at Acme', href: '#culture' },
      { label: 'Benefits', href: '#benefits' },
    ],
  },
  footer: {
    bgColor: '#0F1729', textColor: '#F1F5F9',
    bottomText: '© 2026 Acme Corporation. All rights reserved.',
    columns: [
      { id: uid(), heading: 'Company', links: [
        { label: 'About Us', href: '#' }, { label: 'Blog', href: '#' }, { label: 'Press', href: '#' }
      ]},
      { id: uid(), heading: 'Careers', links: [
        { label: 'Open Roles', href: '#jobs' }, { label: 'Internships', href: '#' }, { label: 'Referrals', href: '#' }
      ]},
      { id: uid(), heading: 'Legal', links: [
        { label: 'Privacy Policy', href: '#' }, { label: 'Cookie Policy', href: '#' }, { label: 'Accessibility', href: '#' }
      ]},
    ],
  },
  pages: [
    {
      id: uid(), name: 'Home', slug: '/', isDefault: true,
      rows: [
        row([cell('hero', {
          heading: 'Build the future with us',
          subheading: 'We\'re looking for curious minds, bold thinkers, and passionate builders to join our mission.',
          buttonText: 'View open roles', buttonLink: '#jobs',
          align: 'center', size: 'large',
          bgImage: UNSPLASH.abstract1, overlayColor: 'rgba(15, 23, 41, 0.7)',
        })], { padding: 'none' }),
        row([cell('stats', {
          items: [
            { value: '2,400+', label: 'Team members worldwide' },
            { value: '28', label: 'Countries' },
            { value: '96%', label: 'Employee satisfaction' },
            { value: '4.8★', label: 'Glassdoor rating' },
          ],
          columns: 4, style: 'card',
        })], { bgColor: '#F0F4FF', padding: 'lg' }),
        row([cell('jobs', {
          heading: 'Open Positions',
          subheading: 'Find the role that\'s right for you. Filter by department, location, or keyword.',
          showSearch: true, showFilters: true, layout: 'cards',
          emptyMessage: 'No open positions right now — check back soon!',
        })], { anchorId: 'jobs', padding: 'lg' }),
        row([
          cell('content', {
            heading: 'Life at Acme',
            body: 'We believe great work happens when people feel empowered, supported, and inspired. Our culture is built on trust, transparency, and a genuine commitment to each other\'s growth.\n\nFrom flexible work arrangements to learning budgets, we invest in the things that matter most to our team.',
          }),
          cell('image', { src: UNSPLASH.culture, alt: 'Team collaborating', borderRadius: '16px', aspectRatio: '4/3' }),
        ], { preset: '1-1', anchorId: 'culture', padding: 'lg' }),
        row([cell('video', {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          heading: 'Hear from our team',
          subheading: 'Watch what it\'s really like to work at Acme — in our team\'s own words.',
        })], { bgColor: '#0F1729', padding: 'lg' }),
        row([cell('testimonials', {
          heading: 'What our people say',
          items: [
            { quote: 'The culture here is unlike anywhere I\'ve worked. People genuinely care about each other and the work we do together.', author: 'Sarah Chen', role: 'Senior Engineer', avatar: UNSPLASH.person1 },
            { quote: 'I\'ve grown more in two years at Acme than in eight years elsewhere. The mentorship and opportunities are exceptional.', author: 'Marcus Johnson', role: 'Product Manager', avatar: UNSPLASH.person2 },
            { quote: 'What drew me in was the mission. What keeps me here is the people. This team is special.', author: 'Priya Patel', role: 'Design Lead', avatar: UNSPLASH.person3 },
          ],
        })], { padding: 'lg' }),
        row([cell('content', {
          heading: 'Why Acme?',
          body: '',
          cards: [
            { icon: 'heart', title: 'Health & Wellness', desc: 'Comprehensive medical, dental, and vision coverage for you and your family. Plus a monthly wellness stipend.' },
            { icon: 'graduation', title: 'Learning Budget', desc: '$3,000 annual learning budget for courses, conferences, and books. We invest in your growth.' },
            { icon: 'globe', title: 'Remote Flexible', desc: 'Work from anywhere. We have hubs in 12 cities but you choose where you do your best work.' },
            { icon: 'calendar', title: 'Generous PTO', desc: '25 days paid time off plus public holidays, birthday off, and end-of-year company shutdown.' },
          ],
        })], { anchorId: 'benefits', padding: 'lg', bgColor: '#F7F8FC' }),
        row([cell('cta', {
          heading: 'Ready to make an impact?',
          subheading: 'Join a team that\'s redefining what\'s possible. We can\'t wait to meet you.',
          buttonText: 'See open roles', buttonLink: '#jobs', style: 'dark',
        })], { bgColor: '#0F1729', padding: 'lg' }),
      ],
    },
    {
      id: uid(), name: 'About', slug: '/about',
      rows: [
        row([cell('hero', {
          heading: 'Our Story', subheading: 'Founded in 2018, Acme has grown from a 5-person startup to a global team of 2,400+.',
          align: 'center', size: 'medium', bgImage: UNSPLASH.cityscape, overlayColor: 'rgba(15,23,41,0.65)',
        })], { padding: 'none' }),
        row([
          cell('image', { src: UNSPLASH.team1, alt: 'Our team', borderRadius: '16px' }),
          cell('content', {
            heading: 'Our Values',
            body: '**Customer Obsession** — We start with the customer and work backwards.\n\n**Ownership** — We think long-term and act on behalf of the entire company.\n\n**Bias for Action** — Speed matters. Many decisions are reversible.\n\n**Earn Trust** — We listen attentively, speak candidly, and treat others respectfully.',
          }),
        ], { preset: '1-1', padding: 'lg' }),
        row([cell('team', {
          heading: 'Leadership Team',
          members: [
            { name: 'Alexandra Park', role: 'CEO & Co-Founder', avatar: UNSPLASH.person1 },
            { name: 'David Okafor', role: 'CTO & Co-Founder', avatar: UNSPLASH.person2 },
            { name: 'Emma Richardson', role: 'VP People', avatar: UNSPLASH.person3 },
            { name: 'Raj Mehta', role: 'VP Engineering', avatar: UNSPLASH.person4 },
          ],
        })], { padding: 'lg', bgColor: '#F7F8FC' }),
      ],
    },
  ],
};

// ─── CAREER SITE: CORPORATE ────────────────────────────────────────────────────
const careerCorporate = {
  id: 'career_corporate',
  name: 'Corporate',
  description: 'Clean, professional layout with a split hero, structured job list, and formal tone.',
  thumbnail: UNSPLASH.cityscape,
  type: 'career_site',
  tags: ['professional', 'clean', 'enterprise'],
  theme: {
    primaryColor: '#1B4965', secondaryColor: '#62B6CB', accentColor: '#BEE9E8',
    bgColor: '#FFFFFF', textColor: '#1A1A2E', fontFamily: 'Inter',
    buttonStyle: 'filled', buttonRadius: '8px', maxWidth: '1140px',
  },
  nav: { logoText: 'GlobalTech Industries', sticky: true, bgColor: '#1B4965', textColor: '#FFFFFF',
    links: [{ label: 'Careers', href: '#jobs' }, { label: 'Our Culture', href: '#culture' }, { label: 'Contact', href: '#contact' }],
  },
  footer: { bgColor: '#1B4965', textColor: '#BEE9E8', bottomText: '© 2026 GlobalTech Industries. Equal Opportunity Employer.',
    columns: [
      { id: uid(), heading: 'Quick Links', links: [{ label: 'Corporate Website', href: '#' }, { label: 'Investor Relations', href: '#' }] },
      { id: uid(), heading: 'Contact', links: [{ label: 'careers@globaltech.com', href: 'mailto:careers@globaltech.com' }] },
    ],
  },
  pages: [{
    id: uid(), name: 'Home', slug: '/', isDefault: true,
    rows: [
      row([
        cell('content', { heading: 'Shape Tomorrow\'s Technology', body: 'For over 30 years, GlobalTech has been at the forefront of enterprise innovation. We\'re looking for exceptional talent to lead the next chapter.', buttonText: 'Explore Opportunities', buttonLink: '#jobs' }),
        cell('image', { src: UNSPLASH.office1, alt: 'GlobalTech headquarters', borderRadius: '12px' }),
      ], { preset: '1-1', padding: 'xl' }),
      row([cell('stats', { items: [{ value: '15,000+', label: 'Employees' }, { value: '42', label: 'Offices worldwide' }, { value: 'Fortune 500', label: 'Ranked' }, { value: '$12B', label: 'Annual revenue' }], columns: 4, style: 'minimal' })], { bgColor: '#F8FAFB', padding: 'md' }),
      row([cell('jobs', { heading: 'Current Openings', subheading: 'Browse our open positions across all departments and locations.', showSearch: true, showFilters: true, layout: 'list' })], { anchorId: 'jobs', padding: 'lg' }),
      row([
        cell('image', { src: UNSPLASH.team2, alt: 'Team meeting', borderRadius: '12px' }),
        cell('content', { heading: 'A Culture of Excellence', body: 'At GlobalTech, we foster an environment where every voice matters. Our commitment to diversity, equity, and inclusion isn\'t just policy — it\'s who we are.' }),
      ], { preset: '1-1', anchorId: 'culture', padding: 'lg' }),
      row([cell('cta', { heading: 'Join a world-class team', subheading: 'Discover your potential with GlobalTech Industries.', buttonText: 'View all roles', buttonLink: '#jobs', style: 'accent' })], { padding: 'lg', bgColor: '#1B4965' }),
    ],
  }],
};

// ─── CAREER SITE: CREATIVE ─────────────────────────────────────────────────────
const careerCreative = {
  id: 'career_creative', name: 'Creative',
  description: 'Bold, asymmetric layout with vivid colours, large imagery, and a magazine-style feel.',
  thumbnail: UNSPLASH.abstract2, type: 'career_site', tags: ['bold', 'colourful', 'magazine'],
  theme: { primaryColor: '#FF6B35', secondaryColor: '#004E89', accentColor: '#F7C548', bgColor: '#FFF8F0', textColor: '#1A1A2E', fontFamily: 'Space Grotesk', buttonStyle: 'filled', buttonRadius: '24px', maxWidth: '1280px' },
  nav: { logoText: 'studio.', sticky: true, bgColor: 'transparent', textColor: '#1A1A2E', links: [{ label: 'Work with us', href: '#jobs' }, { label: 'Our world', href: '#world' }] },
  footer: { bgColor: '#1A1A2E', textColor: '#FFF8F0', bottomText: '© 2026 Studio Creative. Made with passion.',
    columns: [{ id: uid(), heading: 'Connect', links: [{ label: 'Instagram', href: '#' }, { label: 'LinkedIn', href: '#' }, { label: 'Dribbble', href: '#' }] }],
  },
  pages: [{
    id: uid(), name: 'Home', slug: '/', isDefault: true,
    rows: [
      row([cell('hero', { heading: 'We don\'t do ordinary.', subheading: 'We\'re a team of makers, thinkers, and dreamers building brands that move people. Come make something remarkable.', buttonText: 'See what\'s open →', buttonLink: '#jobs', align: 'left', size: 'large', bgImage: UNSPLASH.abstract2, overlayColor: 'rgba(26, 26, 46, 0.5)' })], { padding: 'none' }),
      row([cell('gallery', { images: [{ src: UNSPLASH.culture, alt: 'Studio life' }, { src: UNSPLASH.team1, alt: 'Brainstorm' }, { src: UNSPLASH.office3, alt: 'Our space' }, { src: UNSPLASH.meeting, alt: 'Client work' }], columns: 4, gap: 8, borderRadius: '12px' })], { padding: 'md' }),
      row([
        cell('content', { heading: 'Our World', body: 'We believe creativity thrives in chaos. Our studio is a playground for ideas — no cubicles, no hierarchy, just the relentless pursuit of work that matters.\n\nEvery project is a canvas. Every brief is an invitation to surprise.' }),
        cell('image', { src: UNSPLASH.office3, alt: 'Studio space', borderRadius: '24px' }),
      ], { preset: '1-2', anchorId: 'world', padding: 'lg' }),
      row([cell('video', { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', heading: 'A day at the studio' })], { padding: 'lg', bgColor: '#1A1A2E' }),
      row([cell('jobs', { heading: 'Come create with us', showSearch: true, showFilters: true, layout: 'cards' })], { anchorId: 'jobs', padding: 'lg' }),
      row([cell('cta', { heading: 'Your next chapter starts here', buttonText: 'Apply now', buttonLink: '#jobs', style: 'dark' })], { bgColor: '#FF6B35', padding: 'lg' }),
    ],
  }],
};

// ─── HIRING MANAGER: DASHBOARD ──────────────────────────────────────────────────
const hmDashboard = {
  id: 'hm_dashboard', name: 'Dashboard',
  description: 'Stats-forward layout with pipeline overview, candidate cards, and quick actions.',
  thumbnail: UNSPLASH.laptop, type: 'hm_portal', tags: ['data', 'pipeline', 'actions'],
  theme: { primaryColor: '#6366F1', secondaryColor: '#A855F7', accentColor: '#22D3EE', bgColor: '#F8FAFC', textColor: '#0F172A', fontFamily: 'Inter', buttonStyle: 'filled', buttonRadius: '10px', maxWidth: '1200px' },
  nav: { logoText: 'Hiring Portal', sticky: true, bgColor: '#0F172A', textColor: '#F1F5F9', links: [{ label: 'My Roles', href: '#roles' }, { label: 'Candidates', href: '#candidates' }, { label: 'Feedback', href: '#feedback' }] },
  footer: { bgColor: '#0F172A', textColor: '#94A3B8', bottomText: '© 2026 Your Company. Hiring Manager Portal.' },
  pages: [{
    id: uid(), name: 'Dashboard', slug: '/', isDefault: true,
    rows: [
      row([cell('hero', { heading: 'Welcome back, Hiring Manager', subheading: 'Here\'s a snapshot of your open roles and candidate pipeline.', align: 'left', size: 'small' })], { bgColor: '#0F172A', padding: 'md' }),
      row([cell('stats', { items: [{ value: '8', label: 'Open roles' }, { value: '47', label: 'Active candidates' }, { value: '12', label: 'Awaiting your review' }, { value: '3', label: 'Offers pending' }], columns: 4, style: 'card' })], { padding: 'md' }),
      row([cell('jobs', { heading: 'Your Open Roles', subheading: 'Roles assigned to you as hiring manager.', showSearch: false, showFilters: false, layout: 'list' })], { anchorId: 'roles', padding: 'lg' }),
      row([cell('content', { heading: 'Candidates Awaiting Review', body: 'The candidates below have completed their interviews and are waiting for your feedback.',
        cards: [
          { icon: 'user', title: 'Sarah Chen — Senior Engineer', desc: 'Technical interview completed. 3 scorecards submitted. Awaiting your review.' },
          { icon: 'user', title: 'James Park — Product Manager', desc: 'Panel interview completed yesterday. HR recommends proceeding to offer.' },
          { icon: 'user', title: 'Aisha Mahmoud — UX Designer', desc: 'Portfolio review pending. Scheduled for Thursday at 2pm.' },
        ],
      })], { anchorId: 'candidates', padding: 'lg', bgColor: '#EEF2FF' }),
      row([cell('content', { heading: 'Quick Actions',
        cards: [
          { icon: 'check', title: 'Submit Feedback', desc: 'Complete outstanding scorecards for interviewed candidates.' },
          { icon: 'plus', title: 'Request New Role', desc: 'Submit a headcount request for your team.' },
          { icon: 'calendar', title: 'View Schedule', desc: 'See upcoming interviews and availability.' },
        ],
      })], { padding: 'lg' }),
    ],
  }],
};

// ─── HIRING MANAGER: REVIEW BOARD ───────────────────────────────────────────────
const hmReviewBoard = {
  id: 'hm_review', name: 'Review Board',
  description: 'Kanban-inspired candidate review layout with stage columns and inline feedback.',
  thumbnail: UNSPLASH.meeting, type: 'hm_portal', tags: ['kanban', 'feedback', 'review'],
  theme: { primaryColor: '#059669', secondaryColor: '#10B981', accentColor: '#34D399', bgColor: '#F0FDF4', textColor: '#064E3B', fontFamily: 'DM Sans', buttonStyle: 'filled', buttonRadius: '8px', maxWidth: '1280px' },
  nav: { logoText: 'Review Portal', sticky: true, bgColor: '#064E3B', textColor: '#D1FAE5', links: [{ label: 'Pipeline', href: '#pipeline' }, { label: 'Scorecards', href: '#scorecards' }] },
  footer: { bgColor: '#064E3B', textColor: '#A7F3D0', bottomText: '© 2026 Your Company. Confidential — for internal use only.' },
  pages: [{
    id: uid(), name: 'Pipeline', slug: '/', isDefault: true,
    rows: [
      row([cell('hero', { heading: 'Candidate Pipeline', subheading: 'Review candidates at each stage. Click any card to expand and submit your feedback.', align: 'left', size: 'small' })], { bgColor: '#064E3B', padding: 'md' }),
      row([
        cell('content', { heading: '📋 Applied (14)', body: '', cards: [{ title: 'Emma Liu', desc: 'Senior Designer · Applied 2 days ago' }, { title: 'Carlos Mendez', desc: 'Full-Stack Developer · Applied yesterday' }, { title: 'Fatima Al-Rashid', desc: 'Data Analyst · Applied today' }] }),
        cell('content', { heading: '🔍 Screening (8)', body: '', cards: [{ title: 'Alex Thompson', desc: 'PM — phone screen scheduled Thu' }, { title: 'Yuki Tanaka', desc: 'Engineer — HR screening complete' }] }),
        cell('content', { heading: '💬 Interview (5)', body: '', cards: [{ title: 'Rachel Kim', desc: 'Final round Monday. 2 scorecards in.' }, { title: 'Omar Hassan', desc: 'Technical interview tomorrow 10am' }] }),
      ], { anchorId: 'pipeline', padding: 'lg' }),
      row([cell('content', { heading: 'Your Pending Scorecards', body: 'You have 3 scorecards awaiting completion. Timely feedback helps us move quickly.',
        cards: [{ icon: 'star', title: 'Rachel Kim — Final Interview', desc: 'Completed March 25. Please submit your scorecard by March 28.' }, { icon: 'star', title: 'Alex Thompson — Technical', desc: 'Completed March 24. Please submit your scorecard.' }],
      })], { anchorId: 'scorecards', padding: 'lg', bgColor: '#ECFDF5' }),
    ],
  }],
};

// ─── HIRING MANAGER: MINIMAL ────────────────────────────────────────────────────
const hmMinimal = {
  id: 'hm_minimal', name: 'Minimal',
  description: 'Clean, distraction-free layout focused on candidate details and feedback submission.',
  thumbnail: UNSPLASH.office2, type: 'hm_portal', tags: ['clean', 'simple', 'focused'],
  theme: { primaryColor: '#374151', secondaryColor: '#6B7280', accentColor: '#F59E0B', bgColor: '#FFFFFF', textColor: '#111827', fontFamily: 'System UI', buttonStyle: 'outline', buttonRadius: '6px', maxWidth: '900px' },
  nav: { logoText: 'Hiring Review', sticky: true, bgColor: '#FFFFFF', textColor: '#111827', links: [{ label: 'Active Roles', href: '#roles' }, { label: 'My Reviews', href: '#reviews' }] },
  footer: { bgColor: '#F9FAFB', textColor: '#6B7280', bottomText: '© 2026 Your Company. Internal use only.' },
  pages: [{
    id: uid(), name: 'Home', slug: '/', isDefault: true,
    rows: [
      row([cell('content', { heading: 'Your Active Roles', body: 'Below are the positions where you\'re listed as hiring manager. Click any role to see its candidates.' })], { padding: 'md' }),
      row([cell('jobs', { heading: '', showSearch: false, showFilters: false, layout: 'list' })], { anchorId: 'roles', padding: 'md' }),
      row([cell('divider', { thickness: 1, color: '#E5E7EB' })]),
      row([cell('content', { heading: 'Pending Reviews', body: 'Complete your outstanding feedback to keep the hiring process on track.',
        cards: [{ icon: 'clock', title: 'Due today', desc: 'Scorecard for Maria Santos — Product Designer (Final Round)' }, { icon: 'clock', title: 'Due tomorrow', desc: 'Scorecard for David Park — Senior Engineer (Technical)' }],
      })], { anchorId: 'reviews', padding: 'lg' }),
    ],
  }],
};

// ─── ONBOARDING: WELCOME JOURNEY ────────────────────────────────────────────────
const onboardJourney = {
  id: 'onboard_journey', name: 'Welcome Journey',
  description: 'Warm, step-by-step onboarding experience with a progress feel and friendly tone.',
  thumbnail: UNSPLASH.welcome, type: 'onboarding', tags: ['warm', 'guided', 'steps'],
  theme: { primaryColor: '#7C3AED', secondaryColor: '#A78BFA', accentColor: '#FCD34D', bgColor: '#FAF5FF', textColor: '#1E1B4B', fontFamily: 'Plus Jakarta Sans', buttonStyle: 'filled', buttonRadius: '14px', maxWidth: '1000px' },
  nav: { logoText: 'Welcome Aboard', sticky: true, bgColor: '#7C3AED', textColor: '#FFFFFF',
    links: [{ label: 'Getting Started', href: '#start' }, { label: 'Your Team', href: '#team' }, { label: 'Resources', href: '#resources' }, { label: 'FAQs', href: '#faqs' }],
  },
  footer: { bgColor: '#1E1B4B', textColor: '#C4B5FD', bottomText: '© 2026 Your Company. Welcome to the team!' },
  pages: [{
    id: uid(), name: 'Welcome', slug: '/', isDefault: true,
    rows: [
      row([cell('hero', { heading: 'Welcome to the team!', subheading: 'We\'re thrilled to have you. This page is your guide to everything you need for a smooth start.', align: 'center', size: 'large', bgImage: UNSPLASH.welcome, overlayColor: 'rgba(124, 58, 237, 0.75)' })], { padding: 'none' }),
      row([cell('content', { heading: 'Your First Week', body: 'Here\'s what to expect in your first few days with us.',
        cards: [
          { icon: 'check', title: 'Day 1 — Welcome & Setup', desc: 'Meet your buddy, set up your laptop and accounts, and get a tour of the office.' },
          { icon: 'users', title: 'Day 2 — Meet the Team', desc: 'Coffee chats with your immediate team. Lunch with your manager. Overview of current projects.' },
          { icon: 'book', title: 'Day 3 — Deep Dive', desc: 'Product walkthrough, codebase tour (for engineers), or client portfolio review.' },
          { icon: 'star', title: 'Day 4-5 — Get Building', desc: 'Pair with a teammate on a real project. Attend your first standup. Ask all the questions.' },
        ],
      })], { anchorId: 'start', padding: 'lg' }),
      row([cell('team', { heading: 'Your Team', subheading: 'These are the people you\'ll be working with most closely.',
        members: [
          { name: 'Alex Rivera', role: 'Your Manager', avatar: UNSPLASH.person2 },
          { name: 'Jordan Kim', role: 'Your Buddy', avatar: UNSPLASH.person3 },
          { name: 'Taylor Singh', role: 'Team Lead', avatar: UNSPLASH.person4 },
          { name: 'Sam Okonkwo', role: 'Teammate', avatar: UNSPLASH.person1 },
        ],
      })], { anchorId: 'team', padding: 'lg', bgColor: '#F3E8FF' }),
      row([cell('form', { heading: 'Upload Your Documents', subheading: 'Please complete this form within your first week.',
        fields: [
          { label: 'Emergency Contact Name', type: 'text', required: true },
          { label: 'Emergency Contact Phone', type: 'phone', required: true },
          { label: 'Dietary Requirements', type: 'text' },
          { label: 'T-Shirt Size', type: 'dropdown', options: 'XS,S,M,L,XL,XXL' },
        ],
        submitText: 'Submit', successMessage: 'Thanks! Your information has been received.',
      })], { padding: 'lg' }),
      row([cell('content', { heading: 'Helpful Resources',
        cards: [
          { icon: 'book', title: 'Employee Handbook', desc: 'Everything about policies, benefits, and how we work.' },
          { icon: 'shield', title: 'IT & Security Guide', desc: 'How to set up 2FA, VPN access, and your development environment.' },
          { icon: 'heart', title: 'Benefits Overview', desc: 'Health insurance, retirement plans, learning budget, and more.' },
          { icon: 'coffee', title: 'Culture Guide', desc: 'How we communicate, our values in practice, and team traditions.' },
        ],
      })], { anchorId: 'resources', padding: 'lg', bgColor: '#EDE9FE' }),
      row([cell('accordion', { heading: 'Frequently Asked Questions',
        items: [
          { title: 'What time should I start on Day 1?', content: 'We start at 9:00 AM local time. Your buddy will meet you at reception.' },
          { title: 'What should I bring?', content: 'Just yourself and your ID for building access. We\'ll provide everything else.' },
          { title: 'How do I set up my email and Slack?', content: 'IT will walk you through this on Day 1. Login credentials are sent before your start date.' },
          { title: 'When do benefits kick in?', content: 'Health insurance is effective from your first day. Retirement matching starts after 90 days.' },
          { title: 'Who should I contact if I have questions?', content: 'Your buddy is your go-to. For HR questions, email people@company.com.' },
        ],
      })], { anchorId: 'faqs', padding: 'lg' }),
    ],
  }],
};

// ─── ONBOARDING: RESOURCE HUB ───────────────────────────────────────────────────
const onboardHub = {
  id: 'onboard_hub', name: 'Resource Hub',
  description: 'Card-based resource centre with document checklist, FAQ, and team directory.',
  thumbnail: UNSPLASH.laptop, type: 'onboarding', tags: ['resources', 'cards', 'checklist'],
  theme: { primaryColor: '#0284C7', secondaryColor: '#38BDF8', accentColor: '#FDE68A', bgColor: '#F0F9FF', textColor: '#0C4A6E', fontFamily: 'DM Sans', buttonStyle: 'filled', buttonRadius: '10px', maxWidth: '1100px' },
  nav: { logoText: 'New Starter Hub', sticky: true, bgColor: '#0284C7', textColor: '#FFFFFF', links: [{ label: 'Checklist', href: '#checklist' }, { label: 'Documents', href: '#docs' }, { label: 'Help', href: '#help' }] },
  footer: { bgColor: '#0C4A6E', textColor: '#BAE6FD', bottomText: '© 2026 Your Company. New Starter Portal.' },
  pages: [{
    id: uid(), name: 'Home', slug: '/', isDefault: true,
    rows: [
      row([cell('content', { heading: 'Welcome! Here\'s everything you need.', body: 'This hub contains all the resources, documents, and contacts you\'ll need for a smooth onboarding.' })], { padding: 'lg' }),
      row([cell('content', { heading: 'Your Onboarding Checklist',
        cards: [
          { icon: 'check', title: 'Accept your offer letter', desc: 'Review and digitally sign your employment agreement.' },
          { icon: 'check', title: 'Submit your documents', desc: 'ID, right to work, bank details for payroll setup.' },
          { icon: 'check', title: 'Complete IT setup', desc: 'Request your laptop and set up your accounts.' },
          { icon: 'check', title: 'Meet your buddy', desc: 'Schedule a 30-minute intro call with your onboarding buddy.' },
          { icon: 'check', title: 'Review the handbook', desc: 'Read through the employee handbook and policies.' },
          { icon: 'check', title: 'Join Slack channels', desc: '#general, #your-team, #social, #announcements' },
        ],
      })], { anchorId: 'checklist', padding: 'lg', bgColor: '#E0F2FE' }),
      row([cell('content', { heading: 'Key Documents',
        cards: [
          { icon: 'file', title: 'Employee Handbook', desc: 'Policies, code of conduct, and how we work.' },
          { icon: 'shield', title: 'Security Policy', desc: 'Data handling, password requirements, and incident reporting.' },
          { icon: 'heart', title: 'Benefits Guide', desc: 'Full breakdown of health, dental, vision, and wellness perks.' },
        ],
      })], { anchorId: 'docs', padding: 'lg' }),
      row([cell('accordion', { heading: 'Need Help?',
        items: [
          { title: 'How do I get building access?', content: 'Your access card will be ready at reception on Day 1.' },
          { title: 'What if I need equipment?', content: 'Submit an IT request through the internal portal.' },
          { title: 'Who is my HR contact?', content: 'Your dedicated People Partner is listed in your welcome email.' },
        ],
      })], { anchorId: 'help', padding: 'lg', bgColor: '#F0F9FF' }),
    ],
  }],
};

// ─── ONBOARDING: TIMELINE ───────────────────────────────────────────────────────
const onboardTimeline = {
  id: 'onboard_timeline', name: 'Timeline',
  description: 'Day-by-day onboarding timeline with progressive content and milestone markers.',
  thumbnail: UNSPLASH.handshake, type: 'onboarding', tags: ['timeline', 'progressive', 'milestones'],
  theme: { primaryColor: '#DC2626', secondaryColor: '#EF4444', accentColor: '#FCA5A5', bgColor: '#FEF2F2', textColor: '#450A0A', fontFamily: 'Inter', buttonStyle: 'filled', buttonRadius: '8px', maxWidth: '900px' },
  nav: { logoText: 'Your Onboarding', sticky: true, bgColor: '#450A0A', textColor: '#FECACA', links: [{ label: 'Pre-Start', href: '#pre' }, { label: 'Week 1', href: '#week1' }, { label: 'Month 1', href: '#month1' }] },
  footer: { bgColor: '#450A0A', textColor: '#FCA5A5', bottomText: '© 2026 Your Company. Welcome aboard.' },
  pages: [{
    id: uid(), name: 'Timeline', slug: '/', isDefault: true,
    rows: [
      row([cell('hero', { heading: 'Your Onboarding Journey', subheading: 'A day-by-day guide to getting started. We\'ve planned everything so you can focus on settling in.', align: 'center', size: 'medium', bgImage: UNSPLASH.handshake, overlayColor: 'rgba(69, 10, 10, 0.7)' })], { padding: 'none' }),
      row([cell('content', { heading: 'Before You Start', body: 'Complete these tasks before your first day so you can hit the ground running.',
        cards: [
          { icon: 'mail', title: 'Check your welcome email', desc: 'Sent to your personal email with login credentials and Day 1 logistics.' },
          { icon: 'file', title: 'Sign your documents', desc: 'Employment agreement, NDA, and tax forms — all available for e-signature.' },
          { icon: 'laptop', title: 'Choose your equipment', desc: 'Select your preferred laptop and peripherals in the IT portal.' },
        ],
      })], { anchorId: 'pre', padding: 'lg' }),
      row([cell('content', { heading: 'Week 1 — Orientation', body: '**Monday:** Welcome session, IT setup, meet your buddy\n**Tuesday:** Team introductions, product overview\n**Wednesday:** Deep dive into your role, first project briefing\n**Thursday:** Shadowing day — observe how your team works\n**Friday:** End-of-week check-in with your manager' })], { anchorId: 'week1', padding: 'lg', bgColor: '#FEE2E2' }),
      row([cell('content', { heading: 'Month 1 — Getting Up to Speed', body: 'By the end of your first month, you should feel comfortable with:\n\n• Your team\'s tools and processes\n• The current project roadmap\n• Key stakeholders and their priorities\n• How to request help and escalate issues\n\nYour manager will schedule a 30/60/90 day check-in.' })], { anchorId: 'month1', padding: 'lg' }),
      row([cell('cta', { heading: 'Questions? We\'re here to help.', subheading: 'Reach out to your buddy, your manager, or the People team at any time.', buttonText: 'Contact People Team', buttonLink: 'mailto:people@company.com', style: 'dark' })], { bgColor: '#450A0A', padding: 'lg' }),
    ],
  }],
};

// ─── AGENCY: SUBMISSION PORTAL ──────────────────────────────────────────────────
const agencySubmission = {
  id: 'agency_submission', name: 'Submission Portal',
  description: 'Clean, form-focused portal for agency partners to browse roles and submit candidates.',
  thumbnail: UNSPLASH.handshake, type: 'agency_portal', tags: ['forms', 'clean', 'submit'],
  theme: { primaryColor: '#7C3AED', secondaryColor: '#A855F7', accentColor: '#C084FC', bgColor: '#FAF5FF', textColor: '#1E1B4B', fontFamily: 'Inter', buttonStyle: 'filled', buttonRadius: '10px', maxWidth: '1000px' },
  nav: { logoText: 'Agency Portal', sticky: true, bgColor: '#1E1B4B', textColor: '#E9D5FF', links: [{ label: 'Open Roles', href: '#roles' }, { label: 'Submit Candidate', href: '#submit' }, { label: 'My Submissions', href: '#track' }] },
  footer: { bgColor: '#1E1B4B', textColor: '#C4B5FD', bottomText: '© 2026 Your Company. Agency Partner Portal. Confidential.' },
  pages: [{
    id: uid(), name: 'Home', slug: '/', isDefault: true,
    rows: [
      row([cell('hero', { heading: 'Agency Partner Portal', subheading: 'Browse our open roles, submit candidates, and track your submissions.', align: 'center', size: 'small' })], { bgColor: '#1E1B4B', padding: 'md' }),
      row([cell('stats', { items: [{ value: '24', label: 'Open roles' }, { value: '12', label: 'Your submissions' }, { value: '5', label: 'In process' }, { value: '2', label: 'Placed' }], columns: 4, style: 'card' })], { padding: 'md' }),
      row([cell('jobs', { heading: 'Current Open Roles', subheading: 'Click any role to view the full brief and submit a candidate.', showSearch: true, showFilters: true, layout: 'list' })], { anchorId: 'roles', padding: 'lg' }),
      row([cell('form', { heading: 'Submit a Candidate', subheading: 'Fill in the candidate\'s details below. We\'ll review within 48 hours.',
        fields: [
          { label: 'Candidate First Name', type: 'text', required: true }, { label: 'Candidate Last Name', type: 'text', required: true },
          { label: 'Email', type: 'email', required: true }, { label: 'Phone', type: 'phone' },
          { label: 'Role Applied For', type: 'dropdown', options: 'Senior Engineer,Product Manager,Designer,Data Analyst,Other', required: true },
          { label: 'CV / Resume', type: 'file' }, { label: 'Cover Note', type: 'textarea' },
        ],
        submitText: 'Submit Candidate', successMessage: 'Candidate submitted successfully. You\'ll receive confirmation via email.',
      })], { anchorId: 'submit', padding: 'lg', bgColor: '#F3E8FF' }),
      row([cell('content', { heading: 'Submission Guidelines', body: '• Only submit candidates who have given explicit consent\n• Include a current CV in PDF format\n• Ensure contact details are up to date\n• We aim to provide feedback within 5 business days\n• For urgent roles, contact your account manager directly' })], { padding: 'lg' }),
    ],
  }],
};

// ─── AGENCY: PARTNERSHIP DASHBOARD ──────────────────────────────────────────────
const agencyDashboard = {
  id: 'agency_dashboard', name: 'Partnership Dashboard',
  description: 'Data-rich agency dashboard with performance stats, active roles, and submission history.',
  thumbnail: UNSPLASH.office2, type: 'agency_portal', tags: ['stats', 'dashboard', 'tracking'],
  theme: { primaryColor: '#0F766E', secondaryColor: '#14B8A6', accentColor: '#5EEAD4', bgColor: '#F0FDFA', textColor: '#134E4A', fontFamily: 'DM Sans', buttonStyle: 'filled', buttonRadius: '8px', maxWidth: '1200px' },
  nav: { logoText: 'Partner Dashboard', sticky: true, bgColor: '#134E4A', textColor: '#CCFBF1', links: [{ label: 'Overview', href: '#overview' }, { label: 'Roles', href: '#roles' }, { label: 'Submissions', href: '#history' }] },
  footer: { bgColor: '#134E4A', textColor: '#99F6E4', bottomText: '© 2026 Your Company. Recruitment Partner Portal.' },
  pages: [{
    id: uid(), name: 'Dashboard', slug: '/', isDefault: true,
    rows: [
      row([cell('content', { heading: 'Welcome, Partner', body: 'Your performance dashboard and active roles are below. Thank you for your partnership.' })], { padding: 'md' }),
      row([cell('stats', { items: [{ value: '156', label: 'Total submissions' }, { value: '23', label: 'In process' }, { value: '18', label: 'Placements YTD' }, { value: '82%', label: 'Quality score' }], columns: 4, style: 'card' })], { anchorId: 'overview', padding: 'md', bgColor: '#CCFBF1' }),
      row([cell('jobs', { heading: 'Active Roles', showSearch: true, showFilters: true, layout: 'cards' })], { anchorId: 'roles', padding: 'lg' }),
      row([cell('content', { heading: 'Recent Submissions',
        cards: [
          { icon: 'check', title: 'Anna Kowalski → Senior Engineer', desc: 'Submitted Mar 20 · Status: Interview scheduled' },
          { icon: 'clock', title: 'Ben Taylor → Product Manager', desc: 'Submitted Mar 18 · Status: Under review' },
          { icon: 'x', title: 'Clara Chen → UX Designer', desc: 'Submitted Mar 15 · Status: Not progressed — role filled' },
        ],
      })], { anchorId: 'history', padding: 'lg', bgColor: '#F0FDFA' }),
    ],
  }],
};

// ─── AGENCY: MARKETPLACE ────────────────────────────────────────────────────────
const agencyMarketplace = {
  id: 'agency_marketplace', name: 'Marketplace',
  description: 'Browseable job marketplace with filter sidebar, agency branding, and easy submission.',
  thumbnail: UNSPLASH.cityscape, type: 'agency_portal', tags: ['browse', 'marketplace', 'cards'],
  theme: { primaryColor: '#EA580C', secondaryColor: '#FB923C', accentColor: '#FED7AA', bgColor: '#FFF7ED', textColor: '#431407', fontFamily: 'Space Grotesk', buttonStyle: 'filled', buttonRadius: '12px', maxWidth: '1200px' },
  nav: { logoText: 'Talent Marketplace', sticky: true, bgColor: '#431407', textColor: '#FED7AA', links: [{ label: 'Browse Roles', href: '#browse' }, { label: 'Submit', href: '#submit' }, { label: 'Terms', href: '#terms' }] },
  footer: { bgColor: '#431407', textColor: '#FDBA74', bottomText: '© 2026 Your Company. Talent Marketplace for Approved Agencies.' },
  pages: [{
    id: uid(), name: 'Marketplace', slug: '/', isDefault: true,
    rows: [
      row([cell('hero', { heading: 'Talent Marketplace', subheading: 'Browse our full catalogue of open positions. Submit your best candidates and earn top-tier placement fees.', align: 'center', size: 'medium', bgImage: UNSPLASH.cityscape, overlayColor: 'rgba(67, 20, 7, 0.7)' })], { padding: 'none' }),
      row([cell('jobs', { heading: 'Browse All Roles', showSearch: true, showFilters: true, layout: 'cards' })], { anchorId: 'browse', padding: 'lg' }),
      row([cell('form', { heading: 'Quick Submit', subheading: 'Fast-track a candidate submission.',
        fields: [
          { label: 'Candidate Name', type: 'text', required: true }, { label: 'Email', type: 'email', required: true },
          { label: 'Target Role', type: 'text', required: true }, { label: 'CV Upload', type: 'file' }, { label: 'Notes', type: 'textarea' },
        ],
        submitText: 'Submit Candidate', successMessage: 'Received! We\'ll confirm within 24 hours.',
      })], { anchorId: 'submit', padding: 'lg', bgColor: '#FFEDD5' }),
      row([cell('content', { heading: 'Partnership Terms', body: '**Fee Structure:** Standard placement fee is 20% of first-year base salary. Rebate period: 90 days.\n\n**Exclusivity:** Non-exclusive unless otherwise agreed in writing.\n\n**Quality Standards:** We expect all submitted candidates to have been briefed on the role and to have given explicit consent.\n\n**Contact:** For partnership queries, email agency-team@company.com.' })], { anchorId: 'terms', padding: 'lg' }),
    ],
  }],
};

// ─── EXPORT ALL TEMPLATES ───────────────────────────────────────────────────────

export const PORTAL_TEMPLATES = [
  careerModern, careerCorporate, careerCreative,
  hmDashboard, hmReviewBoard, hmMinimal,
  onboardJourney, onboardHub, onboardTimeline,
  agencySubmission, agencyDashboard, agencyMarketplace,
// ── CAMPAIGN PAGE TEMPLATES ───────────────────────────────────────────────────
{
  id: 'campaign_1',
  type: 'campaign',
  name: 'Role Campaign',
  desc: 'High-impact single-page campaign for a specific role or hiring surge',
  accent: '#7C3AED',
  tags: ['Campaign', 'Role', 'Targeted'],
  theme: {
    primaryColor:'#7C3AED', secondaryColor:'#5B21B6',
    bgColor:'#0F0A1E', textColor:'#F9FAFB', accentColor:'#F59E0B',
    fontFamily:"'Space Grotesk', sans-serif", headingFont:"'Space Grotesk', sans-serif",
    fontSize:'16px', headingWeight:'800',
    borderRadius:'12px', buttonStyle:'filled', buttonRadius:'12px', maxWidth:'1100px',
  },
  pages: [
    { id:uid(), name:'Home', slug:'/', rows:[
      { id:uid(), preset:'1',
        bgImage:'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1400&q=80',
        bgColor:'', overlayOpacity:60, padding:'xl',
        cells:[{ id:uid(), widgetType:'hero', widgetConfig:{
          headline:"We're Hiring 50 Engineers.",
          subheading:'Join a team building the future of intelligent software. Remote-first, world-class benefits, and work that actually matters.',
          ctaText:'Apply Now', align:'left',
        }}]},
      { id:uid(), preset:'4', bgColor:'#7C3AED', bgImage:'', overlayOpacity:0, padding:'sm',
        cells:[{ id:uid(), widgetType:'stats', widgetConfig:{ stats:[{value:'50',label:'Open Roles'},{value:'Remote',label:'Work Style'},{value:'$180k+',label:'Comp Range'},{value:'2 wks',label:'To Hire'}]}}]},
      { id:uid(), preset:'3', bgColor:'#160D2E', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Why engineers love it here', content:'No bureaucracy. No endless meetings. Just small teams with big impact, shipping software used by millions.' }},
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'The stack', content:'TypeScript, React, Node.js, PostgreSQL, and a modern AI-powered pipeline. We pick the right tool for the job.' }},
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Your first 90 days', content:'Paired with a senior engineer from day one. First PR merged in week one. Running your first release in month two.' }},
        ]},
      { id:uid(), preset:'1', bgColor:'', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[{ id:uid(), widgetType:'image', widgetConfig:{ url:'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&q=80', alt:'Engineering team', borderRadius:'16px' }}]},
      { id:uid(), preset:'1', bgColor:'#0F0A1E', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[{ id:uid(), widgetType:'jobs', widgetConfig:{ heading:'Open Engineering Roles' }}]},
      { id:uid(), preset:'3', bgColor:'#160D2E', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Compensation', content:'Base $120-$180k plus equity, annual bonus, and salary review every 6 months.' }},
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Remote-first', content:'Work from anywhere. Hubs in Dubai, London and NYC for those who want them.' }},
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Growth', content:'$3k learning budget per year, conference sponsorship, and internal mobility encouraged.' }},
        ]},
      { id:uid(), preset:'1', bgColor:'#0F0A1E', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[{ id:uid(), widgetType:'accordion', widgetConfig:{ heading:'Frequently Asked Questions', items:[
          { q:'What does the interview process look like?', a:'A 30-min intro call, a take-home task (max 3 hours), and a final loop. Total time from apply to offer: under 2 weeks.' },
          { q:'Do I need to relocate?', a:'No. Fully remote-first. Our hubs are entirely optional.' },
          { q:'What experience level are you hiring?', a:'Mid-level through staff engineer. Each listing specifies the level — apply to the one that fits.' },
        ]}}]},
      { id:uid(), preset:'1',
        bgImage:'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1400&q=80',
        bgColor:'', overlayOpacity:70, padding:'xl',
        cells:[{ id:uid(), widgetType:'hero', widgetConfig:{ headline:'Ready to build something great?', subheading:'Applications reviewed within 48 hours. We always let you know either way.', ctaText:'Apply Now', align:'center' }}]},
    ]},
  ],
},

{
  id: 'campaign_2',
  type: 'campaign',
  name: 'Early Careers',
  desc: 'Graduate programmes, internships and entry-level recruitment campaigns',
  accent: '#059669',
  tags: ['Graduate', 'Internship', 'Early Careers'],
  theme: {
    primaryColor:'#059669', secondaryColor:'#0D9488',
    bgColor:'#ECFDF5', textColor:'#064E3B', accentColor:'#7C3AED',
    fontFamily:"'Plus Jakarta Sans', sans-serif", headingFont:"'Plus Jakarta Sans', sans-serif",
    fontSize:'16px', headingWeight:'800',
    borderRadius:'16px', buttonStyle:'filled', buttonRadius:'999px', maxWidth:'1060px',
  },
  pages: [
    { id:uid(), name:'Home', slug:'/', rows:[
      { id:uid(), preset:'2', bgColor:'#064E3B', bgImage:'', overlayOpacity:0, padding:'xl',
        cells:[
          { id:uid(), widgetType:'hero', widgetConfig:{ headline:'Start your career where it counts.', subheading:'Our Graduate Programme turns ambitious graduates into confident professionals — fast. 12 months, real responsibility, mentorship from day one.', ctaText:'Apply for 2026 Cohort', align:'left' }},
          { id:uid(), widgetType:'image', widgetConfig:{ url:'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80', alt:'Young professionals collaborating', borderRadius:'20px' }},
        ]},
      { id:uid(), preset:'4', bgColor:'#059669', bgImage:'', overlayOpacity:0, padding:'md',
        cells:[{ id:uid(), widgetType:'stats', widgetConfig:{ stats:[{value:'12 months',label:'Programme Length'},{value:'4',label:'Rotations'},{value:'92%',label:'Permanent Hire Rate'},{value:'250+',label:'Alumni Network'}]}}]},
      { id:uid(), preset:'1', bgColor:'#F0FDF4', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[{ id:uid(), widgetType:'text', widgetConfig:{ heading:'The journey', content:'Months 1-3: Foundation — orientation, training, your first rotation. Months 4-6: Explore — a second rotation across a different business area. Months 7-9: Deliver — a live project with real ownership. Months 10-12: Lead — present to leadership and secure your permanent offer.' }}]},
      { id:uid(), preset:'2', bgColor:'', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[
          { id:uid(), widgetType:'image', widgetConfig:{ url:'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80', alt:'Graduate cohort', borderRadius:'16px' }},
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Who we are looking for', content:'Any degree, any classification. We care about how you think. We are looking for curious, driven graduates with strong communication skills, comfort with ambiguity, and genuine passion for the industry.' }},
        ]},
      { id:uid(), preset:'3', bgColor:'#ECFDF5', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'"Real ownership from month one."', content:'Sarah K., 2024 cohort, now Product Manager. The programme threw me in at the deep end. My manager trusted me to lead a client project in my second rotation. I made mistakes, learned fast, and never looked back.' }},
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'"Best career decision I ever made."', content:'Marcus T., 2023 cohort, now Senior Analyst. I applied thinking I might get a foot in the door. What I got was a proper career. Two years on I am managing a team of four and working with our biggest clients.' }},
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'"They invest in you like they mean it."', content:'Priya M., 2024 cohort, now UX Designer. Conferences, coaching, a learning budget — they do not just say they invest in people. I went to three conferences in my first year alone.' }},
        ]},
      { id:uid(), preset:'1', bgColor:'#F0FDF4', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[{ id:uid(), widgetType:'accordion', widgetConfig:{ heading:'Your questions answered', items:[
          { q:'When does the 2026 cohort start?', a:'September 2026. Applications close 31 May 2026. We review on a rolling basis — apply early.' },
          { q:'What degree do I need?', a:'Any degree, any classification. We care far more about how you think than what you studied.' },
          { q:'Is the programme paid?', a:'Yes. Competitive graduate salary with full benefits from day one.' },
          { q:'What happens after the programme?', a:'92% of graduates receive a permanent offer based on rotations and preference.' },
        ]}}]},
      { id:uid(), preset:'1',
        bgImage:'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1400&q=80',
        bgColor:'', overlayOpacity:65, padding:'xl',
        cells:[{ id:uid(), widgetType:'hero', widgetConfig:{ headline:'Applications now open for 2026.', subheading:'Cohort sizes are limited. Do not leave it to the last minute.', ctaText:'Apply Now — Takes 15 mins', align:'center' }}]},
    ]},
    { id:uid(), name:'Apply', slug:'/apply', rows:[
      { id:uid(), preset:'1', bgColor:'', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[{ id:uid(), widgetType:'form', widgetConfig:{ title:'Graduate Programme Application 2026', description:'Tell us about yourself. We read every application.' }}]},
    ]},
  ],
},

{
  id: 'campaign_3',
  type: 'campaign',
  name: 'Talent Community',
  desc: 'Alumni networks, talent pools and stay-in-touch communities for future hiring',
  accent: '#0EA5E9',
  tags: ['Alumni', 'Community', 'Talent Pool'],
  theme: {
    primaryColor:'#0EA5E9', secondaryColor:'#0284C7',
    bgColor:'#F0F9FF', textColor:'#0C4A6E', accentColor:'#F59E0B',
    fontFamily:"'DM Sans', sans-serif", headingFont:"'DM Sans', sans-serif",
    fontSize:'16px', headingWeight:'700',
    borderRadius:'10px', buttonStyle:'filled', buttonRadius:'10px', maxWidth:'1100px',
  },
  pages: [
    { id:uid(), name:'Home', slug:'/', rows:[
      { id:uid(), preset:'1',
        bgImage:'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1400&q=80',
        bgColor:'', overlayOpacity:55, padding:'xl',
        cells:[{ id:uid(), widgetType:'hero', widgetConfig:{ headline:'Stay connected. Get first access.', subheading:'Join our talent community and be the first to hear about new roles, events, and news from our team. No spam — just the good stuff.', ctaText:'Join the Community', align:'center' }}]},
      { id:uid(), preset:'3', bgColor:'#E0F2FE', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Early access to roles', content:'Community members hear about new opportunities 2 weeks before public posting. Many are filled before they ever go live.' }},
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Events and webinars', content:'Exclusive access to networking events, industry panels, and skills workshops run by our team and senior leaders.' }},
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Direct recruiter contact', content:'A real person who knows your background. No black holes — we actually respond and keep you updated.' }},
        ]},
      { id:uid(), preset:'4', bgColor:'#0EA5E9', bgImage:'', overlayOpacity:0, padding:'md',
        cells:[{ id:uid(), widgetType:'stats', widgetConfig:{ stats:[{value:'4,200+',label:'Community Members'},{value:'68%',label:'Hired From Community'},{value:'Monthly',label:'Events'},{value:'48hrs',label:'Avg Response'}]}}]},
      { id:uid(), preset:'2', bgColor:'', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Who joins our community?', content:'Former applicants who impressed us but were not right timing. Passive candidates open to the right opportunity. Past colleagues and alumni. Anyone curious about working with us — now or in the future.' }},
          { id:uid(), widgetType:'image', widgetConfig:{ url:'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80', alt:'Community networking event', borderRadius:'16px' }},
        ]},
      { id:uid(), preset:'1', bgColor:'#F0F9FF', bgImage:'', overlayOpacity:0, padding:'lg',
        cells:[{ id:uid(), widgetType:'jobs', widgetConfig:{ heading:'Roles open right now', limit:6 }}]},
      { id:uid(), preset:'2', bgColor:'#0C4A6E', bgImage:'', overlayOpacity:0, padding:'xl',
        cells:[
          { id:uid(), widgetType:'text', widgetConfig:{ heading:'Join in 60 seconds.', content:'Tell us who you are and what you are interested in. We will match you to relevant roles and events. No CV required — share that later if it feels right.' }},
          { id:uid(), widgetType:'form', widgetConfig:{ title:'Join Our Talent Community', description:'We will only contact you with things that are actually relevant.' }},
        ]},
    ]},
  ],
}

];

export const getTemplatesForType = (type) =>
  PORTAL_TEMPLATES.filter(t => t.type === type);

export const applyTemplate = (template, uuidFn) => {
  const idMap = {};
  const replaceId = (oldId) => {
    if (!idMap[oldId]) idMap[oldId] = uuidFn();
    return idMap[oldId];
  };
  const clonePages = (pages) => pages.map(page => ({
    ...page, id: replaceId(page.id),
    rows: (page.rows || []).map(r => ({
      ...r, id: replaceId(r.id),
      cells: (r.cells || []).map(c => ({ ...c, id: replaceId(c.id) })),
    })),
  }));
  return {
    theme: { ...template.theme },
    nav: JSON.parse(JSON.stringify(template.nav || {})),
    footer: JSON.parse(JSON.stringify(template.footer || {})),
    pages: clonePages(template.pages || []),
  };
};
