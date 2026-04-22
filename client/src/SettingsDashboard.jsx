import { useState } from "react";
import { usePermissions } from "./PermissionContext.jsx";

// Matches the NAV_GROUPS in Settings.jsx — ids must be identical
const DASHBOARD_GROUPS = [
  {
    id: "preferences", label: "Your Preferences", color: "#4f46e5",
    items: [
      { id:"appearance",    icon:"sun",      label:"Appearance",      desc:"Theme, colour scheme, font and density" },
      { id:"language",      icon:"globe",    label:"Language",        desc:"Interface language and regional format" },
      { id:"notifications", icon:"bell",     label:"Notifications",   desc:"Manage your notification preferences" },
      { id:"company_profile",icon:"building",label:"Company Profile", desc:"Logo, brand name and company details" },
    ],
  },
  {
    id: "people", label: "People & Access", color: "#0891b2",
    items: [
      { id:"users",   icon:"users",      label:"Users",              desc:"Invite and manage platform users",          perm:"manage_users" },
      { id:"groups",  icon:"layers",     label:"Groups",             desc:"Organise users into teams and groups",      perm:"manage_users" },
      { id:"roles",   icon:"shield",     label:"Roles & Permissions",desc:"Define what each role can see and do",      perm:"manage_roles" },
      { id:"org",     icon:"git-branch", label:"Org Structure",      desc:"Build your organisational hierarchy",       perm:"manage_org_structure" },
    ],
  },
  {
    id: "security", label: "Security", color: "#dc2626",
    items: [
      { id:"security", icon:"lock",      label:"Security",           desc:"Password policy, MFA and SSO settings",    perm:"manage_roles" },
      { id:"sessions", icon:"activity",  label:"Active Sessions",    desc:"View and revoke live user sessions",        perm:"manage_roles" },
      { id:"audit",    icon:"file-text", label:"Audit Log",          desc:"Full trail of system activity and changes", perm:"view_audit_log" },
    ],
  },
  {
    id: "schema", label: "Data & Schema", color: "#059669",
    items: [
      { id:"datamodel",   icon:"database",    label:"Data Model",       desc:"Configure objects, fields and field types",     perm:"manage_data_model" },
      { id:"duplicates",  icon:"copy",        label:"Duplicates",       desc:"Merge rules and duplicate detection settings",  perm:"manage_data_model" },
      { id:"file_types",  icon:"paperclip",   label:"File Types",       desc:"Define file categories and extraction rules",   perm:"manage_data_model" },
      { id:"company_docs",icon:"file-text",   label:"Company Documents",desc:"Shared documents available across the platform" },
      { id:"forms",       icon:"clipboard",   label:"Forms",            desc:"Build forms to capture structured data",         perm:"manage_forms" },
      { id:"questions",   icon:"help-circle", label:"Question Library", desc:"Reusable questions for interviews and surveys" },
      { id:"datasets",    icon:"layers",      label:"Data Sets",        desc:"Manage shared data sets and lookup values" },
      { id:"enterprise",  icon:"briefcase",   label:"Enterprise",       desc:"Enterprise-specific configuration options",      perm:"manage_roles" },
    ],
  },
  {
    id: "processes", label: "Processes", color: "#7c3aed",
    items: [
      { id:"brand_kits",      icon:"palette",   label:"Brand Kits",      desc:"Manage brand colours, fonts and assets" },
      { id:"email_templates", icon:"mail",      label:"Email Templates", desc:"Create and manage reusable email templates" },
      { id:"talent_profile",  icon:"user",      label:"Talent Profile",  desc:"Configure the candidate talent profile card" },
      { id:"workflows",       icon:"zap",       label:"Workflows",       desc:"Automate steps, triggers and AI actions",       perm:"manage_workflows" },
      { id:"portals",         icon:"globe",     label:"Portals",         desc:"Career sites, HM portals and external experiences", perm:"manage_portals" },
      { id:"sandbox",         icon:"git-branch",label:"Sandbox Manager", desc:"Test configuration changes before going live",   perm:"manage_roles" },
    ],
  },
  {
    id: "ai", label: "AI", color: "#b45309",
    items: [
      { id:"ai_governance", icon:"sparkles", label:"AI Governance",   desc:"Usage policies, content controls and audit" },
      { id:"ai_matching",   icon:"target",   label:"Recommendations", desc:"Configure candidate-to-job recommendation rules" },
      { id:"agents",        icon:"cpu",      label:"Agents",          desc:"Configure AI agents and their capabilities" },
    ],
  },
  {
    id: "system", label: "System", color: "#64748b",
    items: [
      { id:"integration_hub", icon:"link",     label:"Integrations",   desc:"Connect email, SMS, WhatsApp and third-party tools", perm:"manage_integrations" },
      { id:"feature-flags",   icon:"flag",     label:"Feature Flags",  desc:"Enable or disable platform features per environment",  perm:"manage_roles" },
      { id:"config",          icon:"download", label:"Import / Export",desc:"Bulk import data or export configuration",             perm:"manage_roles" },
    ],
  },
];

