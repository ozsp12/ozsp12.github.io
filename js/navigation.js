document.addEventListener('DOMContentLoaded', function () {
  var isPortuguese = (document.documentElement.lang || '').toLowerCase().indexOf('pt') === 0;
  var blogHref = isPortuguese ? '/pt/blog/' : '/en/blog/';
  var blogLabel = 'Blog';
  var onBlog = window.location.pathname.indexOf(blogHref) === 0;

  function ensureBlogLink(nav) {
    if (!nav || nav.querySelector('.nav-link[href="' + blogHref + '"]')) return;

    var link = document.createElement('a');
    link.className = 'nav-link';
    link.href = blogHref;
    link.textContent = blogLabel;

    if (onBlog) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }

    var physlab = nav.querySelector('.nav-link[href="' + (isPortuguese ? '/pt/physlab/' : '/en/physlab/') + '"]');
    var about = nav.querySelector('.nav-link[href="' + (isPortuguese ? '/pt/about/' : '/en/about/') + '"]');

    if (physlab) {
      physlab.insertAdjacentElement('afterend', link);
    } else if (about) {
      about.insertAdjacentElement('beforebegin', link);
    } else {
      nav.appendChild(link);
    }
  }

  ensureBlogLink(document.querySelector('.site-nav'));
  ensureBlogLink(document.querySelector('[data-mobile-nav]'));

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
