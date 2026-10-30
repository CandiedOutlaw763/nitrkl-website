/* Search results (search.html). DBIM v3.0 section 9: search across the website's pages and PDFs,
   with help for an empty query and suggestions when nothing is found.
   Uses the same index as the chatbot: POST {API}/search {"query": "...", "k": 20}. */
(function () {
  'use strict';

  var LOCAL_API = 'http://127.0.0.1:8000/api';
  var isLocal = location.protocol === 'file:' ||
    (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && location.port !== '8000');
  var API = (window.NITBOT_API || (isLocal ? LOCAL_API : '/api')).replace(/\/$/, '');

  var form = document.getElementById('searchPageForm');
  var input = document.getElementById('searchPageInput');
  var status = document.getElementById('searchStatus');
  var list = document.getElementById('searchResults');
  var help = document.getElementById('searchHelp');
  if (!form || !list) return;

  var q = (new URLSearchParams(location.search).get('q') || '').trim();
  input.value = q;
  var top = document.getElementById('search');
  if (top) top.value = q;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function snippet(text, words) {
    text = String(text || '').replace(/\s+/g, ' ').trim();
    var lower = text.toLowerCase(), at = -1;
    words.some(function (w) { at = lower.indexOf(w); return at >= 0; });
    var start = Math.max(0, at - 80);
    var cut = text.slice(start, start + 240);
    var html = (start > 0 ? '… ' : '') + esc(cut) + (start + 240 < text.length ? ' …' : '');
    words.forEach(function (w) {
      if (w.length < 3) return;
      html = html.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
    });
    return html;
  }
  function kindOf(r) {
    var u = (r.url || '').toLowerCase();
    if (r.kind === 'pdf' || /\.pdf($|\?)/.test(u)) return 'PDF document';
    return 'Web page';
  }
  function say(text) { status.textContent = text; }

  if (!q) {
    say('Type a word or phrase to search the website, or choose one of the common searches below.');
    help.hidden = false;
    input.focus();
    return;
  }

  document.title = 'Search results for ' + q + ' | National Institute of Technology Rourkela';
  say('Searching for "' + q + '"…');
  list.setAttribute('aria-busy', 'true');

  fetch(API + '/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q.slice(0, 500), k: 20 }) })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (rows) {
      var seen = {}, words = q.toLowerCase().split(/\s+/).filter(Boolean), html = '', n = 0;
      // The index also matches by meaning; a result counts as a match only if a query word appears in it
      var keys = words.filter(function (w) { return w.length >= 3; });
      if (!keys.length) keys = words;
      var hit = function (r) {
        var t = ((r.title || '') + ' ' + (r.heading || '') + ' ' + (r.text || '')).toLowerCase();
        return keys.some(function (w) { return t.indexOf(w) >= 0; });
      };
      var matched = rows.filter(hit);
      var related = !matched.length;
      if (related) rows = rows.slice(0, 5);
      else rows = matched;
      rows.forEach(function (r) {
        if (!r.url || seen[r.url]) return;
        seen[r.url] = true; n++;
        var title = r.title || r.url;
        var sub = r.heading && r.heading !== title ? ' <span class="sr-heading">' + esc(r.heading) + '</span>' : '';
        html += '<li><a class="sr-title" href="' + esc(r.url) + '">' + esc(title) + '</a>' + sub +
          '<p class="sr-meta"><span>' + kindOf(r) + '</span> <span class="sr-url">' + esc(r.url.replace(/^https?:\/\//, '')) + '</span></p>' +
          '<p class="sr-snippet">' + snippet(r.text, words) + '</p></li>';
      });
      list.innerHTML = html;
      list.removeAttribute('aria-busy');
      if (n && !related) {
        say(n + (n === 1 ? ' result' : ' results') + ' for "' + q + '".');
      } else if (n) {
        say('No pages contain "' + q + '". Check the spelling or try other words. These pages may be related:');
        help.hidden = false;
      } else {
        say('No results for "' + q + '". Check the spelling, try fewer or different words, or choose a common search below.');
        help.hidden = false;
      }
    })
    .catch(function () {
      list.removeAttribute('aria-busy');
      say('Search is not available right now. Please try again later, or use the Sitemap or the common searches below.');
      help.hidden = false;
    });
})();
