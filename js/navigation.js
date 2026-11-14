document.addEventListener('DOMContentLoaded', function () {
  var isPortuguese = (document.documentElement.lang || '').toLowerCase().indexOf('pt') === 0;

  var themeButtons = document.querySelectorAll('[data-theme-toggle]');
  var storedTheme = null;
  try {
    storedTheme = window.localStorage.getItem('site-theme');
  } catch (error) {
    storedTheme = null;
  }

  var systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  var initialTheme = storedTheme === 'dark' || storedTheme === 'light'
    ? storedTheme
    : (systemPrefersDark ? 'dark' : 'light');

  function applyTheme(theme) {
    var isDark = theme === 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    themeButtons.forEach(function (button) {
      button.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      button.setAttribute('aria-label', isPortuguese
        ? (isDark ? 'Usar tema claro' : 'Usar tema escuro')
        : (isDark ? 'Use light theme' : 'Use dark theme'));
      var label = button.querySelector('.theme-btn-label');
      if (label) {
        label.textContent = isPortuguese
          ? (isDark ? 'Claro' : 'Escuro')
          : (isDark ? 'Light' : 'Dark');
      }
    });
  }

  applyTheme(initialTheme);

  themeButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') || 'light';
      var next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        window.localStorage.setItem('site-theme', next);
      } catch (error) {
        // Theme still works for the current page when storage is unavailable.
      }
    });
  });

  var toggle = document.querySelector('[data-menu-toggle]');
  var panel = document.querySelector('[data-mobile-nav]');
  if (!toggle || !panel) return;

  var openLabel = toggle.getAttribute('aria-label') || (isPortuguese ? 'Abrir menu' : 'Open menu');
  var closeLabel = isPortuguese ? 'Fechar menu' : 'Close menu';

  if (!panel.id) panel.id = 'mobile-navigation';
  toggle.setAttribute('aria-controls', panel.id);

  function isOpen() {
    return panel.classList.contains('open');
  }

  function setOpen(open, returnFocus) {
    panel.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? closeLabel : openLabel);
    panel.hidden = !open;

    if (!open && returnFocus) {
      toggle.focus();
    }
  }

  setOpen(false, false);

  toggle.addEventListener('click', function () {
    setOpen(!isOpen(), false);
  });

  panel.addEventListener('click', function (event) {
    if (event.target.closest('a')) {
      setOpen(false, false);
    }
  });

  document.addEventListener('click', function (event) {
    if (!isOpen()) return;
    if (panel.contains(event.target) || toggle.contains(event.target)) return;
    setOpen(false, false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && isOpen()) {
      event.preventDefault();
      setOpen(false, true);
    }
  });

  var desktopQuery = window.matchMedia('(min-width: 1121px)');
  function handleViewportChange(event) {
    if (event.matches && isOpen()) {
      setOpen(false, false);
    }
  }

  if (typeof desktopQuery.addEventListener === 'function') {
    desktopQuery.addEventListener('change', handleViewportChange);
  } else if (typeof desktopQuery.addListener === 'function') {
    desktopQuery.addListener(handleViewportChange);
  }
});
