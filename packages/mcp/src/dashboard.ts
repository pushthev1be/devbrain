// The DevBrain dashboard served at GET /.
//
// Organised around projects. Opening the page asks "which project?" and then
// shows everything recorded for it — stack, bugs and fixes, decisions,
// architecture, patterns, anti-patterns, notes — grouped by the same sections
// the CLI dossier uses, so the browser and the terminal cannot disagree.
//
// What was removed, and why:
//   * The sidebar duplicated the tab bar — same five targets, same handler.
//   * "Stack" and "Endpoints" were hardcoded decoration. "MongoDB Atlas" was a
//     literal string, true or not.
//   * "Team Feed" listed recent entries across all projects, which on a small
//     install is the same content as everything else.
//   * "Decisions" and "Context" were top-level views of things that belong to a
//     project: decisions are one section of it, context is an action on it.
//
// No inline event handlers. This file is a TypeScript template literal, where a
// backslash-quote collapses to a bare quote — that once terminated a JS string
// early and killed the entire script block. Clicks are delegated from data
// attributes instead, so no escaping is ever required.

import { ENTRY_TYPES } from '@devbrain/core';

export const HTML_DASHBOARD = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DevBrain &mdash; Developer Memory</title>
  <style>
    :root {
      --bg: #141414; --surface: #1a1a1a; --surface2: #202020;
      --border: #2b2b2b; --border2: #383838;
      --text: #e6e6e6; --text2: #a8a8a8; --text3: #6e6e6e;
      --accent: #2f7fd4; --green: #4caf7d; --yellow: #d4a72f; --red: #d45f5f;
      --purple: #9b7fd4; --cyan: #4aa8c0;
      --mono: 'Consolas', 'Courier New', monospace;
      --ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

      /* The sidebar keeps its own tokens, as shadcn/ui's Sidebar does, so the
         panel can be themed without touching the rest of the page. */
      --sidebar: #1a1a1a;
      --sidebar-foreground: #c8c8c8;
      --sidebar-accent: #242424;
      --sidebar-accent-foreground: #f0f0f0;
      --sidebar-border: #2b2b2b;
      --sidebar-ring: #2f7fd4;
      --sidebar-width: 16rem;
      --sidebar-width-icon: 3.25rem;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--ui); font-size: 14px; }

    .topbar { display: flex; align-items: center; gap: 10px; padding: 8px 14px; background: var(--surface); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 20; }
    .brand { font-family: var(--mono); font-size: 13px; color: var(--text2); }
    .spacer { flex: 1; }
    .badge { font-family: var(--mono); font-size: 11px; padding: 2px 8px; border: 1px solid var(--border2); border-radius: 3px; color: var(--text3); }
    .badge.ok { color: var(--green); border-color: var(--green); }
    .badge.bad { color: var(--red); border-color: var(--red); }

    /* ── sidebar ────────────────────────────────────────────────────────────
       Ported from shadcn/ui's Sidebar: the same composition (header, content,
       group with a label, menu, menu button, badge, footer, rail), the same
       --sidebar-* theming contract, collapse-to-icon, and Ctrl/Cmd+B.
       Written in plain CSS because this dashboard is one served string with no
       React, Tailwind or build step — so the component itself cannot be
       installed, only its structure and behaviour.
       The open/collapsed state lives in a data attribute on <body>, which is
       what shadcn's SidebarProvider does with a wrapper div, so these rules
       read the way its group-data-[state=...] selectors do. */
    .layout { display: grid; grid-template-columns: var(--sidebar-width) 1fr; min-height: calc(100vh - 41px); }

    /* Sticky and exactly one viewport tall, as shadcn's panel is, so the header
       and footer stay put and only .sidebar-content scrolls. Left to stretch,
       the panel grows with the page and its footer ends up far below the fold. */
    .sidebar { position: sticky; top: 41px; height: calc(100vh - 41px); display: flex; flex-direction: column; background: var(--sidebar); color: var(--sidebar-foreground); border-right: 1px solid var(--sidebar-border); overflow: hidden; }
    .sidebar-header { flex: 0 0 auto; padding: 9px 12px; border-bottom: 1px solid var(--sidebar-border); }
    .sidebar-content { flex: 1 1 auto; overflow-y: auto; overflow-x: hidden; padding: 4px 0; }
    .sidebar-footer { flex: 0 0 auto; padding: 9px 12px; border-top: 1px solid var(--sidebar-border); }

    .sidebar-group { display: flex; flex-direction: column; padding: 4px 0; }
    .sidebar-group-label { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: var(--text3); padding: 7px 14px 4px; white-space: nowrap; }
    .sidebar-menu { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
    .sidebar-menu-item { position: relative; }
    .sidebar-menu-button { display: flex; align-items: center; gap: 9px; width: 100%; text-align: left; background: none; border: none; border-left: 2px solid transparent; color: var(--sidebar-foreground); padding: 7px 12px; cursor: pointer; font-size: 13px; font-family: var(--ui); }
    .sidebar-menu-button:hover { background: var(--sidebar-accent); color: var(--sidebar-accent-foreground); }
    .sidebar-menu-button:focus-visible { outline: 2px solid var(--sidebar-ring); outline-offset: -2px; }
    .sidebar-menu-button[data-active="true"] { background: var(--sidebar-accent); color: var(--sidebar-accent-foreground); border-left-color: var(--accent); }
    .sidebar-menu-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sidebar-menu-badge { font-family: var(--mono); font-size: 11px; color: var(--text3); }

    /* Every row carries an icon, because that is all a collapsed panel can
       show. A project has no icon of its own, so it gets a monogram. */
    .sidebar-icon { flex: 0 0 20px; width: 20px; height: 20px; display: grid; place-items: center; font-family: var(--mono); font-size: 10px; text-transform: uppercase; color: var(--text2); border: 1px solid var(--border2); border-radius: 3px; }
    .sidebar-icon svg { width: 13px; height: 13px; }
    .sidebar-menu-button[data-active="true"] .sidebar-icon { color: var(--sidebar-accent-foreground); border-color: var(--accent); }
    .sidebar-brand { display: flex; align-items: center; gap: 9px; font-family: var(--mono); font-size: 12px; color: var(--text2); }

    /* The rail: the thin strip on the panel's edge that toggles it. */
    .sidebar-rail { position: absolute; top: 0; bottom: 0; right: 0; width: 8px; padding: 0; border: none; background: transparent; cursor: ew-resize; }
    .sidebar-rail:hover { background: var(--sidebar-border); }
    .sidebar-rail:focus-visible { outline: 2px solid var(--sidebar-ring); outline-offset: -2px; }

    .sidebar-trigger { display: inline-grid; place-items: center; width: 28px; height: 28px; padding: 0; background: none; border: 1px solid transparent; border-radius: 4px; color: var(--text2); cursor: pointer; }
    .sidebar-trigger:hover { background: var(--surface2); color: var(--text); border-color: var(--border2); }
    .sidebar-trigger svg { width: 15px; height: 15px; }

    .sidebar-backdrop { display: none; position: fixed; inset: 41px 0 0 0; padding: 0; border: none; background: rgba(0, 0, 0, .5); z-index: 30; }

    /* Collapsed to icons. Desktop only: an overlay the user opened on purpose
       should show its labels, so these rules never apply on a narrow screen. */
    @media (min-width: 861px) {
      body[data-sidebar="collapsed"] .layout { grid-template-columns: var(--sidebar-width-icon) 1fr; }
      body[data-sidebar="collapsed"] .sidebar-menu-label,
      body[data-sidebar="collapsed"] .sidebar-menu-badge,
      body[data-sidebar="collapsed"] .sidebar-group-label,
      body[data-sidebar="collapsed"] .sidebar-collapse-hide { display: none; }
      body[data-sidebar="collapsed"] .sidebar-menu-button { justify-content: center; gap: 0; padding: 7px 0; }
      body[data-sidebar="collapsed"] .sidebar-brand,
      body[data-sidebar="collapsed"] .sidebar-footer { justify-content: center; }
      body[data-sidebar="collapsed"] .sidebar-header,
      body[data-sidebar="collapsed"] .sidebar-footer { padding-left: 0; padding-right: 0; text-align: center; }
    }

    .main { padding: 18px 22px 60px; overflow-x: hidden; }
    .phead h1 { margin: 0 0 4px; font-size: 20px; }
    .pmeta { color: var(--text2); font-size: 12px; font-family: var(--mono); margin-bottom: 14px; word-break: break-all; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .btn { background: var(--accent); border: none; color: #fff; padding: 7px 14px; border-radius: 4px; cursor: pointer; font-size: 13px; }
    .btn.ghost { background: transparent; border: 1px solid var(--border2); color: var(--text2); }
    .btn.ghost:hover { border-color: var(--accent); color: var(--text); }
    .btn:disabled { opacity: .5; cursor: default; }

    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
    .tb-q { flex: 1 1 220px; min-width: 160px; padding: 6px 10px; font-size: 13px; }
    .tb-sel { flex: 0 0 auto; width: auto; padding: 6px 8px; font-size: 12px; }
    .tb-check { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text2); cursor: pointer; white-space: nowrap; }
    .tb-count { margin-left: auto; font-family: var(--mono); font-size: 11px; color: var(--text3); white-space: nowrap; }
    .chip { background: var(--surface2); border: 1px solid var(--border); color: var(--text2); padding: 4px 10px; border-radius: 12px; cursor: pointer; font-size: 12px; }
    .chip.active { border-color: var(--accent); color: var(--text); }
    .chip .n { font-family: var(--mono); color: var(--text3); margin-left: 5px; }

    .sec { margin-bottom: 26px; }
    .sec h2 { font-size: 14px; margin: 0 0 2px; }
    .sec .blurb { color: var(--text3); font-size: 12px; margin-bottom: 10px; }
    /* An entry is a closed row until you ask for it. Titles are written to be
       the symptom, so the title is the thing worth scanning; the detail is for
       the one entry you stopped on. Thirty-six entries opened at once is a wall
       nobody reads, which is the state this replaces. */
    .card { background: var(--surface); border: 1px solid var(--border); border-left: 2px solid var(--border2); border-radius: 4px; margin-bottom: 6px; }
    .card.superseded { opacity: .5; }
    .card > summary, .card > .chead { display: flex; align-items: baseline; gap: 9px; padding: 9px 12px; }
    .card > summary { cursor: pointer; list-style: none; }
    .card > summary::-webkit-details-marker { display: none; }
    .card > summary:hover { background: var(--surface2); }
    .card > summary:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
    .card[open] > summary { border-bottom: 1px solid var(--border); }
    .ctitle { flex: 1; font-size: 13px; font-weight: 600; line-height: 1.4; color: var(--text); }
    .cmark { font-family: var(--mono); font-size: 13px; color: var(--text3); }
    .card > summary .cmark::after { content: '+'; }
    .card[open] > summary .cmark::after { content: '-'; }
    .cdetail { padding: 10px 12px 11px; }

    /* The spine carries the type, so a section's shape is visible before
       reading a word of it. */
    .card.k-bug, .card.k-anti-pattern { border-left-color: var(--red); }
    .card.k-fix { border-left-color: var(--green); }
    .card.k-decision { border-left-color: var(--purple); }
    .card.k-architecture, .card.k-stack { border-left-color: var(--cyan); }
    .card.k-pattern, .card.k-lesson { border-left-color: var(--yellow); }

    .cmeta { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; font-family: var(--mono); font-size: 11px; color: var(--text3); }
    .cbody { color: var(--text2); font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
    .err { font-family: var(--mono); font-size: 11px; background: var(--surface2); border: 1px solid var(--border); padding: 6px 9px; border-radius: 3px; color: var(--yellow); margin-top: 7px; overflow-x: auto; }
    .arch { font-size: 12px; color: var(--purple); margin-top: 6px; }
    .tags { margin-top: 7px; display: flex; flex-wrap: wrap; gap: 5px; }
    .tag { font-family: var(--mono); font-size: 10px; background: var(--surface2); border: 1px solid var(--border); padding: 1px 6px; border-radius: 2px; color: var(--text3); }
    .t { font-family: var(--mono); font-size: 10px; padding: 1px 6px; border-radius: 2px; }
    .t-bug { background: rgba(212,95,95,.16); color: var(--red); }
    .t-fix { background: rgba(76,175,125,.16); color: var(--green); }
    .t-decision { background: rgba(155,127,212,.16); color: var(--purple); }
    .t-architecture { background: rgba(74,168,192,.16); color: var(--cyan); }
    .t-pattern, .t-lesson { background: rgba(212,167,47,.16); color: var(--yellow); }
    .t-anti-pattern { background: rgba(212,95,95,.22); color: var(--red); }
    .t-stack { background: rgba(74,168,192,.14); color: var(--cyan); }
    .t-note, .t-image { background: var(--surface2); color: var(--text3); }
    .conf-confirmed { color: var(--green); }
    .conf-corroborated { color: var(--yellow); }

    .empty { color: var(--text3); font-family: var(--mono); font-size: 12px; padding: 22px 0; }
    .fail { color: var(--red); font-family: var(--mono); font-size: 12px; padding: 12px 0; }
    .row { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
    .in { flex: 1; min-width: 180px; background: var(--surface2); border: 1px solid var(--border2); color: var(--text); padding: 8px 11px; border-radius: 4px; font-size: 13px; font-family: inherit; }
    .in:focus { outline: none; border-color: var(--accent); }
    textarea.in { min-height: 110px; resize: vertical; }
    label.fl { display: block; font-size: 11px; color: var(--text3); margin-bottom: 4px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .full { grid-column: 1 / -1; }
    pre.ctx { background: var(--surface); border: 1px solid var(--border); padding: 12px; border-radius: 4px; font-family: var(--mono); font-size: 12px; white-space: pre-wrap; word-break: break-word; max-height: 60vh; overflow-y: auto; }
    .supersede-btn { margin-top: 8px; background: transparent; border: 1px solid var(--border); color: var(--text3); padding: 3px 10px; font-size: 11px; font-family: var(--mono); cursor: pointer; border-radius: 3px; }
    .supersede-btn:hover { border-color: var(--red); color: var(--red); }
    .toast { position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%); background: var(--surface2); border: 1px solid var(--border2); padding: 9px 16px; border-radius: 4px; font-size: 13px; opacity: 0; pointer-events: none; transition: opacity .2s; z-index: 50; }
    .toast.show { opacity: 1; }

    /* Offcanvas below this width: the panel slides over the page instead of
       taking a column from it, and a backdrop closes it. */
    @media (max-width: 860px) {
      .layout { grid-template-columns: 1fr; }
      .sidebar { position: fixed; top: 41px; bottom: 0; left: 0; width: var(--sidebar-width); z-index: 40; transform: translateX(-100%); transition: transform .18s ease; }
      .sidebar.open { transform: translateX(0); }
      .sidebar-rail { display: none; }
      .sidebar-backdrop.open { display: block; }
      .main { padding: 14px 14px 60px; }
      .grid2 { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="topbar">
    <button class="sidebar-trigger" data-act="toggle-sidebar" title="Toggle sidebar (Ctrl+B)" aria-label="Toggle sidebar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M9 3v18"></path></svg>
    </button>
    <span class="brand">devbrain &mdash; developer memory</span>
    <span class="spacer"></span>
  </div>

  <div class="layout">
    <aside class="sidebar" id="sidebar" data-collapsible="icon">
      <div class="sidebar-header">
        <div class="sidebar-brand">
          <span class="sidebar-icon">db</span>
          <span class="sidebar-menu-label">devbrain</span>
        </div>
      </div>

      <div class="sidebar-content">
        <div class="sidebar-group">
          <div class="sidebar-group-label">Projects</div>
          <ul class="sidebar-menu" id="project-list">
            <li class="sidebar-menu-item"><div class="empty sidebar-collapse-hide" style="padding:8px 14px">loading&hellip;</div></li>
          </ul>
        </div>

        <div class="sidebar-group">
          <div class="sidebar-group-label">All projects</div>
          <ul class="sidebar-menu">
            <li class="sidebar-menu-item">
              <button class="sidebar-menu-button" data-view="search" title="Search everything">
                <span class="sidebar-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.6-3.6"></path></svg></span>
                <span class="sidebar-menu-label">Search everything</span>
              </button>
            </li>
            <li class="sidebar-menu-item">
              <button class="sidebar-menu-button" data-view="save" title="Save an entry">
                <span class="sidebar-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg></span>
                <span class="sidebar-menu-label">Save an entry</span>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div class="sidebar-footer">
        <span class="badge" id="storage-badge">checking&hellip;</span>
      </div>

      <button class="sidebar-rail" data-act="toggle-sidebar" title="Toggle sidebar (Ctrl+B)" aria-label="Toggle sidebar"></button>
    </aside>

    <main class="main" id="main">
      <div class="empty">loading&hellip;</div>
    </main>
  </div>

  <button class="sidebar-backdrop" id="sidebar-backdrop" data-act="close-sidebar" aria-label="Close sidebar"></button>

  <div class="toast" id="toast"></div>

  <script>
    var STATE = {
      projects: [], projectId: null, view: 'project', section: 'all', dossier: null,
      // Filters apply to the loaded project, client side — the whole record is
      // already here, so narrowing it should not cost a round trip.
      q: '', sort: 'newest', category: 'all', origin: 'all', showRetracted: false,
    };
    var TYPES = ${JSON.stringify(ENTRY_TYPES.map(t => ({ type: t.type, hint: t.hint })))};

    function esc(s) {
      return String(s == null ? '' : s)
        .split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;')
        .split('"').join('&quot;');
    }
    function el(id) { return document.getElementById(id); }
    function toast(msg) {
      var t = el('toast'); t.textContent = msg; t.classList.add('show');
      setTimeout(function () { t.classList.remove('show'); }, 2600);
    }
    function fail(msg, detail) {
      return '<div class="fail">' + esc(msg) + (detail ? ' &mdash; ' + esc(detail) : '') + '</div>';
    }

    async function getJSON(url, opts) {
      var r = await fetch(url, opts);
      var body = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(body.error || ('HTTP ' + r.status));
      return body;
    }

    // ── storage badge: report what is really configured, not a fixed label ──
    async function loadStorage() {
      var b = el('storage-badge');
      try {
        var d = await getJSON('/api/health');
        b.textContent = d.storage === 'local' ? 'local storage' : 'mongodb';
        b.className = 'badge ok';
      } catch (e) {
        b.textContent = 'disconnected';
        b.className = 'badge bad';
      }
    }

    // A collapsed panel shows icons only, and a project has no icon, so it gets
    // the first two letters of its name — enough to tell projects apart.
    function monogram(name) {
      var letters = String(name || '').replace(/[^A-Za-z0-9]/g, '');
      return letters.slice(0, 2) || '?';
    }

    async function loadProjects() {
      var box = el('project-list');
      try {
        var d = await getJSON('/api/projects');
        STATE.projects = d.projects || [];
        if (!STATE.projects.length) {
          box.innerHTML = '<div class="empty" style="padding:10px 14px">no projects yet &mdash; run devbrain init</div>';
          return;
        }
        box.innerHTML = STATE.projects.map(function (p) {
          return '<li class="sidebar-menu-item">' +
                 '<button class="sidebar-menu-button" data-project="' + esc(p.id) + '"' +
                 (p.id === STATE.projectId ? ' data-active="true"' : '') +
                 ' title="' + esc(p.name) + ' &mdash; ' + esc(p.path) + '">' +
                 '<span class="sidebar-icon">' + esc(monogram(p.name)) + '</span>' +
                 '<span class="sidebar-menu-label">' + esc(p.name) + '</span>' +
                 '<span class="sidebar-menu-badge">' + p.total + '</span>' +
                 '</button></li>';
        }).join('');
        if (!STATE.projectId) selectProject(STATE.projects[0].id);
      } catch (e) {
        box.innerHTML = fail('could not load projects', e.message);
      }
    }

    function selectProject(id) {
      STATE.projectId = id;
      STATE.view = 'project';
      STATE.section = 'all';
      document.querySelectorAll('[data-project]').forEach(function (n) {
        if (n.getAttribute('data-project') === id) n.setAttribute('data-active', 'true');
        else n.removeAttribute('data-active');
      });
      document.querySelectorAll('[data-view]').forEach(function (n) { n.removeAttribute('data-active'); });
      closeSidebarOverlay();
      renderProject();
    }

    // ── the project record: everything saved about one project ──
    async function renderProject() {
      var main = el('main');
      main.innerHTML = '<div class="empty">loading project&hellip;</div>';
      try {
        var d = await getJSON('/api/project?id=' + encodeURIComponent(STATE.projectId));
        STATE.dossier = d;
        var p = d.project;

        var head = '<div class="phead"><h1>' + esc(p.name) + '</h1>' +
          // Escape each value, then join with markup. Escaping a string that
          // already contains an entity renders the entity as literal text.
          '<div class="pmeta">' +
          ((p.stack || []).length ? (p.stack).map(esc).join(' &middot; ') : 'stack not detected') +
          ' &middot; ' + esc(p.path) + '</div></div>' +
          '<div class="actions">' +
          '<button class="btn" data-act="save-here">Save an entry here</button>' +
          '<button class="btn ghost" data-act="context">agent.md</button>' +
          '<button class="btn ghost" data-act="search-here">Search</button>' +
          '</div>';

        if (!d.total) {
          main.innerHTML = head + '<div class="empty">Nothing recorded for this project yet.<br><br>' +
            'Run <b>devbrain backfill</b> to read past commits, or save an entry above.</div>';
          return;
        }

        var total = d.sections.reduce(function (a, s) { return a + s.entries.length; }, 0);
        var chips = '<div class="chips"><button class="chip' + (STATE.section === 'all' ? ' active' : '') +
          '" data-section="all">Everything<span class="n">' + total + '</span></button>' +
          d.sections.map(function (s) {
            return '<button class="chip' + (STATE.section === s.section ? ' active' : '') +
              '" data-section="' + esc(s.section) + '">' + esc(s.heading) +
              '<span class="n">' + s.entries.length + '</span></button>';
          }).join('') + '</div>';

        var shown = d.sections
          .filter(function (s) { return STATE.section === 'all' || s.section === STATE.section; })
          .map(function (s) {
            return { section: s, entries: sortEntries(s.entries.filter(keepEntry)) };
          })
          .filter(function (s) { return s.entries.length > 0; });

        var kept = shown.reduce(function (a, s) { return a + s.entries.length; }, 0);
        var body = shown.length
          ? shown.map(function (s) {
              return '<div class="sec"><h2>' + esc(s.section.heading) + '</h2>' +
                '<div class="blurb">' + esc(s.section.blurb) + '</div>' +
                s.entries.map(renderCard).join('') + '</div>';
            }).join('')
          : '<div class="empty">// nothing matches these filters &mdash; ' +
            '<a href="#" data-act="clear-filters" style="color:var(--accent)">clear them</a></div>';

        main.innerHTML = head + chips + toolbar(kept, total) + body;
        restoreFilterFocus();
      } catch (e) {
        main.innerHTML = fail('could not load this project', e.message);
      }
    }

    // ── filtering and sorting, over the project already loaded ──
    var SORTS = [
      ['newest',     'Newest first'],
      ['oldest',     'Oldest first'],
      ['used',       'Most used'],
      ['confidence', 'Most confident'],
      ['title',      'Title A-Z'],
    ];

    function keepEntry(e) {
      // Retracted entries are kept for history but are not current guidance, so
      // they stay hidden unless asked for.
      if (e.supersededBy && !STATE.showRetracted) return false;
      if (STATE.category !== 'all' && (e.category || 'other') !== STATE.category) return false;
      if (STATE.origin === 'indexed' && !e.sourceFile) return false;
      if (STATE.origin === 'captured' && e.sourceFile) return false;
      if (STATE.q) {
        var hay = (e.title + ' ' + e.content + ' ' + (e.tags || []).join(' ') + ' ' +
                   (e.errorPattern || '') + ' ' + (e.causeArchetype || '')).toLowerCase();
        if (hay.indexOf(STATE.q.toLowerCase()) === -1) return false;
      }
      return true;
    }

    function sortEntries(list) {
      var rank = { confirmed: 2, corroborated: 1, observation: 0 };
      var copy = list.slice();
      if (STATE.sort === 'oldest')      copy.sort(function (a, b) { return a.createdAt - b.createdAt; });
      else if (STATE.sort === 'used')   copy.sort(function (a, b) { return (b.retrievalCount || 0) - (a.retrievalCount || 0); });
      else if (STATE.sort === 'title')  copy.sort(function (a, b) { return String(a.title).localeCompare(String(b.title)); });
      else if (STATE.sort === 'confidence') {
        copy.sort(function (a, b) {
          return (rank[b.confidence] || 0) - (rank[a.confidence] || 0) || b.createdAt - a.createdAt;
        });
      } else copy.sort(function (a, b) { return b.createdAt - a.createdAt; });
      return copy;
    }

    function categoriesInDossier() {
      var seen = {};
      (STATE.dossier ? STATE.dossier.sections : []).forEach(function (s) {
        s.entries.forEach(function (e) { seen[e.category || 'other'] = true; });
      });
      return Object.keys(seen).sort();
    }

    function toolbar(kept, total) {
      var opts = function (list, current) {
        return list.map(function (o) {
          var v = Array.isArray(o) ? o[0] : o, label = Array.isArray(o) ? o[1] : o;
          return '<option value="' + esc(v) + '"' + (v === current ? ' selected' : '') + '>' + esc(label) + '</option>';
        }).join('');
      };
      var retractedCount = 0;
      (STATE.dossier ? STATE.dossier.sections : []).forEach(function (s) {
        s.entries.forEach(function (e) { if (e.supersededBy) retractedCount++; });
      });

      return '<div class="toolbar">' +
        '<input class="in tb-q" id="f-q" placeholder="Filter these entries&hellip;" value="' + esc(STATE.q) + '">' +
        '<select class="in tb-sel" id="f-sort">' + opts(SORTS, STATE.sort) + '</select>' +
        '<select class="in tb-sel" id="f-cat">' +
          opts([['all', 'All categories']].concat(categoriesInDossier().map(function (c) { return [c, c]; })), STATE.category) +
        '</select>' +
        '<select class="in tb-sel" id="f-origin">' +
          opts([['all', 'All sources'], ['captured', 'From my work'], ['indexed', 'From a file']], STATE.origin) +
        '</select>' +
        (retractedCount
          ? '<label class="tb-check"><input type="checkbox" id="f-retracted"' + (STATE.showRetracted ? ' checked' : '') + '> ' +
            'retracted (' + retractedCount + ')</label>'
          : '') +
        '<button class="chip" data-act="toggle-all">expand all</button>' +
        '<span class="tb-count">' + kept + ' of ' + total + '</span>' +
        '</div>';
    }

    // Re-rendering replaces the input, so put the caret back where it was —
    // otherwise typing a filter drops focus after the first character.
    var FILTER_CARET = null;
    function restoreFilterFocus() {
      var q = el('f-q');
      if (q && FILTER_CARET !== null) {
        q.focus();
        try { q.setSelectionRange(FILTER_CARET, FILTER_CARET); } catch (err) {}
        FILTER_CARET = null;
      }
    }

    // Entries saved before the CLI stopped repeating the title still carry it
    // at the head of their body. Strip it on read, so an old entry reads like a
    // new one without rewriting anything in the store.
    //
    // Done with string slicing rather than a regular expression: inside this
    // template literal a lone backslash is dropped, so a written \\s would reach
    // the browser as s — a different pattern that still parses and silently
    // matches the wrong thing.
    function bodyOf(e) {
      var body = String(e.content || '');
      var title = String(e.title || '');
      if (title && body.slice(0, title.length) === title) {
        body = body.slice(title.length).trim();
        var seps = ['\\u2014', '\\u2013', '--'];
        for (var i = 0; i < seps.length; i++) {
          if (body.slice(0, seps[i].length) === seps[i]) { body = body.slice(seps[i].length); break; }
        }
      }
      return body.trim();
    }

    function renderCard(e) {
      var type = esc(e.type);
      var meta = '';
      if (e.category) meta += '<span>' + esc(e.category) + '</span>';
      meta += '<span>' + esc(e.timeAgo) + '</span>';
      if (e.confidence && e.confidence !== 'observation') {
        meta += '<span class="conf-' + esc(e.confidence) + '">' + esc(e.confidence) + '</span>';
      }
      if (e.seenInProjects >= 2) meta += '<span>seen in ' + e.seenInProjects + ' projects</span>';
      if (e.supersededBy) meta += '<span style="color:var(--red)">superseded</span>';

      var body = bodyOf(e);
      var detail = '';
      if (body) detail += '<div class="cbody">' + esc(body) + '</div>';
      if (e.errorPattern) detail += '<div class="err">' + esc(e.errorPattern) + '</div>';
      if (e.causeArchetype) detail += '<div class="arch">root-cause pattern: ' + esc(e.causeArchetype) + '</div>';
      if (e.tags && e.tags.length) {
        detail += '<div class="tags">' + e.tags.map(function (t) {
          return '<span class="tag">' + esc(t) + '</span>';
        }).join('') + '</div>';
      }
      if (e.type === 'decision' && !e.supersededBy) {
        detail += '<button class="supersede-btn" data-supersede="' + esc(e.id) + '">supersede</button>';
      }

      var head = '<span class="t t-' + type + '">' + type + '</span>' +
        '<span class="ctitle">' + esc(e.title) + '</span>' +
        '<div class="cmeta">' + meta + '</div>';
      var cls = 'card k-' + type + (e.supersededBy ? ' superseded' : '');

      // A title with nothing behind it is a plain row, not an empty disclosure
      // that opens onto nothing.
      if (!detail) return '<div class="' + cls + '"><div class="chead">' + head + '</div></div>';
      return '<details class="' + cls + '"><summary>' + head + '<span class="cmark"></span></summary>' +
        '<div class="cdetail">' + detail + '</div></details>';
    }

    // ── search across every project ──
    function renderSearch(prefill) {
      STATE.view = 'search';
      closeSidebarOverlay();
      el('main').innerHTML =
        '<div class="phead"><h1>Search</h1><div class="pmeta">across every project</div></div>' +
        '<div class="row"><input class="in" id="q" placeholder="paste an exact error message, or describe the problem" value="' + esc(prefill || '') + '">' +
        '<button class="btn" data-act="do-search">Search</button></div>' +
        '<div id="results"><div class="empty">nothing searched yet</div></div>';
      el('q').focus();
      el('q').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') doSearch(); });
      if (prefill) doSearch();
    }

    async function doSearch() {
      var q = el('q').value.trim();
      if (!q) return;
      var box = el('results');
      box.innerHTML = '<div class="empty">searching&hellip;</div>';
      try {
        var d = await getJSON('/api/search', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q })
        });
        var rs = d.results || [];
        if (!rs.length) { box.innerHTML = '<div class="empty">no matches</div>'; return; }
        box.innerHTML = rs.map(function (r) {
          return '<div class="card"><h3>' + esc(r.title) + '</h3>' +
            '<div class="cmeta"><span class="t t-' + esc(r.type) + '">' + esc(r.type) + '</span>' +
            '<span>' + esc(r.match) + '</span><span>' + esc(r.project) + '</span></div>' +
            '<div class="cbody">' + esc(r.content) + '</div></div>';
        }).join('');
      } catch (e) {
        box.innerHTML = fail('search failed', e.message);
      }
    }

    // ── agent context for the selected project ──
    async function renderContext() {
      var main = el('main');
      var name = currentProjectName();
      main.innerHTML = '<div class="phead"><h1>agent.md</h1><div class="pmeta">' + esc(name) +
        ' &mdash; ranked history, ready to paste into an agent prompt</div></div>' +
        '<div class="actions"><button class="btn ghost" data-act="back">Back to project</button>' +
        '<button class="btn ghost" data-act="copy-ctx">Copy</button>' +
        '<button class="btn ghost" data-act="download-ctx">Download agent.md</button></div>' +
        '<pre class="ctx" id="ctx">generating&hellip;</pre>';
      try {
        var d = await getJSON('/api/context', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '' })
        });
        el('ctx').textContent = d.text || '(empty)';
      } catch (e) {
        el('ctx').textContent = 'Could not generate context: ' + e.message;
      }
    }

    function currentProjectName() {
      var p = STATE.projects.filter(function (x) { return x.id === STATE.projectId; })[0];
      return p ? p.name : 'no project';
    }

    // ── save, into a project you choose ──
    function renderSave() {
      STATE.view = 'save';
      closeSidebarOverlay();
      var opts = STATE.projects.map(function (p) {
        return '<option value="' + esc(p.id) + '"' + (p.id === STATE.projectId ? ' selected' : '') + '>' + esc(p.name) + '</option>';
      }).join('');
      var types = TYPES.map(function (t) {
        return '<option value="' + esc(t.type) + '"' + (t.type === 'fix' ? ' selected' : '') + ' title="' + esc(t.hint) + '">' + esc(t.type) + '</option>';
      }).join('');
      var cats = ['auth','database','deployment','build','config','network','performance','ui','data','testing','security','other']
        .map(function (c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');

      el('main').innerHTML =
        '<div class="phead"><h1>Save an entry</h1><div class="pmeta">stored against the project you pick</div></div>' +
        '<div class="grid2">' +
          '<div><label class="fl">project</label><select class="in" id="f-project">' + opts + '</select></div>' +
          '<div><label class="fl">type</label><select class="in" id="f-type">' + types + '</select></div>' +
          '<div><label class="fl">category</label><select class="in" id="f-cat">' + cats + '</select></div>' +
          '<div><label class="fl">tags (comma separated)</label><input class="in" id="f-tags" placeholder="mongodb, auth, production"></div>' +
          '<div class="full"><label class="fl">title &mdash; specific and searchable</label><input class="in" id="f-title" placeholder="MongoDB authSource=admin required in production URI"></div>' +
          '<div class="full"><label class="fl">what happened &mdash; symptom, root cause, fix</label><textarea class="in" id="f-content" placeholder="Describe the problem, the real cause, and the exact resolution"></textarea></div>' +
          '<div class="full"><label class="fl">exact error text (optional)</label><input class="in" id="f-err" placeholder="MongoServerError: Authentication failed"></div>' +
        '</div>' +
        '<button class="btn" data-act="do-save" id="save-btn">Save to DevBrain</button>';
    }

    async function doSave() {
      var btn = el('save-btn');
      var title = el('f-title').value.trim();
      var content = el('f-content').value.trim();
      if (!title || !content) { toast('title and description are required'); return; }
      var tags = el('f-tags').value.trim();
      btn.disabled = true; btn.textContent = 'Saving&hellip;';
      try {
        await getJSON('/api/save', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: el('f-project').value,
            type: el('f-type').value,
            category: el('f-cat').value,
            title: title, content: content,
            error_pattern: el('f-err').value.trim() || undefined,
            tags: tags ? tags.split(',').map(function (t) { return t.trim(); }).filter(Boolean) : []
          })
        });
        toast('saved to ' + el('f-project').options[el('f-project').selectedIndex].text);
        STATE.projectId = el('f-project').value;
        await loadProjects();
        renderProject();
      } catch (e) {
        toast('save failed: ' + e.message);
      } finally {
        btn.disabled = false; btn.textContent = 'Save to DevBrain';
      }
    }

    async function supersedeDecision(id, btn) {
      var reason = prompt('Why is this decision being superseded? (optional)');
      if (reason === null) return;
      btn.disabled = true; btn.textContent = 'superseding&hellip;';
      try {
        await getJSON('/api/decisions/' + encodeURIComponent(id) + '/supersede', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason || 'Manually superseded via dashboard' })
        });
        toast('decision superseded');
        renderProject();
      } catch (e) {
        toast('could not supersede: ' + e.message);
        btn.disabled = false; btn.textContent = 'supersede';
      }
    }

    // Filter controls are recreated on every render, so listen at the document
    // rather than binding to elements that will be replaced.
    document.addEventListener('input', function (ev) {
      var t = ev.target;
      if (!t || !t.id) return;
      if (t.id === 'f-q') { FILTER_CARET = t.selectionStart; STATE.q = t.value; renderProject(); }
    });

    document.addEventListener('change', function (ev) {
      var t = ev.target;
      if (!t || !t.id) return;
      if (t.id === 'f-sort')           { STATE.sort = t.value; renderProject(); }
      else if (t.id === 'f-cat')       { STATE.category = t.value; renderProject(); }
      else if (t.id === 'f-origin')    { STATE.origin = t.value; renderProject(); }
      else if (t.id === 'f-retracted') { STATE.showRetracted = t.checked; renderProject(); }
    });

    // ── one delegated click handler; no inline handlers anywhere ──
    document.addEventListener('click', function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;

      var proj = t.closest('[data-project]');
      if (proj) { selectProject(proj.getAttribute('data-project')); return; }

      var chip = t.closest('[data-section]');
      if (chip) { STATE.section = chip.getAttribute('data-section'); renderProject(); return; }

      var nav = t.closest('[data-view]');
      if (nav) {
        document.querySelectorAll('[data-view]').forEach(function (n) { n.removeAttribute('data-active'); });
        document.querySelectorAll('[data-project]').forEach(function (n) { n.removeAttribute('data-active'); });
        nav.setAttribute('data-active', 'true');
        if (nav.getAttribute('data-view') === 'search') renderSearch();
        else renderSave();
        return;
      }

      var sup = t.closest('[data-supersede]');
      if (sup) { supersedeDecision(sup.getAttribute('data-supersede'), sup); return; }

      var act = t.closest('[data-act]');
      if (!act) return;
      var a = act.getAttribute('data-act');
      if (a === 'clear-filters') {
        ev.preventDefault();
        STATE.q = ''; STATE.category = 'all'; STATE.origin = 'all'; STATE.showRetracted = false;
        renderProject();
      }
      else if (a === 'toggle-all') {
        var cards = el('main').querySelectorAll('details.card');
        var opening = false;
        cards.forEach(function (c) { if (!c.open) opening = true; });
        cards.forEach(function (c) { c.open = opening; });
        act.textContent = opening ? 'collapse all' : 'expand all';
      }
      else if (a === 'toggle-sidebar') toggleSidebar();
      else if (a === 'close-sidebar') closeSidebarOverlay();
      else if (a === 'save-here' || a === 'do-save-nav') renderSave();
      else if (a === 'do-save') doSave();
      else if (a === 'search-here') renderSearch();
      else if (a === 'do-search') doSearch();
      else if (a === 'context') renderContext();
      else if (a === 'back') renderProject();
      else if (a === 'copy-ctx') {
        var txt = el('ctx').textContent;
        if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { toast('copied'); });
        else toast('copy not available');
      }
      else if (a === 'download-ctx') {
        var blob = new Blob([el('ctx').textContent], { type: 'text/markdown' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url; link.download = 'agent.md';
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        toast('agent.md downloaded');
      }
    });

    // ── sidebar state ──
    //
    // Narrow screens get the offcanvas panel, which is open or shut; wider ones
    // get the column, which is expanded or collapsed to icons. The collapsed
    // choice is remembered, because a sidebar that reopens itself on every
    // page load is one the user has to close again every time.

    function isNarrow() { return window.matchMedia('(max-width: 860px)').matches; }

    function closeSidebarOverlay() {
      el('sidebar').classList.remove('open');
      el('sidebar-backdrop').classList.remove('open');
    }

    function setCollapsed(collapsed) {
      document.body.setAttribute('data-sidebar', collapsed ? 'collapsed' : 'expanded');
      try { localStorage.setItem('devbrain:sidebar', collapsed ? 'collapsed' : 'expanded'); } catch (e) {}
    }

    function toggleSidebar() {
      if (isNarrow()) {
        var open = el('sidebar').classList.toggle('open');
        el('sidebar-backdrop').classList.toggle('open', open);
        return;
      }
      setCollapsed(document.body.getAttribute('data-sidebar') !== 'collapsed');
    }

    // The shortcut shadcn's Sidebar uses, on both platforms.
    document.addEventListener('keydown', function (ev) {
      if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && (ev.key === 'b' || ev.key === 'B')) {
        ev.preventDefault();
        toggleSidebar();
      } else if (ev.key === 'Escape' && isNarrow()) {
        closeSidebarOverlay();
      }
    });

    try {
      setCollapsed(localStorage.getItem('devbrain:sidebar') === 'collapsed');
    } catch (e) {
      setCollapsed(false);
    }

    loadStorage();
    loadProjects();
  </script>
</body>
</html>`;
