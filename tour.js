/**
 * TMS Staff Resources — tour.js
 * A live, spotlight-style onboarding tour. Each step highlights a REAL element
 * already on the page (switching tabs as needed) rather than showing static
 * screenshots, per the request that it "use imagery or elements from the
 * actual tool."
 */
window.TMSTour = (function () {
  'use strict';

  let setActiveTab = null; // injected from app.js
  let steps = [];
  let stepIndex = 0;
  let active = false;
  let resizeHandler = null;

  const STEPS = [
    {
      tab: 'schedule',
      selector: '.tms-tabs',
      title: 'Welcome to TMS Staff Resources',
      body: 'Everything staff-related lives in one place now, across three tabs: Work Schedules, Organization Chart, and Directory. Let\u2019s walk through each.',
    },
    {
      tab: 'schedule',
      selector: '.sched-staff-header-btn',
      title: 'Reading the schedule grid',
      body: 'Each row is a staff member; each column is a workday. The icon on every time pill shows where that block is worked \u2014 office or remote.',
    },
    {
      tab: 'schedule',
      selector: '.sched-nav',
      title: 'Moving between weeks',
      body: 'Step week-to-week with the arrows, or click the date range to jump straight to any week on a calendar picker. \u201cJump to Today\u201d snaps you right back.',
    },
    {
      tab: 'schedule',
      selector: '#sched-filter-btn',
      title: 'Filtering the schedule',
      body: 'Narrow the grid to specific staff, or toggle \u201cDisplay In-Office Hours Only\u201d to hide anyone without in-office time that week. The button becomes \u201cClear Filter\u201d whenever one is active.',
    },
    {
      tab: 'schedule',
      selector: '.sched-day-header-btn.sched-selected-col',
      fallbackSelector: '.sched-day-header-btn',
      title: 'Choosing a reference day',
      body: 'Today\u2019s column is highlighted automatically. Click any day header \u2014 or the Staff header for everyone regardless of day \u2014 to change which day Copy Emails uses.',
    },
    {
      tab: 'schedule',
      selector: '#sched-copy-emails',
      title: 'Copy Emails',
      body: 'Copies the email addresses of everyone currently shown who has hours on the selected reference day, ready to paste into Outlook. See a confirmation at the bottom of the page.',
    },
    {
      tab: 'schedule',
      selector: '.sched-name-btn',
      title: 'Staff profiles',
      body: 'Click any name to open that person\u2019s profile \u2014 contact info, mobile, birthday, and a \u201cView Work Schedule\u201d button that jumps straight to their two-week schedule.',
    },
    {
      tab: 'orgchart',
      selector: '.dept-grid .dept-block',
      title: 'The Organization Chart',
      body: 'Departments are color-coded with reporting lines from department heads down through managers to staff. Search narrows the chart to matching names, titles, or emails.',
    },
    {
      tab: 'orgchart',
      selector: '#btn-export-pdf',
      title: 'Export the Org Chart',
      body: 'Generates a single-page, landscape PDF of the whole chart \u2014 automatically scaled to fit one 11\u00d78.5" page no matter how many staff are on it.',
    },
    {
      tab: 'directory',
      selector: '#directory-org-contact',
      pad: { top: 14, bottom: 8, left: 8, right: 8 },
      title: 'The Staff Directory',
      body: 'Every staff member as a searchable card, with TMS\u2019s main contact info always visible up top. Sort by A\u2013Z, Role, Department, or upcoming Birthday.',
    },
    {
      tab: 'directory',
      selector: '#btn-export-directory-pdf',
      title: 'Export the Directory',
      body: 'Opens a choice of four PDFs: the full Staff Phone Directory, a Direct-Dials-Only lobby poster, a Photo Directory organized by department, or a simple Staff Birthdays list.',
    },
    {
      tab: 'schedule',
      selector: '.tour-help-btn',
      title: 'You\u2019re all set',
      body: 'Revisit this tour anytime \u2014 just click the ? icon next to the version number in the header.',
    },
  ];

  function ensureDom() {
    if (document.getElementById('tour-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'tour-overlay';
    overlay.innerHTML =
      '<div id="tour-spotlight"></div>' +
      '<div id="tour-tooltip" role="dialog" aria-modal="true" aria-label="Onboarding tour">' +
        '<button type="button" id="tour-close" aria-label="Close tour">&times;</button>' +
        '<div id="tour-step-label"></div>' +
        '<h3 id="tour-title"></h3>' +
        '<p id="tour-body"></p>' +
        '<div id="tour-dots"></div>' +
        '<div id="tour-controls">' +
          '<button type="button" id="tour-skip">Skip tour</button>' +
          '<div id="tour-nav-btns">' +
            '<button type="button" id="tour-back">Back</button>' +
            '<button type="button" id="tour-next">Next</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    document.getElementById('tour-close').addEventListener('click', end);
    document.getElementById('tour-skip').addEventListener('click', end);
    document.getElementById('tour-back').addEventListener('click', () => go(stepIndex - 1));
    document.getElementById('tour-next').addEventListener('click', () => {
      if (stepIndex >= steps.length - 1) end();
      else go(stepIndex + 1);
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) end(); });
    document.addEventListener('keydown', (e) => {
      if (!active) return;
      if (e.key === 'Escape') end();
      if (e.key === 'ArrowRight') document.getElementById('tour-next').click();
      if (e.key === 'ArrowLeft') document.getElementById('tour-back').click();
    });
  }

  function position(target, padOverride) {
    const spotlight = document.getElementById('tour-spotlight');
    const tooltip = document.getElementById('tour-tooltip');
    const pad = { top: 8, bottom: 8, left: 8, right: 8, ...(padOverride || {}) };
    const rect = target.getBoundingClientRect();

    spotlight.style.top = (rect.top - pad.top) + 'px';
    spotlight.style.left = (rect.left - pad.left) + 'px';
    spotlight.style.width = (rect.width + pad.left + pad.right) + 'px';
    spotlight.style.height = (rect.height + pad.top + pad.bottom) + 'px';

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tw = tooltip.offsetWidth || 320;
    const th = tooltip.offsetHeight || 180;
    const gap = 14;

    let top, left;
    if (rect.bottom + gap + th < vh) {
      top = rect.bottom + gap;
    } else if (rect.top - gap - th > 0) {
      top = rect.top - gap - th;
    } else {
      top = Math.max(12, vh - th - 12);
    }
    left = rect.left + rect.width / 2 - tw / 2;
    left = Math.min(Math.max(left, 12), vw - tw - 12);

    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
  }

  function renderStep() {
    const step = steps[stepIndex];
    const label = document.getElementById('tour-step-label');
    const title = document.getElementById('tour-title');
    const body = document.getElementById('tour-body');
    const dots = document.getElementById('tour-dots');
    const backBtn = document.getElementById('tour-back');
    const nextBtn = document.getElementById('tour-next');

    label.textContent = 'Step ' + (stepIndex + 1) + ' of ' + steps.length;
    title.textContent = step.title;
    body.textContent = step.body;
    dots.innerHTML = steps.map((_, i) =>
      '<span class="tour-dot' + (i === stepIndex ? ' active' : '') + '"></span>').join('');
    backBtn.style.visibility = stepIndex === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = stepIndex === steps.length - 1 ? 'Finish' : 'Next';

    const target = document.querySelector(step.selector) ||
      (step.fallbackSelector ? document.querySelector(step.fallbackSelector) : null);
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: 'auto' });
      requestAnimationFrame(() => position(target, step.pad));
    }
  }

  function go(i) {
    if (i < 0 || i >= steps.length) return;
    stepIndex = i;
    const step = steps[stepIndex];
    if (step.tab && setActiveTab) setActiveTab(step.tab);
    requestAnimationFrame(() => requestAnimationFrame(renderStep));
  }

  function start() {
    if (!window.TMS || !window.TMS.data) return; // wait until data has loaded
    ensureDom();
    steps = STEPS;
    active = true;
    document.getElementById('tour-overlay').classList.add('open');

    // Make sure the tool is expanded so every element is actually visible.
    const container = document.getElementById('unifiedContainer');
    if (container && container.classList.contains('collapsed')) {
      const toggle = document.getElementById('expandCollapseText');
      if (toggle) toggle.click();
    }

    resizeHandler = () => {
      const step = steps[stepIndex];
      const target = step && (document.querySelector(step.selector) ||
        (step.fallbackSelector ? document.querySelector(step.fallbackSelector) : null));
      if (target) position(target, step.pad);
    };
    window.addEventListener('resize', resizeHandler);

    go(0);
  }

  function end() {
    active = false;
    const overlay = document.getElementById('tour-overlay');
    if (overlay) overlay.classList.remove('open');
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
  }

  function init(setActiveTabFn) {
    setActiveTab = setActiveTabFn;
    const btn = document.getElementById('tour-help-btn');
    if (btn) btn.addEventListener('click', start);
  }

  return { init, start, end };
})();
