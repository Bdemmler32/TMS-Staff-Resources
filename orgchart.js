/**
 * TMS Staff Resources — orgchart.js
 * Org Chart tab + Directory tab (two independent top-level tabs). Reads from
 * window.TMS (populated by app.js after data.js finishes loading the workbook).
 */
window.TMSOrgChart = (function () {
  'use strict';
  const { esc, makePhoto, lastNameOf } = window.TMSCommon;

  let orgSearchQuery = '';
  let dirSearchQuery = '';
  let dirSort = 'alpha';
  let lightboxOpen = false;

  function people() { return window.TMS.data.peopleList; }
  function depts() { return window.TMS.data.depts; }

  function matches(p, q) {
    if (!q) return true;
    const s = q.toLowerCase();
    return (p.name || '').toLowerCase().includes(s)
      || (p.title || '').toLowerCase().includes(s)
      || (p.email || '').toLowerCase().includes(s)
      || (p.ext || '').includes(s)
      || (p.deptName || '').toLowerCase().includes(s);
  }

  function makeCard(person, extraClass) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'staff-card' + (extraClass ? ' ' + extraClass : '');
    btn.setAttribute('aria-label', 'View profile for ' + person.name);
    btn.appendChild(makePhoto(person, 'staff-photo'));
    const info = document.createElement('div');
    info.className = 'staff-info';
    info.innerHTML =
      '<div class="staff-name">' + esc(person.name) + '</div>' +
      '<div class="staff-title">' + esc(person.title) + '</div>';
    btn.appendChild(info);
    btn.addEventListener('click', () => openModal(person));
    return btn;
  }

  /* ── Org Chart tab ──────────────────────────────────────────────── */
  function renderOrgView() {
    const container = document.getElementById('org-view');
    if (!container) return;
    container.innerHTML = '';
    const q = orgSearchQuery;

    const ceo = people().find((p) => p.deptId === 'executive' && p.role === 'executive');
    const execStaff = people()
      .filter((p) => p.deptId === 'executive' && p.role !== 'executive')
      .sort((a, b) => {
        const order = { deputy: 0, exec_staff: 1 };
        return (order[a.role] ?? 9) - (order[b.role] ?? 9);
      });
    const execVisible = [ceo, ...execStaff].filter((p) => p && matches(p, q));

    if (execVisible.length > 0) {
      const execRow = document.createElement('div');
      execRow.className = 'exec-row';
      const execBlock = document.createElement('div');
      execBlock.className = 'dept-block dept-exec exec-block';

      const execHdr = document.createElement('div');
      execHdr.className = 'dept-header';
      const execNameEl = document.createElement('div');
      execNameEl.className = 'dept-name';
      execNameEl.textContent = 'Executive';
      execHdr.appendChild(execNameEl);

      if (ceo && matches(ceo, q)) {
        const wrap = document.createElement('div');
        wrap.className = 'dept-head-wrap';
        wrap.appendChild(makeCard(ceo, 'dept-head-card ceo-head-card'));
        execHdr.appendChild(wrap);
      }
      execBlock.appendChild(execHdr);

      const execMembers = document.createElement('div');
      execMembers.className = 'dept-members';
      execStaff.forEach((p) => { if (matches(p, q)) execMembers.appendChild(makeCard(p)); });
      execBlock.appendChild(execMembers);

      execRow.appendChild(execBlock);
      container.appendChild(execRow);
    }

    const grid = document.createElement('div');
    grid.className = 'dept-grid';
    const deptList = Object.values(depts()).filter((d) => d.id !== 'executive');
    let visibleDepts = 0;

    deptList.forEach((dept) => {
      const head = people().find((p) => p.deptId === dept.id && p.role === 'dept_head');
      const members = people().filter((p) => p.deptId === dept.id && p.role !== 'dept_head');
      const headMatch = head && matches(head, q);
      const memberMatches = members.filter((p) => matches(p, q));
      if (q && !headMatch && memberMatches.length === 0) return;
      visibleDepts++;

      const block = document.createElement('div');
      block.className = 'dept-block dept-' + dept.color;
      const hdr = document.createElement('div');
      hdr.className = 'dept-header';
      const nameEl = document.createElement('div');
      nameEl.className = 'dept-name';
      nameEl.textContent = dept.name;
      hdr.appendChild(nameEl);
      if (head) {
        const wrap = document.createElement('div');
        wrap.className = 'dept-head-wrap';
        wrap.appendChild(makeCard(head, 'dept-head-card'));
        hdr.appendChild(wrap);
      }
      block.appendChild(hdr);

      const membersEl = document.createElement('div');
      membersEl.className = 'dept-members';
      const managers = members.filter((p) => p.role === 'manager');
      const managerIds = new Set(managers.map((m) => m.id));
      const directStaff = members.filter((p) =>
        p.role === 'staff' && (!p.reportsTo || p.reportsTo === (head ? head.id : '') || !managerIds.has(p.reportsTo)));
      const claimedIds = new Set();

      managers.forEach((mgr) => {
        const mgrMatch = matches(mgr, q);
        const reports = members.filter((p) => p.role === 'staff' && p.reportsTo === mgr.id);
        const reportsVisible = reports.filter((p) => matches(p, q));
        if (q && !mgrMatch && reportsVisible.length === 0) return;
        reports.forEach((r) => claimedIds.add(r.id));

        const group = document.createElement('div');
        group.className = 'manager-group';
        group.appendChild(makeCard(mgr));
        const displayReports = q ? reportsVisible : reports;
        if (displayReports.length > 0) {
          const indent = document.createElement('div');
          indent.className = 'reports-indent';
          displayReports.forEach((r) => indent.appendChild(makeCard(r)));
          group.appendChild(indent);
        }
        membersEl.appendChild(group);
      });

      directStaff.forEach((p) => {
        if (claimedIds.has(p.id)) return;
        if (q && !matches(p, q)) return;
        membersEl.appendChild(makeCard(p));
      });

      block.appendChild(membersEl);
      grid.appendChild(block);
    });

    if (visibleDepts === 0 && q) {
      grid.innerHTML = '<div class="no-results" style="grid-column:1/-1">No staff match your search.</div>';
    }
    container.appendChild(grid);
  }

  /* ── Directory tab ──────────────────────────────────────────────── */
  function icoPhone() {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.64A2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.16 6.16l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>';
  }
  function icoEmail() {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
  }
  function icoCake() {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M4 21v-6a2 2 0 012-2h12a2 2 0 012 2v6"/><path d="M2 21h20"/><path d="M7 13V9M12 13V9M17 13V9"/><path d="M7 9c0-1 .5-1.5.5-2.5S7 5 7 5M12 9c0-1 .5-1.5.5-2.5S12 5 12 5M17 9c0-1 .5-1.5.5-2.5S17 5 17 5"/></svg>';
  }
  function icoMobile() {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>';
  }

  function makeDirCard(p) {
    const card = document.createElement('div');
    card.className = 'dir-card dept-' + p.deptColor;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', 'View profile for ' + p.name);
    card.appendChild(makePhoto(p, 'dir-photo'));

    const nameEl = document.createElement('div');
    nameEl.className = 'dir-name';
    nameEl.textContent = p.name;
    card.appendChild(nameEl);

    const titleEl = document.createElement('div');
    titleEl.className = 'dir-title';
    titleEl.textContent = p.title;
    card.appendChild(titleEl);

    const badge = document.createElement('span');
    badge.className = 'dir-dept-badge';
    badge.textContent = p.deptName;
    card.appendChild(badge);

    if (p.birthdate) {
      const bday = document.createElement('div');
      bday.className = 'dir-birthday';
      bday.innerHTML = icoCake() + '<span>' + esc(p.birthdate) + '</span>';
      card.appendChild(bday);
    }

    const contact = document.createElement('div');
    contact.className = 'dir-contact';
    const directInfo = window.TMSCommon.parsePhoneNote(p.direct);
    const mobileInfo = window.TMSCommon.parsePhoneNote(p.mobile);
    const anyNote = directInfo.hasNote || mobileInfo.hasNote;
    contact.innerHTML =
      '<div class="dir-contact-row">' + icoPhone() +
      '<span>Ext. ' + esc(p.ext) + ' &middot; <a href="tel:' + esc(directInfo.display) + '">' + esc(directInfo.display) + '</a>' +
      (directInfo.hasNote ? '<sup>*</sup>' : '') + '</span></div>' +
      (p.mobile ? '<div class="dir-contact-row">' + icoMobile() +
        '<a href="tel:' + esc(mobileInfo.display) + '">' + esc(mobileInfo.display) + '</a>' +
        (mobileInfo.hasNote ? '<sup>*</sup>' : '') + '</div>' : '') +
      '<div class="dir-contact-row">' + icoEmail() +
      '<a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a></div>' +
      (anyNote ? '<div class="dir-phone-note">* Text-Messaging only available during AM and MST.</div>' : '');
    card.appendChild(contact);

    card.addEventListener('click', () => openModal(p));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(p); } });
    return card;
  }

  function renderDirectoryView() {
    const wrap = document.getElementById('directory-grid-wrap');
    if (!wrap) return;
    wrap.innerHTML = '';
    const q = dirSearchQuery;
    const roleOrder = { executive: 0, deputy: 1, exec_staff: 2, dept_head: 3, manager: 4, staff: 5 };
    const deptOrder = Object.keys(depts());
    let sorted = people().filter((p) => matches(p, q));

    function grid(list) {
      const g = document.createElement('div');
      g.className = 'directory-grid';
      list.forEach((p) => g.appendChild(makeDirCard(p)));
      if (list.length === 0) g.innerHTML = '<div class="no-results" style="grid-column:1/-1">No staff match your search.</div>';
      return g;
    }

    if (dirSort === 'alpha') {
      sorted.sort((a, b) => lastNameOf(a.name).localeCompare(lastNameOf(b.name)));
      wrap.appendChild(grid(sorted));
    } else if (dirSort === 'dept') {
      const groups = {};
      deptOrder.forEach((id) => { groups[id] = []; });
      sorted.forEach((p) => { (groups[p.deptId] || (groups[p.deptId] = [])).push(p); });
      let any = false;
      deptOrder.forEach((deptId) => {
        const members = groups[deptId];
        if (!members || members.length === 0) return;
        any = true;
        members.sort((a, b) => {
          if (a.role === 'dept_head' && b.role !== 'dept_head') return -1;
          if (b.role === 'dept_head' && a.role !== 'dept_head') return 1;
          return lastNameOf(a.name).localeCompare(lastNameOf(b.name)) || a.name.localeCompare(b.name);
        });
        const hdr = document.createElement('div');
        hdr.className = 'dir-dept-group-header';
        hdr.textContent = (depts()[deptId] && depts()[deptId].name) || deptId;
        wrap.appendChild(hdr);
        wrap.appendChild(grid(members));
      });
      if (!any) wrap.innerHTML = '<div class="no-results">No staff match your search.</div>';
    } else if (dirSort === 'birthday') {
      sorted.sort((a, b) => window.TMSCommon.daysUntilBirthday(a.birthdate) - window.TMSCommon.daysUntilBirthday(b.birthdate));
      wrap.appendChild(grid(sorted));
    } else {
      sorted.sort((a, b) => {
        const d = (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9);
        return d !== 0 ? d : a.name.localeCompare(b.name);
      });
      wrap.appendChild(grid(sorted));
    }
  }

  /* ── Shared profile modal + lightbox ───────────────────────────── */
  function row(icon, label, value) {
    return '<div class="modal-contact-row"><div class="modal-contact-icon">' + icon + '</div>' +
      '<div><div class="modal-contact-label">' + label + '</div>' +
      '<div class="modal-contact-value">' + value + '</div></div></div>';
  }

  function openModal(person) {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');
    modal.innerHTML = '';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal-close';
    closeBtn.setAttribute('aria-label', 'Close profile');
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', closeModal);
    modal.appendChild(closeBtn);

    const hdr = document.createElement('div');
    hdr.className = 'modal-header';
    if (person.photo) {
      const wrap = document.createElement('div');
      wrap.className = 'modal-photo-wrap';
      wrap.title = 'Click to enlarge';
      const img = document.createElement('img');
      img.className = 'modal-photo';
      img.src = window.TMSCommon.photoPath(person.photo);
      img.alt = person.name;
      img.onerror = function () {
        const ph = window.TMSCommon.makePlaceholder(person, 'modal-photo');
        wrap.replaceWith(ph);
      };
      const hint = document.createElement('div');
      hint.className = 'modal-photo-zoom-hint';
      hint.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
      wrap.appendChild(img);
      wrap.appendChild(hint);
      wrap.addEventListener('click', () => openLightbox(person));
      hdr.appendChild(wrap);
    } else {
      hdr.appendChild(window.TMSCommon.makePlaceholder(person, 'modal-photo'));
    }

    const nameBlock = document.createElement('div');
    nameBlock.className = 'modal-name-block';
    nameBlock.innerHTML =
      '<div class="modal-name">' + esc(person.name) + '</div>' +
      '<div class="modal-title-text">' + esc(person.title) + '</div>' +
      '<span class="modal-dept-badge">' + esc(person.deptName || 'Executive') + '</span>';
    hdr.appendChild(nameBlock);
    modal.appendChild(hdr);

    const contact = document.createElement('div');
    contact.className = 'modal-contact';
    const directInfo = window.TMSCommon.parsePhoneNote(person.direct);
    const mobileInfo = window.TMSCommon.parsePhoneNote(person.mobile);
    const anyNote = directInfo.hasNote || mobileInfo.hasNote;
    contact.innerHTML =
      row(icoPhone(), 'Extension', 'Ext. ' + esc(person.ext)) +
      row(icoPhone(), 'Direct Line', '<a href="tel:' + esc(directInfo.display) + '">' + esc(directInfo.display) + '</a>' + (directInfo.hasNote ? '<sup>*</sup>' : '')) +
      (person.mobile ? row(icoMobile(), 'Mobile', '<a href="tel:' + esc(mobileInfo.display) + '">' + esc(mobileInfo.display) + '</a>' + (mobileInfo.hasNote ? '<sup>*</sup>' : '')) : '') +
      row(icoEmail(), 'Email', '<a href="mailto:' + esc(person.email) + '">' + esc(person.email) + '</a>') +
      (person.birthdate ? row(icoCake(), 'Birthday', esc(person.birthdate)) : '');
    modal.appendChild(contact);

    if (anyNote) {
      const note = document.createElement('div');
      note.className = 'modal-phone-note';
      note.textContent = '* Text-Messaging only available during AM and MST.';
      modal.appendChild(note);
    }

    if (person.description && person.description.trim()) {
      const desc = document.createElement('div');
      desc.className = 'modal-description';
      desc.textContent = person.description;
      modal.appendChild(desc);
    }

    const scheduleBtn = document.createElement('button');
    scheduleBtn.type = 'button';
    scheduleBtn.className = 'view-schedule-btn';
    scheduleBtn.innerHTML =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg> View Work Schedule';
    scheduleBtn.addEventListener('click', () => {
      closeModal();
      window.TMSSchedule.openScheduleModal(person);
    });
    modal.appendChild(scheduleBtn);

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function openLightbox(person) {
    if (!person.photo) return;
    document.getElementById('lightbox-img').src = window.TMSCommon.photoPath(person.photo);
    document.getElementById('lightbox-img').alt = person.name;
    document.getElementById('lightbox-name').textContent = person.name;
    document.getElementById('lightbox').classList.add('open');
    lightboxOpen = true;
  }
  function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
    lightboxOpen = false;
  }

  /* ── Print frame + PDF export (Org Chart tab only) ─────────────── */
  function convertImagesForCapture(frame) {
    const imgs = frame.querySelectorAll('img:not(.tms-logo-img)');
    const conversions = [];
    imgs.forEach((img) => {
      const div = document.createElement('div');
      div.className = img.className;
      const w = img.offsetWidth || parseInt(img.style.width, 10) || 32;
      const h = img.offsetHeight || parseInt(img.style.height, 10) || 32;
      div.style.width = w + 'px';
      div.style.height = h + 'px';
      div.style.borderRadius = '50%';
      div.style.backgroundImage = 'url("' + img.src + '")';
      div.style.backgroundSize = 'cover';
      div.style.backgroundPosition = 'top center';
      div.style.flexShrink = '0';
      div.style.border = img.style.border || '1px solid rgba(0,0,0,0.1)';
      div.style.boxSizing = 'border-box';
      img.parentNode.insertBefore(div, img);
      img.style.display = 'none';
      conversions.push({ img, div });
    });
    return {
      restore() { conversions.forEach(({ img, div }) => { img.style.display = ''; div.remove(); }); },
    };
  }

  function buildPrintFrame() {
    const frame = document.getElementById('print-frame');
    if (!frame) return;
    frame.innerHTML = '';
    frame.className = '';
    const hdrRow = document.createElement('div');
    hdrRow.className = 'page-header-row';
    hdrRow.innerHTML =
      '<div class="page-header-left">' +
        '<img src="assets/tms-logo.png" alt="TMS" class="tms-logo-img" />' +
        '<h1 class="page-title">Staff Organization Chart' +
        '<span class="version-badge version-text">' + esc(window.TMS.version || '') + '</span></h1>' +
      '</div>' +
      '<span class="page-meta">' + esc(window.TMS.dateStr || '') + '</span>';
    frame.appendChild(hdrRow);
    const orgView = document.getElementById('org-view');
    if (orgView) {
      const clone = orgView.cloneNode(true);
      clone.style.display = '';
      clone.style.paddingTop = '0';
      const deptGrid = clone.querySelector('.dept-grid');
      if (deptGrid) {
        const deptCount = Object.keys(depts()).filter((id) => id !== 'executive').length;
        deptGrid.style.gridTemplateColumns = 'repeat(' + Math.max(deptCount, 1) + ', 1fr)';
      }
      frame.appendChild(clone);
    }
  }

  function exportPDF() {
    const btn = document.getElementById('btn-export-pdf');
    const label = document.getElementById('export-label');
    const icon = document.getElementById('export-icon');
    btn.disabled = true;
    label.textContent = 'Generating\u2026';
    icon.style.opacity = '.4';

    const frame = document.getElementById('print-frame');
    frame.style.position = 'relative';
    frame.style.left = '0';
    frame.style.top = '0';
    frame.style.visibility = 'visible';
    frame.style.width = '1400px';

    const { restore: restoreImgs } = convertImagesForCapture(frame);

    function restore() {
      restoreImgs();
      frame.style.position = 'fixed';
      frame.style.left = '-19999px';
      frame.style.top = '-19999px';
      frame.style.visibility = 'hidden';
      frame.style.width = '';
      btn.disabled = false;
      label.textContent = 'Export PDF';
      icon.style.opacity = '';
    }

    html2canvas(frame, {
      scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#ffffff',
      width: 1400, windowWidth: 1400, logging: false,
    }).then((canvas) => {
      restore();
      const { jsPDF } = window.jspdf;
      // Single 11x8.5" landscape page — org chart is always scaled down to fit,
      // never spans multiple pages.
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: 'letter' });
      const margin = 0.25;
      const useW = 11 - margin * 2;
      const useH = 8.5 - margin * 2;
      const canvasW = canvas.width / 2;
      const canvasH = canvas.height / 2;
      const ratio = Math.min(useW / (canvasW / 96), useH / (canvasH / 96));
      const imgW = (canvasW / 96) * ratio;
      const imgH = (canvasH / 96) * ratio;
      const x = margin + (useW - imgW) / 2;
      const y = margin;
      const imgData = canvas.toDataURL('image/jpeg', 0.93);
      pdf.addImage(imgData, 'JPEG', x, y, imgW, imgH);
      pdf.save('TMS-Staff-Organization-Chart.pdf');
    }).catch((err) => {
      console.error('PDF export failed:', err);
      restore();
      alert('PDF export failed. Please try again.');
    });
  }

  function icoGlobe() {
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a14 14 0 010 18a14 14 0 010-18"/></svg>';
  }

  function buildDirectoryPrintFrame() {
    const frame = document.getElementById('print-frame');
    if (!frame) return;
    frame.innerHTML = '';
    frame.className = 'dirprint-frame';

    const meta = (window.TMS.data && window.TMS.data.meta) || {};
    const hdrRow = document.createElement('div');
    hdrRow.className = 'page-header-row';
    hdrRow.innerHTML =
      '<div class="page-header-left">' +
        '<img src="assets/tms-logo.png" alt="TMS" class="tms-logo-img" />' +
        '<h1 class="page-title">' + esc(meta.shortName || 'TMS') + ' Staff Directory</h1>' +
      '</div>' +
      '<span class="page-meta">' + esc(window.TMS.dateStr || '') + '</span>';
    frame.appendChild(hdrRow);

    const contactParts = [];
    if (meta.address) contactParts.push('<span class="dirprint-contact-item">' + icoMapPin() + esc(meta.address) + '</span>');
    if (meta.phone) contactParts.push('<span class="dirprint-contact-item">' + icoPhone() + esc(meta.phone) + '</span>');
    if (meta.fax) contactParts.push('<span class="dirprint-contact-item">' + icoFax() + esc(meta.fax) + '</span>');
    if (meta.website) contactParts.push('<span class="dirprint-contact-item">' + icoGlobe() + esc(meta.website) + '</span>');
    if (contactParts.length) {
      const contactLine = document.createElement('div');
      contactLine.className = 'dirprint-contact-line';
      contactLine.innerHTML = contactParts.join('<span class="dirprint-contact-sep">&middot;</span>');
      frame.appendChild(contactLine);
    }

    const table = document.createElement('div');
    table.className = 'dirprint-table';

    const headerRow = document.createElement('div');
    headerRow.className = 'dirprint-row dirprint-header-row';
    headerRow.innerHTML =
      '<div class="dirprint-col-photo"></div>' +
      '<div class="dirprint-col-name">Name</div>' +
      '<div class="dirprint-col-title">Title</div>' +
      '<div class="dirprint-col-direct">Direct</div>' +
      '<div class="dirprint-col-ext">Ext</div>' +
      '<div class="dirprint-col-email">Email</div>' +
      '<div class="dirprint-col-mobile">Mobile</div>';
    table.appendChild(headerRow);

    let anyNote = false;
    const sorted = people().slice().sort((a, b) =>
      a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));

    sorted.forEach((p) => {
      const row = document.createElement('div');
      row.className = 'dirprint-row';

      const photoCell = document.createElement('div');
      photoCell.className = 'dirprint-col-photo';
      photoCell.appendChild(makePhoto(p, 'dirprint-photo'));
      row.appendChild(photoCell);

      const directInfo = window.TMSCommon.parsePhoneNote(p.direct);
      const mobileInfo = window.TMSCommon.parsePhoneNote(p.mobile);
      if (directInfo.hasNote || mobileInfo.hasNote) anyNote = true;

      row.innerHTML +=
        '<div class="dirprint-col-name">' + esc(p.lastName) + ', ' + esc(p.firstName) + '</div>' +
        '<div class="dirprint-col-title">' + esc(p.title) + '</div>' +
        '<div class="dirprint-col-direct">' + esc(directInfo.display) + (directInfo.hasNote ? '<sup>*</sup>' : '') + '</div>' +
        '<div class="dirprint-col-ext">' + esc(p.ext) + '</div>' +
        '<div class="dirprint-col-email">' + esc(p.email) + '</div>' +
        '<div class="dirprint-col-mobile">' + (p.mobile ? esc(mobileInfo.display) + (mobileInfo.hasNote ? '<sup>*</sup>' : '') : '\u2014') + '</div>';

      table.appendChild(row);
    });

    frame.appendChild(table);

    if (anyNote) {
      const note = document.createElement('div');
      note.className = 'dirprint-footnote';
      note.textContent = '* Text-Messaging only available during AM and MST.';
      frame.appendChild(note);
    }
  }

  function exportDirectoryPDF() {
    const btn = document.getElementById('btn-export-directory-pdf');
    const label = document.getElementById('export-directory-label');
    const icon = document.getElementById('export-directory-icon');
    btn.disabled = true;
    label.textContent = 'Generating\u2026';
    icon.style.opacity = '.4';

    buildDirectoryPrintFrame();

    const frame = document.getElementById('print-frame');
    const frameWidth = 900;
    frame.style.position = 'relative';
    frame.style.left = '0';
    frame.style.top = '0';
    frame.style.visibility = 'visible';
    frame.style.width = frameWidth + 'px';

    const { restore: restoreImgs } = convertImagesForCapture(frame);

    function restore() {
      restoreImgs();
      frame.style.position = 'fixed';
      frame.style.left = '-19999px';
      frame.style.top = '-19999px';
      frame.style.visibility = 'hidden';
      frame.style.width = '';
      frame.className = '';
      btn.disabled = false;
      label.textContent = 'Export PDF';
      icon.style.opacity = '';
    }

    html2canvas(frame, {
      scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#ffffff',
      width: frameWidth, windowWidth: frameWidth, logging: false,
    }).then((canvas) => {
      restore();
      const { jsPDF } = window.jspdf;
      // Single 8.5x11" portrait page — the whole directory is always scaled
      // down to fit, never spans multiple pages.
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });
      const margin = 0.4;
      const useW = 8.5 - margin * 2;
      const useH = 11 - margin * 2;
      const canvasW = canvas.width / 2;
      const canvasH = canvas.height / 2;
      const ratio = Math.min(useW / (canvasW / 96), useH / (canvasH / 96));
      const imgW = (canvasW / 96) * ratio;
      const imgH = (canvasH / 96) * ratio;
      const x = margin + (useW - imgW) / 2;
      const y = margin;
      const imgData = canvas.toDataURL('image/jpeg', 0.93);
      pdf.addImage(imgData, 'JPEG', x, y, imgW, imgH);
      pdf.save('TMS-Staff-Directory.pdf');
    }).catch((err) => {
      console.error('Directory PDF export failed:', err);
      restore();
      alert('PDF export failed. Please try again.');
    });
  }

  function icoMapPin() {
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>';
  }
  function icoFax() {
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>';
  }

  function renderOrgContactBar() {
    const bar = document.getElementById('directory-org-contact');
    if (!bar) return;
    const meta = (window.TMS.data && window.TMS.data.meta) || {};
    const parts = [];
    if (meta.address) {
      parts.push(
        '<button type="button" class="org-contact-item org-contact-copy" data-copy="' + esc(meta.address) + '" ' +
        'data-msg="Address copied to clipboard." title="Click to copy address">' + icoMapPin() + esc(meta.address) + '</button>'
      );
    }
    if (meta.phone) parts.push('<span class="org-contact-item">' + icoPhone() + '<a href="tel:' + esc(meta.phone) + '">' + esc(meta.phone) + '</a></span>');
    if (meta.fax) {
      parts.push(
        '<button type="button" class="org-contact-item org-contact-copy" data-copy="' + esc(meta.fax) + '" ' +
        'data-msg="Fax number copied to clipboard." title="Click to copy fax number">' + icoFax() + esc(meta.fax) + '</button>'
      );
    }
    if (meta.website) {
      const href = /^https?:\/\//i.test(meta.website) ? meta.website : 'https://' + meta.website;
      parts.push('<span class="org-contact-item">' + icoGlobe() + '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(meta.website) + '</a></span>');
    }
    if (parts.length === 0) { bar.style.display = 'none'; return; }
    bar.style.display = '';
    bar.innerHTML = (meta.shortName ? '<strong>' + esc(meta.shortName) + '</strong>' : '') + parts.join('<span class="org-contact-sep">&middot;</span>');
    bar.onclick = (e) => {
      const btn = e.target.closest('.org-contact-copy');
      if (!btn) return;
      window.TMSCommon.copyToClipboard(btn.dataset.copy, btn.dataset.msg);
    };
  }

  /* ── Public API ─────────────────────────────────────────────────── */
  function renderOrgTab() {
    renderOrgView();
    requestAnimationFrame(() => setTimeout(buildPrintFrame, 100));
  }
  function renderDirectoryTab() { renderOrgContactBar(); renderDirectoryView(); }

  function init() {
    document.querySelectorAll('.dir-sort-btn').forEach((btn) => {
      btn.addEventListener('click', function () {
        dirSort = this.getAttribute('data-sort');
        document.querySelectorAll('.dir-sort-btn').forEach((b) => b.classList.remove('active'));
        this.classList.add('active');
        renderDirectoryView();
      });
    });

    document.getElementById('btn-export-pdf').addEventListener('click', exportPDF);
    document.getElementById('btn-export-directory-pdf').addEventListener('click', exportDirectoryPDF);

    document.getElementById('modal-overlay').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });
    document.getElementById('lightbox').addEventListener('click', closeLightbox);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { lightboxOpen ? closeLightbox() : closeModal(); }
    });

    let orgSearchTimer;
    document.getElementById('orgchart-search').addEventListener('input', function () {
      clearTimeout(orgSearchTimer);
      const val = this.value;
      orgSearchTimer = setTimeout(() => { orgSearchQuery = val.trim(); renderOrgView(); }, 160);
    });

    let dirSearchTimer;
    document.getElementById('directory-search').addEventListener('input', function () {
      clearTimeout(dirSearchTimer);
      const val = this.value;
      dirSearchTimer = setTimeout(() => { dirSearchQuery = val.trim(); renderDirectoryView(); }, 160);
    });
  }

  return { init, renderOrgTab, renderDirectoryTab, openProfileModal: openModal };
})();
