(function () {
  // 主题切换
  var btn = document.getElementById('themeToggle');
  if (btn) {
    var dark = localStorage.getItem('theme') === 'dark';
    if (dark) document.body.classList.add('dark');
    btn.textContent = dark ? '🌙' : '☀️';
    btn.addEventListener('click', function () {
      dark = !dark;
      document.body.classList.toggle('dark', dark);
      localStorage.setItem('theme', dark ? 'dark' : 'light');
      btn.textContent = dark ? '🌙' : '☀️';
    });
  }

  // 当前页导航高亮（使用 URL 解析，兼容子目录如 games/）
  var currentPathname = '';
  try {
    currentPathname = new URL(location.href).pathname.replace(/\/+$/, '');
  } catch (e) {
    currentPathname = (location.pathname || '').replace(/\/+$/, '');
  }
  if (currentPathname === '' || currentPathname === '/') currentPathname = '/index.html';

  document.querySelectorAll('.site-nav a[href]').forEach(function (a) {
    var rawHref = a.getAttribute('href') || '';
    var targetPathname = '';
    try {
      targetPathname = new URL(rawHref, location.href).pathname.replace(/\/+$/, '');
    } catch (e2) {
      targetPathname = rawHref;
    }

    var isActive = (targetPathname === currentPathname);
    // 进入 games 子页面时，让 Games（games/index.html）保持高亮
    if (!isActive && currentPathname.indexOf('/games/') === 0) {
      if (targetPathname.endsWith('/games/index.html')) isActive = true;
    }

    if (isActive) a.classList.add('active');
    else a.classList.remove('active');
  });

  // ========= 背景动态几何：不规则线段 + 鼠标聚集 + 每个几何图形仅一条端点连鼠标 =========
  (function initFloatingGeometryBackground() {
    var reduceMotion = false;
    try {
      reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}
    if (reduceMotion) return;

    var canvas = document.createElement('canvas');
    canvas.className = 'bg-geometry';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    var w = 0, h = 0;
    function resize() {
      w = Math.floor(window.innerWidth);
      h = Math.floor(window.innerHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    var mouse = { x: w * 0.5, y: h * 0.35, active: false };
    window.addEventListener('mousemove', function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }, { passive: true });
    window.addEventListener('mouseleave', function () {
      mouse.active = false;
    }, { passive: true });

    function rand(min, max) { return min + Math.random() * (max - min); }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    // 每个“几何图形”由若干点和线段组成（线段连接形成图形）
    function makeGeometry() {
      var pointsCount = Math.floor(rand(5, 9)); // 5~8
      var points = [];
      var edges = [];

      // 中心与速度（整体飘荡）
      var cx = rand(0.15 * w, 0.85 * w);
      var cy = rand(0.18 * h, 0.82 * h);
      var vx = rand(-0.25, 0.25);
      var vy = rand(-0.25, 0.25);

      // 局部点：围绕中心的随机偏移（不规则）
      var spread = rand(26, 54);
      for (var i = 0; i < pointsCount; i++) {
        points.push({
          ox: rand(-spread, spread),
          oy: rand(-spread, spread),
          jx: rand(-0.15, 0.15),
          jy: rand(-0.15, 0.15),
          // 形变参数：每个点有独立相位/频率/幅度
          ph1: rand(0, Math.PI * 2),
          ph2: rand(0, Math.PI * 2),
          f1: rand(0.5, 1.2),
          f2: rand(0.5, 1.2),
          amp: rand(2.5, 6.5)
        });
      }

      // 先用生成树保证连通，并确保存在“端点”（度为 1 的点）
      var degree = new Array(pointsCount).fill(0);
      for (var i2 = 1; i2 < pointsCount; i2++) {
        var j = Math.floor(rand(0, i2));
        edges.push([i2, j]);
        degree[i2]++; degree[j]++;
      }
      // 再随机加 0~2 条边，让图形更“几何”
      var extra = Math.floor(rand(0, 3));
      for (var k = 0; k < extra; k++) {
        var a = Math.floor(rand(0, pointsCount));
        var b = Math.floor(rand(0, pointsCount));
        if (a === b) continue;
        var ok = true;
        for (var eidx = 0; eidx < edges.length; eidx++) {
          var e = edges[eidx];
          if ((e[0] === a && e[1] === b) || (e[0] === b && e[1] === a)) { ok = false; break; }
        }
        if (!ok) continue;
        edges.push([a, b]);
        degree[a]++; degree[b]++;
      }

      // 选择“唯一连鼠标的端点”：优先选择度为 1 的点（线段端点）
      var endpoints = [];
      for (var di = 0; di < degree.length; di++) if (degree[di] === 1) endpoints.push(di);
      var tetherIndex = endpoints.length ? endpoints[Math.floor(rand(0, endpoints.length))] : 0;

      return {
        cx: cx, cy: cy, vx: vx, vy: vy,
        points: points,
        edges: edges,
        tetherIndex: tetherIndex,
        seed: rand(0, 1000),
        rotSeed: rand(0, Math.PI * 2)
      };
    }

    var geometries = [];
    // 数量随屏幕面积调整，避免性能问题
    var count = Math.floor(clamp((w * h) / 90000, 8, 16));
    for (var g = 0; g < count; g++) geometries.push(makeGeometry());

    function colors() {
      var dark = document.body.classList.contains('dark');
      return {
        stroke: dark ? 'rgba(160, 196, 255, 0.22)' : 'rgba(102, 178, 255, 0.20)',
        strokeStrong: dark ? 'rgba(160, 196, 255, 0.34)' : 'rgba(102, 178, 255, 0.32)',
        tether: dark ? 'rgba(251, 191, 36, 0.35)' : 'rgba(255, 217, 102, 0.40)'
      };
    }

    var last = performance.now();
    function tick(now) {
      var dt = Math.min(32, now - last) / 16.6667;
      last = now;

      ctx.clearRect(0, 0, w, h);
      var c = colors();

      // 鼠标影响半径：附近聚集
      var influenceR = Math.min(w, h) * 0.22;
      var influenceR2 = influenceR * influenceR;

      for (var gi = 0; gi < geometries.length; gi++) {
        var geo = geometries[gi];

        // 整体轻微飘荡（速度+边界回弹）
        geo.vx += Math.sin((now / 900) + geo.seed) * 0.0018;
        geo.vy += Math.cos((now / 1000) + geo.seed) * 0.0016;
        geo.vx *= 0.985;
        geo.vy *= 0.985;

        // 鼠标附近聚集：吸引中心到鼠标（距离越近越强，限定半径）
        if (mouse.active) {
          var dx = mouse.x - geo.cx;
          var dy = mouse.y - geo.cy;
          var d2 = dx * dx + dy * dy;
          if (d2 < influenceR2) {
            var d = Math.sqrt(d2) || 1;
            var t = 1 - d / influenceR; // 0~1
            var ax = (dx / d) * (0.16 * t);
            var ay = (dy / d) * (0.16 * t);
            geo.vx += ax;
            geo.vy += ay;
          }
        }

        geo.cx += geo.vx * dt;
        geo.cy += geo.vy * dt;

        // 轻微边界回弹
        if (geo.cx < -40) geo.cx = w + 40;
        if (geo.cx > w + 40) geo.cx = -40;
        if (geo.cy < -40) geo.cy = h + 40;
        if (geo.cy > h + 40) geo.cy = -40;

        // 变形：整体“呼吸”缩放 + 轻微旋转（让几何图形在漂浮时发生形变）
        var tsec = now / 1000;
        var scale = 1 + 0.055 * Math.sin(tsec * 0.9 + geo.seed);
        var rot = 0.14 * Math.sin(tsec * 0.7 + geo.rotSeed);
        var cosr = Math.cos(rot);
        var sinr = Math.sin(rot);

        function pointPos(p) {
          // 点位周期形变（不规则但稳定）
          var mx = Math.sin(tsec * p.f1 + p.ph1) * p.amp;
          var my = Math.cos(tsec * p.f2 + p.ph2) * (p.amp * 0.85);
          var lx = (p.ox + p.jx + mx) * scale;
          var ly = (p.oy + p.jy + my) * scale;
          return {
            x: geo.cx + (lx * cosr - ly * sinr),
            y: geo.cy + (lx * sinr + ly * cosr)
          };
        }

        // 绘制线段网络（几何图形）
        ctx.lineWidth = 1;
        ctx.strokeStyle = c.stroke;
        ctx.beginPath();
        for (var ei = 0; ei < geo.edges.length; ei++) {
          var e = geo.edges[ei];
          var p0 = geo.points[e[0]];
          var p1 = geo.points[e[1]];

          // 点自身微抖动（不规则漂移）
          p0.jx += rand(-0.03, 0.03);
          p0.jy += rand(-0.03, 0.03);
          p1.jx += rand(-0.03, 0.03);
          p1.jy += rand(-0.03, 0.03);
          p0.jx *= 0.92; p0.jy *= 0.92;
          p1.jx *= 0.92; p1.jy *= 0.92;

          var pp0 = pointPos(p0);
          var pp1 = pointPos(p1);

          ctx.moveTo(pp0.x, pp0.y);
          ctx.lineTo(pp1.x, pp1.y);
        }
        ctx.stroke();

        // 每个几何图形：有且仅有一条“端点-鼠标”连接线
        if (mouse.active) {
          var tp = geo.points[geo.tetherIndex];
          var tpp = pointPos(tp);
          var tx = tpp.x;
          var ty = tpp.y;

          // 仅在一定距离内明显显示，远处淡化
          var mdx = mouse.x - tx;
          var mdy = mouse.y - ty;
          var md2 = mdx * mdx + mdy * mdy;
          var alpha = 0.0;
          var fadeR = Math.min(w, h) * 0.35;
          if (md2 < fadeR * fadeR) {
            var md = Math.sqrt(md2) || 1;
            alpha = clamp(1 - md / fadeR, 0, 1);
          }

          if (alpha > 0.02) {
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = c.tether.replace(/0\.\d+\)/, (0.12 + 0.28 * alpha).toFixed(3) + ')');
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();
})();
