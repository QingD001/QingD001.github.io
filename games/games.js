(function () {
  // ========= util =========
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function randInt(n) { return Math.floor(Math.random() * n); }

  function onSwipe(el, cb) {
    var sx = 0, sy = 0, active = false;
    el.addEventListener('touchstart', function (e) {
      if (!e.touches || !e.touches[0]) return;
      active = true;
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (!active) return;
      active = false;
      var t = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
      if (!t) return;
      var dx = t.clientX - sx;
      var dy = t.clientY - sy;
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
      if (Math.abs(dx) > Math.abs(dy)) cb(dx > 0 ? 'right' : 'left');
      else cb(dy > 0 ? 'down' : 'up');
    }, { passive: true });
  }

  // ========= 2048 =========
  function init2048() {
    var gridEl = document.getElementById('grid2048');
    if (!gridEl) return;
    var scoreEl = document.getElementById('score2048');
    var resetBtn = document.getElementById('reset2048');

    var size = 4;
    var score = 0;
    var tiles = new Map(); // id -> { id, v, r, c }
    var board = []; // [r][c] -> tileId | 0
    var nextId = 1;
    var animating = false;

    function emptyBoard() {
      board = [];
      for (var r = 0; r < size; r++) {
        var row = [];
        for (var c = 0; c < size; c++) row.push(0);
        board.push(row);
      }
    }

    function spawn(isFirst) {
      var empties = [];
      for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (board[r][c] === 0) empties.push([r, c]);
      if (!empties.length) return false;
      var pick = empties[randInt(empties.length)];
      var v = Math.random() < 0.9 ? 2 : 4;
      var id = nextId++;
      tiles.set(id, { id: id, v: v, r: pick[0], c: pick[1] });
      board[pick[0]][pick[1]] = id;
      markTileClass(id, isFirst ? '' : 'is-new');
      return true;
    }

    function canMove() {
      for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (board[r][c] === 0) return true;
      for (var r2 = 0; r2 < size; r2++) for (var c2 = 0; c2 < size; c2++) {
        var id = board[r2][c2];
        if (!id) continue;
        var v = tiles.get(id).v;
        if (r2 + 1 < size) {
          var idD = board[r2 + 1][c2];
          if (idD && tiles.get(idD).v === v) return true;
        }
        if (c2 + 1 < size) {
          var idR = board[r2][c2 + 1];
          if (idR && tiles.get(idR).v === v) return true;
        }
      }
      return false;
    }

    function tileColor(v) {
      var p = Math.log2(v) / 11;
      p = clamp(p, 0, 1);
      var a = 0.20 + p * 0.32;
      return 'rgba(96,165,250,' + a.toFixed(3) + ')';
    }

    // 计算单元格几何（用于 transform）
    function measure() {
      var rect = gridEl.getBoundingClientRect();
      var styles = getComputedStyle(gridEl);
      var pad = parseFloat(styles.paddingLeft) || 12;
      var gap = parseFloat(styles.gap) || 10;
      var inner = rect.width - pad * 2;
      var cell = (inner - gap * (size - 1)) / size;
      return { pad: pad, gap: gap, cell: cell };
    }
    function cellXY(r, c, m) {
      return {
        x: m.pad + c * (m.cell + m.gap),
        y: m.pad + r * (m.cell + m.gap),
        s: m.cell
      };
    }

    // 背景 16 格（固定不动）
    function ensureBackground() {
      if (gridEl.getAttribute('data-bg') === '1') return;
      gridEl.setAttribute('data-bg', '1');
      var m = measure();
      for (var r = 0; r < size; r++) {
        for (var c = 0; c < size; c++) {
          var bg = document.createElement('div');
          bg.className = 'tile-bg';
          var p = cellXY(r, c, m);
          bg.style.left = p.x + 'px';
          bg.style.top = p.y + 'px';
          bg.style.width = p.s + 'px';
          bg.style.height = p.s + 'px';
          gridEl.appendChild(bg);
        }
      }
    }

    // 可移动 tile DOM
    var domById = new Map();
    var pendingClass = new Map(); // id -> className
    function markTileClass(id, cls) {
      if (!cls) return;
      pendingClass.set(id, cls);
    }

    function applyTileStyles(el, t, m) {
      var p = cellXY(t.r, t.c, m);
      el.style.width = p.s + 'px';
      el.style.height = p.s + 'px';
      el.style.setProperty('--tx', p.x + 'px');
      el.style.setProperty('--ty', p.y + 'px');
      el.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)';
    }

    function renderTiles() {
      ensureBackground();
      var m = measure();
      // 更新/创建 DOM
      tiles.forEach(function (t, id) {
        var el = domById.get(id);
        if (!el) {
          el = document.createElement('div');
          el.className = 'tile-move';
          el.setAttribute('data-id', String(id));
          gridEl.appendChild(el);
          domById.set(id, el);
        }
        el.textContent = String(t.v);
        el.style.background = tileColor(t.v);
        applyTileStyles(el, t, m);

        var cls = pendingClass.get(id);
        if (cls) {
          el.classList.add(cls);
          // 下一帧移除（避免无限重复动画）
          requestAnimationFrame(function () {
            el.classList.remove(cls);
          });
          pendingClass.delete(id);
        }
      });
      // 移除不存在的 tile
      domById.forEach(function (el, id) {
        if (!tiles.has(id)) {
          el.remove();
          domById.delete(id);
        }
      });

      if (scoreEl) scoreEl.textContent = String(score);
    }

    function move(dir) {
      if (animating) return;
      var moved = false;
      var mergedTo = new Set(); // cellKey "r,c" merged already this move
      var consumed = new Set(); // tileId removed due to merge

      function stepOrder() {
        var rStart = 0, rEnd = size, rStep = 1;
        var cStart = 0, cEnd = size, cStep = 1;
        if (dir === 'right') { cStart = size - 1; cEnd = -1; cStep = -1; }
        if (dir === 'down') { rStart = size - 1; rEnd = -1; rStep = -1; }
        return { rStart: rStart, rEnd: rEnd, rStep: rStep, cStart: cStart, cEnd: cEnd, cStep: cStep };
      }

      function delta() {
        if (dir === 'left') return { dr: 0, dc: -1 };
        if (dir === 'right') return { dr: 0, dc: 1 };
        if (dir === 'up') return { dr: -1, dc: 0 };
        return { dr: 1, dc: 0 }; // down
      }

      var ord = stepOrder();
      var d = delta();

      // 逐 tile 推进到最远
      for (var r = ord.rStart; r !== ord.rEnd; r += ord.rStep) {
        for (var c = ord.cStart; c !== ord.cEnd; c += ord.cStep) {
          var id = board[r][c];
          if (!id) continue;
          if (consumed.has(id)) continue;
          var t = tiles.get(id);

          var nr = r;
          var nc = c;
          while (true) {
            var tr = nr + d.dr;
            var tc = nc + d.dc;
            if (tr < 0 || tc < 0 || tr >= size || tc >= size) break;
            var nextId = board[tr][tc];
            if (!nextId) {
              nr = tr; nc = tc;
              continue;
            }
            var tv = tiles.get(nextId).v;
            var key = tr + ',' + tc;
            if (tv === t.v && !mergedTo.has(key)) {
              // merge into nextId
              mergedTo.add(key);
              score += t.v * 2;
              tiles.get(nextId).v = t.v * 2;
              markTileClass(nextId, 'is-merged');
              consumed.add(id);
              board[r][c] = 0;
              moved = true;
              break;
            }
            break;
          }

          if (!consumed.has(id) && (nr !== r || nc !== c)) {
            board[r][c] = 0;
            board[nr][nc] = id;
            t.r = nr; t.c = nc;
            moved = true;
          }
        }
      }

      // 删除被合并吞掉的 tile
      if (consumed.size) {
        consumed.forEach(function (id) {
          tiles.delete(id);
          // dom 清理在 renderTiles 做
        });
      }

      if (!moved) return;

      animating = true;
      renderTiles(); // 触发 transform 过渡

      window.setTimeout(function () {
        spawn(false);
        renderTiles();
        if (!canMove()) gridEl.setAttribute('data-over', '1');
        else gridEl.removeAttribute('data-over');
        animating = false;
      }, 130);
    }

    function reset() {
      score = 0;
      tiles.clear();
      domById.forEach(function (el) { el.remove(); });
      domById.clear();
      pendingClass.clear();
      emptyBoard();
      // 先清背景，避免尺寸变化后错位
      gridEl.innerHTML = '';
      gridEl.removeAttribute('data-bg');
      spawn(true);
      spawn(true);
      gridEl.removeAttribute('data-over');
      renderTiles();
    }

    if (resetBtn) resetBtn.addEventListener('click', reset);
    gridEl.tabIndex = 0;
    gridEl.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); move('left'); }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); move('right'); }
      else if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); move('up'); }
      else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); move('down'); }
    });
    onSwipe(gridEl, function (dir) { move(dir); });

    reset();
  }

  // ========= Snake =========
  function initSnake() {
    var canvas = document.getElementById('snakeCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var scoreEl = document.getElementById('scoreSnake');
    var resetBtn = document.getElementById('resetSnake');
    var speedWrap = document.getElementById('snakeSpeed');
    var speedLevel = 2; // 默认 2 档

    var gridSize = 18;
    var cells = 18;
    function fitCanvas() {
      var cssW = Math.min(480, Math.floor(window.innerWidth * 0.92));
      var px = Math.max(320, Math.min(cssW, 420));
      canvas.style.width = px + 'px';
      canvas.style.height = px + 'px';
      var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(px * dpr);
      canvas.height = Math.floor(px * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gridSize = Math.floor(px / cells);
    }
    fitCanvas();
    window.addEventListener('resize', fitCanvas, { passive: true });

    var snake, dir, nextDir, food, score, alive, lastMove;
    function speedMs() {
      // 1 慢 / 2 中 / 3 快
      if (speedLevel === 1) return 170;
      if (speedLevel === 3) return 85;
      return 120;
    }
    function reset() {
      snake = [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }];
      dir = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      food = spawnFood();
      score = 0;
      alive = true;
      lastMove = performance.now();
      if (scoreEl) scoreEl.textContent = '0';
      draw();
    }

    function spawnFood() {
      while (true) {
        var fx = randInt(cells);
        var fy = randInt(cells);
        var hit = false;
        for (var i = 0; i < snake.length; i++) if (snake[i].x === fx && snake[i].y === fy) { hit = true; break; }
        if (!hit) return { x: fx, y: fy };
      }
    }

    function setDir(nx, ny) {
      if (nx === -dir.x && ny === -dir.y) return;
      nextDir = { x: nx, y: ny };
    }

    function step(now) {
      requestAnimationFrame(step);
      if (!alive) return;
      var speed = speedMs();
      if (now - lastMove < speed) return;
      lastMove = now;
      dir = nextDir;
      var head = snake[0];
      var nh = { x: head.x + dir.x, y: head.y + dir.y };
      if (nh.x < 0 || nh.y < 0 || nh.x >= cells || nh.y >= cells) { alive = false; draw(); return; }
      for (var i = 0; i < snake.length; i++) if (snake[i].x === nh.x && snake[i].y === nh.y) { alive = false; draw(); return; }
      snake.unshift(nh);
      if (nh.x === food.x && nh.y === food.y) {
        score += 1;
        if (scoreEl) scoreEl.textContent = String(score);
        food = spawnFood();
      } else {
        snake.pop();
      }
      draw();
    }

    function draw() {
      var dark = document.body.classList.contains('dark');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var bg = dark ? 'rgba(17,24,39,0.35)' : 'rgba(96,165,250,0.06)';
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cells * gridSize, cells * gridSize);

      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1;
      for (var i = 1; i < cells; i++) {
        ctx.beginPath(); ctx.moveTo(i * gridSize, 0); ctx.lineTo(i * gridSize, cells * gridSize); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * gridSize); ctx.lineTo(cells * gridSize, i * gridSize); ctx.stroke();
      }

      ctx.fillStyle = dark ? 'rgba(251,191,36,0.85)' : 'rgba(59,130,246,0.85)';
      ctx.fillRect(food.x * gridSize + 4, food.y * gridSize + 4, gridSize - 8, gridSize - 8);

      for (var s = 0; s < snake.length; s++) {
        var p = snake[s];
        var a = 0.18 + (1 - s / Math.max(1, snake.length)) * 0.55;
        ctx.fillStyle = dark ? 'rgba(160,196,255,' + a.toFixed(3) + ')' : 'rgba(37,99,235,' + a.toFixed(3) + ')';
        ctx.fillRect(p.x * gridSize + 2, p.y * gridSize + 2, gridSize - 4, gridSize - 4);
      }

      if (!alive) {
        ctx.fillStyle = dark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)';
        ctx.fillRect(0, 0, cells * gridSize, cells * gridSize);
        ctx.fillStyle = dark ? '#e5e7eb' : '#0f172a';
        ctx.font = '700 18px system-ui, -apple-system, Segoe UI, Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', (cells * gridSize) / 2, (cells * gridSize) / 2 - 6);
        ctx.font = '14px system-ui, -apple-system, Segoe UI, Arial';
        ctx.fillText('点击「重开」或按 R', (cells * gridSize) / 2, (cells * gridSize) / 2 + 18);
      }
    }

    if (resetBtn) resetBtn.addEventListener('click', reset);
    if (speedWrap) {
      speedWrap.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.getAttribute) return;
        var v = t.getAttribute('data-speed');
        if (!v) return;
        var n = parseInt(v, 10);
        if (n !== 1 && n !== 2 && n !== 3) return;
        speedLevel = n;
        // 更新样式与 aria-pressed
        speedWrap.querySelectorAll('[data-speed]').forEach(function (btn) {
          var on = btn.getAttribute('data-speed') === String(speedLevel);
          btn.classList.toggle('is-active', on);
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        // 让切换速度立即生效（下一步不必等太久）
        lastMove = 0;
      });
    }
    window.addEventListener('keydown', function (e) {
      if (!document.getElementById('snakeCanvas')) return;
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); setDir(-1, 0); }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); setDir(1, 0); }
      else if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); setDir(0, -1); }
      else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); setDir(0, 1); }
      else if (k === 'r' || k === 'R') { reset(); }
    });
    onSwipe(canvas, function (dirName) {
      if (dirName === 'left') setDir(-1, 0);
      else if (dirName === 'right') setDir(1, 0);
      else if (dirName === 'up') setDir(0, -1);
      else if (dirName === 'down') setDir(0, 1);
    });

    reset();
    requestAnimationFrame(step);
  }

  // ========= Tetris =========
  function initTetris() {
    var canvas = document.getElementById('tetrisCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var scoreEl = document.getElementById('scoreTetris');
    var resetBtn = document.getElementById('resetTetris');

    var cols = 10, rows = 16;
    var cell = 30;
    function fitCanvas() {
      var cssW = Math.min(360, Math.floor(window.innerWidth * 0.92));
      var pxW = Math.max(280, Math.min(cssW, 340));
      var pxH = Math.floor(pxW * (rows / cols));
      canvas.style.width = pxW + 'px';
      canvas.style.height = pxH + 'px';
      var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(pxW * dpr);
      canvas.height = Math.floor(pxH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = Math.floor(pxW / cols);
    }
    fitCanvas();
    window.addEventListener('resize', fitCanvas, { passive: true });

    var board, piece, score, lastDrop, dropMs, over;
    var shapes = {
      I: [[1, 1, 1, 1]],
      O: [[1, 1], [1, 1]],
      T: [[0, 1, 0], [1, 1, 1]],
      S: [[0, 1, 1], [1, 1, 0]],
      Z: [[1, 1, 0], [0, 1, 1]],
      J: [[1, 0, 0], [1, 1, 1]],
      L: [[0, 0, 1], [1, 1, 1]]
    };
    var bag = [];
    function nextType() {
      if (!bag.length) bag = ['I','O','T','S','Z','J','L'].sort(function(){return Math.random()-0.5;});
      return bag.pop();
    }
    function clone(m) { return m.map(function (r) { return r.slice(); }); }
    function rotate(mat) {
      var h = mat.length, w = mat[0].length;
      var res = [];
      for (var x = 0; x < w; x++) {
        var row = [];
        for (var y = h - 1; y >= 0; y--) row.push(mat[y][x]);
        res.push(row);
      }
      return res;
    }
    function makePiece() {
      var t = nextType();
      var m = clone(shapes[t]);
      var x = Math.floor((cols - m[0].length) / 2);
      var y = -1;
      return { t: t, m: m, x: x, y: y };
    }
    function emptyBoard() {
      board = [];
      for (var r = 0; r < rows; r++) {
        var row = [];
        for (var c = 0; c < cols; c++) row.push('');
        board.push(row);
      }
    }
    function collide(px, py, pm) {
      for (var y = 0; y < pm.length; y++) {
        for (var x = 0; x < pm[y].length; x++) {
          if (!pm[y][x]) continue;
          var bx = px + x;
          var by = py + y;
          if (bx < 0 || bx >= cols || by >= rows) return true;
          if (by >= 0 && board[by][bx]) return true;
        }
      }
      return false;
    }
    function lock() {
      for (var y = 0; y < piece.m.length; y++) {
        for (var x = 0; x < piece.m[y].length; x++) {
          if (!piece.m[y][x]) continue;
          var bx = piece.x + x;
          var by = piece.y + y;
          if (by >= 0) board[by][bx] = piece.t;
        }
      }
      clearLines();
      piece = makePiece();
      if (collide(piece.x, piece.y, piece.m)) over = true;
    }
    function clearLines() {
      var cleared = 0;
      for (var r = rows - 1; r >= 0; r--) {
        var full = true;
        for (var c = 0; c < cols; c++) if (!board[r][c]) { full = false; break; }
        if (full) {
          board.splice(r, 1);
          var newRow = [];
          for (var cc = 0; cc < cols; cc++) newRow.push('');
          board.unshift(newRow);
          cleared++;
          r++;
        }
      }
      if (cleared) {
        var add = [0, 100, 300, 500, 800][cleared] || (cleared * 250);
        score += add;
        if (scoreEl) scoreEl.textContent = String(score);
        dropMs = Math.max(180, dropMs - cleared * 10);
      }
    }
    function colorOf(t) {
      var map = { I: 'rgba(96,165,250,0.90)', O: 'rgba(125,211,252,0.85)', T: 'rgba(59,130,246,0.88)', S: 'rgba(34,211,238,0.78)', Z: 'rgba(56,189,248,0.82)', J: 'rgba(99,102,241,0.82)', L: 'rgba(147,197,253,0.85)' };
      return map[t] || 'rgba(96,165,250,0.85)';
    }
    function draw() {
      var dark = document.body.classList.contains('dark');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = dark ? 'rgba(17,24,39,0.35)' : 'rgba(96,165,250,0.06)';
      ctx.fillRect(0, 0, cols * cell, rows * cell);

      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var t = board[r][c];
          if (t) {
            ctx.fillStyle = colorOf(t);
            ctx.fillRect(c * cell + 1, r * cell + 1, cell - 2, cell - 2);
          }
        }
      }

      if (!over) {
        ctx.fillStyle = colorOf(piece.t);
        for (var y = 0; y < piece.m.length; y++) {
          for (var x = 0; x < piece.m[y].length; x++) {
            if (!piece.m[y][x]) continue;
            var bx = piece.x + x;
            var by = piece.y + y;
            if (by < 0) continue;
            ctx.fillRect(bx * cell + 1, by * cell + 1, cell - 2, cell - 2);
          }
        }
      }

      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1;
      for (var i = 1; i < cols; i++) { ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, rows * cell); ctx.stroke(); }
      for (var j = 1; j < rows; j++) { ctx.beginPath(); ctx.moveTo(0, j * cell); ctx.lineTo(cols * cell, j * cell); ctx.stroke(); }

      if (over) {
        ctx.fillStyle = dark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.55)';
        ctx.fillRect(0, 0, cols * cell, rows * cell);
        ctx.fillStyle = dark ? '#e5e7eb' : '#0f172a';
        ctx.font = '700 18px system-ui, -apple-system, Segoe UI, Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', (cols * cell) / 2, (rows * cell) / 2 - 6);
        ctx.font = '14px system-ui, -apple-system, Segoe UI, Arial';
        ctx.fillText('按 R 或点击「重开」', (cols * cell) / 2, (rows * cell) / 2 + 18);
      }
    }
    function hardDrop() {
      if (over) return;
      while (!collide(piece.x, piece.y + 1, piece.m)) piece.y++;
      lock();
    }
    function tick(now) {
      requestAnimationFrame(tick);
      if (over) { draw(); return; }
      if (now - lastDrop >= dropMs) {
        lastDrop = now;
        if (!collide(piece.x, piece.y + 1, piece.m)) piece.y++;
        else lock();
        draw();
      } else {
        draw();
      }
    }
    function reset() {
      score = 0;
      if (scoreEl) scoreEl.textContent = '0';
      dropMs = 520;
      lastDrop = performance.now();
      over = false;
      emptyBoard();
      bag = [];
      piece = makePiece();
      if (collide(piece.x, piece.y, piece.m)) over = true;
      draw();
    }

    if (resetBtn) resetBtn.addEventListener('click', reset);
    window.addEventListener('keydown', function (e) {
      if (!document.getElementById('tetrisCanvas')) return;
      var k = e.key;
      if (k === 'r' || k === 'R') { reset(); return; }
      if (over) return;
      if (k === 'ArrowLeft') { e.preventDefault(); if (!collide(piece.x - 1, piece.y, piece.m)) piece.x--; }
      else if (k === 'ArrowRight') { e.preventDefault(); if (!collide(piece.x + 1, piece.y, piece.m)) piece.x++; }
      else if (k === 'ArrowDown') { e.preventDefault(); if (!collide(piece.x, piece.y + 1, piece.m)) piece.y++; else lock(); }
      else if (k === 'ArrowUp') {
        e.preventDefault();
        var rm = rotate(piece.m);
        if (!collide(piece.x, piece.y, rm)) piece.m = rm;
      } else if (k === ' ') {
        e.preventDefault();
        hardDrop();
      }
    });

    reset();
    requestAnimationFrame(tick);
  }

  init2048();
  initSnake();
  initTetris();
})();

