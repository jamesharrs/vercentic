// Company Profile Data Structure
// This becomes the primary context source for copilot when working on jobs for this company

const companyProfile = {
  // Basic Identity
  id: "company_123",
  name: "Talentos",
  domain: "talentos.io",
  industry: "Technology Recruitment",
  headquarters: "London, UK",
  
  // Brand & Messaging
  brand: {
    tagline: "Connecting exceptional talent with ambitious companies",
    voiceTone: "Professional yet approachable, data-driven but human-centric",
    colorPrimary: "#6366f1",
    colorSecondary: "#8b5cf6",
    logo: "https://cdn.talentos.io/logo.png"
  },

  // Employee Value Proposition (EVP)
  evp: {
    headline: "Build your career where impact meets innovation",
    pillars: [
      {
        title: "Career Growth",
        description: "Clear progression paths with quarterly reviews and mentorship",
        keywords: ["development", "learning", "progression"]
      },
      {
        title: "Work-Life Balance",
        description: "Flexible working, unlimited PTO, and remote-first culture",
        keywords: ["flexibility", "remote", "wellbeing"]
      },
      {
        title: "Competitive Compensation",
        description: "Market-leading salaries, equity, and performance bonuses",
        keywords: ["salary", "equity", "bonus"]
      },
      {
        title: "Innovative Culture",
        description: "Work with cutting-edge tech and solve meaningful problems",
        keywords: ["innovation", "technology", "impact"]
      }
    ]
  },

  // Benefits Package
  benefits: {
    core: [
      "Competitive salary based on experience",
      "Equity/stock options",
      "Private health insurance (medical, dental, vision)",
      "Pension/401k matching up to 5%",
      "25 days annual leave + public holidays",
      "Flexible/remote working"
    ],
    additional: [
      "£1,500 annual learning & development budget",
      "Home office setup allowance (£500)",
      "Monthly wellness stipend (£100)",
      "Team offsites twice per year",
      "Paid parental leave (6 months primary, 2 months secondary)",
      "Cycle to work scheme"
    ],
    perks: [
      "Latest tech equipment (MacBook Pro, etc)",
      "Co-working space memberships",
      "Annual company retreat",
      "Regular team lunches/socials"
    ]
  },

  // Interview Process
  interviewProcess: {
    standard: [
      {
        stage: 1,
        name: "Initial Screen",
        duration: "30 mins",
        format: "Phone/video call with recruiter",
        focusAreas: ["Background fit", "Salary expectations", "Availability"]
      },
      {
        stage: 2,
        name: "Hiring Manager Interview",
        duration: "45-60 mins",
        format: "Video call",
        focusAreas: ["Technical depth", "Experience review", "Culture fit"]
      },
      {
        stage: 3,
        name: "Technical Assessment",
        duration: "2-3 hours",
        format: "Take-home project or live coding session",
        focusAreas: ["Technical skills", "Problem-solving", "Code quality"]
      },
      {
        stage: 4,
        name: "Team Interview",
        duration: "60 mins",
        format: "Meet potential teammates",
        focusAreas: ["Collaboration style", "Communication", "Team dynamics"]
      },
      {
        stage: 5,
        name: "Final Interview",
        duration: "45 mins",
        format: "With C-level executive",
        focusAreas: ["Vision alignment", "Leadership potential", "Offer discussion"]
      }
    ],
    timeline: "Typically 2-3 weeks from application to offer",
    feedback: "We provide detailed feedback at every stage, usually within 48 hours"
  },

  // Culture & Values
  culture: {
    values: [
      {
        name: "Customer Obsession",
        description: "We start with the customer and work backwards"
      },
      {
        name: "Ownership",
        description: "We act like owners, thinking long-term and never saying 'that's not my job'"
      },
      {
        name: "Bias for Action",
        description: "Speed matters in business. We make decisions quickly and iterate"
      },
      {
        name: "Learn and Be Curious",
        description: "We're never done learning and always seek to improve"
      }
    ],
    workingStyle: "Remote-first, async communication, outcome-focused",
    teamSize: 45,
    demographics: {
      engineeringRatio: 0.6,
      averageTenure: "2.5 years",
      diversityCommitment: "50%+ underrepresented groups in leadership"
    }
  },

  // Office Locations
  locations: [
    {
      city: "London",
      country: "UK",
      type: "Headquarters",
      address: "123 Tech Street, London EC2A 1AA",
      facilities: ["Hot desks", "Meeting rooms", "Kitchen", "Rooftop terrace"],
      isRemoteAllowed: true
    },
    {
      city: "Dubai",
      country: "UAE",
      type: "Regional Office",
      address: "Dubai Internet City",
      facilities: ["Dedicated desks", "Meeting rooms", "Prayer room"],
      isRemoteAllowed: true
    }
  ],

  // Tech Stack (for engineering roles)
  techStack: {
    frontend: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
    backend: ["Node.js", "Python", "PostgreSQL", "Redis"],
    infrastructure: ["AWS", "Docker", "Kubernetes", "Terraform"],
    tools: ["GitHub", "Linear", "Slack", "Notion"]
  },

  // Standard Templates
  templates: {
    jobDescriptionStructure: {
      sections: ["About Us", "The Role", "What You'll Do", "What We're Looking For", "Benefits", "Our Process"],
      toneGuidelines: "Use 'you' and 'we' language, avoid jargon, focus on impact not just tasks"
    },
    emailSignature: "Best regards,\n[Name]\n[Title]\nTalentos\ntalentos.io",
    offerLetterBoilerplate: "We're thrilled to extend this offer..."
  },

  // Compliance & Requirements
  compliance: {
    rightToWork: {
      UK: "Must have right to work in UK or valid visa sponsorship pathway",
      UAE: "Visa sponsorship available for qualified candidates"
    },
    backgroundChecks: true,
    dataProtection: "GDPR compliant - all candidate data handled per our privacy policy",
    equalOpportunity: "Equal opportunity employer - we welcome applications from all backgrounds"
  },

  // Hiring Stats (for copilot to reference)
  hiringMetrics: {
    averageTimeToHire: "21 days",
    offerAcceptanceRate: "85%",
    employeeRetentionRate: "92% at 1 year",
    glassdoorRating: 4.6,
    totalEmployees: 45,
    activeOpenings: 8
  }
};

