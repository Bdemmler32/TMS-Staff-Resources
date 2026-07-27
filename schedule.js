/**
 * TMS Staff Resources — schedule.js
 * Work Schedules tab. Functions the same way the original standalone tool did:
 * browse a biweekly rotating schedule, jump to any week via calendar, filter
 * which employees are shown, and view a person's full two-week schedule in a
 * modal. Reads from window.TMS.data (populated by data.js via app.js).
 */
window.TMSSchedule = (function () {
  'use strict';
  const { esc, makePhoto, locationIcon } = window.TMSCommon;

  const WEEK_1_START = new Date('2025-09-13T00:00:00');
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  let currentWeekStart = null;
  let currentWeekType = 1;
  let selectedIds = null; // null = no filter applied (show everyone)
  let officeHoursOnly = false;
  let searchQuery = '';
  let calendarDate = new Date();
  let selectedCopyDay = null; // manually clicked day header (overrides "today"); a day name, 'ALL' (Staff header clicked), or null = auto

  function people() { return window.TMS.data.peopleList; }

  function weekTypeFor(date) {
    const daysSince = Math.floor((date - WEEK_1_START) / 86400000);
    const weekNumber = Math.floor(daysSince / 7);
    return (((weekNumber % 2) + 2) % 2) + 1;
  }

  function startOfWeekPeriod(date) {
    const daysSince = Math.floor((date - WEEK_1_START) / 86400000);
    const weeksFromStart = Math.floor(daysSince / 7);
    const d = new Date(WEEK_1_START);
    d.setDate(d.getDate() + weeksFromStart * 7);
    return d;
  }

  function fmtDate(d) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function updateDateRange() {
    const start = new Date(currentWeekStart);
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    document.getElementById('sched-date-range').textContent = fmtDate(start) + ' \u2013 ' + fmtDate(end);
    document.getElementById('sched-week-display').textContent =
      'Week ' + currentWeekType + (currentWeekType === 1 ? ' (Pay Week)' : '');
  }

  function rawDayBlocks(person, day) {
    const weekKey = currentWeekType === 1 ? 'week1' : 'week2';
    return (person.schedule[weekKey] && person.schedule[weekKey][day]) || [];
  }

  function hasAnyOfficeHours(person) {
    return DAYS.some((day) => rawDayBlocks(person, day).some((b) => b.location.toLowerCase() === 'office'));
  }

  function visiblePeople() {
    let list = people();
    if (selectedIds) list = list.filter((p) => selectedIds.has(p.id));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (officeHoursOnly) list = list.filter((p) => hasAnyOfficeHours(p));
    return list.slice().sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  }

  function dayBlocks(person, day) {
    const blocks = rawDayBlocks(person, day);
    if (officeHoursOnly) return blocks.filter((b) => b.location.toLowerCase() === 'office');
    return blocks;
  }

  function pill(block) {
    return (
      '<span class="time-pill" title="' + esc(block.location) + '">' +
        locationIcon(block.location) +
        '<span class="time-pill-text">' + esc(block.start) + '\u2013' + esc(block.end) + '</span>' +
      '</span>'
    );
  }

  function todayColumnDay() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(currentWeekStart);
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    if (today < start || today > end) return null;
    const name = today.toLocaleDateString('en-US', { weekday: 'long' });
    return DAYS.includes(name) ? name : null; // null for weekend days (not shown as columns)
  }

  // The day Copy Emails should reference: a manually-clicked header takes
  // priority, otherwise falls back to today (if today is in the displayed week).
  function referenceDay() {
    if (selectedCopyDay === 'ALL') return null;
    return selectedCopyDay || todayColumnDay();
  }

  function renderGrid() {
    const grid = document.getElementById('sched-grid');
    const list = visiblePeople();
    grid.innerHTML = '';
    const todayDay = todayColumnDay();
    const refDay = referenceDay();

    const header = document.createElement('div');
    header.className = 'sched-row sched-header-row';

    const staffHeaderBtn = document.createElement('button');
    staffHeaderBtn.type = 'button';
    staffHeaderBtn.className = 'sched-col-name sched-cell sched-staff-header-btn' +
      (selectedCopyDay === 'ALL' ? ' sched-selected-col' : '');
    staffHeaderBtn.setAttribute('aria-pressed', String(selectedCopyDay === 'ALL'));
    staffHeaderBtn.title = 'Click to set Copy Emails to use all currently shown staff, regardless of day';
    staffHeaderBtn.innerHTML = 'Staff' +
      '<span class="sched-today-badge' + (selectedCopyDay === 'ALL' ? '' : ' sched-badge-reserved') + '">Selected</span>';
    staffHeaderBtn.addEventListener('click', () => {
      selectedCopyDay = (selectedCopyDay === 'ALL') ? null : 'ALL';
      renderGrid();
    });
    header.appendChild(staffHeaderBtn);

    DAYS.forEach((d) => {
      const cell = document.createElement('button');
      cell.type = 'button';
      const isToday = d === todayDay;
      const isRef = d === refDay;
      cell.className = 'sched-col-day sched-cell sched-day-header-btn' +
        (isRef ? (isToday ? ' sched-today-col' : ' sched-selected-col') : '');
      cell.setAttribute('aria-pressed', String(d === selectedCopyDay));
      cell.title = 'Click to set ' + d + ' as the day Copy Emails uses';
      const badgeText = isToday ? 'Today' : 'Selected';
      cell.innerHTML = '<span class="sched-day-full-name">' + d + '</span>' +
        '<span class="sched-today-badge' + (isRef ? '' : ' sched-badge-reserved') + '">' + badgeText + '</span>';
      cell.addEventListener('click', () => {
        selectedCopyDay = (selectedCopyDay === d) ? null : d;
        renderGrid();
      });
      header.appendChild(cell);
    });
    grid.appendChild(header);

    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'no-results';
      empty.textContent = 'No staff match the current filter.';
      grid.appendChild(empty);
      document.getElementById('sched-filter-results').style.display = 'none';
      return;
    }

    list.forEach((p, idx) => {
      const row = document.createElement('div');
      row.className = 'sched-row' + (idx % 2 === 1 ? ' sched-row-alt' : '');

      const nameCell = document.createElement('div');
      nameCell.className = 'sched-col-name sched-cell';

      const nameBtn = document.createElement('button');
      nameBtn.type = 'button';
      nameBtn.className = 'sched-name-btn';
      nameBtn.setAttribute('aria-label', 'View profile for ' + p.name);
      nameBtn.appendChild(makePhoto(p, 'sched-photo'));
      const nameText = document.createElement('span');
      nameText.className = 'sched-name-text';
      const firstEl = document.createElement('span');
      firstEl.className = 'sched-name-first';
      firstEl.textContent = p.firstName;
      const lastEl = document.createElement('span');
      lastEl.className = 'sched-name-last';
      lastEl.textContent = p.lastName;
      nameText.appendChild(firstEl);
      nameText.appendChild(lastEl);
      nameBtn.appendChild(nameText);
      nameBtn.addEventListener('click', () => window.TMSOrgChart.openProfileModal(p));
      nameCell.appendChild(nameBtn);

      row.appendChild(nameCell);

      DAYS.forEach((day) => {
        const cell = document.createElement('div');
        const isToday = day === todayDay;
        const isRef = day === refDay;
        cell.className = 'sched-col-day sched-cell sched-day-cell' +
          (isRef ? (isToday ? ' sched-today-col' : ' sched-selected-col') : '');
        const blocks = dayBlocks(p, day);
        if (blocks.length === 0) {
          cell.innerHTML = '<span class="sched-off">\u2014</span>';
        } else {
          cell.innerHTML = blocks.map(pill).join('');
        }
        row.appendChild(cell);
      });

      grid.appendChild(row);
    });

    const results = document.getElementById('sched-filter-results');
    if (selectedIds || searchQuery || officeHoursOnly) {
      results.style.display = '';
      document.getElementById('sched-filter-results-text').textContent =
        'Showing ' + list.length + ' of ' + people().length + ' staff';
    } else {
      results.style.display = 'none';
    }
  }

  function render() {
    updateDateRange();
    renderGrid();
  }

  function navigateWeek(direction) {
    currentWeekStart.setDate(currentWeekStart.getDate() + direction * 7);
    currentWeekType = weekTypeFor(currentWeekStart);
    render();
  }

  function jumpToToday() {
    currentWeekStart = startOfWeekPeriod(new Date());
    currentWeekType = weekTypeFor(currentWeekStart);
    selectedCopyDay = null;
    render();
  }

  /* ── Employee detail modal ─────────────────────────────────────── */
  function weekTable(person, weekKey, title) {
    let rows = '';
    DAYS.forEach((day) => {
      const blocks = (person.schedule[weekKey] && person.schedule[weekKey][day]) || [];
      rows +=
        '<div class="sched-modal-day-row">' +
          '<div class="sched-modal-day-label">' + day + '</div>' +
          '<div class="sched-modal-day-blocks">' +
            (blocks.length ? blocks.map(pill).join('') : '<span class="sched-off">Not scheduled</span>') +
          '</div>' +
        '</div>';
    });
    return '<h3 class="sched-modal-week-title">' + esc(title) + '</h3><div class="sched-modal-week-table">' + rows + '</div>';
  }

  function openEmployeeModal(person) {
    const overlay = document.getElementById('sched-modal-overlay');
    const modal = document.getElementById('sched-modal');
    modal.innerHTML = '';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close';
    closeBtn.setAttribute('aria-label', 'Close schedule');
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', closeEmployeeModal);
    modal.appendChild(closeBtn);

    const hdr = document.createElement('div');
    hdr.className = 'modal-header';
    hdr.appendChild(makePhoto(person, 'modal-photo'));
    const nameBlock = document.createElement('div');
    nameBlock.className = 'modal-name-block';
    nameBlock.innerHTML =
      '<div class="modal-name">' + esc(person.name) + '</div>' +
      '<div class="modal-title-text">' + esc(person.title) + '</div>';
    hdr.appendChild(nameBlock);
    modal.appendChild(hdr);

    const body = document.createElement('div');
    body.className = 'sched-modal-body';
    body.innerHTML =
      weekTable(person, 'week1', 'Week 1 (Pay Week)') +
      weekTable(person, 'week2', 'Week 2');
    modal.appendChild(body);

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function closeEmployeeModal() {
    const overlay = document.getElementById('sched-modal-overlay');
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function copyVisibleEmails() {
    const day = referenceDay();
    let list = visiblePeople();
    let dayLabel;

    if (day) {
      list = list.filter((p) => {
        const blocks = officeHoursOnly
          ? rawDayBlocks(p, day).filter((b) => b.location.toLowerCase() === 'office')
          : rawDayBlocks(p, day);
        return blocks.length > 0;
      });
      dayLabel = (day === todayColumnDay() && !selectedCopyDay) ? 'today' : day;
    } else {
      dayLabel = 'currently shown';
      if (selectedCopyDay === 'ALL') dayLabel = 'all staff shown';
    }

    const emails = list.map((p) => p.email).filter(Boolean);
    if (emails.length === 0) {
      window.TMSCommon.showToast('No email addresses to copy for ' + dayLabel + '.');
      return;
    }
    const text = emails.join('; ');
    const done = () => window.TMSCommon.showToast(
      'Copied ' + emails.length + ' email address' + (emails.length === 1 ? '' : 'es') + ' for ' + dayLabel + '.'
    );
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {
        window.TMSCommon.showToast('Could not copy to clipboard. Please try again.');
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); }
      catch (e) { window.TMSCommon.showToast('Could not copy to clipboard. Please try again.'); }
      ta.remove();
    }
  }

  /* ── Filter modal ──────────────────────────────────────────────── */
  function renderFilterList() {
    const list = document.getElementById('sched-filter-list');
    list.innerHTML = '';
    const q = document.getElementById('sched-filter-search').value.trim().toLowerCase();
    people()
      .slice()
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
      .forEach((p) => {
        if (q && !p.name.toLowerCase().includes(q)) return;
        const row = document.createElement('label');
        row.className = 'sched-filter-row';
        const checked = !selectedIds || selectedIds.has(p.id);
        row.innerHTML =
          '<input type="checkbox" value="' + esc(p.id) + '" ' + (checked ? 'checked' : '') + ' />' +
          '<span>' + esc(p.name) + '</span>';
        list.appendChild(row);
      });
  }

  function isFilterActive() {
    return !!selectedIds || officeHoursOnly;
  }

  function updateFilterBtn() {
    const btn = document.getElementById('sched-filter-btn');
    if (isFilterActive()) {
      btn.textContent = '';
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Clear Filter';
      btn.classList.add('is-active-filter');
    } else {
      btn.innerHTML = 'Filter Options';
      btn.classList.remove('is-active-filter');
    }
  }

  function handleFilterBtnClick() {
    if (isFilterActive()) {
      selectedIds = null;
      officeHoursOnly = false;
      updateFilterBtn();
      render();
    } else {
      openFilterModal();
    }
  }

  function openFilterModal() {
    document.getElementById('sched-office-checkbox').checked = officeHoursOnly;
    renderFilterList();
    document.getElementById('sched-filter-modal-overlay').classList.add('open');
  }
  function closeFilterModal() {
    document.getElementById('sched-filter-modal-overlay').classList.remove('open');
  }
  function applyFilter() {
    const checked = Array.from(document.querySelectorAll('#sched-filter-list input:checked')).map((i) => i.value);
    const total = people().length;
    selectedIds = checked.length === total ? null : new Set(checked);
    officeHoursOnly = document.getElementById('sched-office-checkbox').checked;
    updateFilterBtn();
    closeFilterModal();
    render();
  }

  /* ── Calendar modal (jump to any week) ───────────────────────────── */
  function renderCalendar() {
    const grid = document.getElementById('sched-calendar-grid');
    grid.innerHTML = '';
    document.getElementById('sched-calendar-month-year').textContent =
      calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((d) => {
      const el = document.createElement('div');
      el.className = 'sched-cal-dow';
      el.textContent = d;
      grid.appendChild(el);
    });

    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < startPad; i++) grid.appendChild(document.createElement('div'));

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sched-cal-day';
      btn.textContent = String(day);
      const today = new Date();
      if (date.toDateString() === today.toDateString()) btn.classList.add('is-today');
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.sched-cal-day').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        btn.dataset.selectedDate = date.toISOString();
      });
      grid.appendChild(btn);
    }
  }

  function openCalendarModal() {
    calendarDate = new Date(currentWeekStart);
    renderCalendar();
    document.getElementById('sched-calendar-modal-overlay').classList.add('open');
  }
  function closeCalendarModal() {
    document.getElementById('sched-calendar-modal-overlay').classList.remove('open');
  }

  function init() {
    currentWeekStart = startOfWeekPeriod(new Date());
    currentWeekType = weekTypeFor(currentWeekStart);
    updateFilterBtn();

    document.getElementById('sched-prev-week').addEventListener('click', () => navigateWeek(-1));
    document.getElementById('sched-next-week').addEventListener('click', () => navigateWeek(1));
    document.getElementById('sched-jump-today').addEventListener('click', jumpToToday);
    document.getElementById('sched-date-range').addEventListener('click', openCalendarModal);

    document.getElementById('sched-copy-emails').addEventListener('click', copyVisibleEmails);
    document.getElementById('sched-filter-btn').addEventListener('click', handleFilterBtnClick);
    document.getElementById('sched-close-filter').addEventListener('click', closeFilterModal);
    document.getElementById('sched-filter-modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'sched-filter-modal-overlay') closeFilterModal();
    });
    document.getElementById('sched-filter-search').addEventListener('input', renderFilterList);
    document.getElementById('sched-select-all').addEventListener('click', () => {
      document.querySelectorAll('#sched-filter-list input').forEach((i) => { i.checked = true; });
    });
    document.getElementById('sched-deselect-all').addEventListener('click', () => {
      document.querySelectorAll('#sched-filter-list input').forEach((i) => { i.checked = false; });
    });
    document.getElementById('sched-apply-filter').addEventListener('click', applyFilter);

    document.getElementById('sched-close-calendar').addEventListener('click', closeCalendarModal);
    document.getElementById('sched-calendar-modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'sched-calendar-modal-overlay') closeCalendarModal();
    });
    document.getElementById('sched-cal-prev-month').addEventListener('click', () => {
      calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar();
    });
    document.getElementById('sched-cal-next-month').addEventListener('click', () => {
      calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar();
    });
    document.getElementById('sched-cal-today').addEventListener('click', () => {
      calendarDate = new Date(); renderCalendar();
    });
    document.getElementById('sched-cal-cancel').addEventListener('click', closeCalendarModal);
    document.getElementById('sched-cal-apply').addEventListener('click', () => {
      const selected = document.querySelector('.sched-cal-day.selected');
      if (selected && selected.dataset.selectedDate) {
        currentWeekStart = startOfWeekPeriod(new Date(selected.dataset.selectedDate));
        currentWeekType = weekTypeFor(currentWeekStart);
        render();
      }
      closeCalendarModal();
    });

    document.getElementById('sched-modal-close-x') && document.getElementById('sched-modal-close-x').addEventListener('click', closeEmployeeModal);
    document.getElementById('sched-modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'sched-modal-overlay') closeEmployeeModal();
    });

    let searchTimer;
    const searchEl = document.getElementById('sched-search');
    if (searchEl) {
      searchEl.addEventListener('input', function () {
        clearTimeout(searchTimer);
        const val = this.value;
        searchTimer = setTimeout(() => { searchQuery = val.trim(); render(); }, 160);
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      closeEmployeeModal(); closeFilterModal(); closeCalendarModal();
    });
  }

  function renderTab() { render(); }

  return { init, renderTab, openScheduleModal: openEmployeeModal };
})();
