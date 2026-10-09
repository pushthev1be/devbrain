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

import { ICON_PATHS } from './icons';
import { STACK_ICONS } from './stackIcons';
import { LOGO_MARK, faviconDataUri } from './brand';
import { ENTRY_TYPES } from '@devbrain/core';

export const HTML_DASHBOARD = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DevBrain &mdash; Developer Memory</title>
  <link rel="icon" href="${faviconDataUri()}">
  <style>
    :root {
      /* ── neutrals ────────────────────────────────────────────────────────
         Nine steps, and nothing outside them. Most interfaces that read as
         amateur are not badly designed so much as inconsistent: eleven nearly
         identical greys, each chosen in the moment. */
      --bg: #0f0f11; --surface: #161618; --surface2: #1d1d20;
      --border: #26262b; --border2: #33333a;
      --text: #ececf0; --text2: #9f9fa9; --text3: #6a6a74;

      /* ── colour with a job ───────────────────────────────────────────────
         Each of these means exactly one thing, which is the only way colour
         carries meaning at all. Previously one amber did six jobs — brand,
         primary action, active tab, focus ring, warning, and a graph edge
         kind — so it had stopped signalling any of them.

         --accent  interactive: focus, selection, the active tab
         --warn    needs attention, and nothing else
         --brand   the logo mark, and nothing else */
      --accent: #6d7cf0;
      --accent-soft: rgba(109, 124, 240, .14);
      --warn: #d4a053;
      --warn-dim: rgba(212, 160, 83, .10);
      --brand: #d4a053;

      /* Entry types. Desaturated on purpose: these are a data encoding read
         forty rows at a time, not highlights. */
      --t-red: #c97070; --t-green: #5aa37e; --t-blue: #6f93c9;
      --t-purple: #8d85c4; --t-cyan: #5d96a8; --t-amber: #b99a5c;
      /* Older names, still referenced by the graph and badges. */
      --green: var(--t-green); --red: var(--t-red); --yellow: var(--t-amber);
      --purple: var(--t-purple); --cyan: var(--t-cyan); --blue: var(--t-blue);

      /* ── type ────────────────────────────────────────────────────────────
         System stacks, deliberately. A webfont on a locally served tool buys
         a little character and costs a network round trip, a flash of
         unstyled text, and working offline. Segoe UI Variable is picked up on
         Windows 11 and Cascadia ships with the terminal. */
      --ui: ui-sans-serif, system-ui, -apple-system, 'Segoe UI Variable Text',
            'Segoe UI', Inter, Roboto, 'Helvetica Neue', Arial, sans-serif;
      --mono: ui-monospace, 'Cascadia Code', 'Cascadia Mono', 'SF Mono',
              'JetBrains Mono', Consolas, monospace;

      --t-xs: 10.5px; --t-sm: 11.5px; --t-base: 12.5px;
      --t-md: 13.5px; --t-lg: 16px;   --t-xl: 21px;

      /* ── space ───────────────────────────────────────────────────────────
         A 4px grid. Every margin and padding below is one of these. */
      --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s5: 24px; --s6: 32px;

      --r1: 5px; --r2: 7px; --r3: 10px;
      /* Short and eased out. Longer reads as sluggish, linear as mechanical. */
      --fast: 120ms cubic-bezier(.4, 0, .2, 1);
      --med: 200ms cubic-bezier(.4, 0, .2, 1);

      --sidebar: #141416;
      --sidebar-foreground: #c4c4cc;
      --sidebar-accent: #1f1f23;
      --sidebar-accent-foreground: #f0f0f4;
      --sidebar-border: #26262b;
      --sidebar-ring: var(--accent);
      --sidebar-width: 13.5rem;
      --sidebar-width-icon: 3.25rem;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; background: var(--bg); color: var(--text);
      font-family: var(--ui); font-size: var(--t-md); line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      /* Digits of equal width, so the shown-and-caught column and the stat
         cards line up instead of shuffling as the numbers change. */
      font-variant-numeric: tabular-nums;
    }
    ::selection { background: var(--accent-soft); }
    :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

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
    .layout { display: grid; grid-template-columns: var(--sidebar-width) 1fr; min-height: 100vh; }

    /* Sticky and exactly one viewport tall, as shadcn's panel is, so the header
       and footer stay put and only .sidebar-content scrolls. Left to stretch,
       the panel grows with the page and its footer ends up far below the fold. */
    .sidebar { position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; background: var(--sidebar); color: var(--sidebar-foreground); border-right: 1px solid var(--sidebar-border); overflow: hidden; }
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
      /* Collapsed, a project is just its folder. The stack row and the count
         have nowhere to go in a 52px rail and were spilling past its edge. */
      body[data-sidebar="collapsed"] .pstack-row,
      body[data-sidebar="collapsed"] .sidebar-menu-badge { display: none; }
      /* The toggle stays. A control that collapses the panel and then vanishes
         makes the action one-way, leaving only the hairline rail to undo it. */
      body[data-sidebar="collapsed"] .sidebar-toggle { position: static; margin: 0 auto; }
      body[data-sidebar="collapsed"] .sidebar-menu-button.proj { align-items: center; }
      body[data-sidebar="collapsed"] .proj-main { flex: 0 0 auto; }
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
    .btn.ghost.active { border-color: var(--accent); color: var(--text); background: var(--surface2); }
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
    /* A fixed-width column on the right, so the eye can run down it rather
       than hunting for the number in a different place on every row. */
    .cstat { flex: 0 0 auto; min-width: 128px; text-align: right; font-family: var(--mono); font-size: 11px; color: var(--text3); }
    .caught { color: var(--green); }
    .caught.zero { color: var(--text3); }
    .cstat .shown, .cstat .sep { color: var(--text3); }
    .use { font-family: var(--mono); font-size: 11px; color: var(--text3); margin-top: 4px; }
    .use.none { color: var(--yellow); }
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

    /* ── the graph ────────────────────────────────────────────────────────────
       Time runs left to right and each entry type gets a lane, so a bug and the
       fix that closed it sit in different rows with a line between them: the
       point where it was fixed is a place on the picture rather than a date to
       compare. A force layout was tried first and read as a hairball — it
       showed that things connect, but never when, which is the whole question. */
    .gwrap { border: 1px solid var(--border); border-radius: 4px; background: var(--surface); overflow-x: auto; overflow-y: hidden; }
    .gwrap svg { display: block; }
    .glane { fill: var(--text3); font-family: var(--mono); font-size: 10px; text-transform: uppercase; }
    .gtick { stroke: var(--border); stroke-width: 1; }
    .gdate { fill: var(--text3); font-family: var(--mono); font-size: 9px; }
    .glanebg { fill: var(--surface2); opacity: .35; }
    .gedge { fill: none; stroke: var(--border2); stroke-width: 1.2; }
    /* Recorded edges are facts and drawn solid; inferred ones are DevBrain's
       guess and drawn dashed, so the picture never overstates what it knows. */
    .gedge.e-fixes { stroke: var(--green); stroke-width: 1.8; }
    .gedge.e-supersedes { stroke: var(--red); stroke-width: 1.6; }
    .gedge.e-sequence { stroke: var(--border2); stroke-dasharray: 2 3; }
    .gedge.e-same-error { stroke: var(--yellow); stroke-dasharray: 4 3; opacity: .75; }
    .gedge.e-same-cause { stroke: var(--purple); stroke-dasharray: 4 3; opacity: .75; }
    /* Weaker than a recorded edge, but still a line. Drawn in border grey at
       low opacity it was invisible against the surface, which is the same as
       not drawing it: the picture read as loose dots when nearly every entry
       in fact had a connection. */
    .gedge.e-related { stroke: var(--t-blue); stroke-dasharray: 3 3; opacity: .45; }
    .gedge.dim { opacity: .12; }
    .gnode { cursor: pointer; }
    .gnode circle { stroke: var(--bg); stroke-width: 1.5; }
    .gnode.n-bug circle, .gnode.n-anti-pattern circle { fill: var(--red); }
    .gnode.n-fix circle { fill: var(--green); }
    .gnode.n-decision circle { fill: var(--purple); }
    .gnode.n-architecture circle, .gnode.n-stack circle { fill: var(--cyan); }
    .gnode.n-pattern circle, .gnode.n-lesson circle { fill: var(--yellow); }
    .gnode.n-note circle, .gnode.n-image circle { fill: var(--text3); }
    /* A retracted entry stays on the picture: a correction is only readable
       next to the thing it corrected. */
    .gnode.retracted circle { opacity: .3; stroke-dasharray: 2 2; }
    .gnode.dim { opacity: .2; }
    .gnode[data-sel="true"] circle { stroke: var(--text); stroke-width: 2.5; }
    /* The travelling light, and the type badge it lights on arrival. */
    /* The light takes its line's colour, so it reads as the legend while it
       moves. Same tokens as .gedge below, so the two can never drift. */
    /* Coloured by its line but glowing, so it stays findable against a line of
       the same colour. One is visible at a time, so the filter costs nothing. */
    .gspark { fill: currentColor; color: var(--text2); filter: drop-shadow(0 0 4px currentColor); }
    .gspark.e-fixes { color: var(--green); }
    .gspark.e-supersedes { color: var(--red); }
    .gspark.e-sequence { color: var(--text2); }
    .gspark.e-same-error { color: var(--yellow); }
    .gspark.e-same-cause { color: var(--purple); }
    .gspark.e-related { color: var(--t-blue); }
    /* Brighter than the ambient light: these were asked for, not stumbled on. */
    .gspark.gfocus { filter: drop-shadow(0 0 7px currentColor); }
    .gbadge { font-family: var(--mono); font-size: 9px; font-weight: 700; text-anchor: middle; pointer-events: none; }
    .gbadge.dim { opacity: .12; }
    .gbadge.n-bug, .gbadge.n-anti-pattern { fill: var(--red); }
    .gbadge.n-fix { fill: var(--green); }
    .gbadge.n-decision { fill: var(--purple); }
    .gbadge.n-architecture, .gbadge.n-stack { fill: var(--cyan); }
    .gbadge.n-pattern, .gbadge.n-lesson { fill: var(--yellow); }
    .gbadge.n-note, .gbadge.n-image { fill: var(--text2); }
    /* Motion is the whole effect, so for a reader who has asked for less of it
       there is nothing to tone down — the pulses and their badges just go. */
    @media (prefers-reduced-motion: reduce) {
      .gspark, .gbadge { display: none; }
    }

    .glegend { display: flex; flex-wrap: wrap; gap: 12px; margin: 10px 0 0; font-family: var(--mono); font-size: 11px; color: var(--text3); }
    .glegend b { font-weight: normal; color: var(--text2); }
    .gkey { display: inline-flex; align-items: center; gap: 5px; }
    .gkey i { width: 16px; height: 0; border-top-width: 2px; border-top-style: solid; display: inline-block; }
    .gsel { margin-top: 12px; border: 1px solid var(--border); border-left: 2px solid var(--accent); border-radius: 4px; background: var(--surface); padding: 11px 13px; }
    .gsel h3 { margin: 0 0 6px; font-size: 14px; font-weight: 600; }
    .glinks { margin-top: 9px; display: grid; gap: 4px; }
    .glink { font-family: var(--mono); font-size: 11px; color: var(--text3); cursor: pointer; }
    .glink:hover { color: var(--text); }
    .glink b { color: var(--text2); font-weight: normal; }

    /* == sidebar brand, search and footer =================================== */
    .sidebar-brand { display: flex; align-items: center; gap: 9px; }
    /* Three nodes and the links between them — the graph view in miniature,
       so the mark says what the product is for. A monogram in a coloured
       square says only that someone needed a logo. */
    .sidebar-mark { flex: 0 0 24px; width: 24px; height: 24px; color: var(--brand); }
    .sidebar-mark svg { width: 24px; height: 24px; display: block; }
    .sidebar-brand-name { display: block; font-size: var(--t-md); font-weight: 600; letter-spacing: -.01em; color: var(--sidebar-accent-foreground); line-height: 1.25; }
    .sidebar-brand-sub { display: block; font-size: var(--t-xs); letter-spacing: .04em; color: var(--text3); line-height: 1.35; }
    /* One line, always. Wrapped onto two it stopped reading as a control and
       started reading as a paragraph with a border. */
    .sidebar-search { display: flex; align-items: center; gap: var(--s2); width: 100%; margin-top: var(--s3); padding: var(--s2) var(--s2); background: var(--surface2); border: 1px solid var(--border); border-radius: var(--r1); color: var(--text3); font-size: var(--t-base); font-family: inherit; cursor: pointer; text-align: left; white-space: nowrap; transition: border-color var(--fast), color var(--fast); }
    .sidebar-search > span:not(.sidebar-sicon) { flex: 1; overflow: hidden; text-overflow: ellipsis; }
    .sidebar-search:hover { border-color: var(--border2); color: var(--text2); }
    .sidebar-sicon { display: inline-flex; flex: 0 0 13px; }
    .sidebar-search svg { width: 13px; height: 13px; flex: 0 0 13px; }
    .sidebar-icon svg { width: 13px; height: 13px; }
    .sidebar-search span { flex: 1; }
    .sidebar-search kbd { font-family: var(--mono); font-size: 10px; color: var(--text3); border: 1px solid var(--border2); border-radius: 3px; padding: 0 4px; }
    /* The toggle sits above the brand: removing the topbar took the old
       trigger with it and left only the hairline rail, which nobody finds. A
       keyboard shortcut is not an affordance. */
    .sidebar-toggle { position: absolute; top: var(--s3); right: var(--s3); width: 24px; height: 24px; display: grid; place-items: center; padding: 0; background: none; border: 1px solid transparent; border-radius: var(--r1); color: var(--text3); cursor: pointer; }
    .sidebar-toggle:hover { color: var(--text); background: var(--surface2); border-color: var(--border); }
    .sidebar-toggle svg { width: 15px; height: 15px; }
    .sidebar-header { position: relative; }

    /* A project is two lines: what it is called, and what it is made of. */
    .sidebar-menu-button.proj { align-items: flex-start; }
    .proj-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .proj-top { display: flex; align-items: center; gap: var(--s2); min-width: 0; }
    .proj-top .sidebar-menu-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    .pstack-row { display: flex; align-items: center; gap: 5px; }
    /* Dimmed until the project is the one being read: at full strength, five
       brand colours per row turn the panel into a sticker album. */
    .smark { display: inline-flex; width: 12px; height: 12px; opacity: .55; transition: opacity var(--fast); }
    .smark svg { width: 12px; height: 12px; display: block; }
    .sidebar-menu-button:hover .smark,
    .sidebar-menu-button[data-active="true"] .smark { opacity: 1; }

    .sfoot { display: flex; align-items: center; gap: 7px; font-family: var(--mono); font-size: 10px; color: var(--text3); line-height: 1.7; }
    .sfoot .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text3); flex: 0 0 6px; }
    .sfoot.ok .dot { background: var(--green); }
    .sfoot.bad .dot { background: var(--red); }

    /* == project header ===================================================== */
    .phead2 { display: flex; align-items: flex-start; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; }
    .phead2 h1 { margin: 0 0 var(--s2); font-size: var(--t-xl); font-weight: 600; letter-spacing: -.02em; }
    .pstack { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-family: var(--mono); font-size: 11px; color: var(--text3); }
    .pchip { border: 1px solid var(--border2); border-radius: 4px; padding: 1px 7px; color: var(--text2); }
    .pactions { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; }
    .btn2 { display: inline-flex; align-items: center; gap: 6px; background: var(--surface2); border: 1px solid var(--border2); color: var(--text2); padding: 6px 12px; border-radius: 6px; font-size: 12px; font-family: inherit; cursor: pointer; }
    .btn2 { transition: background var(--fast), border-color var(--fast), color var(--fast); }
    .btn2:hover { border-color: var(--text3); color: var(--text); }
    .btn2 svg { width: 13px; height: 13px; }
    /* Near-white rather than coloured. A primary button earns its emphasis from
       contrast and from being the only one on screen, not from hue — and a
       brand colour spent here is a brand colour that cannot mean anything
       else. */
    .btn2.primary { background: var(--text); border-color: var(--text); color: var(--bg); font-weight: 550; }
    .btn2.primary:hover { background: #fff; border-color: #fff; color: var(--bg); }

    /* == the four cards ======================================================
       Side by side on purpose. "39 entries" is only good news next to "1 has
       ever caught a failure", and apart they read as four unrelated numbers. */
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s3); margin-bottom: var(--s5); }
    .card2 { border: 1px solid var(--border); border-radius: var(--r2); background: var(--surface); padding: var(--s3) var(--s4); }
    /* The one that should bother you if it is large. */
    .card2.warn { border-color: rgba(212, 160, 83, .3); background: var(--warn-dim); }
    .card2 .k { font-size: var(--t-sm); color: var(--text3); margin-bottom: var(--s2); letter-spacing: .01em; }
    .card2.warn .k { color: var(--warn); }
    .card2 .v { font-size: var(--t-xl); font-weight: 600; line-height: 1.15; letter-spacing: -.02em; }
    .card2 .v small { font-size: 11px; font-weight: 400; color: var(--text3); margin-left: 6px; }
    .card2.warn .v { color: var(--warn); }

    /* == tabs ================================================================ */
    .tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--border); margin-bottom: 14px; overflow-x: auto; }
    .tab { background: none; border: none; border-bottom: 2px solid transparent; color: var(--text3); padding: 8px 11px; font-size: 13px; font-family: inherit; cursor: pointer; white-space: nowrap; margin-bottom: -1px; }
    .tab:hover { color: var(--text2); }
    .tab.active { color: var(--text); border-bottom-color: var(--accent); }
    .tab .n { font-family: var(--mono); font-size: 11px; color: var(--text3); margin-left: 5px; }

    /* == filter toolbar ====================================================== */
    .tb2 { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; }
    .fwrap { position: relative; flex: 1 1 260px; min-width: 190px; display: flex; align-items: center; }
    .fwrap > svg { position: absolute; left: 10px; width: 13px; height: 13px; color: var(--text3); pointer-events: none; }
    .fin { width: 100%; background: var(--surface2); border: 1px solid var(--border); color: var(--text); padding: 7px 30px 7px 29px; border-radius: 6px; font-size: 12.5px; font-family: inherit; }
    .fin:focus { outline: none; border-color: var(--accent); }
    .fwrap kbd { position: absolute; right: 8px; font-family: var(--mono); font-size: 10px; color: var(--text3); border: 1px solid var(--border2); border-radius: 3px; padding: 0 4px; pointer-events: none; }
    .seg { display: inline-flex; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
    .seg button { background: var(--surface2); border: none; border-right: 1px solid var(--border); color: var(--text3); padding: 6px 13px; font-size: 12px; font-family: inherit; cursor: pointer; }
    .seg button:last-child { border-right: none; }
    .seg button.on { background: var(--border); color: var(--text); }
    .tgl { display: inline-flex; align-items: center; gap: 6px; background: var(--surface2); border: 1px solid var(--border); color: var(--text3); padding: 6px 12px; border-radius: 6px; font-size: 12px; font-family: inherit; cursor: pointer; }
    .tgl:hover { border-color: var(--border2); }
    .tgl.on { border-color: var(--accent); color: var(--accent); }
    .tgl svg { width: 12px; height: 12px; }
    .sel2 { background: var(--surface2); border: 1px solid var(--border); color: var(--text2); padding: 6px 10px; border-radius: 6px; font-size: 12px; font-family: inherit; cursor: pointer; }
    .sel2:focus { outline: none; border-color: var(--accent); }

    /* == master-detail =======================================================
       The list stays on screen while an entry is read. Collapsible cards made
       that impossible: opening one pushed every other row down the page, so
       comparing two entries meant losing your place in the list. */
    .md { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 0; border-top: 1px solid var(--border); }
    .mdlist { min-width: 0; padding-right: 14px; }
    .lhead { display: flex; align-items: center; gap: 10px; padding: 8px 2px; font-family: var(--mono); font-size: 10.5px; color: var(--text3); border-bottom: 1px solid var(--border); text-transform: lowercase; }
    .lhead .lh-t { flex: 1; }
    .lhead .lh-s { flex: 0 0 118px; }
    .lhead .lh-a { flex: 0 0 42px; text-align: right; }
    .lhead .lh-c { flex: 0 0 56px; text-align: right; }

    .erow { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 8px 8px 7px; background: none; border: none; border-left: 2px solid transparent; border-radius: 5px; color: inherit; font-family: inherit; font-size: 13px; text-align: left; cursor: pointer; }
    .erow { transition: background var(--fast), border-color var(--fast); }
    .erow:hover { background: var(--surface); }
    .erow[data-sel="true"] { background: var(--surface2); border-left-color: var(--accent); }
    .erow .et { flex: 0 0 38px; font-family: var(--mono); font-size: 9.5px; font-weight: 700; letter-spacing: .05em; }
    .erow .eti { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text); }
    .erow[data-retracted="true"] .eti { color: var(--text3); text-decoration: line-through; }
    .erow .esrc { flex: 0 0 118px; display: flex; gap: 7px; font-family: var(--mono); font-size: 10.5px; color: var(--text3); }
    .erow .eage { flex: 0 0 42px; white-space: nowrap; text-align: right; font-family: var(--mono); font-size: 10.5px; color: var(--text3); }
    .erow .ecnt { flex: 0 0 56px; text-align: right; font-family: var(--mono); font-size: 10.5px; color: var(--text3); }
    .erow .ecnt b { font-weight: 400; }
    .erow .ecnt .hit { color: var(--green); }
    .et-bug, .et-anti-pattern { color: var(--red); }
    .et-fix { color: var(--blue); }
    .et-decision { color: var(--purple); }
    .et-architecture, .et-stack { color: var(--cyan); }
    .et-pattern, .et-lesson { color: var(--yellow); }
    .et-note, .et-image { color: var(--text3); }

    .keys { display: flex; gap: 14px; flex-wrap: wrap; padding: 11px 2px 0; margin-top: 8px; border-top: 1px solid var(--border); font-family: var(--mono); font-size: 10.5px; color: var(--text3); }
    .keys b { color: var(--text2); font-weight: 400; border: 1px solid var(--border2); border-radius: 3px; padding: 0 4px; margin-right: 4px; }

    /* == detail pane ========================================================= */
    .mddet { border-left: 1px solid var(--border); padding: 0 0 0 16px; min-width: 0; }
    .mdsticky { position: sticky; top: 14px; display: flex; flex-direction: column; max-height: calc(100vh - 40px); }
    .dbadges { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-family: var(--mono); font-size: 10.5px; color: var(--text3); padding-top: 10px; }
    .dpill { border-radius: 3px; padding: 1px 6px; font-weight: 700; letter-spacing: .05em; }
    .dvia { border: 1px solid var(--border2); border-radius: 3px; padding: 1px 6px; color: var(--text2); }
    .dtitle { margin: var(--s3) 0 0; font-size: var(--t-lg); font-weight: 600; line-height: 1.35; letter-spacing: -.01em; }
    .dtabs { display: flex; gap: 2px; border-bottom: 1px solid var(--border); margin: 12px 0 0; }
    .dtab { background: none; border: none; border-bottom: 2px solid transparent; color: var(--text3); padding: 7px 9px; font-size: 12px; font-family: inherit; cursor: pointer; margin-bottom: -1px; white-space: nowrap; }
    .dtab:hover { color: var(--text2); }
    .dtab.active { color: var(--text); border-bottom-color: var(--accent); }
    .dbody { flex: 1; overflow-y: auto; padding: 14px 2px 14px 0; }
    .dsec { font-family: var(--mono); font-size: 10px; text-transform: uppercase; letter-spacing: .09em; color: var(--text3); margin: 0 0 6px; }
    .dsec + .dtext { margin: 0 0 15px; }
    /* Capped for reading. Past about 70 characters the eye loses the start of
       the next line, and entry bodies are the only real prose here. */
    .dtext { color: var(--text2); font-size: var(--t-md); line-height: 1.65; max-width: 68ch; white-space: pre-wrap; word-break: break-word; }
    .derr { font-family: var(--mono); font-size: 11px; background: #0f0f0f; border: 1px solid var(--border); border-radius: 5px; padding: 8px 10px; color: var(--yellow); margin: 0 0 15px; overflow-x: auto; white-space: pre-wrap; word-break: break-word; }
    .dtags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; }
    .dtag { font-family: var(--mono); font-size: 10px; color: var(--text3); }
    .dfoot { flex: 0 0 auto; display: flex; gap: 7px; flex-wrap: wrap; padding: 11px 0 2px; border-top: 1px solid var(--border); }
    .dfoot .btn2 { padding: 5px 11px; font-size: 11.5px; }
    .dfoot .danger:hover { border-color: var(--red); color: var(--red); }
    .dnone { color: var(--text3); font-family: var(--mono); font-size: 12px; padding: 40px 0; text-align: center; }

    /* == recall log ========================================================== */
    .rlog { display: grid; gap: 8px; }
    .rrow { border: 1px solid var(--border); border-left: 2px solid var(--green); border-radius: 5px; padding: 7px 9px; background: var(--surface); }
    .rrow .rwhen { font-family: var(--mono); font-size: 10px; color: var(--text3); margin-bottom: 3px; }
    .rrow .rq { font-family: var(--mono); font-size: 11px; color: var(--text2); word-break: break-word; }

    /* == recall tester ======================================================= */
    .rt { max-width: 720px; }
    .rt textarea.in { width: 100%; min-height: 96px; }
    .rthits { display: grid; gap: 8px; margin-top: 14px; }
    .rthit { border: 1px solid var(--border); border-left: 2px solid var(--accent); border-radius: 6px; background: var(--surface); padding: 10px 12px; }
    .rthit .rth { display: flex; align-items: baseline; gap: 8px; font-family: var(--mono); font-size: 10.5px; color: var(--text3); margin-bottom: 4px; }
    .rthit .rtt { font-size: 13px; color: var(--text); }

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
      .sidebar { position: fixed; top: 0; bottom: 0; left: 0; width: var(--sidebar-width); z-index: 40; transform: translateX(-100%); transition: transform .18s ease; }
      .sidebar.open { transform: translateX(0); }
      .sidebar-rail { display: none; }
      .sidebar-backdrop.open { display: block; }
      .main { padding: 14px 14px 60px; }
      .grid2 { grid-template-columns: 1fr; }
      .cards { grid-template-columns: 1fr 1fr; }
      /* Stacked, with the detail above the list: a pane 360px wide has nowhere
         to go on a phone, and the entry just chosen is what you want to read. */
      .md { grid-template-columns: 1fr; }
      .mdlist { padding-right: 0; }
      .mddet { border-left: none; border-bottom: 1px solid var(--border); padding: 0 0 14px; margin-bottom: 14px; order: -1; }
      .mdsticky { position: static; max-height: none; }
    }
  </style>