// ============================================================================
// COPILOT CONTEXT INJECTION
// ============================================================================

// When copilot is opened for a job, inject company profile into system prompt
const buildCopilotSystemPrompt = (job, companyProfile) => {
  return `You are Vercentic Copilot, an AI assistant helping to manage recruitment for ${companyProfile.name}.

COMPANY CONTEXT:
You are currently working on the "${job.title}" role at ${companyProfile.name}.

About ${companyProfile.name}:
- Industry: ${companyProfile.industry}
- Tagline: ${companyProfile.brand.tagline}
- Voice & Tone: ${companyProfile.brand.voiceTone}
- Headquarters: ${companyProfile.headquarters}
- Team Size: ${companyProfile.culture.teamSize} employees

EMPLOYEE VALUE PROPOSITION:
${companyProfile.evp.headline}
${companyProfile.evp.pillars.map(p => `- ${p.title}: ${p.description}`).join('\n')}

BENEFITS YOU CAN REFERENCE:
Core Benefits:
${companyProfile.benefits.core.map(b => `- ${b}`).join('\n')}

Additional Benefits:
${companyProfile.benefits.additional.map(b => `- ${b}`).join('\n')}

INTERVIEW PROCESS:
${companyProfile.interviewProcess.standard.map(stage => 
  `Stage ${stage.stage}: ${stage.name} (${stage.duration}) - ${stage.focusAreas.join(', ')}`
).join('\n')}
Timeline: ${companyProfile.interviewProcess.timeline}

COMPANY VALUES:
${companyProfile.culture.values.map(v => `- ${v.name}: ${v.description}`).join('\n')}

${job.department === 'Engineering' ? `
TECH STACK (for engineering roles):
Frontend: ${companyProfile.techStack.frontend.join(', ')}
Backend: ${companyProfile.techStack.backend.join(', ')}
Infrastructure: ${companyProfile.techStack.infrastructure.join(', ')}
` : ''}

LOCATION & WORKING STYLE:
- ${companyProfile.culture.workingStyle}
- Offices: ${companyProfile.locations.map(l => l.city).join(', ')}
${companyProfile.locations.find(l => l.isRemoteAllowed) ? '- Remote working available' : ''}

COMPLIANCE REQUIREMENTS:
${Object.entries(companyProfile.compliance.rightToWork).map(([country, req]) => 
  `- ${country}: ${req}`
).join('\n')}

YOUR ROLE:
- Write job descriptions in ${companyProfile.name}'s voice (${companyProfile.brand.voiceTone})
- Reference specific benefits and EVP when answering candidate questions
- Use the company's interview process when discussing timelines
- Draft emails using the company's tone and signature format
- Help summarize roles using company values as evaluation criteria
- Suggest interview questions aligned with company culture

Always speak as if you're part of the ${companyProfile.name} team, using "we" and "our" when referring to the company.`;
};

