(function () {
  if (!document.body.classList.contains('page-home')) return;

  // ========== 可调参数（字号 / 透明度 / 速度 / 同时显示数量） ==========
  var CONFIG = {
    fontSizeDesktop: 22,   // 桌面字号（px）
    fontSizeMobile: 15,    // 手机字号（px）
    opacity: 0.15,         // 诗句峰值透明度
    maxDesktop: 5,         // 桌面同时显示数量
    maxMobile: 2,          // 手机同时显示数量
    floatSpeedMin: 7,      // 上下漂浮速度下限（px/s）
    floatSpeedMax: 14,     // 上下漂浮速度上限（px/s）
    fadeInMs: 2000,        // 渐现时长
    fadeOutMs: 2200,       // 渐隐时长
    lifeMinMs: 10000,      // 可见停留下限（含漂浮）
    lifeMaxMs: 15000,      // 可见停留上限
    swayMin: 12,           // 左右摆动幅度下限（px）
    swayMax: 24,           // 左右摆动幅度上限（px）
    spawnDelayMin: 1600,   // 下次出现的最短间隔
    spawnDelayMax: 3800,   // 下次出现的最长间隔
    mobileMaxChars: 8      // 手机端跳过更长的句子
  };

  var POEMS = [
    '花谢花飞花满天',
    '红消香断有谁怜',
    '花开易见落难寻',
    '天尽头，何处有香丘',
    '花落人亡两不知',
    '秋花惨淡秋草黄',
    '耿耿秋灯秋夜长',
    '已觉秋窗秋不尽',
    '那堪风雨助凄凉',
    '不知风雨几时休',
    '桃花帘外开仍旧',
    '帘中人比桃花瘦',
    '花解怜人花也愁',
    '花飞人倦易黄昏',
    '寂寞帘栊空月痕',
    '霁月难逢',
    '彩云易散',
    '玉带林中挂',
    '寒塘渡鹤影',
    '冷月葬花魂'
  ];

  var PUNCT = /[，。、；：！？,.!?;:\s]/;
  var MOBILE_MQ = '(max-width: 720px)';

  var layer = null;
  var pool = [];
  var active = [];
  var timers = [];
  var rafId = 0;
  var running = false;
  var destroyed = false;
  var lastTick = 0;
  var poemCursor = 0;
  var deck = [];
  var dirBias = 0;
  var lastMobile = null;
  var reduceMotion = false;

  function rand(min, max) { return min + Math.random() * (max - min); }
  function isMobile() {
    try { return window.matchMedia && window.matchMedia(MOBILE_MQ).matches; }
    catch (e) { return window.innerWidth <= 720; }
  }
  function isPunct(ch) { return PUNCT.test(ch); }
  function prefersReduce() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
    catch (e2) { return false; }
  }
  function isDark() { return document.body.classList.contains('dark'); }
  function fontSize() { return isMobile() ? CONFIG.fontSizeMobile : CONFIG.fontSizeDesktop; }
  function maxConcurrent() { return isMobile() ? CONFIG.maxMobile : CONFIG.maxDesktop; }

  function addTimer(id) {
    timers.push(id);
    return id;
  }
  function clearTimers() {
    for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
    timers = [];
  }
  function dropTimer(id) {
    timers = timers.filter(function (t) { return t !== id; });
  }

  function shuffle(list) {
    var arr = list.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function nextPoem() {
    var mobile = isMobile();
    var guard = 0;
    while (guard++ < POEMS.length * 2) {
      if (poemCursor >= deck.length) {
        deck = shuffle(POEMS);
        poemCursor = 0;
      }
      var text = deck[poemCursor++];
      if (mobile && Array.from(text).length > CONFIG.mobileMaxChars) continue;
      return text;
    }
    return '霁月难逢';
  }

  function pickDir() {
    if (dirBias > 0) { dirBias -= 1; return -1; }
    if (dirBias < 0) { dirBias += 1; return 1; }
    var dir = Math.random() < 0.5 ? -1 : 1;
    dirBias += dir;
    return dir;
  }

  function metrics(text, size) {
    var chars = Array.from(text);
    var h = 0;
    for (var i = 0; i < chars.length; i++) {
      h += isPunct(chars[i]) ? size * 0.82 : size * 1.22;
    }
    return { w: size * 1.35, h: h, chars: chars };
  }

  function overlaps(a, b) {
    return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
  }

  function findPlacement(m) {
    var mobile = isMobile();
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var padX = mobile ? 10 : 40;
    var padY = mobile ? 20 : 36;
    var sway = CONFIG.swayMax;
    var minX = padX + sway;
    var maxX = vw - padX - sway - m.w;
    if (maxX < minX) {
      minX = padX;
      maxX = Math.max(minX, vw - padX - m.w);
    }

    var cols = mobile ? 3 : 5;
    var colW = Math.max(1, (maxX - minX) / cols);
    var dir = pickDir();

    for (var attempt = 0; attempt < 20; attempt++) {
      var col;
      if (mobile) {
        col = Math.random() < 0.8 ? (Math.random() < 0.5 ? 0 : cols - 1) : 1;
      } else {
        col = Math.floor(Math.random() * cols);
      }

      var x = minX + col * colW + rand(0, Math.max(4, colW * 0.45));
      x = Math.max(minX, Math.min(maxX, x));

      var y;
      if (mobile) {
        if (Math.random() < 0.55) y = padY + rand(0, vh * 0.16);
        else y = padY + vh * 0.58 + rand(0, vh * 0.16);
      } else if (dir < 0) {
        y = padY + vh * 0.30 + rand(0, vh * 0.34);
      } else {
        y = padY + rand(0, vh * 0.36);
      }
      if (y + m.h > vh - padY) y = Math.max(padY, vh - padY - m.h);
      if (y < padY) y = padY;

      var box = { x: x - 28, y: y - 20, w: m.w + 56, h: m.h + 40 };
      var hit = false;
      for (var i = 0; i < active.length; i++) {
        if (overlaps(box, active[i].box)) { hit = true; break; }
      }
      if (!hit) return { x: x, y: y, dir: dir, box: box };
    }
    return null;
  }

  function createLine() {
    var el = document.createElement('div');
    el.className = 'bg-poetry-line';
    el.setAttribute('aria-hidden', 'true');
    layer.appendChild(el);
    return el;
  }

  function acquire() {
    return pool.pop() || createLine();
  }

  function fillLine(el, chars) {
    el.textContent = '';
    for (var i = 0; i < chars.length; i++) {
      var span = document.createElement('span');
      span.className = 'bg-poetry-char' + (isPunct(chars[i]) ? ' is-punct' : '');
      span.textContent = chars[i];
      el.appendChild(span);
    }
  }

  function recycle(item) {
    var idx = active.indexOf(item);
    if (idx >= 0) active.splice(idx, 1);
    item.el.style.opacity = '0';
    item.el.style.transition = 'none';
    item.el.style.transform = 'translate3d(-9999px,-9999px,0)';
    if (pool.indexOf(item.el) === -1) pool.push(item.el);
  }

  function recycleAll() {
    while (active.length) recycle(active[0]);
  }

  function spawn() {
    if (!running || destroyed || isDark()) return;
    if (active.length >= maxConcurrent()) return;

    var text = nextPoem();
    var size = fontSize();
    var m = metrics(text, size);
    var place = findPlacement(m);
    if (!place) return;

    var el = acquire();
    fillLine(el, m.chars);
    el.style.fontSize = size + 'px';
    el.style.opacity = '0';
    el.style.transition = 'opacity ' + (CONFIG.fadeInMs / 1000) + 's ease';
    el.style.transform = 'translate3d(' + place.x + 'px,' + place.y + 'px,0)';

    var item = {
      el: el,
      x0: place.x,
      y0: place.y,
      y: place.y,
      box: place.box,
      vy: place.dir * rand(CONFIG.floatSpeedMin, CONFIG.floatSpeedMax),
      sway: rand(CONFIG.swayMin, CONFIG.swayMax),
      omega: rand(0.35, 0.7),
      phase: rand(0, Math.PI * 2),
      born: performance.now(),
      fading: false
    };
    active.push(item);

    el.offsetWidth;
    el.style.opacity = String(CONFIG.opacity);

    var life = rand(CONFIG.lifeMinMs, CONFIG.lifeMaxMs);
    item.fadeTimer = addTimer(setTimeout(function () {
      dropTimer(item.fadeTimer);
      if (!running || active.indexOf(item) === -1) return;
      item.fading = true;
      el.style.transition = 'opacity ' + (CONFIG.fadeOutMs / 1000) + 's ease';
      el.style.opacity = '0';
      item.doneTimer = addTimer(setTimeout(function () {
        dropTimer(item.doneTimer);
        recycle(item);
      }, CONFIG.fadeOutMs + 40));
    }, life));
  }

  function scheduleSpawn(immediate, burstLeft) {
    if (!running || destroyed) return;
    var wait = immediate
      ? rand(180, 520)
      : (burstLeft > 0 ? rand(700, 1400) : rand(CONFIG.spawnDelayMin, CONFIG.spawnDelayMax));
    var id = addTimer(setTimeout(function () {
      dropTimer(id);
      spawn();
      scheduleSpawn(false, Math.max(0, (burstLeft || 0) - 1));
    }, wait));
  }

  function tick(now) {
    if (!running) return;
    if (!lastTick) lastTick = now;
    var dt = Math.min(48, now - lastTick) / 1000;
    lastTick = now;

    for (var i = 0; i < active.length; i++) {
      var p = active[i];
      var t = (now - p.born) / 1000;
      p.y = p.y0 + p.vy * t;
      var x = p.x0 + Math.sin(t * p.omega + p.phase) * p.sway;
      p.el.style.transform = 'translate3d(' + x + 'px,' + p.y + 'px,0)';
      p.box.x = x - 28;
      p.box.y = p.y - 20;
    }

    rafId = requestAnimationFrame(tick);
  }

  function showStatic() {
    recycleAll();
    var picks = isMobile()
      ? ['霁月难逢', '冷月葬花魂']
      : ['霁月难逢', '彩云易散', '冷月葬花魂'];
    var spots = isMobile()
      ? [{ x: 0.10, y: 0.16 }, { x: 0.78, y: 0.42 }]
      : [{ x: 0.10, y: 0.16 }, { x: 0.82, y: 0.26 }, { x: 0.14, y: 0.58 }];
    var size = fontSize();
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    for (var i = 0; i < picks.length; i++) {
      var m = metrics(picks[i], size);
      var el = acquire();
      fillLine(el, m.chars);
      var x = spots[i].x * vw;
      var y = spots[i].y * vh;
      x = Math.max(12, Math.min(vw - m.w - 12, x));
      y = Math.max(16, Math.min(vh - m.h - 16, y));
      el.style.fontSize = size + 'px';
      el.style.transition = 'none';
      el.style.opacity = String(CONFIG.opacity * 0.72);
      el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      active.push({
        el: el, x0: x, y0: y, y: y,
        box: { x: x, y: y, w: m.w, h: m.h },
        vy: 0, sway: 0, omega: 1, phase: 0, born: 0, fading: false
      });
    }
  }

  function applyLayerVars() {
    layer.style.setProperty('--poetry-size', fontSize() + 'px');
    layer.style.setProperty('--poetry-opacity', String(CONFIG.opacity));
  }

  function startMotion() {
    running = true;
    lastTick = 0;
    applyLayerVars();
    layer.style.display = '';
    scheduleSpawn(true, isMobile() ? 1 : 3);
    rafId = requestAnimationFrame(tick);
  }

  function startStatic() {
    running = true;
    applyLayerVars();
    layer.style.display = '';
    showStatic();
  }

  function stop() {
    running = false;
    clearTimers();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    lastTick = 0;
    recycleAll();
    if (layer) layer.style.display = 'none';
  }

  function sync() {
    if (destroyed) return;
    if (isDark()) {
      stop();
      return;
    }
    if (running) return;
    reduceMotion = prefersReduce();
    if (reduceMotion) startStatic();
    else startMotion();
  }

  function onResize() {
    if (destroyed || isDark()) return;
    var mobile = isMobile();
    if (lastMobile === null) {
      lastMobile = mobile;
      return;
    }
    if (mobile === lastMobile) return;
    lastMobile = mobile;
    stop();
    sync();
  }

  function onVisibility() {
    if (!running || reduceMotion || isDark()) return;
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      lastTick = 0;
    } else if (!rafId) {
      lastTick = 0;
      rafId = requestAnimationFrame(tick);
    }
  }

  function onMotionChange() {
    if (destroyed || isDark()) return;
    stop();
    sync();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    stop();
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('themechange', sync);
    window.removeEventListener('pagehide', destroy);
    if (motionMql) {
      if (motionMql.removeEventListener) motionMql.removeEventListener('change', onMotionChange);
      else if (motionMql.removeListener) motionMql.removeListener(onMotionChange);
    }
    pool = [];
    if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    layer = null;
  }

  var motionMql = null;
  try { motionMql = window.matchMedia('(prefers-reduced-motion: reduce)'); } catch (e3) {}

  layer = document.createElement('div');
  layer.className = 'bg-poetry';
  layer.id = 'bgPoetry';
  layer.setAttribute('aria-hidden', 'true');
  document.body.prepend(layer);
  applyLayerVars();
  lastMobile = isMobile();
  reduceMotion = prefersReduce();

  window.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('themechange', sync);
  window.addEventListener('pagehide', destroy);
  if (motionMql) {
    if (motionMql.addEventListener) motionMql.addEventListener('change', onMotionChange);
    else if (motionMql.addListener) motionMql.addListener(onMotionChange);
  }

  var boot = addTimer(setTimeout(function () {
    dropTimer(boot);
    sync();
  }, 80));
})();
