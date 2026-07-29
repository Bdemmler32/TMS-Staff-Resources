# TMS Staff Resources — v0.35

**One tool, three tabs: Work Schedules, Organization Chart, and Directory — all reading from a single Excel workbook.**

This replaced the two previous standalone tools (`intranetSched` and `tms-org-chart`), rebuilt from scratch rather than patched, and has grown substantially since. This README reflects the tool as of v0.35 — see [Version Note](#version-note) at the bottom for how versioning works going forward.

---

## Package Structure

```
tms-staff-resources/
├── index.html                    ← Entry point (all three tabs, all modals)
├── styles.css                    ← All styling
├── common.js                     ← Shared helpers (photo handling, icons, toasts, clipboard copy)
├── data.js                       ← Loads & parses TMS_Staff_Resource_File.xlsx
├── schedule.js                   ← Work Schedules tab
├── orgchart.js                   ← Organization Chart tab + Directory tab + their PDF exports
├── directory-exports.js          ← The Directory tab's other 3 PDF export options
├── tour.js                       ← Onboarding tour (the ? icon next to the version number)
├── app.js                        ← Tab switching, expand/collapse shell, init
├── TMS_Staff_Resource_File.xlsx  ← ⭐ All staff data — the only file you should need to edit
├── assets/
│   ├── tms-logo.png
│   └── headshots/                ← Staff headshot JPGs (filenames must match the Photo column)
└── README.md
```

**Important:** this loads the xlsx via `fetch`, so it must be served from a web server (`python -m http.server`, Apache, Nginx, S3, Netlify, etc.) — it will not work opened directly as a local file (`file://`).

---

## The Data File

Everything in the tool — schedules, org chart, directory, and every PDF export — comes from **one workbook**: `TMS_Staff_Resource_File.xlsx`. Keep it under that exact filename; the tool fetches it by name. When you get an updated file, just replace this one (same name).

### Person sheets
Each staff member has their own sheet (e.g. `Arbuckle, A`). Column C holds each value:

| Row | Field | Notes |
|-----|-------|-------|
| 1 | First Name | |
| 2 | Last Name | |
| 3 | Title | |
| 4 | Birthdate | Shown on profile cards/modals; used for the Directory's Birthday sort and Photo Directory data |
| 5 | Id | **Format: `LastName-FirstName`** (e.g. `Arbuckle-Alicia`). Must be unique. Links `Reporting` and names the photo file. |
| 6 | Direct | Direct phone number. End with `*` (e.g. `724-814-3146*`) to show the text-messaging-hours footnote wherever this number appears. |
| 7 | Ext | Phone extension |
| 8 | Mobile | Mobile number — leave blank if none. Same `*` convention as Direct. |
| 9 | Email | |
| 10 | Photo | Filename in `assets/headshots/` — leave blank if no photo (shows a "photo unavailable" placeholder instead) |
| 11 | Dept ID | Must match an id in the Departments table on the Admin sheet |
| 12 | Role | `executive`, `deputy`, `exec_staff`, `dept_head`, `manager`, or `staff` |
| 13 | Reporting | The `Id` of this person's manager/supervisor |
| 14 | Description | Optional bio shown in the profile modal |

Below that, the same sheet has the two-week schedule grid (Work Blocks 1–5 per day, Week 1 and Week 2 — unchanged from the original Work Schedules form).

### Admin sheet
- **Departments table**: `id` / `name` / `color` per department. Available colors: `exec` (red), `yellow`, `green`, `orange`, `blue`, `pink`.
- **Meta table**: `shortName`, `address`, `phone`, `fax`, `website`, `version`. The `version` value here is what displays as the version badge in the app header and drives the filename convention below.
- **Last Updated**: shown throughout the tool and in PDF exports.

### FormTools sheet
Reference/dropdown data for the fill-in-your-own-schedule form. Not read by this display tool.

---

## Adding Staff Photos

Drop a JPG into `assets/headshots/` with a filename that **exactly matches** the `Photo` column value for that person (e.g. `ArbuckleAlicia.jpg`). Anyone whose photo file is missing or fails to load automatically shows a "photo unavailable" placeholder (initials + icon) instead of a broken image.

## Adding / Removing / Changing Staff

- **Add:** duplicate an existing person sheet, rename the tab, fill in all fields, add their headshot.
- **Remove:** delete their sheet. If they were a `manager`, their reports fall back to showing as direct department members in the Org Chart.
- **Reassign/promote:** update `Dept ID`, `Role`, and `Reporting` — no code changes required.
- **New department:** add a row to the Departments table on the Admin sheet, then set staff `Dept ID` to match.

---

## Features by Tab

### Work Schedules
Browse the current biweekly pay-period schedule; navigate week-to-week or jump to any date via the calendar picker; filter to specific staff or Office-Hours-Only (hides anyone with zero in-office hours that week); Today's column is highlighted automatically, and clicking any day header (or the Staff header, for everyone regardless of day) changes which day **Copy Emails** uses. Copy Emails copies the addresses of everyone currently shown with hours on the selected reference day, ready to paste into Outlook, with a confirmation toast. Click a staff photo to open their profile; click their name to jump straight to their two-week schedule. Office/Remote time blocks are color-coded (coral/purple) with distinct icons.

### Organization Chart
Hierarchical, color-coded by department, with manager/report indentation and live search. **Export PDF** renders a single scaled-to-fit landscape page — it always clears any active search first so the export includes everyone, then restores your search afterward.

### Directory
Card grid of all staff, sortable by A–Z (default), Role, Department, or upcoming Birthday, with live search and a contact bar (address/phone/fax/website — address and fax are click-to-copy). **Export PDF** opens a choice of four PDFs:

1. **Staff Phone Directory** — full detail (photo, title, direct, ext, email, mobile), alphabetical by last name.
2. **Staff Phone Directory (Direct Dials Only)** — a printable lobby-poster (single page, scaled to fill it), name + direct line only, two columns, with your Visitors/Deliveries signage text.
3. **Staff Photo Directory** — one page per department (Executive always first, then the rest alphabetically), large photo + name + title + email per card. If a department doesn't fit on one page, it spills onto additional pages labeled "(Continued.)".
4. **Staff Birthdays List** — just names and birthdays, alphabetical by last name.

All exports pull the complete staff list directly regardless of any active Directory search.

---

## Onboarding Tour

Click the **?** icon next to the version badge in the header to replay a 12-step guided tour. It's a live spotlight walkthrough — it highlights real elements on the page and switches tabs automatically as needed, rather than showing static screenshots.

---

## Accessibility

- Base font size is 16px throughout, with one flagged exception: schedule-grid time-pill text, which is deliberately allowed to scale down (via container queries) so a full time range always fits on one line rather than wrapping or truncating.
- All interactive elements have a visible focus outline.
- Photo placeholders and icons carry `alt`/`aria-label` text; modals use `aria-modal` and return focus to the close button on open.

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

## Version Note

The **in-app version badge** always reflects the `version` value on the workbook's Admin > Meta sheet — update it there when you update staff data, and the app picks it up automatically.

The **delivered package filename** is a separate, sequential thing: starting with this delivery, each package zip is named with its version number (e.g. `tms-staff-resources-v0.35.zip`), incrementing with each round of changes, so you can tell deliveries apart at a glance without opening them.

---

*TMS — The Minerals, Metals & Materials Society | tms.org | v0.35*
