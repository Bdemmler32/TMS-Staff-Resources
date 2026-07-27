/**
 * TMS Staff Resources — data.js
 * Loads and parses the single merged workbook (TMS_Staff_Resource_File.xlsx) into
 * shared, in-memory data structures used by the Work Schedules, Org Chart, and
 * Directory tabs.
 *
 * Workbook shape (one file, per-person tabs):
 *   - "Admin" sheet: Departments table + Meta key/value table + last-updated date
 *   - "FormTools" sheet: dropdown/reference data for the fill-in form (not used here)
 *   - One sheet per staff member, named like "Arbuckle, A", containing:
 *       C1  First Name        C8  Mobile
 *       C2  Last Name         C9  Email
 *       C3  Title             C10 Photo (filename in assets/headshots/)
 *       C4  Birthdate         C11 Dept ID
 *       C5  Id                C12 Role
 *       C6  Direct            C13 Reporting (id of manager/supervisor)
 *       C7  Ext                C14 Description
 *     ...followed by the two-week schedule grid:
 *       Week 1 work blocks: rows 23-27
 *       Week 2 work blocks: rows 38-42
 *       Day columns (Start/End/Location): Mon I-K, Tue L-N, Wed O-Q, Thu R-T, Fri U-W
 */
window.TMSData = (function () {
  'use strict';

  const DAY_COLUMNS = {
    Monday:    ['I', 'J', 'K'],
    Tuesday:   ['L', 'M', 'N'],
    Wednesday: ['O', 'P', 'Q'],
    Thursday:  ['R', 'S', 'T'],
    Friday:    ['U', 'V', 'W'],
  };
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const WEEK1_ROWS = [23, 24, 25, 26, 27];
  const WEEK2_ROWS = [38, 39, 40, 41, 42];

  function s(v) { return String(v == null ? '' : v).trim(); }

  function cell(sheet, addr) {
    const c = sheet[addr];
    return c ? c.v : undefined;
  }

  function excelTimeToDisplay(v) {
    if (v == null || v === '') return null;
    let timeValue;
    if (v instanceof Date) {
      timeValue = v.getHours() + v.getMinutes() / 60;
    } else if (typeof v === 'number') {
      timeValue = v * 24;
    } else {
      return s(v); // already a string like "7:00 AM"
    }
    const hours = Math.floor(timeValue);
    const minutes = Math.round((timeValue - hours) * 60);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  function parseSchedule(sheet) {
    const week = (rows) => {
      const out = {};
      DAYS.forEach((day) => { out[day] = []; });
      rows.forEach((row, blockIdx) => {
        DAYS.forEach((day) => {
          const [startCol, endCol, locCol] = DAY_COLUMNS[day];
          const start = cell(sheet, `${startCol}${row}`);
          const end = cell(sheet, `${endCol}${row}`);
          const loc = cell(sheet, `${locCol}${row}`);
          if (start != null && end != null && loc != null && s(loc) !== '') {
            out[day].push({
              start: excelTimeToDisplay(start),
              end: excelTimeToDisplay(end),
              location: s(loc),
              block: blockIdx + 1,
            });
          }
        });
      });
      return out;
    };
    return { week1: week(WEEK1_ROWS), week2: week(WEEK2_ROWS) };
  }

  function parseAdminSheet(sheet, data) {
    if (!sheet) return;
    const ref = sheet['!ref'];
    if (!ref) return;
    const range = XLSX.utils.decode_range(ref);
    let mode = null; // 'depts' | 'meta' | null
    let deptHeaderSeen = false;
    for (let r = range.s.r; r <= range.e.r; r++) {
      const rowNum = r + 1;
      const a = cell(sheet, `A${rowNum}`);
      const b = cell(sheet, `B${rowNum}`);
      const cc = cell(sheet, `C${rowNum}`);
      const label = s(a);

      if (label === 'Last Updated:') { data.meta.lastUpdated = b; continue; }
      if (label === 'Departments:') { mode = 'depts'; deptHeaderSeen = false; continue; }
      if (label === 'Meta:') { mode = 'meta'; continue; }
      if (!label && b == null && cc == null) continue; // blank row

      if (mode === 'depts') {
        if (label === 'id') { deptHeaderSeen = true; continue; } // header row
        if (!label) { mode = null; continue; }
        data.depts[label] = { id: label, name: s(b), color: s(cc) || 'exec' };
      } else if (mode === 'meta') {
        if (!label) { mode = null; continue; }
        data.meta[label] = s(b);
      }
    }
  }

  function load(url, onSuccess, onError) {
    fetch(url, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('Could not load ' + url);
        return r.arrayBuffer();
      })
      .then((buf) => {
        const wb = XLSX.read(buf, { type: 'array', cellDates: true });
        const data = { people: {}, peopleList: [], depts: {}, meta: {} };

        parseAdminSheet(wb.Sheets['Admin'], data);

        const skip = new Set(['Admin', 'FormTools', 'NewEmployee']);
        wb.SheetNames.forEach((sheetName) => {
          if (skip.has(sheetName)) return;
          const sheet = wb.Sheets[sheetName];
          const firstName = s(cell(sheet, 'C1'));
          const lastName = s(cell(sheet, 'C2'));
          if (!firstName && !lastName) return; // not a person sheet

          const id = s(cell(sheet, 'C5')) || sheetName;
          const person = {
            id,
            firstName,
            lastName,
            name: [firstName, lastName].filter(Boolean).join(' '),
            title: s(cell(sheet, 'C3')),
            birthdate: s(cell(sheet, 'C4')),
            direct: s(cell(sheet, 'C6')),
            ext: s(cell(sheet, 'C7')),
            mobile: s(cell(sheet, 'C8')),
            email: s(cell(sheet, 'C9')),
            photo: s(cell(sheet, 'C10')),
            deptId: s(cell(sheet, 'C11')),
            role: s(cell(sheet, 'C12')) || 'staff',
            reportsTo: s(cell(sheet, 'C13')),
            description: s(cell(sheet, 'C14')),
            sheetName,
            schedule: parseSchedule(sheet),
          };
          data.people[id] = person;
        });

        data.peopleList = Object.values(data.people).map((p) => ({
          ...p,
          deptName: (data.depts[p.deptId] && data.depts[p.deptId].name) || 'Executive',
          deptColor: (data.depts[p.deptId] && data.depts[p.deptId].color) || 'exec',
        }));

        onSuccess(data);
      })
      .catch((err) => {
        console.error('TMSData load error:', err);
        if (onError) onError(err);
      });
  }

  return { load };
})();