const PATHS = {
  sun:           "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41M12 7a5 5 0 100 10A5 5 0 0012 7z",
  globe:         "M12 2a10 10 0 100 20A10 10 0 0012 2zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  building:      "M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V11h6v10",
  users:         "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  layers:        "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  shield:        "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  "git-branch":  "M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9",
  lock:          "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  activity:      "M22 12h-4l-3 9L9 3l-3 9H2",
  "file-text":   "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  database:      "M12 2C6.477 2 2 4.239 2 7s4.477 5 10 5 10-2.239 10-5S17.523 2 12 2zM2 7v5c0 2.761 4.477 5 10 5s10-2.239 10-5V7M2 12v5c0 2.761 4.477 5 10 5s10-2.239 10-5v-5",
  paperclip:     "M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48",
  clipboard:     "M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M9 2h6a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1V3a1 1 0 011-1z",
  "help-circle": "M12 22a10 10 0 100-20 10 10 0 000 20zM9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01",
  briefcase:     "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  zap:           "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  cpu:           "M18 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2zM9 9h6v6H9z",
  sparkles:      "M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z",
  target:        "M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z",
  link:          "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  download:      "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  copy:          "M20 9H11a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1",
  flag:          "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7",
  bell:          "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  palette:       "M12 2a10 10 0 100 20 10 10 0 000-20zM12 8a2 2 0 110 4 2 2 0 010-4zM6.93 15a7 7 0 0110.14 0",
  mail:          "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  user:          "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  globe2:        "M12 2a10 10 0 100 20A10 10 0 0012 2z",
};

function Ic({ n, s = 16, c = "currentColor" }) {
  const d = PATHS[n] || PATHS["help-circle"];
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  );
}

export default function SettingsDashboard({ onNavigate, searchQuery = "" }) {
  const [hovered, setHovered] = useState(null);
  const { canGlobal } = usePermissions();
  const q = searchQuery.trim().toLowerCase();

  const filtered = DASHBOARD_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => {
      // Permission gate — items with no perm always show
      if (item.perm && !canGlobal(item.perm)) return false;
      // Search filter
      if (q && !item.label.toLowerCase().includes(q) &&
               !item.desc.toLowerCase().includes(q) &&
               !group.label.toLowerCase().includes(q)) return false;
      return true;
    }),
  })).filter(g => g.items.length > 0);

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--t-text1)", margin: "0 0 4px" }}>
          Settings
        </h1>
        <p style={{ fontSize: 13, color: "var(--t-text3)", margin: 0 }}>
          Configure your workspace, team access, data model and integrations.
        </p>
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--t-text3)" }}>
          <Ic n="help-circle" s={32} c="var(--t-text3)" />
          <div style={{ marginTop: 12, fontSize: 14 }}>No settings match "{searchQuery}"</div>
        </div>
      )}

      {filtered.map(group => (
        <div key={group.id} style={{ marginBottom: 28 }}>
          {/* Group heading */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 3, height: 14, borderRadius: 99, background: group.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--t-text3)",
              letterSpacing: "0.07em", textTransform: "uppercase" }}>
              {group.label}
            </span>
          </div>

          {/* Card grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10 }}>
            {group.items.map(item => {
              const isHov = hovered === `${group.id}-${item.id}`;
              return (
                <button key={item.id}
                  onClick={() => onNavigate(item.id)}
                  onMouseEnter={() => setHovered(`${group.id}-${item.id}`)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    background: "var(--t-surface)",
                    border: `1.5px solid ${isHov ? group.color : "var(--t-border)"}`,
                    borderRadius: 12,
                    boxShadow: isHov ? `0 4px 14px ${group.color}20` : "0 1px 3px rgba(0,0,0,0.04)",
                    cursor: "pointer",
                    transition: "all .15s",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    transform: isHov ? "translateY(-1px)" : "none",
                    fontFamily: "inherit",
                  }}>
                  {/* Icon bubble */}
                  <div style={{
                    width: 34, height: 34, borderRadius: 9, flexShrink: 0, marginTop: 1,
                    background: isHov ? group.color : `${group.color}15`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background .15s",
                  }}>
                    <Ic n={item.icon} s={15} c={isHov ? "white" : group.color} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 700, marginBottom: 2,
                      color: isHov ? group.color : "var(--t-text1)",
                      transition: "color .15s",
                    }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--t-text3)", lineHeight: 1.5 }}>
                      {item.desc}
                    </div>
                  </div>

                  {/* Arrow */}
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                    stroke={isHov ? group.color : "var(--t-text3)"}
                    strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
                    style={{ flexShrink: 0, marginTop: 3, opacity: isHov ? 1 : 0.35, transition: "all .15s" }}>
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
