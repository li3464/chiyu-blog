(function () {
  'use strict';
  var CFG = window.CHIYU || {};
  var root = document.documentElement;
  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 白天 / 夜晚 ---------- */
  var toggle = $('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var t = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', t);
      try { localStorage.setItem('chiyu-theme', t); } catch (e) {}
    });
  }

  /* ---------- 导航、阅读进度、回到顶部 ---------- */
  var nav = $('nav');
  var progress = $('read-progress');
  var toTop = $('to-top');
  function onScroll() {
    var y = window.scrollY || 0;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (nav) nav.classList.toggle('scrolled', y > 20);
    if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    if (toTop) toTop.hidden = y < 600;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); });

  var burger = $('burger');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = !nav.classList.contains('menu-open');
      nav.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    });
  }
  // 触屏上点击展开下拉
  Array.prototype.forEach.call(document.querySelectorAll('.has-sub > .menu-link'), function (btn) {
    btn.addEventListener('click', function () {
      var li = btn.parentNode;
      var open = !li.classList.contains('open');
      li.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', function (e) {
    Array.prototype.forEach.call(document.querySelectorAll('.has-sub.open'), function (li) {
      if (!li.contains(e.target)) { li.classList.remove('open'); li.firstElementChild.setAttribute('aria-expanded', 'false'); }
    });
  });

  /* ---------- 站内搜索 ---------- */
  var input = $('search-input');
  var panel = $('search-panel');
  var index = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mark(text, q) {
    var i = text.toLowerCase().indexOf(q);
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }
  function render() {
    var q = input.value.trim().toLowerCase();
    if (!q) { panel.hidden = true; return; }
    if (!index) { panel.innerHTML = '<p class="search-empty">正在翻书……</p>'; panel.hidden = false; return; }
    var hits = index.filter(function (p) {
      return p.title.toLowerCase().indexOf(q) > -1 || p.text.toLowerCase().indexOf(q) > -1 ||
        p.tags.some(function (t) { return t.toLowerCase().indexOf(q) > -1; });
    }).slice(0, 8);
    if (!hits.length) { panel.innerHTML = '<p class="search-empty">没有找到「' + esc(input.value.trim()) + '」相关的文章</p>'; panel.hidden = false; return; }
    panel.innerHTML = hits.map(function (p) {
      var i = p.text.toLowerCase().indexOf(q);
      var snippet = i > -1 ? p.text.slice(Math.max(0, i - 20), i + 60) : p.text.slice(0, 80);
      return '<a class="search-hit" href="' + esc(p.url) + '"><b>' + mark(p.title, q) + '</b><small>' + p.date + ' · ' + mark(snippet, q) + '</small></a>';
    }).join('');
    panel.hidden = false;
  }
  if (input && panel) {
    input.addEventListener('focus', function () {
      if (index || !CFG.search) return;
      fetch(CFG.search).then(function (r) { return r.json(); }).then(function (d) { index = d; render(); })
        .catch(function () { index = []; panel.innerHTML = '<p class="search-empty">搜索索引加载失败，请刷新后再试</p>'; });
    });
    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; panel.hidden = true; input.blur(); }
      if (e.key === 'Enter') { var first = panel.querySelector('.search-hit'); if (first) location.href = first.href; }
    });
    document.addEventListener('click', function (e) { if (!$('search').contains(e.target)) panel.hidden = true; });
  }

  /* ---------- 看板娘说话 ---------- */
  var bubble = $('bubble');
  var mascotBtn = $('mascot-btn');
  var lines = CFG.lines || [];
  var bubbleTimer, lastLine = -1;
  function say(text) {
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.classList.remove('show'); }, 4200);
  }
  if (bubble && mascotBtn && lines.length) {
    setTimeout(function () { say(lines[0]); lastLine = 0; }, 1400);
    mascotBtn.addEventListener('click', function () {
      var i;
      do { i = Math.floor(Math.random() * lines.length); } while (lines.length > 1 && i === lastLine);
      lastLine = i;
      say(lines[i]);
    });
  }

  /* ---------- 首屏飘落的花瓣 ---------- */
  var canvas = $('petals');
  if (canvas && canvas.getContext && !reduceMotion) {
    var ctx = canvas.getContext('2d');
    var hero = $('hero');
    var W = 0, H = 0, petals = [], running = true, visible = true;
    var COLORS = ['#f08a4b', '#e0622a', '#f6b37e', '#e3c27a', '#ffd9bd'];
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = hero.clientWidth; H = hero.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.min(30, Math.round(W / 55));
      while (petals.length < n) petals.push(spawn(true));
      petals.length = n;
    }
    function spawn(anywhere) {
      return {
        x: Math.random() * W, y: anywhere ? Math.random() * H : -20,
        s: 5 + Math.random() * 7, r: Math.random() * Math.PI * 2, vr: (Math.random() - .5) * .04,
        vy: .35 + Math.random() * .8, sway: Math.random() * Math.PI * 2, c: COLORS[(Math.random() * COLORS.length) | 0],
        a: .55 + Math.random() * .4
      };
    }
    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      petals.forEach(function (p, i) {
        p.sway += .012; p.y += p.vy; p.x += Math.sin(p.sway) * .6 + .25; p.r += p.vr;
        if (p.y > H + 20 || p.x > W + 20) petals[i] = p = spawn(false);
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, Math.abs(Math.cos(p.sway * 1.6)) * .6 + .4);
        ctx.globalAlpha = p.a; ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.moveTo(0, -p.s);
        ctx.bezierCurveTo(p.s * .9, -p.s * .5, p.s * .7, p.s * .6, 0, p.s);
        ctx.bezierCurveTo(-p.s * .7, p.s * .6, -p.s * .9, -p.s * .5, 0, -p.s);
        ctx.fill();
        ctx.restore();
      });
      requestAnimationFrame(frame);
    }
    function setRunning() {
      var should = visible && !document.hidden;
      if (should && !running) { running = true; requestAnimationFrame(frame); }
      else if (!should) running = false;
    }
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', setRunning);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; setRunning(); }).observe(hero);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- 八音盒播放器 ---------- */
  var player = $('player');
  if (player) {
    var tracks = CFG.tracks && CFG.tracks.length ? CFG.tracks : [{ title: '书页间的八音盒', artist: '', src: '' }];
    // 内置旋律：[MIDI 音高, 拍数]，每小节 3 拍；bass 为每小节的根音
    var MELODIES = [
      { beat: .36, notes: [[76, 2], [79, 1], [84, 2], [83, 1], [81, 2], [79, 1], [76, 3], [77, 2], [81, 1], [79, 2], [76, 1], [74, 2], [77, 1], [76, 3]], bass: [48, 43, 45, 40, 41, 48, 43, 48] },
      { beat: .4, notes: [[69, 1], [72, 1], [76, 1], [74, 2], [72, 1], [71, 1], [74, 1], [79, 1], [76, 3], [77, 1], [76, 1], [74, 1], [72, 2], [71, 1], [69, 1], [71, 1], [72, 1], [69, 3]], bass: [45, 50, 43, 48, 41, 45, 40, 45] }
    ];
    var cur = 0, playing = false, audio = null, actx = null, master = null;
    var events = [], loopStart = 0, loopLen = 0, ptr = 0, tick = null, raf = null;
    var bar = $('player-progress');

    function freq(m) { return 440 * Math.pow(2, (m - 69) / 12); }
    function initAudio() {
      if (actx) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = new AC();
      master = actx.createGain(); master.gain.value = .8;
      var delay = actx.createDelay(); delay.delayTime.value = .27;
      var fb = actx.createGain(); fb.gain.value = .28;
      var wet = actx.createGain(); wet.gain.value = .3;
      master.connect(actx.destination);
      master.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(actx.destination);
    }
    function pluck(t, midi, vol) {
      var f = freq(midi);
      [[1, 1], [2.005, .32], [4.02, .08]].forEach(function (h) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = 'sine'; o.frequency.value = f * h[0];
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(vol * h[1], t + .006);
        g.gain.exponentialRampToValueAtTime(.0001, t + 1.5 / h[0] + .3);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + 2);
      });
    }
    function buildEvents(mel) {
      var ev = [], b = 0;
      mel.notes.forEach(function (n) { ev.push({ at: b, m: n[0], v: .13 }); b += n[1]; });
      mel.bass.forEach(function (m, i) {
        ev.push({ at: i * 3, m: m, v: .07 }, { at: i * 3 + 1, m: m + 7, v: .04 }, { at: i * 3 + 2, m: m + 12, v: .04 });
      });
      ev.sort(function (a, b2) { return a.at - b2.at; });
      return { list: ev, beats: mel.bass.length * 3 };
    }
    function startMelody() {
      var mel = MELODIES[cur % MELODIES.length];
      var built = buildEvents(mel);
      events = built.list.map(function (e) { return { t: e.at * mel.beat, m: e.m, v: e.v }; });
      loopLen = built.beats * mel.beat;
      loopStart = actx.currentTime + .08; ptr = 0;
      clearInterval(tick);
      tick = setInterval(function () {
        while (events.length && loopStart + events[ptr].t < actx.currentTime + .25) {
          pluck(loopStart + events[ptr].t, events[ptr].m, events[ptr].v);
          ptr++;
          if (ptr >= events.length) { ptr = 0; loopStart += loopLen; }
        }
      }, 50);
    }
    function stopMelody() { clearInterval(tick); tick = null; }

    function showTrack() {
      var t = tracks[cur];
      $('player-title').textContent = t.title || '未命名';
      $('player-artist').textContent = t.artist || '';
    }
    function updateBar() {
      var p = 0;
      if (audio && audio.duration) p = audio.currentTime / audio.duration;
      else if (actx && loopLen) p = ((actx.currentTime - loopStart) % loopLen + loopLen) % loopLen / loopLen;
      bar.style.width = (p * 100).toFixed(2) + '%';
      if (playing) raf = requestAnimationFrame(updateBar);
    }
    function play() {
      var t = tracks[cur];
      if (t.src) {
        stopMelody();
        if (!audio) { audio = new Audio(); audio.addEventListener('ended', function () { go(1); }); }
        if (audio.getAttribute('src') !== t.src) audio.src = t.src;
        audio.play().catch(function () { setPlaying(false); });
      } else {
        if (audio) audio.pause();
        initAudio();
        if (!actx) return;
        actx.resume();
        if (!tick) startMelody();
      }
      setPlaying(true);
    }
    function pause() {
      if (audio) audio.pause();
      if (actx) actx.suspend();
      setPlaying(false);
    }
    function setPlaying(v) {
      playing = v;
      player.classList.toggle('is-playing', v);
      $('player-play').setAttribute('aria-label', v ? '暂停' : '播放');
      cancelAnimationFrame(raf);
      if (v) updateBar();
    }
    function go(step) {
      cur = (cur + step + tracks.length) % tracks.length;
      showTrack();
      stopMelody();
      if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
      if (playing) play(); else bar.style.width = '0';
    }
    $('player-play').addEventListener('click', function () { playing ? pause() : play(); });
    $('player-prev').addEventListener('click', function () { go(-1); });
    $('player-next').addEventListener('click', function () { go(1); });

    var fold = $('player-fold');
    function setFold(f) {
      player.classList.toggle('folded', f);
      fold.setAttribute('aria-expanded', String(!f));
      fold.setAttribute('aria-label', f ? '展开播放器' : '收起播放器');
      try { localStorage.setItem('chiyu-player-folded', f ? '1' : '0'); } catch (e) {}
    }
    var folded = window.innerWidth < 720;
    try { var saved = localStorage.getItem('chiyu-player-folded'); if (saved !== null) folded = saved === '1'; } catch (e) {}
    setFold(folded);
    fold.addEventListener('click', function () { setFold(!player.classList.contains('folded')); });
    showTrack();
  }

  /* ---------- 联系方式：点击 QQ 图标时复制 QQ 号 ---------- */
  var toastEl, toastTimer;
  function toast(text) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (a) {
    a.addEventListener('click', function () {
      var text = a.getAttribute('data-copy');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast('QQ 号 ' + text + ' 已复制'); }, function () { toast('QQ 号：' + text); });
      } else {
        toast('QQ 号：' + text);
      }
    });
  });

  /* ---------- 文章目录高亮 ---------- */
  var tocLinks = document.querySelectorAll('.toc-link');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    Array.prototype.forEach.call(tocLinks, function (a) {
      var id = decodeURIComponent((a.getAttribute('href') || '').slice(1));
      var h = id && document.getElementById(id);
      if (h) map[id] = a;
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        Array.prototype.forEach.call(tocLinks, function (a) { a.classList.remove('active'); });
        if (map[e.target.id]) map[e.target.id].classList.add('active');
      });
    }, { rootMargin: '-90px 0px -70% 0px' });
    Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
  }
})();