// ============================================================================
// COPILOT RESPONSE EXAMPLES WITH COMPANY CONTEXT
// ============================================================================

const exampleResponses = {
  
  // User: "Write a job description for this role"
  writeJD: `I'll write a compelling job description for the Engineering Manager role that aligns with Talentos' voice and EVP.

**Engineering Manager**

**About Us**
At Talentos, we're on a mission to connect exceptional talent with ambitious companies. We're a 45-person team building the future of recruitment technology, and we're looking for an Engineering Manager to help us scale.

**The Role**
As an Engineering Manager at Talentos, you'll lead a team of 6-8 engineers building our core recruitment platform. You'll balance technical leadership with people management, ensuring we ship high-quality features while growing your team's capabilities.

**What You'll Do**
- Lead sprint planning and delivery for our platform team
- Mentor engineers through 1-on-1s and career development conversations
- Partner with Product to define our technical roadmap
- Drive architectural decisions for our React/Node.js stack
- Foster our culture of ownership and bias for action

**What We're Looking For**
- 5+ years software engineering experience, 2+ years managing teams
- Strong technical background in our stack (React, TypeScript, Node.js, PostgreSQL)
- Track record of shipping products and growing engineers
- Comfortable with remote-first, async communication

**Benefits**
- Competitive salary + equity
- 25 days annual leave + public holidays
- £1,500 annual L&D budget
- Private health insurance
- Flexible/remote working across UK and Dubai offices

**Our Process**
We typically move from application to offer in 2-3 weeks:
1. Initial screen (30 mins)
2. Hiring manager interview (60 mins)
3. Technical discussion (60 mins)
4. Team interview (60 mins)
5. Final interview with CTO

We provide detailed feedback at every stage, usually within 48 hours.

Talentos is an equal opportunity employer - we welcome applications from all backgrounds.`,

  // User: "What benefits can I mention to this candidate?"
  benefitsQuestion: `Based on Talentos' benefits package, here's what you can highlight:

**Core Benefits:**
- Competitive salary (market-leading for this role)
- Equity/stock options
- Private health insurance (medical, dental, vision)
- Pension matching up to 5%
- 25 days annual leave + public holidays
- Flexible/remote working

**Standout Perks:**
- £1,500 annual learning budget (conferences, courses, books)
- £500 home office setup allowance
- £100 monthly wellness stipend
- 6 months primary parental leave (2 months secondary)
- Team offsites twice per year

**For this senior engineering role specifically:**
- Latest tech equipment (MacBook Pro, monitors, etc)
- Co-working space memberships if working remotely
- Access to our annual company retreat

The L&D budget and career growth support align well with our "Build your career where impact meets innovation" EVP.`,

  // User: "What's our interview timeline?"
  interviewTimeline: `Our standard interview process for this Engineering Manager role runs 2-3 weeks from application to offer:

**Stage 1: Initial Screen** (30 mins)
Phone/video with recruiter covering background fit, salary expectations, availability

**Stage 2: Hiring Manager Interview** (60 mins)
Video call with the Engineering Director - technical depth and experience review

**Stage 3: Technical Assessment** (2-3 hours)
Either take-home project or live coding session focusing on system design

**Stage 4: Team Interview** (60 mins)
Meet potential team members to assess collaboration style and communication

**Stage 5: Final Interview** (45 mins)
With our CTO to discuss vision alignment and offer details

We pride ourselves on quick feedback - you'll hear back within 48 hours after each stage. This aligns with our "Bias for Action" value - we move fast but thoughtfully.`,

  // User: "Draft an email to this candidate about our culture"
  cultureEmail: `Subject: Engineering Manager Role - What Makes Talentos Different

Hi [Candidate Name],

Thanks for your interest in the Engineering Manager position. I wanted to share a bit about what makes Talentos unique.

We're a 45-person team building recruitment tech with a clear set of values:

**Customer Obsession** - We start with the customer and work backwards
**Ownership** - We act like owners, never saying "that's not my job"
**Bias for Action** - Speed matters; we make decisions quickly and iterate
**Learn and Be Curious** - We're never done learning and always seek to improve

Our engineering team (about 60% of the company) works in a remote-first, async style. You'd be leading 6-8 engineers across our London and Dubai offices, with full flexibility on where you work.

We invest heavily in development - £1,500/year L&D budget, quarterly career reviews, and a strong mentorship culture. Our retention is 92% at 1 year because we genuinely care about growth.

The tech stack is modern (React, TypeScript, Node.js, PostgreSQL on AWS) and we ship fast - our average sprint cycle is 2 weeks.

Happy to jump on a call to discuss further if this resonates.

Best regards,
[Your Name]
[Your Title]
Talentos
talentos.io`
};

