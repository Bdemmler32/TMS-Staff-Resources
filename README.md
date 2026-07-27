# TMS Staff Resources — v1.0

**One tool, three tabs: Work Schedules, Organizational Chart, and Directory — all reading from a single Excel workbook.**

This replaces the two previous standalone tools (`intranetSched` and `tms-org-chart`). It was rebuilt from scratch (not patched) to read the new merged data file, while keeping the look, feel, and interactions of both original tools.

---

## Package Structure

```
tms-staff-resources/
├── index.html                    ← Entry point (all three tabs)
├── styles.css                    ← All styling (16px+ base type, TMS red frame, dept colors)
├── common.js                     ← Shared helpers (photo handling, icons, escaping)
├── data.js                       ← Loads & parses TMS_Staff_Resource_File.xlsx
├── schedule.js                   ← Work Schedules tab
├── orgchart.js                   ← Organizational Chart tab + Directory tab
├── app.js                        ← Tab switching, expand/collapse shell, init
├── TMS_Staff_Resource_File.xlsx  ← ⭐ All staff data — the only file you need to edit
├── assets/
│   ├── tms-logo.png
│   └── headshots/                ← Empty — add staff headshot JPGs here (see below)
└── README.md
```

**Important:** like the previous tools, this loads the xlsx via `fetch`, so it must be served from a web server (`python -m http.server`, Apache, Nginx, S3, Netlify, etc.) — it will not work opened directly as a local file (`file://`).

---

## The Data File

Everything — org chart, directory, and schedules — comes from **one workbook**: `TMS_Staff_Resource_File.xlsx`. Keep it under that exact filename; the tool fetches it by name and doesn't look for anything date-stamped. When you get an updated file from HR/admin, just replace this one (same name) rather than adding a new dated copy.

### Person sheets
Each staff member has their own sheet (e.g. `Arbuckle, A`). Column C holds each value:

| Row | Field | Notes |
|-----|-------|-------|
| 1 | First Name | |
| 2 | Last Name | |
| 3 | Title | |
| 4 | Birthdate | Shown on profile cards/modals and usable for the Directory's Birthday sort |
| 5 | Id | **Format: `LastName-FirstName`** (e.g. `Arbuckle-Alicia`). Must be unique. Used to link `Reporting` and to name the photo file. |
| 6 | Direct | Direct phone number |
| 7 | Ext | Phone extension |
| 8 | Mobile | Mobile phone number — leave blank if none |
| 9 | Email | |
| 10 | Photo | Filename in `assets/headshots/` — leave blank if no photo |
| 11 | Dept ID | Must match an id in the Departments table on the Admin sheet |
| 12 | Role | `executive`, `deputy`, `exec_staff`, `dept_head`, `manager`, or `staff` |
| 13 | Reporting | The `Id` of this person's manager/supervisor |
| 14 | Description | Optional bio shown in the profile modal |

**Text-messaging note:** if a `Direct` or `Mobile` value ends in `*` (e.g. `724-814-3146*`), the tool strips the `*` from the displayed number and shows a footnote wherever that number appears: "Text-Messaging only available during AM and MST."

Below that, the same sheet has the two-week schedule grid (unchanged from the original Work Schedules form — Work Blocks 1–5 per day, Week 1 and Week 2).

### Admin sheet
- **Departments table**: `id` / `name` / `color` per department. Available colors: `exec` (red), `yellow`, `green`, `orange`, `blue`, `pink`.
- **Meta table**: organization name, address, phone, fax, website, version.
- **Last Updated**: shown in the header of the tool.

### FormTools sheet
Reference/dropdown data for the fill-in-your-own-schedule form. Not read by this display tool — leave as-is.

---

## Adding Staff Photos

1. Drop the JPG into `assets/headshots/`.
2. Make sure the filename **exactly matches** the `Photo` column value for that person in the workbook (e.g. `ArbuckleAlicia.jpg`).
3. Anyone whose photo file isn't present yet (or fails to load) automatically shows a clearly-labeled "photo unavailable" placeholder (initials + a small icon) instead of a broken image or a photo that could be mistaken for a real one.

---

## Adding / Removing / Changing Staff

- **Add:** duplicate an existing person sheet, rename the tab, fill in all the fields, and add their headshot.
- **Remove:** delete their sheet. If they were a `manager`, their reports automatically fall back to showing as direct department members in the Org Chart.
- **Reassign / promote:** update `Dept ID`, `Role`, and `Reporting` as needed — no code changes required.
- **New department:** add a row to the Departments table on the Admin sheet, then set staff `Dept ID` to match.

---

## Features by Tab

**Work Schedules** — functions exactly as the original standalone tool did: browse the current biweekly pay-period schedule, navigate week-to-week, jump to any date via the calendar picker, filter to specific staff or office-hours-only, and click any name for their full two-week schedule.

**Organizational Chart** — hierarchical, color-coded by department, with manager/report indentation and live search. **Export PDF** (top-right, only shown on this tab) renders a single 11×8.5" landscape page with the chart scaled to fit — it never spans multiple pages.

**Directory** — card grid of all staff, sortable by Role, A–Z (last name), or Department, with live search.

All three tabs share one profile modal (click any staff card/name in Org Chart or Directory) showing photo, title, department, extension, direct line, email, and bio.

---

## Accessibility

- Base font size is 16px (1rem) throughout, per EAA/WCAG guidance.
- All interactive elements have a visible focus outline.
- Work-location values (Office/Remote/Travel/PTO) are shown as an icon inside each time pill rather than repeated text, keeping schedule rows compact at the larger type size.
- Photo placeholders and icons carry `alt`/`aria-label` text; modals use `aria-modal` and return focus to the close button on open.

This is a first accessibility pass — flag anything that still needs attention (contrast, specific screen-reader behavior, keyboard-only walkthroughs) and we can tighten further.

---

## Integration into tms.org

**Iframe embed:**
```html
<iframe src="/staff/tms-staff-resources/index.html"
        width="100%" height="900px"
        style="border:none;"
        title="TMS Staff Resources">
</iframe>
```

**Direct page:** upload the whole `tms-staff-resources/` folder to your server and link to `index.html` directly.

---

*TMS — The Minerals, Metals & Materials Society | tms.org | v1.0*
