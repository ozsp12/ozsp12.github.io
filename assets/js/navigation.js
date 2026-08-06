(() => {
  const toggle = document.querySelector('[data-menu-toggle]');
  const mobile = document.querySelector('[data-mobile-nav]');
  if (toggle && mobile) {
    toggle.addEventListener('click', () => {
      const open = mobile.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    mobile.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      mobile.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }
  document.querySelectorAll('[data-current-year]').forEach(node => {
    node.textContent = new Date().getFullYear();
  });
})();