// ============================================================================
// COPILOT CAPABILITIES WITH COMPANY CONTEXT
// ============================================================================

const copilotCapabilities = {
  
  "Draft Job Description": {
    usesCompanyContext: [
      "brand.voiceTone",
      "evp.pillars",
      "benefits.core",
      "interviewProcess.timeline",
      "techStack (if engineering)",
      "culture.workingStyle",
      "templates.jobDescriptionStructure"
    ],
    example: "Creates JD matching Talentos voice with accurate benefits and process"
  },

  "Answer Candidate Questions": {
    usesCompanyContext: [
      "benefits.core + benefits.additional",
      "culture.values",
      "locations",
      "techStack",
      "hiringMetrics",
      "compliance.rightToWork"
    ],
    example: "When asked 'What's the remote policy?', references culture.workingStyle and locations"
  },

  "Draft Outreach Email": {
    usesCompanyContext: [
      "brand.tagline",
      "brand.voiceTone",
      "evp.headline",
      "templates.emailSignature",
      "culture.values"
    ],
    example: "Writes emails that sound like they're from Talentos, not generic recruiter spam"
  },

  "Summarize Candidate": {
    usesCompanyContext: [
      "culture.values",
      "techStack (for fit assessment)",
      "job.requirements"
    ],
    example: "Evaluates candidate against 'Ownership' and 'Bias for Action' values"
  },

  "Suggest Interview Questions": {
    usesCompanyContext: [
      "culture.values",
      "interviewProcess.standard[stage].focusAreas",
      "techStack"
    ],
    example: "For 'Hiring Manager Interview', suggests questions probing technical depth + culture fit"
  },

  "Explain Benefits": {
    usesCompanyContext: [
      "benefits.core",
      "benefits.additional",
      "benefits.perks",
      "evp.pillars"
    ],
    example: "When candidate asks 'What's the PTO policy?', cites '25 days + public holidays' and connects to Work-Life Balance pillar"
  },

  "Draft Offer": {
    usesCompanyContext: [
      "templates.offerLetterBoilerplate",
      "benefits (full package)",
      "compliance.backgroundChecks",
      "locations.address"
    ],
    example: "Generates compliant offer letter with correct legal entity and benefits"
  }
};

module.exports = {
  companyProfile,
  buildCopilotSystemPrompt,
  exampleResponses,
  copilotCapabilities
};
