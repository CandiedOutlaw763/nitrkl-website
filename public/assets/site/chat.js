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
  // moving: the reader scrolls on as they read. An empty spacer after the answer (the log's ::after,
  // --chat-tail) makes up the rest of the visible height, so the question can reach the top even when
  // the log is short; the answer itself is only as tall as its text.
  var lastAnswer = null, reserve = 0;
  function fitTail() {
    var tail = lastAnswer ? Math.max(0, reserve - lastAnswer.offsetHeight) : 0;  // the ::after cancels its own gap
    log.style.setProperty('--chat-tail', tail + 'px');
  }
  function showQuestion(question, answer) {
    var cs = getComputedStyle(log), pad = parseFloat(cs.paddingTop) || 0, gap = parseFloat(cs.rowGap) || 0;
    reserve = Math.max(0, log.clientHeight - pad * 2 - question.offsetHeight - gap);
    lastAnswer = answer;
    fitTail();
    var top = question.offsetTop - pad;
    if (log.scrollTo && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) log.scrollTo({ top: top, behavior: 'smooth' });
    else log.scrollTop = top;
  }
  function restore() {
    history.forEach(function (m) {
      if (m.role === 'user') add('user', esc(m.content));
      else addReadAloud(add('bot', markdown(m.content, m.sources) + sourcesHTML(m.content, m.sources)));
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
    if (on) { input.focus(); log.scrollTop = log.scrollHeight; } else { cancelListening(); stopReading(); fab.focus(); }
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
    cancelListening(); stopReading(); say('');
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
      fitTail();
    }
    function paint(final) {
      if (final) { if (frame) cancelAnimationFrame(frame); draw(true); return; }
      if (!frame) frame = requestAnimationFrame(function () { draw(false); });
    }
    function fail(message) {
      msg.className = 'chat-msg chat-msg--error';
      msg.textContent = message;
      fitTail();
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
        addReadAloud(msg);
        fitTail();
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

  // ---- voice ----------------------------------------------------------------------------------
  // The browser's own speech features: no key, no server, and nothing starts by itself. Each is offered
  // only where the browser has it. What is heard goes into the box for checking, not straight to the
  // assistant, because names are the words speech recognition most often gets wrong.
  var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  var synth = window.speechSynthesis;
  var mic = document.getElementById('chatMic');
  var voiceRow = document.getElementById('chatVoice');
  var voiceLang = document.getElementById('chatVoiceLang');
  var voiceStatus = document.getElementById('chatVoiceStatus');
  var LANG_NAMES = { 'en-IN': 'English', 'hi-IN': 'Hindi', 'or-IN': 'Odia' };
  var HEARD_ERRORS = {
    'not-allowed': 'The microphone is blocked. Allow it for this site from the icon beside the address bar and press the mic again, or type your question.',
    'service-not-allowed': 'This browser does not allow speech input here. Please type your question.',
    'no-speech': 'Nothing was heard. Press the microphone and try again.',
    'audio-capture': 'No microphone was found. Please type your question.',
    'network': 'Speech input needs an internet connection. Please type your question.',
    'language-not-supported': 'This browser cannot listen in that language. Choose another, or type your question.'
  };
  var MIC_WAIT = 6000, MIC_GIVE_UP = 15000, micTimers = [];
  function clearMicTimers() { micTimers.forEach(clearTimeout); micTimers = []; }
  function say(text, problem) {
    if (!voiceStatus) return;
    voiceStatus.textContent = text;
    voiceStatus.classList.toggle('is-problem', !!problem);
  }
  function setIcon(el, name) { var use = el.querySelector('use'); if (use) use.setAttribute('href', '#i-' + name); }

  // ---- speech to text
  var listening = null;
  function setMicUI(on) {
    if (!mic) return;
    mic.setAttribute('aria-pressed', String(on));
    mic.setAttribute('aria-label', on ? 'Stop listening' : 'Speak your question');
    mic.title = on ? 'Stop listening' : 'Speak your question';
    setIcon(mic, on ? 'stop-circle' : 'mic');
  }
  function stopListening() {
    if (!listening) return;
    try { listening.stop(); } catch (e) { /* already stopped */ }
  }
  // For when the question has gone or the panel has closed: speech still on its way must not refill the box.
  function cancelListening() {
    if (!listening) return;
    var rec = listening;
    rec.onresult = rec.onerror = rec.onstart = rec.onend = null;
    rec.done();
    try { rec.abort(); } catch (e) { /* already stopped */ }
  }
  function listen() {
    stopReading();
    var rec, before = input.value.trim(), heard = '', failed = false, placeholder = input.placeholder;
    try { rec = new Recognition(); } catch (e) { say('Speech input is not available in this browser. Please type your question.', true); return; }
    function done() {
      clearMicTimers();
      input.placeholder = placeholder;
      listening = null;
      setMicUI(false);
    }
    rec.lang = voiceLang.value;
    rec.interimResults = true;
    rec.continuous = false;
    // Listening starts only once the browser has the microphone, which can wait on a permission prompt.
    rec.onstart = function () {
      clearMicTimers();
      input.placeholder = 'Listening. Speak now.';
      say('Listening in ' + LANG_NAMES[voiceLang.value] + '. Speak now.');
    };
    rec.onresult = function (e) {
      heard = '';
      for (var i = 0; i < e.results.length; i++) heard += e.results[i][0].transcript;
      input.value = (before ? before + ' ' : '') + heard;
      autosize();
    };
    rec.onerror = function (e) {
      if (e.error === 'aborted') return;
      failed = true;
      say(HEARD_ERRORS[e.error] || 'Speech input stopped. Please try again, or type your question.', true);
    };
    rec.onend = function () {
      done();
      if (failed) return;
      if (heard.trim()) { say('Check your question, then press Send.'); input.focus(); }
      else say(HEARD_ERRORS['no-speech'], true);
    };
    rec.done = done;
    try { rec.start(); } catch (e) { say('Speech input is busy. Please try again in a moment.', true); return; }
    listening = rec;
    setMicUI(true);
    say('Starting the microphone. If your browser asks, choose Allow.');
    micTimers.push(setTimeout(function () { say('Still waiting for the microphone. Look for a permission prompt near the address bar.'); }, MIC_WAIT));
    micTimers.push(setTimeout(function () {
      failed = true;
      say('The microphone did not start. Check that this site may use it in your browser settings, or type your question.', true);
      try { rec.abort(); } catch (e) { /* already stopped */ }
      if (listening === rec) done();
    }, MIC_GIVE_UP));
  }

  // ---- text to speech
  var reading = null;
  function setReadUI(btn, on) {
    btn.setAttribute('aria-pressed', String(on));
    btn.querySelector('span').textContent = on ? 'Stop reading' : 'Read aloud';
    setIcon(btn, on ? 'stop-circle' : 'volume-up');
  }
  function stopReading() {
    if (!reading) return;
    var r = reading;
    reading = null;
    if (synth) synth.cancel();
    setReadUI(r.btn, false);
  }
  // What the answer says, as it should sound: no citation numbers or source list, tables read row by row,
  // and no email columns, which take far longer to hear than to read.
  function speakable(msg) {
    var copy = msg.cloneNode(true), parts = [];
    Array.prototype.forEach.call(copy.querySelectorAll('.cite, .chat-sources, .chat-read'), function (el) { el.remove(); });
    function clean(el) { return el.textContent.replace(/\[\d+(?:\s*,\s*\d+)*\]/g, '').replace(/\s+/g, ' ').trim(); }
    Array.prototype.forEach.call(copy.children, function (el) {
      if (el.tagName === 'TABLE') {
        var heads = Array.prototype.map.call(el.querySelectorAll('thead th'), clean);
        Array.prototype.forEach.call(el.querySelectorAll('tbody tr'), function (tr) {
          var bits = [];
          Array.prototype.forEach.call(tr.children, function (td, i) {
            var head = heads[i] || '', value = clean(td);
            if (!value || /mail|^#$|^s\.?\s*no/i.test(head)) return;
            bits.push(i === 0 || /^name$/i.test(head) ? value : head + ': ' + value);
          });
          if (bits.length) parts.push(bits.join(', '));
        });
      } else if (el.tagName === 'UL' || el.tagName === 'OL') {
        Array.prototype.forEach.call(el.children, function (li) { parts.push(clean(li)); });
      } else if (el.tagName !== 'HR') {
        parts.push(clean(el));
      }
    });
    return parts.filter(Boolean);
  }
  // Browsers can cut off one long utterance, so the text goes a short piece at a time.
  function pieces(parts) {
    var out = [];
    parts.forEach(function (part) {
      var now = '';
      part.replace(/([.!?\u0964])\s+/g, '$1\u0001').split('\u0001').forEach(function (s) {
        if (now && (now + ' ' + s).length > 200) { out.push(now); now = s; } else now = now ? now + ' ' + s : s;
      });
      if (now) out.push(now);
    });
    return out;
  }
  function languageOf(text) {
    var hi = (text.match(/[\u0900-\u097F]/g) || []).length, or = (text.match(/[\u0B00-\u0B7F]/g) || []).length;
    var en = (text.match(/[A-Za-z]/g) || []).length;
    if (hi > en && hi >= or) return 'hi-IN';
    if (or > en) return 'or-IN';
    return 'en-IN';
  }
  function voiceFor(lang) {
    var voices = synth.getVoices(), norm = function (v) { return (v.lang || '').replace('_', '-').toLowerCase(); };
    var code = lang.toLowerCase(), base = code.split('-')[0];
    return voices.filter(function (v) { return norm(v) === code; })[0] ||
      voices.filter(function (v) { return norm(v).split('-')[0] === base; })[0] || null;
  }
  function readNext(r) {
    if (reading !== r) return;
    if (r.i >= r.list.length) { stopReading(); return; }
    var text = r.list[r.i++], lang = languageOf(text), voice = voiceFor(lang);
    // Some phones report no voices at all yet still speak. A list without this language means it would be misread.
    if (!voice && synth.getVoices().length) {
      say('This device has no ' + LANG_NAMES[lang] + ' voice, so this answer cannot be read aloud.', true);
      stopReading();
      return;
    }
    var u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    if (voice) u.voice = voice;
    u.onend = function () { readNext(r); };
    u.onerror = function (e) {
      if (reading !== r || e.error === 'interrupted' || e.error === 'canceled') return;
      say('The answer could not be read aloud on this device.', true);
      stopReading();
    };
    r.current = u; // some browsers drop an utterance nothing refers to, and its end never comes
    synth.speak(u);
  }
  function read(btn) {
    var same = reading && reading.btn === btn;
    stopReading();
    stopListening();
    say('');
    if (same) return;
    var list = pieces(speakable(btn.closest('.chat-msg')));
    if (!list.length) return;
    synth.cancel();
    reading = { btn: btn, list: list, i: 0 };
    setReadUI(btn, true);
    readNext(reading);
  }
  function addReadAloud(msg) {
    if (!synth || !window.SpeechSynthesisUtterance) return msg;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chat-read';
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = '<svg class="ic" aria-hidden="true" focusable="false"><use href="#i-volume-up"/></svg><span>Read aloud</span>';
    msg.appendChild(btn);
    return msg;
  }
  log.addEventListener('click', function (e) {
    var btn = e.target.closest('.chat-read');
    if (btn) read(btn);
  });
  if (synth) window.addEventListener('pagehide', function () { synth.cancel(); }); // it would otherwise carry on after leaving

  if (Recognition && mic) {
    mic.hidden = false;
    voiceRow.hidden = false;
    mic.parentNode.classList.add('has-mic');
    // Start in the language the site is being read in
    var site = (document.cookie.match(/googtrans=\/en\/(\w+)/) || [])[1];
    if (site === 'hi') voiceLang.value = 'hi-IN';
    mic.addEventListener('click', function () { if (listening) stopListening(); else listen(); });
  }

  restore();
})();
