document.addEventListener('DOMContentLoaded', function () {
  var isPortuguese = (document.documentElement.lang || '').toLowerCase().indexOf('pt') === 0;
  var physLabHref = isPortuguese ? '/pt/physlab/' : '/en/physlab/';

  function addPhysLabLink(nav) {
    if (!nav || nav.querySelector('a[href="' + physLabHref + '"]')) return;

    var link = document.createElement('a');
    link.className = 'nav-link';
    link.href = physLabHref;
    link.textContent = 'PhysLab';

    if (window.location.pathname.indexOf('/physlab/') !== -1) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }

    var codeLink = Array.prototype.find.call(nav.querySelectorAll('.nav-link'), function (item) {
      return (item.getAttribute('href') || '').indexOf('/repos/') !== -1;
    });
    var contactLink = Array.prototype.find.call(nav.querySelectorAll('.nav-link'), function (item) {
      return (item.getAttribute('href') || '').indexOf('/contact/') !== -1;
    });

    nav.insertBefore(link, codeLink || contactLink || null);
  }

  addPhysLabLink(document.querySelector('.site-nav'));
  addPhysLabLink(document.querySelector('.mobile-nav-panel'));

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
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');

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
