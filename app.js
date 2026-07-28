/**
 * TMS Staff Resources — app.js
 * Loads the merged workbook once, then wires the expand/collapse shell and
 * the three top-level tabs (Work Schedules, Org Chart, Directory).
 */
(function () {
  'use strict';

  const DATA_FILE = 'TMS_Staff_Resource_File.xlsx';
  const FALLBACK_VERSION = 'v1.0';

  window.TMS = { data: null, version: FALLBACK_VERSION, dateStr: '' };

  function setActiveTab(tabName) {
    document.querySelectorAll('.tms-tab-panel').forEach((el) => {
      el.style.display = el.id === 'tab-panel-' + tabName ? '' : 'none';
    });
    document.querySelectorAll('.tms-tab-btn').forEach((btn) => {
      const isActive = btn.dataset.tab === tabName;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', String(isActive));
    });

    // Export PDF buttons are each scoped to their own tab.
    document.getElementById('btn-export-pdf').style.display = tabName === 'orgchart' ? '' : 'none';
    document.getElementById('btn-export-directory-pdf').style.display = tabName === 'directory' ? '' : 'none';

    if (tabName === 'schedule') window.TMSSchedule.renderTab();
    if (tabName === 'orgchart') window.TMSOrgChart.renderOrgTab();
    if (tabName === 'directory') window.TMSOrgChart.renderDirectoryTab();
  }

  function initTabs() {
    document.querySelectorAll('.tms-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
    });
  }

  function initCollapse() {
    const container = document.getElementById('unifiedContainer');
    const content = document.getElementById('expandableContent');
    const toggle = document.getElementById('expandCollapseText');
    const label = document.getElementById('expandCollapseLabel');

    container.classList.add('collapsed');
    content.classList.add('collapsed');

    toggle.addEventListener('click', () => {
      const collapsing = !container.classList.contains('collapsed');
      container.classList.toggle('collapsed');
      content.classList.toggle('collapsed');
      label.textContent = collapsing ? 'EXPAND' : 'COLLAPSE';
      toggle.setAttribute('aria-expanded', String(!collapsing));
      if (collapsing && window.TMS.data) setActiveTab('schedule');
    });
  }

  function showLoadError(err) {
    document.getElementById('tms-load-error').style.display = '';
    document.getElementById('tms-load-error-detail').textContent = err.message || String(err);
    document.getElementById('tms-loading').style.display = 'none';
  }

  function init() {
    initCollapse();
    initTabs();
    window.TMSOrgChart.init();
    window.TMSSchedule.init();
    if (window.TMSDirectoryExports) window.TMSDirectoryExports.init();
    if (window.TMSTour) window.TMSTour.init(setActiveTab);

    window.TMSData.load(
      DATA_FILE,
      (data) => {
        window.TMS.data = data;
        window.TMS.version = data.meta.version || FALLBACK_VERSION;
        const dateVal = data.meta.lastUpdated;
        let dateStr = 'Last updated: ';
        if (dateVal instanceof Date) {
          dateStr += dateVal.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        } else {
          dateStr += String(dateVal || '');
        }
        window.TMS.dateStr = dateStr;
        document.querySelectorAll('.version-text').forEach((el) => { el.textContent = window.TMS.version; });
        document.getElementById('tms-meta-date').textContent = dateStr;
        document.getElementById('tms-loading').style.display = 'none';
        setActiveTab('schedule');
      },
      showLoadError
    );
  }

  document.addEventListener('DOMContentLoaded', init);
})();
