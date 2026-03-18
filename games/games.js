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
    var grid = [];
    var score = 0;

    function emptyGrid() {
      grid = [];
      for (var r = 0; r < size; r++) {
        var row = [];
        for (var c = 0; c < size; c++) row.push(0);
        grid.push(row);
      }
    }

    function spawn() {
      var empties = [];
      for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (grid[r][c] === 0) empties.push([r, c]);
      if (!empties.length) return false;
      var pick = empties[randInt(empties.length)];
      grid[pick[0]][pick[1]] = Math.random() < 0.9 ? 2 : 4;
      return true;
    }

    function canMove() {
      for (var r = 0; r < size; r++) for (var c = 0; c < size; c++) if (grid[r][c] === 0) return true;
      for (var r2 = 0; r2 < size; r2++) for (var c2 = 0; c2 < size; c2++) {
        var v = grid[r2][c2];
        if (r2 + 1 < size && grid[r2 + 1][c2] === v) return true;
        if (c2 + 1 < size && grid[r2][c2 + 1] === v) return true;
      }
      return false;
    }

    function slideRowLeft(row) {
      var arr = row.filter(function (x) { return x !== 0; });
      var merged = [];
      for (var i = 0; i < arr.length; i++) {
        if (i + 1 < arr.length && arr[i] === arr[i + 1] && !merged[i]) {
          arr[i] = arr[i] * 2;
          score += arr[i];
          arr.splice(i + 1, 1);
          merged[i] = true;
        }
      }
      while (arr.length < size) arr.push(0);
      return arr;
    }

    function rotateRight(mat) {
      var res = [];
      for (var c = 0; c < size; c++) {
        var row = [];
        for (var r = size - 1; r >= 0; r--) row.push(mat[r][c]);
        res.push(row);
      }
      return res;
    }
    function rotateLeft(mat) {
      var res = [];
      for (var c = size - 1; c >= 0; c--) {
        var row = [];
        for (var r = 0; r < size; r++) row.push(mat[r][c]);
        res.push(row);
      }
      return res;
    }

    function move(dir) {
      var before = JSON.stringify(grid);
      if (dir === 'left') {
        for (var r = 0; r < size; r++) grid[r] = slideRowLeft(grid[r]);
      } else if (dir === 'right') {
        for (var r2 = 0; r2 < size; r2++) {
          var rev = grid[r2].slice().reverse();
          rev = slideRowLeft(rev);
          grid[r2] = rev.reverse();
        }
      } else if (dir === 'up') {
        grid = rotateLeft(grid);
        for (var r3 = 0; r3 < size; r3++) grid[r3] = slideRowLeft(grid[r3]);
        grid = rotateRight(grid);
      } else if (dir === 'down') {
        grid = rotateLeft(grid);
        for (var r4 = 0; r4 < size; r4++) {
          var rev2 = grid[r4].slice().reverse();
          rev2 = slideRowLeft(rev2);
          grid[r4] = rev2.reverse();
        }
        grid = rotateRight(grid);
      }
      var after = JSON.stringify(grid);
      if (before !== after) {
        spawn();
        render();
        if (!canMove()) gridEl.setAttribute('data-over', '1');
        else gridEl.removeAttribute('data-over');
      }
    }

    function tileColor(v) {
      if (v === 0) return 'rgba(255,255,255,0.35)';
      var p = Math.log2(v) / 11;
      p = clamp(p, 0, 1);
      var a = 0.18 + p * 0.28;
      return 'rgba(96,165,250,' + a.toFixed(3) + ')';
    }

    function render() {
      if (scoreEl) scoreEl.textContent = String(score);
      gridEl.innerHTML = '';
      for (var r = 0; r < size; r++) {
        for (var c = 0; c < size; c++) {
          var v = grid[r][c];
          var d = document.createElement('div');
          d.className = 'tile';
          d.textContent = v ? String(v) : '';
          d.style.background = tileColor(v);
          gridEl.appendChild(d);
        }
      }
    }

    function reset() {
      score = 0;
      emptyGrid();
      spawn();
      spawn();
      gridEl.removeAttribute('data-over');
      render();
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
      var speed = 120;
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

