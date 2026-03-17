const en = {
  // ── Nav ─────────────────────────────────────────────────────────────────────
  nav: {
    overview: "OVERVIEW", recruit: "RECRUIT", tools: "TOOLS", configure: "CONFIGURE",
    dashboard: "Dashboard", orgChart: "Org Chart", interviews: "Interviews",
    calendar: "Calendar", offers: "Offers", agents: "Agents",
    aiMatching: "AI Matching", reports: "Reports", search: "Search",
    settings: "Settings", apiConnected: "API Connected",
  },

  // ── Dashboard ────────────────────────────────────────────────────────────────
  dashboard: {
    goodMorning: "Good morning", goodAfternoon: "Good afternoon", goodEvening: "Good evening",
    refresh: "Refresh", totalCandidates: "Total Candidates", openJobs: "Open Jobs",
    talentPools: "Talent Pools", placed: "Placed", active: "active",
    totalRoles: "total roles", curatedPipelines: "curated pipelines",
    totalPlacements: "total placements", vsLastMonth: "vs last month",
    hiringActivity: "Hiring Activity", recordsAddedPerMonth: "Records added per month this year",
    candidates: "Candidates", jobs: "Jobs", jobsPipeline: "Jobs Pipeline",
    noDataYet: "No data yet for this year", noDepartmentData: "No department data yet",
    noActivityYet: "No activity yet", recentActivity: "Recent Activity",
    openReqsByDept: "Open Reqs by Department", report: "Report",
  },

  // ── Settings ─────────────────────────────────────────────────────────────────
  settings: {
    title: "Settings", systemAdmin: "SYSTEM ADMIN",
    appearance: "Appearance", auditLog: "Audit Log", dataModel: "Data Model",
    integrations: "Integrations", importExport: "Import / Export",
    orgStructure: "Org Structure", portals: "Portals",
    rolesPermissions: "Roles & Permissions", security: "Security",
    activeSessions: "Active Sessions", users: "Users", workflows: "Workflows",
  },

  // ── Appearance ───────────────────────────────────────────────────────────────
  appearance: {
    title: "Appearance", subtitle: "Personalise your workspace theme and layout.",
    mode: "Mode", light: "Light", dark: "Dark",
    colour: "Colour", font: "Font", density: "Density",
    language: "Language", selectLanguage: "Select language",
    generateTranslations: "Generate translations",
    translationsGenerated: "Translations generated!",
    generatingTranslations: "Generating…",
  },

  // ── Common actions ───────────────────────────────────────────────────────────
  actions: {
    save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit",
    create: "Create", add: "Add", remove: "Remove", search: "Search",
    filter: "Filter", export: "Export", import: "Import", close: "Close",
    confirm: "Confirm", back: "Back", next: "Next", submit: "Submit",
    yes: "Yes", no: "No", ok: "OK", loading: "Loading…", saving: "Saving…",
    newRecord: "+ Create", selectAll: "Select all", clearAll: "Clear all",
  },

  // ── Records / Objects ────────────────────────────────────────────────────────
  records: {
    noRecordsYet: "No records yet", createFirstRecord: "Create your first record to get started",
    record: "record", records: "records", selected: "selected",
    editFields: "Edit fields", deleteSelected: "Delete",
    searchPlaceholder: "Search…", filterBy: "Filter by",
    bulkEditTitle: "Set field on {count} records",
    chooseField: "Choose field…", apply: "Apply",
    sureDelete: "Sure?", yesDelete: "Yes, delete",
    selectPerson: "Select person…", selectPeople: "Select people…",
    activities: "Activities", notes: "Notes", attachments: "Attachments",
    relationships: "Relationships", noActivity: "No activity yet",
  },

  // ── Interviews ───────────────────────────────────────────────────────────────
  interviews: {
    title: "Interviews", types: "Types", scheduled: "Scheduled",
    newType: "New interview type", scheduleInterview: "Schedule interview",
    noTypesYet: "No interview types yet",
    noTypesDesc: "Create your first interview type — like a Calendly event type — to start scheduling with candidates.",
    createType: "Create interview type", noInterviewsScheduled: "No interviews scheduled",
    upcoming: "Upcoming", past: "Past",
    duration: "Duration", format: "Format", location: "Location / Video Link",
    bufferBefore: "Buffer Before (min)", bufferAfter: "Buffer After (min)",
    maxPerDay: "Max/day (0=unlimited)", interviewers: "Interviewers",
    availability: "Availability", description: "Description",
    details: "Details", copyLink: "Copy link", copied: "Copied!",
    schedule: "Schedule", candidate: "Candidate", job: "Job (optional)",
    date: "Date", time: "Time", notes: "Notes",
    schedulingInterview: "Scheduling…", scheduleBtn: "Schedule Interview",
    setBusinessHours: "Set business hours", slotsSelected: "slots selected",
    addInterviewers: "Add interviewers…", noMatches: "No matches",
    selectCandidate: "Select candidate…", selectJob: "Select job…",
    prepNotes: "Any prep notes for the interviewer…",
    confirmed: "Confirmed", pending: "Pending", completed: "Completed",
    editType: "Edit Interview Type", newTypeTitle: "New Interview Type",
    min: "min",
  },

  // ── Org Chart ────────────────────────────────────────────────────────────────
  orgChart: {
    title: "Org Chart", structure: "Structure", people: "People",
    vacancies: "Vacancies", unassigned: "unassigned", department: "Department",
    allDepartments: "All Departments", zoomIn: "Zoom in", zoomOut: "Zoom out",
    fitToScreen: "Fit to screen", exportPdf: "Export PDF",
    noOrgYet: "No org structure yet",
    noOrgDesc: "Start by creating a top-level company or region unit.",
    addUnit: "Add unit", noPeopleInUnit: "No people in this unit",
    addPerson: "Add existing person", createRole: "Create open role",
    openVacancies: "open vacancies",
  },

  // ── Status labels ────────────────────────────────────────────────────────────
  status: {
    open: "Open", closed: "Closed", draft: "Draft", active: "Active",
    inactive: "Inactive", pending: "Pending", approved: "Approved",
    rejected: "Rejected", filled: "Filled", onHold: "On Hold",
    unknown: "Unknown",
  },
};

export default en;