</head>
<body>
  <div class="layout">
    <aside class="sidebar" id="sidebar" data-collapsible="icon">
      <div class="sidebar-header">
        <button class="sidebar-toggle" data-act="toggle-sidebar" title="Toggle sidebar (Ctrl+B)" aria-label="Toggle sidebar" data-icon="panel"></button>
        <div class="sidebar-brand">
          <span class="sidebar-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">${LOGO_MARK}</svg>
          </span>
          <span class="sidebar-collapse-hide">
            <span class="sidebar-brand-name">devbrain</span>
            <span class="sidebar-brand-sub">developer memory</span>
          </span>
        </div>
        <button class="sidebar-search" data-view="search" title="Search all projects">
          <span class="sidebar-sicon"></span>
          <span class="sidebar-collapse-hide">Search</span>
          <kbd class="sidebar-collapse-hide">&#8984;K</kbd>
        </button>
      </div>

      <div class="sidebar-content">
        <div class="sidebar-group">
          <div class="sidebar-group-label">Workspace</div>
          <ul class="sidebar-menu">
            <li class="sidebar-menu-item">
              <button class="sidebar-menu-button" data-view="entries" data-active="true" title="Entries">
                <span class="sidebar-icon" data-icon="list"></span>
                <span class="sidebar-menu-label">Entries</span>
              </button>
            </li>
            <li class="sidebar-menu-item">
              <button class="sidebar-menu-button" data-view="recall" title="Test what memory answers for a failure">
                <span class="sidebar-icon" data-icon="flask"></span>
                <span class="sidebar-menu-label">Recall tester</span>
              </button>
            </li>
          </ul>
        </div>

        <div class="sidebar-group">
          <div class="sidebar-group-label">Projects</div>
          <ul class="sidebar-menu" id="project-list">
            <li class="sidebar-menu-item"><div class="empty sidebar-collapse-hide" style="padding:8px 14px">loading&hellip;</div></li>
          </ul>
        </div>
      </div>

      <div class="sidebar-footer">
        <div class="sfoot" id="storage-badge"><i class="dot"></i><span>checking&hellip;</span></div>
        <div class="sfoot" id="search-badge"><i class="dot"></i><span>search</span></div>
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
      q: '', sort: 'newest', origin: 'all', kind: 'all', neverOnly: false,
      // The row open in the detail pane, and which of its tabs is showing.
      sel: null, dtab: 'entry',
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

    // When the server runs with DEVBRAIN_TOKEN, open the dashboard as
    // /#token=<value>. The fragment never reaches the server or its logs; it is
    // moved into sessionStorage and cleared from the address bar at once.
    var apiToken = (function () {
      var m = /[#&]token=([^&]+)/.exec(location.hash);
      try {
        if (m) {
          sessionStorage.setItem('devbrain-token', decodeURIComponent(m[1]));
          history.replaceState(null, '', location.pathname + location.search);
        }
        return sessionStorage.getItem('devbrain-token') || '';
      } catch (e) { return m ? decodeURIComponent(m[1]) : ''; }
    })();

    async function getJSON(url, opts) {
      opts = opts || {};
      if (apiToken) {
        var h = opts.headers || {};
        h['Authorization'] = 'Bearer ' + apiToken;
        opts.headers = h;
      }
      var r = await fetch(url, opts);
      var body = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(body.error || ('HTTP ' + r.status));
      return body;
    }

    // ── storage badge: report what is really configured, not a fixed label ──
    function setFoot(id, cls, text) {
      var n = el(id);
      if (!n) return;
      n.className = 'sfoot ' + cls;
      n.lastChild.textContent = text;
    }

    // The shell's icons are declared by name in the markup and filled here, so
    // the HTML stays legible instead of carrying path data inline.
    function paintShellIcons() {
      document.querySelectorAll('[data-icon]').forEach(function (n) {
        n.innerHTML = icon(n.getAttribute('data-icon'));
      });
      var si = document.querySelector('.sidebar-sicon');
      if (si) si.innerHTML = icon('search');
    }

    async function loadStorage() {
      try {
        var d = await getJSON('/api/health');
        setFoot('storage-badge', 'ok', (d.storage === 'local' ? 'local' : 'mongodb') + ' · connected');
        // Which retrieval is actually running. Keyword-only still works, but it
        // answers differently, and that belongs on screen rather than in a doc.
        setFoot('search-badge', d.gemini === false ? '' : 'ok',
          d.gemini === false ? 'search · keyword only' : 'search · semantic (gemini)');
      } catch (e) {
        setFoot('storage-badge', 'bad', 'disconnected');
        setFoot('search-badge', 'bad', 'search · unavailable');
      }
    }

    // A collapsed panel shows icons only, and a project has no icon, so it gets
    // the first two letters of its name — enough to tell projects apart.
    // Stack marks are fill-based on a 24x24 box, unlike Lucide's stroked
    // icons, so they get their own wrapper rather than sharing icon().
    var STACKS = ${JSON.stringify(STACK_ICONS)};
    var STACK_ORDER = { lang: 0, frontend: 1, backend: 2, data: 3, build: 4 };

    /**
     * The stack as a row of marks, ordered language first.
     *
     * Capped at five. A project with nine dependencies worth naming would
     * otherwise push the row wider than the panel, and the first few are the
     * ones that say what kind of thing it is.
     */
    function stackRow(stack) {
      var known = (stack || [])
        .filter(function (n) { return STACKS[n]; })
        .sort(function (a, b) { return STACK_ORDER[STACKS[a].role] - STACK_ORDER[STACKS[b].role]; })
        .slice(0, 5);
      if (!known.length) return '';
      return '<span class="pstack-row">' + known.map(function (n) {
        var ic = STACKS[n];
        return '<span class="smark" style="color:' + esc(ic.color) + '" title="' + esc(n) + '">' +
          '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + ic.d + '</svg></span>';
      }).join('') + '</span>';
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
          // A folder reads as "a project" instantly; two letters of its name
          // read as nothing until you have learnt them.
          return '<li class="sidebar-menu-item">' +
                 '<button class="sidebar-menu-button proj" data-project="' + esc(p.id) + '"' +
                 (p.id === STATE.projectId ? ' data-active="true"' : '') +
                 ' title="' + esc(p.name) + ' &mdash; ' + esc(p.path) + '">' +
                 '<span class="sidebar-icon" data-icon="folder"></span>' +
                 '<span class="proj-main">' +
                   '<span class="proj-top">' +
                     '<span class="sidebar-menu-label">' + esc(p.name) + '</span>' +
                     '<span class="sidebar-menu-badge">' + p.total + '</span>' +
                   '</span>' +
                   stackRow(p.stack) +
                 '</span>' +
                 '</button></li>';
        }).join('');
        paintShellIcons();
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

    // == the project record ====================================================
    //
    // Master-detail: the list stays put while an entry is read beside it.
    // Collapsible cards could not do that — opening one pushed every row below
    // it down the page, so comparing two entries meant losing your place.

    // Lucide's real paths, generated into icons.ts rather than drawn by hand.
    // The wrapper lives here and only here, so stroke weight, cap and optical
    // size cannot drift between one icon and the next.
    var ICONS = ${JSON.stringify(ICON_PATHS)};
    function icon(name) {
      var d = ICONS[name];
      if (!d) return '';
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
    }

    /** Every entry of the project in one list, section tagged onto each. */
    function allEntries() {
      var d = STATE.dossier;
      if (!d) return [];
      var out = [];
      d.sections.forEach(function (s) {
        s.entries.forEach(function (e) { out.push(Object.assign({ section: s.section }, e)); });
      });
      return out;
    }

    /** The entries the current tab and filters leave. */
    function visibleEntries() {
      var tab = STATE.section;
      return sortEntries(allEntries().filter(function (e) {
        if (tab === 'retracted') return !!e.supersededBy && keepEntry(e, true);
        if (e.supersededBy) return false;
        if (tab !== 'all' && e.section !== tab) return false;
        return keepEntry(e);
      }));
    }

    function statCards(d) {
      var entries = allEntries();
      var active = entries.filter(function (e) { return !e.supersededBy; });
      var caught = active.filter(function (e) { return e.recallCount > 0; }).length;
      var never = active.filter(function (e) { return !e.retrievalCount; }).length;
      var pct = active.length ? Math.round((caught / active.length) * 100) : 0;
      // "Never surfaced" is the card that should bother you, so it is the one
      // drawn as a warning: an entry nothing has ever read back is a write to
      // a file nobody opens.
      return '<div class="cards">' +
        '<div class="card2"><div class="k">Active entries</div><div class="v">' + active.length + '</div></div>' +
        '<div class="card2"><div class="k">Caught a failure</div><div class="v">' + caught +
          '<small>&middot; ' + pct + '%</small></div></div>' +
        '<div class="card2' + (never ? ' warn' : '') + '"><div class="k">Never surfaced</div>' +
          '<div class="v">' + never + '</div></div>' +
        '<div class="card2"><div class="k">Retracted</div><div class="v">' + (d.supersededCount || 0) + '</div></div>' +
        '</div>';
    }

    function tabsFor(d) {
      var entries = allEntries();
      var active = entries.filter(function (e) { return !e.supersededBy; });
      var tabs = [['all', 'Everything', active.length]];
      d.sections.forEach(function (s) {
        var n = s.entries.filter(function (e) { return !e.supersededBy; }).length;
        if (n) tabs.push([s.section, s.heading, n]);
      });
      if (d.supersededCount) tabs.push(['retracted', 'Retracted', d.supersededCount]);
      tabs.push(['graph', 'Graph', null]);
      return '<div class="tabs">' + tabs.map(function (t) {
        return '<button class="tab' + (STATE.section === t[0] ? ' active' : '') + '" data-section="' + esc(t[0]) + '">' +
          esc(t[1]) + (t[2] === null ? '' : '<span class="n">' + t[2] + '</span>') + '</button>';
      }).join('') + '</div>';
    }

    function filterBar() {
      var kinds = [['all', 'All'], ['bug', 'Bugs'], ['fix', 'Fixes']];
      return '<div class="tb2">' +
        '<span class="fwrap">' +
          icon('search') +
          '<input class="fin" id="f-q" placeholder="Filter by title, tag, error pattern&hellip;" value="' + esc(STATE.q) + '">' +
          '<kbd>/</kbd>' +
        '</span>' +
        '<span class="seg">' + kinds.map(function (k) {
          return '<button data-kind="' + k[0] + '" class="' + (STATE.kind === k[0] ? 'on' : '') + '">' + k[1] + '</button>';
        }).join('') + '</span>' +
        '<button class="tgl' + (STATE.neverOnly ? ' on' : '') + '" data-act="toggle-never">' +
          icon('eye-off') + 'Never surfaced</button>' +
        '<select class="sel2" id="f-origin">' +
          opts([['all', 'All sources'], ['hook', 'Via hook'], ['agent', 'By the agent'],
                ['manual', 'Typed by hand'], ['indexed', 'From a file']], STATE.origin) +
        '</select>' +
        '<select class="sel2" id="f-sort">' + opts(SORTS, STATE.sort) + '</select>' +
        '</div>';
    }

    var TYPE_ABBR = {
      'bug': 'BUG', 'fix': 'FIX', 'solution': 'FIX', 'decision': 'DEC',
      'architecture': 'ARCH', 'pattern': 'PAT', 'lesson': 'LESS',
      'anti-pattern': 'ANTI', 'stack': 'ENV', 'note': 'NOTE', 'image': 'IMG'
    };

    function entryRow(e) {
      var caught = e.recallCount > 0;
      return '<button class="erow" data-entry="' + esc(e.id) + '"' +
        (STATE.sel === e.id ? ' data-sel="true"' : '') +
        (e.supersededBy ? ' data-retracted="true"' : '') + '>' +
        '<span class="et et-' + esc(e.type) + '">' + esc(TYPE_ABBR[e.type] || 'NOTE') + '</span>' +
        '<span class="eti">' + esc(e.title) + '</span>' +
        '<span class="esrc"><span>' + esc(e.category || 'general') + '</span>' +
          '<span>' + esc(originOf(e)) + '</span></span>' +
        '<span class="eage">' + esc(shortAge(e.timeAgo)) + '</span>' +
        '<span class="ecnt"><b>' + (e.retrievalCount || 0) + '</b> &middot; ' +
          '<b class="' + (caught ? 'hit' : '') + '">' + (e.recallCount || 0) + '</b></span>' +
        '</button>';
    }

    /** An entry written before the field existed still has a knowable origin. */
    function originOf(e) {
      if (e.origin) return e.origin;
      return e.sourceFile ? 'indexed' : 'agent';
    }

    /** "34m ago" is twice the column's width; "34m" is not. */
    function shortAge(t) {
      return String(t || '').replace(' ago', '').replace('just now', 'now');
    }

    async function renderProject() {
      var main = el('main');
      main.innerHTML = '<div class="empty">loading project&hellip;</div>';
      try {
        var d = await getJSON('/api/project?id=' + encodeURIComponent(STATE.projectId));
        STATE.dossier = d;
        var p = d.project;

        var head = '<div class="phead2"><div>' +
          '<h1>' + esc(p.name) + '</h1>' +
          '<div class="pstack">' +
          (p.stack || []).map(function (x) { return '<span class="pchip">' + esc(x) + '</span>'; }).join('') +
          '<span>' + esc(p.path) + '</span></div></div>' +
          '<div class="pactions">' +
          '<button class="btn2" data-view="recall">' + icon('flask') + 'Test recall</button>' +
          '<button class="btn2" data-act="context">' + icon('file') + 'agent.md</button>' +
          '<button class="btn2 primary" data-act="save-here">' + icon('plus') + 'Save entry</button>' +
          '</div></div>';

        if (!d.total) {
          main.innerHTML = head + '<div class="empty">Nothing recorded for this project yet.<br><br>' +
            'Run <b>devbrain backfill</b> to read past commits, or save an entry above.</div>';
          return;
        }

        if (STATE.section === 'graph') {
          await renderGraph(head + statCards(d) + tabsFor(d));
          return;
        }

        var list = visibleEntries();
        // The selection must survive a filter change, but not point at a row
        // that is no longer on screen.
        if (STATE.sel && !list.some(function (e) { return e.id === STATE.sel; })) STATE.sel = null;
        if (!STATE.sel && list.length) STATE.sel = list[0].id;

        main.innerHTML = head + statCards(d) + tabsFor(d) + filterBar() +
          '<div class="md"><div class="mdlist" id="mdlist">' + listBody(list) + '</div>' +
          '<div class="mddet" id="mddet">' + detailPane() + '</div></div>';
        restoreFilterFocus();
      } catch (e) {
        main.innerHTML = fail('could not load this project', e.message);
      }
    }

    function listBody(list) {
      if (!list.length) {
        return '<div class="empty">Nothing matches these filters &mdash; ' +
          '<a href="#" data-act="clear-filters" style="color:var(--accent)">clear them</a></div>';
      }
      return '<div class="lhead"><span class="lh-t">' + list.length + ' entries</span>' +
        '<span class="lh-s">source</span><span class="lh-a">age</span>' +
        '<span class="lh-c">shown&middot;caught</span></div>' +
        list.map(entryRow).join('') +
        '<div class="keys"><span><b>j</b><b>k</b>move</span><span><b>e</b>edit</span>' +
        '<span><b>r</b>retract</span><span><b>t</b>test recall</span><span><b>/</b>filter</span></div>';
    }

    /** Repaint only the two panes, so filtering does not scroll the page. */
    function paintList() {
      var list = visibleEntries();
      if (STATE.sel && !list.some(function (e) { return e.id === STATE.sel; })) STATE.sel = null;
      if (!STATE.sel && list.length) STATE.sel = list[0].id;
      var host = el('mdlist');
      if (host) host.innerHTML = listBody(list);
      paintDetail();
    }

    function paintDetail() {
      var host = el('mddet');
      if (host) host.innerHTML = detailPane();
    }

    function selectedEntry() {
      if (!STATE.sel) return null;
      var hit = allEntries().filter(function (e) { return e.id === STATE.sel; });
      return hit.length ? hit[0] : null;
    }

    // ── the detail pane ──
    //
    // Headed WHAT BROKE / WHAT FIXED IT rather than just printing the content,
    // because that is the question the entry was written to answer and a wall
    // of prose makes the reader find it themselves.
    function detailPane() {
      var e = selectedEntry();
      if (!e) return '<div class="mdsticky"><div class="dnone">Select an entry.</div></div>';

      var tab = STATE.dtab || 'entry';
      var body = tab === 'recalls' ? recallLog(e) : tab === 'agent' ? agentView(e) : entryView(e);

      return '<div class="mdsticky">' +
        '<div class="dbadges">' +
        '<span class="dpill et-' + esc(e.type) + '" style="background:var(--surface2)">' +
          esc(e.type.toUpperCase()) + '</span>' +
        '<span class="dvia">via ' + esc(originOf(e)) + '</span>' +
        '<span>' + esc(e.category || 'general') + ' &middot; saved ' + esc(e.timeAgo) + '</span>' +
        (e.supersededBy ? '<span style="color:var(--red)">retracted</span>' : '') +
        '</div>' +
        '<h2 class="dtitle">' + esc(e.title) + '</h2>' +
        '<div class="dtabs">' +
        '<button class="dtab' + (tab === 'entry' ? ' active' : '') + '" data-dtab="entry">Entry</button>' +
        '<button class="dtab' + (tab === 'recalls' ? ' active' : '') + '" data-dtab="recalls">Recall log' +
          '<span class="n"> &middot; ' + (e.recallCount || 0) + '</span></button>' +
        '<button class="dtab' + (tab === 'agent' ? ' active' : '') + '" data-dtab="agent">agent.md</button>' +
        '</div>' +
        '<div class="dbody">' + body + '</div>' +
        '<div class="dfoot">' +
        '<button class="btn2" data-act="edit-entry">' + icon('pencil') + 'Edit</button>' +
        '<button class="btn2" data-act="promote">' + icon('globe') + 'Promote to all projects</button>' +
        (e.supersededBy ? '' : '<button class="btn2 danger" data-act="retract">' + icon('archive') + 'Retract</button>') +
        '</div></div>';
    }

    function entryView(e) {
      var out = '';
      if (e.errorPattern) {
        out += '<div class="dsec">Error pattern</div><div class="derr">' + esc(e.errorPattern) + '</div>';
      }
      var body = bodyOf(e);
      // A bug says what broke; a fix says what fixed it. The same field, named
      // for what the reader is actually looking for.
      var isFix = e.type === 'fix' || e.type === 'solution';
      out += '<div class="dsec">' + (isFix ? 'What fixed it' : 'What broke') + '</div>' +
        '<div class="dtext">' + (body ? esc(body) : '<span style="color:var(--text3)">no detail recorded</span>') + '</div>';
      if (e.causeArchetype) {
        out += '<div class="dsec">Root-cause pattern</div><div class="dtext">' + esc(e.causeArchetype) + '</div>';
      }
      if (e.tags && e.tags.length) {
        out += '<div class="dtags">' + e.tags.map(function (t) {
          return '<span class="dtag">#' + esc(t) + '</span>';
        }).join('') + '</div>';
      }
      return out;
    }

    // The log is the honest answer to "has this ever helped". An entry with a
    // high count and no rows matched before the log existed; one with no count
    // has simply never fired.
    function recallLog(e) {
      var rows = (e.recalls || []).slice().reverse();
      if (!rows.length) {
        return '<div class="dtext" style="color:var(--text3)">' +
          (e.recallCount
            ? 'Recalled ' + e.recallCount + ' times, but before DevBrain kept the matching text. New recalls will be listed here.'
            : 'Never recalled. This entry has not yet matched a real failure.') +
          '</div>';
      }
      return '<div class="rlog">' + rows.map(function (r) {
        return '<div class="rrow"><div class="rwhen">' + esc(new Date(r.at).toLocaleString()) +
          (r.sessionId ? ' &middot; ' + esc(String(r.sessionId).slice(0, 8)) : '') + '</div>' +
          '<div class="rq">' + esc(r.query) + '</div></div>';
      }).join('') + '</div>';
    }

    /** Exactly what an agent is handed for this one entry. */
    function agentView(e) {
      var lines = ['## [' + e.type + '] ' + e.title, ''];
      if (e.errorPattern) lines.push('error: ' + e.errorPattern, '');
      lines.push(bodyOf(e) || e.content || '');
      if (e.causeArchetype) lines.push('', 'root cause: ' + e.causeArchetype);
      if (e.tags && e.tags.length) lines.push('', 'tags: ' + e.tags.join(', '));
      return '<pre class="ctx" style="max-height:none">' + esc(lines.join('\\n')) + '</pre>';
    }

    // == the graph ==============================================================
    //
    // Lanes by type, time left to right. The question it answers is "where did
    // this get fixed", and that is a position on the picture: the bug sits in
    // the bug lane, the fix in the fix lane, and the line between them lands at
    // the moment it closed.

    var LANES = ['bug', 'fix', 'decision', 'architecture', 'pattern', 'lesson', 'anti-pattern', 'stack', 'note', 'image'];
    var EDGE_LABEL = {
      'fixes': 'closed this bug',
      'supersedes': 'corrects this',
      'sequence': 'same session',
      'same-error': 'same error',
      'same-cause': 'same cause',
      'related': 'closest in meaning'
    };
    var LANE_X = 104, STEP = 42, LANE_H = 46, TOP = 34;
    var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var GSTATE = { graph: null, sel: null };
    /** Roughly how long the light takes to walk the whole graph once. */
    var LAP_SECONDS = 50;
    /** How long a clicked node's own lights take to run one of its lines. */
    var FOCUS_SECONDS = 1.8;

    function entryById(id) {
      var d = STATE.dossier;
      if (!d) return null;
      for (var i = 0; i < d.sections.length; i++) {
        var es = d.sections[i].entries;
        for (var j = 0; j < es.length; j++) if (es[j].id === id) return es[j];
      }
      return null;
    }

    function layoutGraph(g) {
      // Only the lanes in use. An empty row for every type the project has
      // never recorded would be most of the picture.
      var used = LANES.filter(function (t) {
        return g.nodes.some(function (n) { return n.type === t; });
      });
      var pos = {};
      g.nodes.forEach(function (n, i) {
        var lane = used.indexOf(n.type);
        pos[n.id] = { x: LANE_X + 20 + i * STEP, y: TOP + lane * LANE_H + LANE_H / 2 };
      });
      return {
        used: used, pos: pos,
        width: LANE_X + 40 + g.nodes.length * STEP,
        height: TOP + used.length * LANE_H + 14
      };
    }

    function edgePath(a, b) {
      var dx = b.x - a.x;
      // Two entries in the same lane would be a straight line drawn through
      // every node between them, so bow it over the top where it can be followed.
      if (Math.abs(b.y - a.y) < 1) {
        var lift = Math.min(26, 8 + Math.abs(dx) / 6);
        return 'M' + a.x + ' ' + a.y + ' Q' + ((a.x + b.x) / 2) + ' ' + (a.y - lift) + ' ' + b.x + ' ' + b.y;
      }
      var c = Math.max(14, Math.abs(dx) * 0.4);
      return 'M' + a.x + ' ' + a.y + ' C' + (a.x + c) + ' ' + a.y + ' ' + (b.x - c) + ' ' + b.y + ' ' + b.x + ' ' + b.y;
    }

    function graphSvg(g) {
      var L = layoutGraph(g);
      var sel = GSTATE.sel;
      var near = {};
      if (sel) {
        near[sel] = true;
        g.edges.forEach(function (e) {
          if (e.from === sel) near[e.to] = true;
          if (e.to === sel) near[e.from] = true;
        });
      }

      var out = '<svg width="' + L.width + '" height="' + L.height + '" viewBox="0 0 ' + L.width + ' ' + L.height + '">';

      // Spacing is one step per entry, not per day: a week of nothing would
      // otherwise be a week of blank picture. So the dates have to be written
      // on, or the horizontal axis means nothing at all.
      var lastDay = '', lastLabelX = -999;
      g.nodes.forEach(function (n) {
        var pt = L.pos[n.id], d = new Date(n.createdAt);
        var day = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
        if (day === lastDay) return;
        lastDay = day;
        out += '<line class="gtick" x1="' + pt.x + '" y1="' + (TOP - 8) + '" x2="' + pt.x + '" y2="' + (L.height - 6) + '"></line>';
        // Only when there is room, or close days overprint each other.
        if (pt.x - lastLabelX > 56) {
          lastLabelX = pt.x;
          out += '<text class="gdate" x="' + (pt.x + 3) + '" y="' + (TOP - 13) + '">' +
            MONTHS[d.getMonth()] + ' ' + d.getDate() + '</text>';
        }
      });
      L.used.forEach(function (t, i) {
        var y = TOP + i * LANE_H;
        if (i % 2 === 0) out += '<rect class="glanebg" x="0" y="' + y + '" width="' + L.width + '" height="' + LANE_H + '"></rect>';
        out += '<text class="glane" x="10" y="' + (y + LANE_H / 2 + 3) + '">' + esc(t) + '</text>';
      });

      // Each edge is given an id so a pulse can be told to follow it.
      g.edges.forEach(function (e, idx) {
        var a = L.pos[e.from], b = L.pos[e.to];
        if (!a || !b) return;
        var dim = sel && e.from !== sel && e.to !== sel ? ' dim' : '';
        out += '<path id="ge' + idx + '" class="gedge e-' + esc(e.kind) + dim + '" d="' + edgePath(a, b) + '">' +
          '<title>' + esc(e.because || EDGE_LABEL[e.kind] || e.kind) + '</title></path>';
      });

      g.nodes.forEach(function (n) {
        var pt = L.pos[n.id];
        // Size carries the one count that means the entry earned its place:
        // times it was handed to an agent on a real failure.
        var r = 5 + Math.min(4, n.recalls);
        var dim = sel && !near[n.id] ? ' dim' : '';
        out += '<g class="gnode n-' + esc(n.type) + (n.superseded ? ' retracted' : '') + dim + '"' +
          ' data-node="' + esc(n.id) + '"' + (sel === n.id ? ' data-sel="true"' : '') + '>' +
          '<circle cx="' + pt.x + '" cy="' + pt.y + '" r="' + r + '"></circle>' +
          '<title>' + esc('[' + n.type + '] ' + n.title) + '</title></g>';
      });

      out += pulses(g, L, sel, near);
      return out + '</svg>';
    }

    /**
     * One light, walking the graph edge by edge.
     *
     * Every edge lit at once was 79 dots moving, and a picture with 79 moving
     * things in it has no focus at all. A single light can be followed, and
     * following it is what makes the connections legible: you see where it came
     * from and where it goes next.
     *
     * It takes the colour of the line it is on, so the light doubles as the
     * legend — amber means it is crossing an inferred likeness, red a
     * correction, green a fix closing a bug.
     *
     * The node it reaches flashes its type, abbreviated. Fifty titles printed
     * on the canvas would bury the graph under them.
     */
    function pulses(g, L, sel, near) {
      var hops = [];
      g.edges.forEach(function (e, idx) {
        if (L.pos[e.from] && L.pos[e.to]) hops.push({ e: e, path: idx });
      });
      if (!hops.length) return '';

      // Left to right, so the walk reads as a pass over the history rather than
      // as a random tour of the canvas.
      hops.sort(function (a, b) {
        return Math.min(L.pos[a.e.from].x, L.pos[a.e.to].x) -
               Math.min(L.pos[b.e.from].x, L.pos[b.e.to].x);
      });

      // One lap stays about the same length whatever the project's size: a
      // fixed hop would make a 188-edge graph take three minutes to come round.
      var hop = Math.max(0.3, Math.min(1.1, LAP_SECONDS / hops.length));
      var last = 'm' + (hops.length - 1);

      // Each hop is its own circle, shown only while the light is on that edge.
      // That is what lets CSS colour it by the kind of line, which animating a
      // single circle's fill could not do.
      var out = '';
      var arrivals = {};
      hops.forEach(function (h, i) {
        var begin = i === 0 ? ('0s;' + last + '.end') : ('m' + (i - 1) + '.end');
        var dim = sel && h.e.from !== sel && h.e.to !== sel ? ' dim' : '';
        out += '<circle class="gspark e-' + esc(h.e.kind) + dim + '" r="3.6" opacity="0">' +
          '<animateMotion id="m' + i + '" dur="' + hop + 's" begin="' + begin + '">' +
          '<mpath href="#ge' + h.path + '"></mpath></animateMotion>' +
          '<set attributeName="opacity" to="1" begin="m' + i + '.begin" end="m' + i + '.end"></set>' +
          '</circle>';
        arrivals[h.e.to] = (arrivals[h.e.to] || []).concat('m' + i + '.end');
      });

      // Only nodes the light actually reaches. A badge over a node nothing
      // arrives at would announce an event that never happens.
      g.nodes.forEach(function (n) {
        var when = arrivals[n.id];
        if (!when) return;
        var pt = L.pos[n.id];
        var dim = sel && !near[n.id] ? ' dim' : '';
        // keyTimes must span the full 0 to 1 or the animation is discarded as
        // invalid, and silently: the badge simply never lights.
        out += '<text class="gbadge n-' + esc(n.type) + dim + '" x="' + pt.x + '" y="' + (pt.y - 12) + '" opacity="0">' +
          esc(TYPE_ABBR[n.type] || 'NOTE') +
          '<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.55;1"' +
          ' dur="1.5s" begin="' + when.join(';') + '"></animate>' +
          '</text>';
      });

      // A clicked node lights its own connections, one light per line, on top
      // of the ambient walk.
      //
      // The walk reaches any given edge once a lap, which is no use when the
      // question is "what is this one entry connected to" — you would stand
      // there waiting for it to come round. These run continuously, so the
      // answer is immediate and the lines are traced rather than merely
      // highlighted.
      //
      // Always outward from the node clicked, whichever end of the edge it
      // happens to be stored at, so the picture reads as "from here, to
      // these" rather than as traffic arriving from nowhere. keyPoints
      // reverses the direction of travel along the path.
      if (sel) {
        g.edges.forEach(function (e, idx) {
          if (e.from !== sel && e.to !== sel) return;
          if (!L.pos[e.from] || !L.pos[e.to]) return;
          var outward = e.from === sel ? '0;1' : '1;0';
          out += '<circle class="gspark gfocus e-' + esc(e.kind) + '" r="4.2">' +
            '<animateMotion dur="' + FOCUS_SECONDS + 's" begin="0s" repeatCount="indefinite"' +
            ' calcMode="linear" keyTimes="0;1" keyPoints="' + outward + '">' +
            '<mpath href="#ge' + idx + '"></mpath></animateMotion></circle>';
        });
      }
      return out;
    }

    function graphLegend(g) {
      var counts = g.counts || {};
      var keys = ['fixes', 'supersedes', 'sequence', 'same-error', 'same-cause', 'related'];
      var stroke = {
        'fixes': 'var(--green)', 'supersedes': 'var(--red)', 'sequence': 'var(--border2)',
        'same-error': 'var(--yellow)', 'same-cause': 'var(--purple)', 'related': 'var(--accent)'
      };
      var parts = keys.filter(function (k) { return counts[k]; }).map(function (k) {
        var dashed = k === 'fixes' || k === 'supersedes' ? '' : ';border-top-style:dashed';
        return '<span class="gkey"><i style="border-top-color:' + stroke[k] + dashed + '"></i>' +
          esc(k) + ' <b>' + counts[k] + '</b></span>';
      });
      if (!parts.length) return '';
      // Solid lines were stated by the agent that did the work; dashed ones are
      // DevBrain noticing two entries share something, and can be wrong.
      parts.push('<span class="gkey">solid = recorded, dashed = inferred</span>');
      return '<div class="glegend">' + parts.join('') + '</div>';
    }

    // Says what the graph had to work with. Without it, "nothing connects" and
    // "nothing to connect them by yet" look identical, and only the second one
    // is true of a store recorded before these links existed.
    function graphGaps(g) {
      var f = g.fields || {}, c = g.counts || {}, miss = [];
      // With nearest-neighbour edges every entry has a line, so the honest
      // caveat is no longer "nothing connects" but "none of this was stated".
      var recorded = (c.fixes || 0) + (c.supersedes || 0);
      if (!recorded) {
        miss.push('Every line here is inferred \u2014 nothing has been recorded as closing or correcting anything yet.');
      }
      if (!f.fixes) miss.push('No fix has named the bug it closed yet — pass <b>fixes</b> to save_entry.');
      if (!f.sessionId) miss.push('No entry carries a session yet; entries saved from now on will.');
      if (f.errorPattern < g.total / 4) {
        miss.push(f.errorPattern + ' of ' + g.total + ' entries carry an error pattern, so few can be matched on one.');
      }
      if (!miss.length) return '';
      return '<div class="use none" style="margin-top:10px">' + miss.join('<br>') + '</div>';
    }

    function graphDetail() {
      var g = GSTATE.graph, id = GSTATE.sel;
      if (!g || !id) return '<div class="empty" style="padding:10px 0">Click a node to see what it connects to.</div>';
      var n = g.nodes.filter(function (x) { return x.id === id; })[0];
      if (!n) return '';
      // Through bodyOf and esc, exactly as a card does: it trims a repeated
      // title off the front, and the raw field must never reach markup.
      var e = entryById(id);
      var body = e ? bodyOf(e) : '';
      var links = g.edges.filter(function (x) { return x.from === id || x.to === id; }).map(function (x) {
        var other = x.from === id ? x.to : x.from;
        var on = g.nodes.filter(function (y) { return y.id === other; })[0];
        if (!on) return '';
        var how = x.kind === 'fixes'
          ? (x.from === id ? 'closed the bug' : 'was closed by')
          : x.kind === 'supersedes'
            ? (x.from === id ? 'corrects' : 'was corrected by')
            : (EDGE_LABEL[x.kind] || x.kind);
        return '<div class="glink" data-node="' + esc(other) + '"><b>' + esc(how) + '</b> &rarr; [' +
          esc(on.type) + '] ' + esc(on.title) + '</div>';
      }).join('');

      return '<div class="gsel"><h3>' + esc(n.title) + '</h3>' +
        '<div class="cmeta"><span class="t t-' + esc(n.type) + '">' + esc(n.type) + '</span>' +
        (n.superseded ? '<span style="color:var(--red)">retracted</span>' : '') +
        '<span>' + n.recalls + ' caught</span></div>' +
        (body ? '<div class="cbody" style="margin-top:8px">' + esc(body) + '</div>' : '') +
        (links
          ? '<div class="glinks">' + links + '</div>'
          : '<div class="use none" style="margin-top:8px">Nothing links to this one yet.</div>') +
        '</div>';
    }

    function paintGraph() {
      var host = el('graph-host');
      if (!host || !GSTATE.graph) return;
      host.innerHTML = '<div class="gwrap">' + graphSvg(GSTATE.graph) + '</div>' +
        graphLegend(GSTATE.graph) + graphGaps(GSTATE.graph) + graphDetail();
    }

    async function renderGraph(head) {
      var main = el('main');
      main.innerHTML = head + '<div class="empty">building the graph&hellip;</div>';
      try {
        var g = await getJSON('/api/graph?id=' + encodeURIComponent(STATE.projectId));
        GSTATE.graph = g; GSTATE.sel = null;
        if (!g.nodes.length) {
          main.innerHTML = head + '<div class="empty">Nothing recorded for this project yet.</div>';
          return;
        }
        var note = g.shown < g.total
          ? '<div class="use" style="margin-bottom:10px">Showing ' + g.shown + ' of ' + g.total +
            ' — connected entries first.</div>'
          : '';
        main.innerHTML = head + note + '<div id="graph-host"></div>';
        paintGraph();
      } catch (e) {
        main.innerHTML = head + fail('could not build the graph', e.message);
      }
    }

    // ── filtering and sorting, over the project already loaded ──
    var SORTS = [
      ['newest',     'Newest first'],
      ['oldest',     'Oldest first'],
      ['caught',     'Most failures caught'],
      ['used',       'Most shown'],
      ['confidence', 'Most confident'],
      ['title',      'Title A-Z'],
    ];

    /**
     * Whether an entry survives the filters. The Retracted tab passes
     * allowRetracted, because there retraction is the point rather than a
     * reason to hide it.
     */
    function keepEntry(e, allowRetracted) {
      if (e.supersededBy && !allowRetracted) return false;
      if (STATE.kind !== 'all') {
        var isFix = e.type === 'fix' || e.type === 'solution';
        if (STATE.kind === 'fix' && !isFix) return false;
        if (STATE.kind === 'bug' && e.type !== 'bug') return false;
      }
      // An entry nothing has ever read back is the one worth isolating: it is
      // a write to a file nobody opens.
      if (STATE.neverOnly && (e.retrievalCount || 0) > 0) return false;
      if (STATE.origin !== 'all' && originOf(e) !== STATE.origin) return false;
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
      // Ties broken by how often it was shown: among entries that have caught
      // nothing, the one surfaced most often is the most conspicuous failure.
      else if (STATE.sort === 'caught') {
        copy.sort(function (a, b) {
          return (b.recallCount || 0) - (a.recallCount || 0)
            || (b.retrievalCount || 0) - (a.retrievalCount || 0);
        });
      }
      else if (STATE.sort === 'title')  copy.sort(function (a, b) { return String(a.title).localeCompare(String(b.title)); });
      else if (STATE.sort === 'confidence') {
        copy.sort(function (a, b) {
          return (rank[b.confidence] || 0) - (rank[a.confidence] || 0) || b.createdAt - a.createdAt;
        });
      } else copy.sort(function (a, b) { return b.createdAt - a.createdAt; });
      return copy;
    }

    /** <option> markup for a select, marking the current value. */
    function opts(list, current) {
      return list.map(function (o) {
        var v = Array.isArray(o) ? o[0] : o, label = Array.isArray(o) ? o[1] : o;
        return '<option value="' + esc(v) + '"' + (v === current ? ' selected' : '') + '>' + esc(label) + '</option>';
      }).join('');
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

    // Has any of this ever caught a real failure?
    //
    // Said plainly when the answer is none, rather than printed as a 0 that
    // reads like a rounding error. A store nothing has recalled from is a
    // diary, and the line should say so for as long as that is true.


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
      if (t.id === 'f-q') { FILTER_CARET = t.selectionStart; STATE.q = t.value; paintList(); restoreFilterFocus(); }
    });

    document.addEventListener('change', function (ev) {
      var t = ev.target;
      if (!t || !t.id) return;
      if (t.id === 'f-sort')        { STATE.sort = t.value; paintList(); }
      else if (t.id === 'f-origin') { STATE.origin = t.value; paintList(); }
    });

    // ── one delegated click handler; no inline handlers anywhere ──
    document.addEventListener('click', function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;

      var proj = t.closest('[data-project]');
      if (proj) { selectProject(proj.getAttribute('data-project')); return; }

      // Choosing a row only changes which entry is open, so the two panes are
      // repainted and the list keeps its scroll position.
      var row = t.closest('[data-entry]');
      if (row) { STATE.sel = row.getAttribute('data-entry'); STATE.dtab = 'entry'; paintList(); return; }

      var dt = t.closest('[data-dtab]');
      if (dt) { STATE.dtab = dt.getAttribute('data-dtab'); paintDetail(); return; }

      var kind = t.closest('[data-kind]');
      if (kind) {
        STATE.kind = kind.getAttribute('data-kind');
        renderProject();
        return;
      }

      // Repainting rather than re-fetching: the selection only changes what is
      // highlighted, and the graph is already in hand.
      var node = t.closest('[data-node]');
      if (node) {
        var id = node.getAttribute('data-node');
        GSTATE.sel = GSTATE.sel === id ? null : id;
        paintGraph();
        return;
      }

      var chip = t.closest('[data-section]');
      // A different tab is a different set of rows, so the old selection is
      // dropped rather than carried to a list that no longer contains it.
      if (chip) { STATE.section = chip.getAttribute('data-section'); STATE.sel = null; renderProject(); return; }

      var nav = t.closest('[data-view]');
      if (nav) {
        var v = nav.getAttribute('data-view');
        if (v === 'entries') { renderProject(); markNav(nav); return; }
        if (v === 'recall')  { renderRecall(); markNav(nav); return; }
        if (v === 'search')  { renderSearch(); markNav(nav); return; }
        renderSave(); markNav(nav);
        return;
      }

      var sup = t.closest('[data-supersede]');
      if (sup) { supersedeDecision(sup.getAttribute('data-supersede'), sup); return; }

      var act = t.closest('[data-act]');
      if (!act) return;
      var a = act.getAttribute('data-act');
      if (a === 'clear-filters') {
        ev.preventDefault();
        STATE.q = ''; STATE.origin = 'all'; STATE.kind = 'all'; STATE.neverOnly = false;
        renderProject();
      }
      else if (a === 'toggle-never') { STATE.neverOnly = !STATE.neverOnly; renderProject(); }
      else if (a === 'retract')      { retractSelected(); }
      else if (a === 'promote')      { promoteSelected(); }
      else if (a === 'edit-entry')   { toast('Editing is not wired up yet'); }
      else if (a === 'do-recall')    { runRecall(); }
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

    /** Light up the sidebar item just used, and clear the others. */
    function markNav(node) {
      document.querySelectorAll('[data-view]').forEach(function (n) { n.removeAttribute('data-active'); });
      document.querySelectorAll('[data-project]').forEach(function (n) { n.removeAttribute('data-active'); });
      if (node) node.setAttribute('data-active', 'true');
    }

    // ── keyboard ──
    //
    // A list you can only reach with the mouse is a list you stop reading. The
    // hints are printed under it, so they have to work.
    function moveSel(step) {
      var list = visibleEntries();
      if (!list.length) return;
      var at = list.findIndex(function (e) { return e.id === STATE.sel; });
      var next = at < 0 ? 0 : Math.min(list.length - 1, Math.max(0, at + step));
      STATE.sel = list[next].id;
      STATE.dtab = 'entry';
      paintList();
      var node = document.querySelector('[data-entry="' + STATE.sel + '"]');
      if (node && node.scrollIntoView) node.scrollIntoView({ block: 'nearest' });
    }

    async function retractSelected() {
      var e = selectedEntry();
      if (!e) return;
      if (!window.confirm('Retract "' + e.title + '"? It stops being recalled as true.')) return;
      try {
        await getJSON('/api/decisions/' + encodeURIComponent(e.id) + '/supersede', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Retracted from the dashboard' }),
        });
        toast('retracted');
        STATE.sel = null;
        renderProject();
      } catch (err) { toast('could not retract: ' + err.message); }
    }

    function promoteSelected() {
      var e = selectedEntry();
      if (!e) return;
      // Deliberately not silently doing nothing: the button is in the mockup,
      // the backing endpoint is not built, and a button that appears to work
      // is worse than one that says it does not.
      toast('Promoting to all projects is not wired up yet');
    }

    // ── recall tester ──
    //
    // The one question the dashboard could not answer: paste a failure and see
    // what DevBrain would hand an agent. Reading the entries tells you what is
    // stored; this tells you what comes back, which is the thing that matters
    // and the thing that was quietly broken for months.
    function renderRecall(prefill) {
      STATE.view = 'recall';
      el('main').innerHTML =
        '<div class="phead2"><div><h1>Recall tester</h1>' +
        '<div class="pstack"><span>Paste a failure. See what memory would hand the agent.</span></div>' +
        '</div><div class="pactions">' +
        '<button class="btn2" data-act="back">Back to entries</button></div></div>' +
        '<div class="rt">' +
        '<textarea class="in" id="rt-q" placeholder="Paste an error, or any line a command failed with&hellip;">' +
        esc(prefill || '') + '</textarea>' +
        '<div class="row" style="margin-top:10px"><button class="btn2 primary" data-act="do-recall">Test recall</button></div>' +
        '<div id="rt-out"></div></div>';
      var f = el('rt-q');
      if (f) f.focus();
    }

    async function runRecall() {
      var q = (el('rt-q').value || '').trim();
      var out = el('rt-out');
      if (!q) { out.innerHTML = '<div class="empty">Nothing to look up.</div>'; return; }
      out.innerHTML = '<div class="empty">searching&hellip;</div>';
      try {
        var r = await getJSON('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, limit: 5 }),
        });
        var hits = r.results || [];
        if (!hits.length) {
          // The useful negative. An agent hitting this failure would be told
          // nothing, and that is worth seeing plainly.
          out.innerHTML = '<div class="empty">No match. An agent hitting this failure would get nothing from memory.</div>';
          return;
        }
        out.innerHTML = '<div class="rthits">' + hits.map(function (h) {
          return '<div class="rthit"><div class="rth">' +
            '<span class="et-' + esc(h.type) + '">' + esc(String(h.type).toUpperCase()) + '</span>' +
            '<span>' + esc(h.project || '') + '</span>' +
            '<span>' + esc(h.match || '') + '</span>' +
            (h.matchType === 'pattern' ? '<span style="color:var(--green)">error pattern</span>' : '') +
            '</div>' +
            '<div class="rtt">' + esc(h.title) + '</div></div>';
        }).join('') + '</div>';
      } catch (e) {
        out.innerHTML = fail('could not run the lookup', e.message);
      }
    }

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
    /** Typing in a field is typing, not a shortcut. */
    function inField(t) {
      if (!t || !t.tagName) return false;
      var tag = t.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
    }

    document.addEventListener('keydown', function (ev) {
      if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && (ev.key === 'b' || ev.key === 'B')) {
        ev.preventDefault();
        toggleSidebar();
        return;
      }
      if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && (ev.key === 'k' || ev.key === 'K')) {
        ev.preventDefault();
        renderSearch();
        return;
      }
      if (ev.key === 'Escape') {
        if (inField(ev.target)) { ev.target.blur(); return; }
        if (isNarrow()) closeSidebarOverlay();
        return;
      }
      if (inField(ev.target) || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      // Only where there is a list to move through.
      if (!el('mdlist')) return;
      if (ev.key === 'j')      { ev.preventDefault(); moveSel(1); }
      else if (ev.key === 'k') { ev.preventDefault(); moveSel(-1); }
      else if (ev.key === 'r') { ev.preventDefault(); retractSelected(); }
      else if (ev.key === 'e') { ev.preventDefault(); toast('Editing is not wired up yet'); }
      else if (ev.key === 't') {
        ev.preventDefault();
        var sel = selectedEntry();
        // Seeded with the entry's own error text: the question the tester
        // answers is whether this entry comes back for that failure.
        renderRecall(sel ? (sel.errorPattern || sel.title) : '');
      }
      else if (ev.key === '/') {
        ev.preventDefault();
        var f = el('f-q');
        if (f) f.focus();
      }
    });

    try {
      setCollapsed(localStorage.getItem('devbrain:sidebar') === 'collapsed');
    } catch (e) {
      setCollapsed(false);
    }

    paintShellIcons();
    loadStorage();
    loadProjects();
  </script>
</body>
</html>`;
