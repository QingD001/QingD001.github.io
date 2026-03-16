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

  // 当前页导航高亮
  var path = (location.pathname || '').replace(/^\//, '') || 'index.html';
  if (path === '') path = 'index.html';
  document.querySelectorAll('.site-nav a[href]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href === path || (path === 'index.html' && href === 'index.html')) a.classList.add('active');
    else a.classList.remove('active');
  });
})();
