/**
 * TMS Staff Resources — directory-exports.js
 * The Directory tab's "Export PDF" button opens a choice modal with four
 * options. "Staff Phone Directory" is the existing export (orgchart.js).
 * This file adds the other three.
 */
window.TMSDirectoryExports = (function () {
  'use strict';
  const { esc, makePhoto, parsePhoneNote, lastNameOf } = window.TMSCommon;

  function people() { return window.TMSOrgChart.people(); }
  function depts() { return window.TMSOrgChart.depts(); }
  function convertImagesForCapture(frame) { return window.TMSOrgChart.convertImagesForCapture(frame); }

  function byLastName(a, b) {
    return lastNameOf(a.name).localeCompare(lastNameOf(b.name)) || a.name.localeCompare(b.name);
  }
  function isLeader(p) { return p.role === 'dept_head' || p.role === 'executive'; }

  // Executive always first; every other department alphabetically by name.
  function orderedDeptIds() {
    const ids = Object.keys(depts());
    const rest = ids.filter((id) => id !== 'executive')
      .sort((a, b) => (depts()[a].name || '').localeCompare(depts()[b].name || ''));
    return ['executive', ...rest];
  }

  function setStatus(message) {
    const el = document.getElementById('dirx-status');
    if (!message) { el.style.display = 'none'; el.textContent = ''; return; }
    el.style.display = '';
    el.textContent = message;
  }

  function setOptionsDisabled(disabled) {
    document.querySelectorAll('.dirx-option').forEach((btn) => { btn.disabled = disabled; });
  }

  /* ══════════════════════════════════════════════════════════════════
     1. STAFF PHONE DIRECTORY (DIRECT DIALS ONLY) — lobby poster
     ══════════════════════════════════════════════════════════════════ */
  function icoMapPin() {
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-2px"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>';
  }
  function icoPhoneSm() {
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-2px"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8a19.79 19.79 0 01-3.07-8.64A2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.16 6.16l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>';
  }
  function icoFaxSm() {
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-2px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>';
  }
  function icoGlobeSm() {
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-2px"><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a14 14 0 010 18a14 14 0 010-18"/></svg>';
  }

  function buildDirectDialsFrame() {
    const frame = document.getElementById('print-frame');
    frame.innerHTML = '';
    frame.className = 'dirx-poster-frame';

    const meta = (window.TMS.data && window.TMS.data.meta) || {};
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });

    const header = document.createElement('div');
    header.className = 'dirx-poster-header';
    header.innerHTML =
      '<img src="assets/tms-logo.png" alt="TMS" class="dirx-poster-logo tms-logo-img" />' +
      '<div class="dirx-poster-title-block">' +
        '<div class="dirx-poster-title">STAFF DIRECTORY</div>' +
        '<div class="dirx-poster-subtitle">Current as of ' + esc(dateStr) + '</div>' +
      '</div>';
    frame.appendChild(header);

    const bannerParts = [];
    if (meta.address) bannerParts.push(icoMapPin() + ' ' + esc(meta.address));
    if (meta.phone) bannerParts.push(icoPhoneSm() + ' ' + esc(meta.phone));
    if (meta.fax) bannerParts.push(icoFaxSm() + ' ' + esc(meta.fax));
    const banner = document.createElement('div');
    banner.className = 'dirx-poster-banner';
    banner.innerHTML = bannerParts.join(' <span class="dirx-poster-banner-sep">|</span> ') +
      (meta.website ? ' <span class="dirx-poster-banner-sep">|</span> ' + icoGlobeSm() + ' <strong>' + esc(meta.website) + '</strong>' : '');
    frame.appendChild(banner);

    const body = document.createElement('div');
    body.className = 'dirx-poster-body';
    body.innerHTML =
      '<div class="dirx-poster-notice">' +
        '<div class="dirx-poster-notice-title">VISITORS:</div>' +
        '<div class="dirx-poster-notice-text">Please contact the staff member directly if the reception desk is not staffed.</div>' +
      '</div>' +
      '<div class="dirx-poster-notice">' +
        '<div class="dirx-poster-notice-title">DELIVERIES:</div>' +
        '<div class="dirx-poster-notice-text">Please ring the doorbell if the reception desk is not staffed, and someone will be out to assist you.</div>' +
      '</div>';
    frame.appendChild(body);

    const sorted = people().slice().sort(byLastName);
    const mid = Math.ceil(sorted.length / 2);
    const columns = [sorted.slice(0, mid), sorted.slice(mid)];

    const columnsWrap = document.createElement('div');
    columnsWrap.className = 'dirx-poster-columns';
    columns.forEach((col) => {
      const table = document.createElement('div');
      table.className = 'dirx-poster-table';
      table.innerHTML =
        '<div class="dirx-poster-row dirx-poster-header-row"><div>Name</div><div>Direct Line</div></div>' +
        col.map((p) => {
          const d = parsePhoneNote(p.direct);
          return '<div class="dirx-poster-row"><div>' + esc(p.name) + '</div><div>' + esc(d.display) + '</div></div>';
        }).join('');
      columnsWrap.appendChild(table);
    });
    body.appendChild(columnsWrap);
  }

  function exportDirectDialsOnly() {
    setStatus('Generating\u2026');
    setOptionsDisabled(true);
    buildDirectDialsFrame();

    const frame = document.getElementById('print-frame');
    const frameWidth = 1000;
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
      setOptionsDisabled(false);
      setStatus('');
    }

    html2canvas(frame, {
      scale: 3, useCORS: true, allowTaint: false, backgroundColor: '#ffffff',
      width: frameWidth, windowWidth: frameWidth, logging: false,
    }).then((canvas) => {
      restore();
      const { jsPDF } = window.jspdf;
      // Single 8.5x11" portrait page, scaled to fit — this is meant to be
      // printed and hung, so it always fills one page regardless of headcount.
      // Anchored to the top (not vertically centered) so the header sits
      // right at the top margin.
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });
      const margin = 0.15;
      const useW = 8.5 - margin * 2;
      const useH = 11 - margin * 2;
      const canvasW = canvas.width / 3;
      const canvasH = canvas.height / 3;
      const ratio = Math.min(useW / (canvasW / 96), useH / (canvasH / 96));
      const imgW = (canvasW / 96) * ratio;
      const imgH = (canvasH / 96) * ratio;
      const x = margin + (useW - imgW) / 2;
      const y = margin;
      const imgData = canvas.toDataURL('image/jpeg', 0.93);
      pdf.addImage(imgData, 'JPEG', x, y, imgW, imgH);
      pdf.save('TMS-Staff-Phone-Directory-Lobby.pdf');
      closeModal();
    }).catch((err) => {
      console.error('Direct Dials Only export failed:', err);
      restore();
      alert('PDF export failed. Please try again.');
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     2. STAFF PHOTO DIRECTORY — one (or more) page per department
     ══════════════════════════════════════════════════════════════════ */
  const PHOTO_PAGE_W = 816;  // 8.5in @ 96dpi
  const PHOTO_PAGE_H = 1056; // 11in @ 96dpi
  const CARDS_PER_PAGE = 12; // 3 columns x 4 rows

  function buildPhotoDirectoryPages() {
    const pages = [];
    orderedDeptIds().forEach((deptId) => {
      const dept = depts()[deptId];
      if (!dept) return;
      const members = people().filter((p) => p.deptId === deptId);
      if (members.length === 0) return;
      members.sort((a, b) => {
        if (isLeader(a) && !isLeader(b)) return -1;
        if (isLeader(b) && !isLeader(a)) return 1;
        return byLastName(a, b);
      });
      for (let i = 0; i < members.length; i += CARDS_PER_PAGE) {
        pages.push({
          deptName: dept.name,
          deptColor: dept.color || 'exec',
          continued: i > 0,
          people: members.slice(i, i + CARDS_PER_PAGE),
        });
      }
    });
    return pages;
  }

  function buildPhotoPageFrame(page) {
    const frame = document.getElementById('print-frame');
    frame.innerHTML = '';
    frame.className = 'dirx-photo-page';

    const header = document.createElement('div');
    header.className = 'dirx-photo-page-header';
    header.innerHTML =
      '<div class="dirx-photo-page-header-left">' +
        '<img src="assets/tms-logo.png" alt="TMS" class="dirx-photo-logo tms-logo-img" />' +
        '<div class="dirx-photo-main-title">Staff Photo Directory</div>' +
      '</div>' +
      '<span class="dirx-photo-date">' + esc(window.TMS.dateStr || '') + '</span>';
    frame.appendChild(header);

    const band = document.createElement('div');
    band.className = 'dirx-photo-dept-band dept-' + page.deptColor;
    band.innerHTML = esc(page.deptName) +
      (page.continued ? ' <span class="dirx-photo-continued">(Continued.)</span>' : '');
    frame.appendChild(band);

    const grid = document.createElement('div');
    grid.className = 'dirx-photo-grid';
    page.people.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'dirx-photo-card';
      card.appendChild(makePhoto(p, 'dirx-photo-img'));
      const name = document.createElement('div');
      name.className = 'dirx-photo-name';
      name.textContent = p.name;
      const title = document.createElement('div');
      title.className = 'dirx-photo-title';
      title.textContent = p.title;
      const email = document.createElement('div');
      email.className = 'dirx-photo-email';
      email.textContent = p.email;
      card.appendChild(name);
      card.appendChild(title);
      card.appendChild(email);
      grid.appendChild(card);
    });
    frame.appendChild(grid);
  }

  async function exportPhotoDirectory() {
    setStatus('Generating\u2026');
    setOptionsDisabled(true);

    const pages = buildPhotoDirectoryPages();
    const frame = document.getElementById('print-frame');
    frame.style.position = 'relative';
    frame.style.left = '0';
    frame.style.top = '0';
    frame.style.visibility = 'visible';
    frame.style.width = PHOTO_PAGE_W + 'px';
    frame.style.height = PHOTO_PAGE_H + 'px';

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });
    const margin = 0.25;

    try {
      for (let i = 0; i < pages.length; i++) {
        setStatus('Generating\u2026 (page ' + (i + 1) + ' of ' + pages.length + ')');
        buildPhotoPageFrame(pages[i]);
        const { restore } = convertImagesForCapture(frame);
        // eslint-disable-next-line no-await-in-loop
        const canvas = await html2canvas(frame, {
          scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#ffffff',
          width: PHOTO_PAGE_W, height: PHOTO_PAGE_H,
          windowWidth: PHOTO_PAGE_W, windowHeight: PHOTO_PAGE_H, logging: false,
        });
        restore();
        if (i > 0) pdf.addPage();
        const imgData = canvas.toDataURL('image/jpeg', 0.93);
        pdf.addImage(imgData, 'JPEG', margin, margin, 8.5 - margin * 2, 11 - margin * 2);
      }
      pdf.save('TMS-Staff-Photo-Directory.pdf');
      closeModal();
    } catch (err) {
      console.error('Photo Directory export failed:', err);
      alert('PDF export failed. Please try again.');
    } finally {
      frame.style.position = 'fixed';
      frame.style.left = '-19999px';
      frame.style.top = '-19999px';
      frame.style.visibility = 'hidden';
      frame.style.width = '';
      frame.style.height = '';
      frame.className = '';
      setOptionsDisabled(false);
      setStatus('');
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     3. STAFF BIRTHDAYS LIST — same simple template as the Phone Directory,
        just Name + Birthday columns.
     ══════════════════════════════════════════════════════════════════ */
  function buildBirthdaysFrame() {
    const frame = document.getElementById('print-frame');
    frame.innerHTML = '';
    frame.className = '';

    const meta = (window.TMS.data && window.TMS.data.meta) || {};
    const hdrRow = document.createElement('div');
    hdrRow.className = 'page-header-row';
    hdrRow.innerHTML =
      '<div class="page-header-left">' +
        '<img src="assets/tms-logo.png" alt="TMS" class="tms-logo-img" />' +
        '<h1 class="page-title">Staff Birthdays</h1>' +
      '</div>' +
      '<span class="page-meta">' + esc(window.TMS.dateStr || '') + '</span>';
    frame.appendChild(hdrRow);

    const table = document.createElement('div');
    table.className = 'dirprint-table dirx-bday-table';
    const headerRow = document.createElement('div');
    headerRow.className = 'dirprint-row dirprint-header-row dirx-bday-row';
    headerRow.innerHTML = '<div>Name</div><div>Birthday</div>';
    table.appendChild(headerRow);

    const sorted = people().slice().sort(byLastName);
    sorted.forEach((p) => {
      const row = document.createElement('div');
      row.className = 'dirprint-row dirx-bday-row';
      row.innerHTML = '<div>' + esc(p.lastName) + ', ' + esc(p.firstName) + '</div><div>' + esc(p.birthdate || '\u2014') + '</div>';
      table.appendChild(row);
    });
    frame.appendChild(table);
  }

  function exportBirthdaysList() {
    setStatus('Generating\u2026');
    setOptionsDisabled(true);
    buildBirthdaysFrame();

    const frame = document.getElementById('print-frame');
    const frameWidth = 700;
    frame.style.position = 'relative';
    frame.style.left = '0';
    frame.style.top = '0';
    frame.style.visibility = 'visible';
    frame.style.width = frameWidth + 'px';

    function restore() {
      frame.style.position = 'fixed';
      frame.style.left = '-19999px';
      frame.style.top = '-19999px';
      frame.style.visibility = 'hidden';
      frame.style.width = '';
      setOptionsDisabled(false);
      setStatus('');
    }

    html2canvas(frame, {
      scale: 3, useCORS: true, allowTaint: false, backgroundColor: '#ffffff',
      width: frameWidth, windowWidth: frameWidth, logging: false,
    }).then((canvas) => {
      restore();
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: 'letter' });
      const margin = 0.4;
      const useW = 8.5 - margin * 2;
      const useH = 11 - margin * 2;
      const canvasW = canvas.width / 3;
      const canvasH = canvas.height / 3;
      const ratio = Math.min(useW / (canvasW / 96), useH / (canvasH / 96));
      const imgW = (canvasW / 96) * ratio;
      const imgH = (canvasH / 96) * ratio;
      const x = margin + (useW - imgW) / 2;
      const y = margin;
      const imgData = canvas.toDataURL('image/jpeg', 0.93);
      pdf.addImage(imgData, 'JPEG', x, y, imgW, imgH);
      pdf.save('TMS-Staff-Birthdays.pdf');
      closeModal();
    }).catch((err) => {
      console.error('Birthdays List export failed:', err);
      restore();
      alert('PDF export failed. Please try again.');
    });
  }

  /* ── Choice modal ───────────────────────────────────────────────── */
  function openModal() {
    document.getElementById('dirx-modal-overlay').classList.add('open');
  }
  function closeModal() {
    document.getElementById('dirx-modal-overlay').classList.remove('open');
  }

  function handleOptionClick(kind) {
    if (kind === 'phone') { window.TMSOrgChart.exportPhoneDirectory(); closeModal(); }
    else if (kind === 'direct-only') exportDirectDialsOnly();
    else if (kind === 'photo') exportPhotoDirectory();
    else if (kind === 'birthdays') exportBirthdaysList();
  }

  function init() {
    document.getElementById('dirx-close').addEventListener('click', closeModal);
    document.getElementById('dirx-modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'dirx-modal-overlay') closeModal();
    });
    document.querySelectorAll('.dirx-option').forEach((btn) => {
      btn.addEventListener('click', () => handleOptionClick(btn.dataset.export));
    });
  }

  return { init, openModal };
})();
