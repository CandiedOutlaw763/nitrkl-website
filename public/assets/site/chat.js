/* Ask NIT Rourkela: the chatbot on the homepage.
   Talks to the RAG API (chatbot/ in this repo; deployed at /api on the same site):
     POST {API}/chat  {"messages": [{"role": "user"|"assistant", "content": "..."}]}
   which streams Server-Sent Events: {type: "sources"|"token"|"done"|"error"}.
   Set window.NITBOT_API before this script to use another server. Opened from disk or from another
   local port, the page uses the local chatbot server on port 8000 ("Start NIT Rourkela.cmd"). */
(function () {
  'use strict';

  var LOCAL_API = 'http://127.0.0.1:8000/api';
  var isLocal = location.protocol === 'file:' ||
    (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && location.port !== '8000');
  var API = (window.NITBOT_API || (isLocal ? LOCAL_API : '/api')).replace(/\/$/, '');
  var OFFLINE = isLocal && API === LOCAL_API
    ? 'The chatbot is not running on this computer. Double-click "Start NIT Rourkela.cmd" in the nitrkl folder, then ask again.'
    : 'The assistant is not available right now. Please try again later.';
  var STORE = 'nitbot-chat';
  var MAX_KEEP = 20;

  var root = document.getElementById('chat');
  if (!root) return;
  var fab = document.getElementById('chatOpen');
  var panel = document.getElementById('chatPanel');
  var closeBtn = document.getElementById('chatClose');
  var log = document.getElementById('chatLog');
  var form = document.getElementById('chatForm');
  var input = document.getElementById('chatInput');
  var send = document.getElementById('chatSend');
  var suggest = document.getElementById('chatSuggest');

  var status = document.createElement('p');
  status.className = 'visually-hidden';
  status.setAttribute('role', 'status');
  panel.appendChild(status);
  log.setAttribute('aria-live', 'off'); // tokens stream in; the status line announces finished answers

  var history = [];
  try { history = JSON.parse(sessionStorage.getItem(STORE) || '[]'); } catch (e) { history = []; }
  var busy = false;

  // ---- rendering ------------------------------------------------------------------------------
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  // The model sometimes writes a little HTML despite being asked not to (<br> inside table cells,
  // <b>, &nbsp;). Those few are turned into plain text or Markdown first; then everything is escaped,
  // so no markup from an answer ever reaches the page.
  function tidy(s) {
    return s.replace(/<br\s*\/?>/gi, '\u2028')
      .replace(/<\/?(?:strong|b)\s*>/gi, '**').replace(/<\/?(?:em|i)\s*>/gi, '*')
      .replace(/<\/?(?:p|div|span|u|sup|sub|small|font)\b[^>]*>/gi, '')
      .replace(/&nbsp;/gi, '\u00a0').replace(/&quot;/gi, '"').replace(/&#0?39;|&apos;/gi, "'")
      .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&');
  }
  function inline(s, sources) {
    s = esc(tidy(s)).replace(/\u2028/g, '<br>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, function (m, nums) {
      return nums.split(/\s*,\s*/).map(function (n) {
        var src = sources && sources[parseInt(n, 10) - 1];
        return src ? '<a class="cite" href="' + esc(src.url) + '" target="_blank" rel="noopener" title="' + esc(src.title || '') + '">' + n + '</a>' : '[' + n + ']';
      }).join('');
    });
    return s;
  }
  // A small, safe Markdown subset: paragraphs, lists, tables, headings, bold, citations.
  function markdown(text, sources) {
    var lines = text.replace(/\r/g, '').split('\n'), out = [], i = 0;
    while (i < lines.length) {
      var l = lines[i];
      if (/^\s*\|.*\|\s*$/.test(l) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
        var rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(lines[i]); i++; }
        var cells = function (r) { return r.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return inline(c.trim(), sources); }); };
        var head = cells(rows[0]);
        var body = rows.slice(2).map(cells);
        out.push('<table><thead><tr>' + head.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
          body.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>');
        continue;
      }
      if (/^\s*[-*•]\s+/.test(l) || /^\s*\d+[.)]\s+/.test(l)) {
        var ordered = /^\s*\d+[.)]\s+/.test(l), items = [];
        while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*•]\s+/).test(lines[i])) {
          items.push('<li>' + inline(lines[i].replace(/^\s*(?:[-*•]|\d+[.)])\s+/, ''), sources) + '</li>'); i++;
        }
        out.push((ordered ? '<ol>' : '<ul>') + items.join('') + (ordered ? '</ol>' : '</ul>'));
        continue;
      }
      if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
      if (/^#{1,6}\s+/.test(l)) { out.push('<h4>' + inline(l.replace(/^#{1,6}\s+/, ''), sources) + '</h4>'); i++; continue; }
      if (!l.trim()) { i++; continue; }
      // Always take the current line: a "|" row whose table has not finished streaming lands here.
      var para = [l]; i++;
      while (i < lines.length && lines[i].trim() && !/^\s*\|/.test(lines[i]) && !/^\s*(?:[-*•]|\d+[.)])\s+/.test(lines[i]) && !/^#{1,6}\s/.test(lines[i])) { para.push(lines[i]); i++; }
      out.push('<p>' + inline(para.join(' '), sources) + '</p>');
    }
    return out.join('');
  }
  function sourcesHTML(text, sources) {
    if (!sources || !sources.length) return '';
    var cited = {};
    (text.match(/\[(\d+(?:\s*,\s*\d+)*)\]/g) || []).forEach(function (m) { m.replace(/\d+/g, function (n) { cited[n] = 1; }); });
    var used = sources.filter(function (s) { return cited[String(s.n)]; });
    if (!used.length) return '';
    return '<div class="chat-sources" aria-label="Sources">' + used.map(function (s) {
      return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener"><b>' + s.n + '</b><span>' + esc(s.title || s.url) + '</span></a>';
    }).join('') + '</div>';
  }
  function toBottom() { log.scrollTop = log.scrollHeight; }
  function add(kind, html) {
    var div = document.createElement('div');
    div.className = 'chat-msg chat-msg--' + kind;
    div.innerHTML = html;
    log.appendChild(div);
    return div;
  }
  // A new question moves to the top of the log once, and its answer grows below it without the view
  // moving: the reader scrolls on as they read. The answer is given at least the rest of the visible
  // height, so the question can reach the top even when the log is short.
  var lastAnswer = null;
  function showQuestion(question, answer) {
    if (lastAnswer) lastAnswer.style.minHeight = '';
    var cs = getComputedStyle(log), pad = parseFloat(cs.paddingTop) || 0, gap = parseFloat(cs.rowGap) || 0;
    answer.style.minHeight = Math.max(0, log.clientHeight - pad * 2 - question.offsetHeight - gap) + 'px';
    lastAnswer = answer;
    var top = question.offsetTop - pad;
    if (log.scrollTo && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) log.scrollTo({ top: top, behavior: 'smooth' });
    else log.scrollTop = top;
  }
  function restore() {
    history.forEach(function (m) {
      if (m.role === 'user') add('user', esc(m.content));
      else add('bot', markdown(m.content, m.sources) + sourcesHTML(m.content, m.sources));
    });
    if (history.length && suggest) suggest.hidden = true;
    toBottom();
  }
  function save() {
    try { sessionStorage.setItem(STORE, JSON.stringify(history.slice(-MAX_KEEP))); } catch (e) { /* storage full or blocked */ }
  }

  // ---- open / close ---------------------------------------------------------------------------
  function open(on) {
    panel.hidden = !on;
    fab.setAttribute('aria-expanded', String(on));
    if (on) { input.focus(); log.scrollTop = log.scrollHeight; } else fab.focus();
  }
  fab.addEventListener('click', function () { open(true); });
  closeBtn.addEventListener('click', function () { open(false); });
  panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') open(false); });

  // ---- asking ---------------------------------------------------------------------------------
  function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 140) + 'px'; }
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit')); }
  });
  if (suggest) suggest.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    input.value = b.textContent; ask();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); ask(); });

  function ask() {
    var q = input.value.trim();
    if (!q || busy) return;
    busy = true; send.disabled = true;
    if (suggest) suggest.hidden = true;
    input.value = ''; autosize();
    var asked = add('user', esc(q));
    history.push({ role: 'user', content: q });
    var msg = add('bot', '<span class="chat-typing" aria-label="Thinking"><i></i><i></i><i></i></span>');
    showQuestion(asked, msg);
    var text = '', sources = [];
    var payload = { messages: history.slice(-10).map(function (m) { return { role: m.role, content: m.content }; }) };

    // Tokens arrive dozens a second; the answer is redrawn at most once a frame, with whatever has
    // arrived since. The view stays where the reader has it.
    var frame = 0, shown = '';
    function draw(final) {
      frame = 0;
      var html = (text ? markdown(text, sources) : '<span class="chat-typing" aria-label="Thinking"><i></i><i></i><i></i></span>') + (final ? sourcesHTML(text, sources) : '');
      if (html === shown) return;
      msg.innerHTML = shown = html;
    }
    function paint(final) {
      if (final) { if (frame) cancelAnimationFrame(frame); draw(true); return; }
      if (!frame) frame = requestAnimationFrame(function () { draw(false); });
    }
    function fail(message) {
      msg.className = 'chat-msg chat-msg--error';
      msg.textContent = message;
      history.pop();
      status.textContent = message;
    }
    function finish() {
      busy = false; send.disabled = false;
      input.focus();
    }

    fetch(API + '/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (res) {
        if (res.status === 429) throw new Error('Too many questions at once. Please wait a minute and try again.');
        if (!res.ok || !res.body) throw new Error(OFFLINE);
        var reader = res.body.getReader(), dec = new TextDecoder(), buf = '', done = false;
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) return;
            buf += dec.decode(r.value, { stream: true });
            var parts = buf.split('\n\n'); buf = parts.pop();
            parts.forEach(function (chunk) {
              var line = chunk.split('\n').filter(function (x) { return x.indexOf('data:') === 0; }).map(function (x) { return x.slice(5).trim(); }).join('');
              if (!line) return;
              var ev; try { ev = JSON.parse(line); } catch (e) { return; }
              if (ev.type === 'sources') sources = ev.sources || [];
              else if (ev.type === 'token') { text += ev.text; paint(false); }
              else if (ev.type === 'error') throw new Error(ev.message || 'Something went wrong.');
              else if (ev.type === 'done') done = true;
            });
            if (!done) return pump();
          });
        }
        return pump();
      })
      .then(function () {
        if (!text.trim()) throw new Error('No answer came back. Please try again.');
        paint(true);
        history.push({ role: 'assistant', content: text, sources: sources });
        save();
        status.textContent = 'Answer ready.';
        finish();
      })
      .catch(function (err) {
        // A TypeError is the browser's "Failed to fetch": the server could not be reached at all.
        fail(err && !(err instanceof TypeError) && err.message && err.message.length < 200 ? err.message : OFFLINE);
        finish();
      });
  }

  restore();
})();
