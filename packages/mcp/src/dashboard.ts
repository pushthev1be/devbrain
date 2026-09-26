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
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--ui); font-size: 14px; }

    .topbar { display: flex; align-items: center; gap: 10px; padding: 8px 14px; background: var(--surface); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 20; }
    .brand { font-family: var(--mono); font-size: 13px; color: var(--text2); }
    .spacer { flex: 1; }
    .badge { font-family: var(--mono); font-size: 11px; padding: 2px 8px; border: 1px solid var(--border2); border-radius: 3px; color: var(--text3); }
    .badge.ok { color: var(--green); border-color: var(--green); }
    .badge.bad { color: var(--red); border-color: var(--red); }
    .menu-btn { display: none; background: var(--surface2); border: 1px solid var(--border2); color: var(--text); padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 13px; }

    .layout { display: grid; grid-template-columns: 250px 1fr; min-height: calc(100vh - 41px); }
    .sidebar { background: var(--surface); border-right: 1px solid var(--border); padding: 10px 0; overflow-y: auto; }
    .side-label { font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: var(--text3); padding: 10px 14px 5px; }
    .proj { display: flex; align-items: baseline; gap: 8px; padding: 7px 14px; cursor: pointer; border-left: 2px solid transparent; }
    .proj:hover { background: var(--surface2); }
    .proj.active { background: var(--surface2); border-left-color: var(--accent); }
    .proj-name { flex: 1; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .proj-count { font-family: var(--mono); font-size: 11px; color: var(--text3); }
    .navlink { display: block; width: 100%; text-align: left; background: none; border: none; border-left: 2px solid transparent; color: var(--text2); padding: 7px 14px; cursor: pointer; font-size: 13px; font-family: var(--ui); }
    .navlink:hover { background: var(--surface2); color: var(--text); }
    .navlink.active { background: var(--surface2); color: var(--text); border-left-color: var(--accent); }

    .main { padding: 18px 22px 60px; overflow-x: hidden; }
    .phead h1 { margin: 0 0 4px; font-size: 20px; }
    .pmeta { color: var(--text2); font-size: 12px; font-family: var(--mono); margin-bottom: 14px; word-break: break-all; }
    .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .btn { background: var(--accent); border: none; color: #fff; padding: 7px 14px; border-radius: 4px; cursor: pointer; font-size: 13px; }
    .btn.ghost { background: transparent; border: 1px solid var(--border2); color: var(--text2); }
    .btn.ghost:hover { border-color: var(--accent); color: var(--text); }
    .btn:disabled { opacity: .5; cursor: default; }

    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
    .chip { background: var(--surface2); border: 1px solid var(--border); color: var(--text2); padding: 4px 10px; border-radius: 12px; cursor: pointer; font-size: 12px; }
    .chip.active { border-color: var(--accent); color: var(--text); }
    .chip .n { font-family: var(--mono); color: var(--text3); margin-left: 5px; }

    .sec { margin-bottom: 26px; }
    .sec h2 { font-size: 14px; margin: 0 0 2px; }
    .sec .blurb { color: var(--text3); font-size: 12px; margin-bottom: 10px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-left: 2px solid var(--border2); border-radius: 4px; padding: 11px 13px; margin-bottom: 8px; }
    .card.superseded { opacity: .5; }
    .card h3 { margin: 0 0 5px; font-size: 13px; font-weight: 600; line-height: 1.4; }
    .cmeta { display: flex; flex-wrap: wrap; gap: 8px; font-family: var(--mono); font-size: 11px; color: var(--text3); margin-bottom: 6px; }
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

    @media (max-width: 860px) {
      .layout { grid-template-columns: 1fr; }
      .sidebar { display: none; border-right: none; border-bottom: 1px solid var(--border); }
      .sidebar.open { display: block; }
      .menu-btn { display: block; }
      .main { padding: 14px 14px 60px; }
      .grid2 { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="topbar">
    <button class="menu-btn" data-act="menu">Projects</button>
    <span class="brand">devbrain &mdash; developer memory</span>
    <span class="spacer"></span>
    <span class="badge" id="storage-badge">checking&hellip;</span>
  </div>

  <div class="layout">
    <aside class="sidebar" id="sidebar">
      <div class="side-label">Projects</div>
      <div id="project-list"><div class="empty" style="padding:10px 14px">loading&hellip;</div></div>
      <div class="side-label">All projects</div>
      <button class="navlink" data-view="search">Search everything</button>
      <button class="navlink" data-view="save">Save an entry</button>
    </aside>

    <main class="main" id="main">
      <div class="empty">loading&hellip;</div>
    </main>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    var STATE = { projects: [], projectId: null, view: 'project', section: 'all', dossier: null };
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
          return '<div class="proj' + (p.id === STATE.projectId ? ' active' : '') + '" data-project="' + esc(p.id) + '">' +
                 '<span class="proj-name" title="' + esc(p.path) + '">' + esc(p.name) + '</span>' +
                 '<span class="proj-count">' + p.total + '</span></div>';
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
      document.querySelectorAll('.proj').forEach(function (n) {
        n.classList.toggle('active', n.getAttribute('data-project') === id);
      });
      document.querySelectorAll('.navlink').forEach(function (n) { n.classList.remove('active'); });
      el('sidebar').classList.remove('open');
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
          '<button class="btn ghost" data-act="context">Agent context</button>' +
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

        var shown = d.sections.filter(function (s) {
          return STATE.section === 'all' || s.section === STATE.section;
        });

        main.innerHTML = head + chips + shown.map(function (s) {
          return '<div class="sec"><h2>' + esc(s.heading) + '</h2>' +
            '<div class="blurb">' + esc(s.blurb) + '</div>' +
            s.entries.map(renderCard).join('') + '</div>';
        }).join('');
      } catch (e) {
        main.innerHTML = fail('could not load this project', e.message);
      }
    }

    function renderCard(e) {
      var meta = '<span class="t t-' + esc(e.type) + '">' + esc(e.type) + '</span>';
      if (e.category) meta += '<span>' + esc(e.category) + '</span>';
      meta += '<span>' + esc(e.timeAgo) + '</span>';
      if (e.confidence && e.confidence !== 'observation') {
        meta += '<span class="conf-' + esc(e.confidence) + '">' + esc(e.confidence) + '</span>';
      }
      if (e.seenInProjects >= 2) meta += '<span>seen in ' + e.seenInProjects + ' projects</span>';
      if (e.supersededBy) meta += '<span style="color:var(--red)">superseded</span>';

      var html = '<div class="card' + (e.supersededBy ? ' superseded' : '') + '">' +
        '<h3>' + esc(e.title) + '</h3>' +
        '<div class="cmeta">' + meta + '</div>';
      if (e.content && e.content !== e.title) html += '<div class="cbody">' + esc(e.content) + '</div>';
      if (e.errorPattern) html += '<div class="err">' + esc(e.errorPattern) + '</div>';
      if (e.causeArchetype) html += '<div class="arch">root-cause pattern: ' + esc(e.causeArchetype) + '</div>';
      if (e.tags && e.tags.length) {
        html += '<div class="tags">' + e.tags.map(function (t) {
          return '<span class="tag">' + esc(t) + '</span>';
        }).join('') + '</div>';
      }
      if (e.type === 'decision' && !e.supersededBy) {
        html += '<button class="supersede-btn" data-supersede="' + esc(e.id) + '">supersede</button>';
      }
      return html + '</div>';
    }

    // ── search across every project ──
    function renderSearch(prefill) {
      STATE.view = 'search';
      el('sidebar').classList.remove('open');
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
      main.innerHTML = '<div class="phead"><h1>Agent context</h1><div class="pmeta">' + esc(name) +
        ' &mdash; ranked history, ready to paste into an agent prompt</div></div>' +
        '<div class="actions"><button class="btn ghost" data-act="back">Back to project</button>' +
        '<button class="btn ghost" data-act="copy-ctx">Copy</button></div>' +
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
      el('sidebar').classList.remove('open');
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
        document.querySelectorAll('.navlink').forEach(function (n) { n.classList.remove('active'); });
        nav.classList.add('active');
        if (nav.getAttribute('data-view') === 'search') renderSearch();
        else renderSave();
        return;
      }

      var sup = t.closest('[data-supersede]');
      if (sup) { supersedeDecision(sup.getAttribute('data-supersede'), sup); return; }

      var act = t.closest('[data-act]');
      if (!act) return;
      var a = act.getAttribute('data-act');
      if (a === 'menu') el('sidebar').classList.toggle('open');
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
    });

    loadStorage();
    loadProjects();
  </script>
</body>
</html>`;
