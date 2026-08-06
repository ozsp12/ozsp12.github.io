(() => {
  'use strict';

  const DATA = window.SITE_DATA;
  const VALID_PAGES = new Set(DATA.NAV.map(item => item.key));
  const state = { page: 'home', lang: 'pt', menuOpen: false };

  const main = document.getElementById('main-content');
  const desktopNav = document.querySelector('.desktop-nav');
  const mobileNav = document.getElementById('mobile-navigation');
  const menuToggle = document.querySelector('.menu-toggle');
  const skipLink = document.getElementById('skip-link');

  function text(value) {
    return document.createTextNode(value);
  }

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined && content !== null) node.append(text(content));
    return node;
  }

  function parseLocation() {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    const lang = params.get('lang');
    state.page = VALID_PAGES.has(page) ? page : 'home';
    state.lang = lang === 'en' || lang === 'pt' ? lang : 'pt';
  }

  function updateLocation(replace = false) {
    const url = new URL(window.location.href);
    if (state.page === 'home') url.searchParams.delete('page');
    else url.searchParams.set('page', state.page);
    if (state.lang === 'pt') url.searchParams.delete('lang');
    else url.searchParams.set('lang', state.lang);
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({ page: state.page, lang: state.lang }, '', url);
  }

  function setPage(page, push = true) {
    if (!VALID_PAGES.has(page)) return;
    state.page = page;
    state.menuOpen = false;
    if (push) updateLocation();
    render();
    window.scrollTo(0, 0);
  }

  function setLanguage(lang, push = true) {
    if (lang !== 'pt' && lang !== 'en') return;
    state.lang = lang;
    state.menuOpen = false;
    if (push) updateLocation();
    render();
  }

  function createLanguageControls(container, mobile = false) {
    if (!mobile) container.append(element('span', 'lang-divider'));
    const row = mobile ? element('div', 'mobile-language-row') : container;
    const pt = element('button', 'lang-button', 'PT');
    pt.type = 'button';
    pt.setAttribute('aria-pressed', String(state.lang === 'pt'));
    pt.addEventListener('click', () => setLanguage('pt'));
    const sep = element('span', 'lang-separator', '|');
    const en = element('button', 'lang-button', 'EN');
    en.type = 'button';
    en.setAttribute('aria-pressed', String(state.lang === 'en'));
    en.addEventListener('click', () => setLanguage('en'));
    row.append(pt, sep, en);
    if (mobile) container.append(row);
  }

  function renderNavigation() {
    const t = DATA.T[state.lang];
    desktopNav.replaceChildren();
    mobileNav.replaceChildren();
    desktopNav.setAttribute('aria-label', t.navAria);
    mobileNav.setAttribute('aria-label', t.navAria);
    menuToggle.setAttribute('aria-label', t.menuAria);
    skipLink.textContent = t.skip;

    DATA.NAV.forEach(item => {
      const href = state.lang === 'en'
        ? `?page=${encodeURIComponent(item.key)}&lang=en`
        : `?page=${encodeURIComponent(item.key)}`;
      const desktop = element('a', 'nav-link', item.label);
      desktop.href = href;
      desktop.dataset.pageLink = item.key;
      desktop.setAttribute('aria-current', item.key === state.page ? 'page' : 'false');
      desktop.addEventListener('click', event => { event.preventDefault(); setPage(item.key); });
      desktopNav.append(desktop);

      const mobile = desktop.cloneNode(true);
      mobile.addEventListener('click', event => { event.preventDefault(); setPage(item.key); });
      mobileNav.append(mobile);
    });

    createLanguageControls(desktopNav);
    createLanguageControls(mobileNav, true);
    mobileNav.hidden = !state.menuOpen;
    menuToggle.setAttribute('aria-expanded', String(state.menuOpen));
  }

  function profileLinks(centered = false) {
    const list = element('ul', 'profile-links');
    if (centered) list.style.justifyContent = 'center';
    DATA.LINKS.forEach(link => {
      const item = document.createElement('li');
      const anchor = element('a', 'profile-link', link.label);
      anchor.href = link.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      item.append(anchor);
      list.append(item);
    });
    return list;
  }

  function homePage(t) {
    const section = element('section', 'hero-section');
    section.setAttribute('aria-label', t.pageTitles.home);
    const container = element('div', 'hero-container');
    const photoWrap = element('div', 'photo-wrap');
    const img = element('img', 'profile-photo');
    img.src = 'assets/images/profile.jpg';
    img.alt = 'Dr. Osvaldo L. Santos-Pereira';
    img.width = 612;
    img.height = 612;
    photoWrap.append(img);

    const copy = element('div', 'hero-text');
    copy.append(element('h1', 'hero-name', t.name));
    copy.append(element('p', 'subtitle', t.subtitle));
    t.bioParagraphs.forEach(paragraph => copy.append(element('p', 'bio', paragraph)));
    copy.append(profileLinks());
    container.append(photoWrap, copy);
    section.append(container);
    return section;
  }

  function sectionShell(title) {
    const section = element('section', 'inner-section');
    section.append(element('h1', 'page-title', title));
    return section;
  }

  function aboutPage(t) {
    const section = sectionShell(t.pageTitles.about);
    t.about.introParagraphs.forEach(paragraph => section.append(element('p', 'lead', paragraph)));

    const academic = element('div', 'content-block');
    academic.append(element('h2', 'section-title', t.about.academicBackground));
    const degrees = element('ul', 'plain-list');
    t.degrees.forEach(degree => degrees.append(element('li', '', degree)));
    academic.append(degrees);
    section.append(academic);

    const professional = element('div', 'content-block');
    professional.append(element('h2', 'section-title', t.about.professionalExperience));
    t.about.professionalParagraphs.forEach(paragraph => professional.append(element('p', 'body-copy', paragraph)));
    section.append(professional);

    const profiles = element('div', 'content-block');
    profiles.append(element('h2', 'section-title', t.about.academicProfiles), profileLinks());
    section.append(profiles);
    return section;
  }

  function teachingPage(t) {
    const section = sectionShell(t.pageTitles.teaching);
    section.append(element('p', 'lead', t.teachingIntro));
    const stack = element('div', 'topic-stack');
    DATA.TEACHING_TOPICS.forEach(topic => {
      const row = element('div', 'topic-row');
      row.append(element('h2', 'item-title', topic.label));
      row.append(element('p', 'body-copy', topic.desc[state.lang]));
      stack.append(row);
    });
    section.append(stack);
    return section;
  }

  function researchPage(t) {
    const section = sectionShell(t.pageTitles.research);
    section.append(element('p', 'lead', t.researchIntro));
    const stack = element('div', 'topic-stack');
    DATA.RESEARCH_LINES.forEach(line => {
      const row = element('div', 'topic-row');
      row.append(element('h2', 'item-title', line.label));
      line.desc[state.lang].forEach(paragraph => row.append(element('p', 'body-copy', paragraph)));
      stack.append(row);
    });
    section.append(stack);
    return section;
  }

  function publicationsPage(t) {
    const section = sectionShell(t.pageTitles.publications);
    section.append(element('p', 'lead', t.publicationsIntro));
    DATA.PUBLICATIONS.forEach(group => {
      const year = element('div', 'publication-year');
      year.append(element('h2', 'section-title', group.year));
      group.entries.forEach(publication => {
        const entry = element('article', 'publication-entry');
        entry.append(element('h3', 'item-title', publication.title));
        publication.meta.forEach(line => entry.append(element('p', 'publication-meta', line)));
        year.append(entry);
      });
      section.append(year);
    });
    return section;
  }

  function blogPage(t) {
    const section = sectionShell(t.pageTitles.blog);
    section.append(element('p', 'lead', t.blogIntro));
    const list = element('div', 'blog-list');
    DATA.BLOG_ENTRIES[state.lang].forEach(post => {
      const article = element('article', 'blog-item');
      article.append(element('h2', 'item-title', post.title));
      article.append(element('p', 'blog-meta', `${post.date} · ${post.category} · ${post.lang}`));
      article.append(element('p', 'body-copy', post.excerpt));
      list.append(article);
    });
    section.append(list);
    return section;
  }

  function contactPage(t) {
    const section = sectionShell(t.pageTitles.contact);
    const email = element('p', 'contact-email');
    email.append(text(`${t.contact.emailIntro} `));
    const emailLink = element('a', 'email-link', 'olsp@if.ufrj.br');
    emailLink.href = 'mailto:olsp@if.ufrj.br';
    email.append(emailLink, text('.'));
    section.append(email);

    const address = element('div', 'address-block');
    address.append(element('p', 'address-name', t.contact.address.name));
    t.contact.address.lines.forEach(line => address.append(element('p', 'address-line', line)));
    section.append(address);
    t.contact.paragraphs.forEach(paragraph => section.append(element('p', 'body-copy', paragraph)));
    return section;
  }

  function renderMain() {
    const t = DATA.T[state.lang];
    const pages = {
      home: homePage,
      about: aboutPage,
      teaching: teachingPage,
      research: researchPage,
      publications: publicationsPage,
      blog: blogPage,
      contact: contactPage
    };
    main.replaceChildren(pages[state.page](t));
    document.documentElement.lang = state.lang === 'pt' ? 'pt-BR' : 'en';
    document.title = 'Dr. Osvaldo L. Santos-Pereira — Physics, AI & Data Science';
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = t.subtitle;
    document.getElementById('footer-copy').textContent = `© ${new Date().getFullYear()} Dr. Osvaldo L. Santos-Pereira. ${t.footerCopy}`;
    document.getElementById('footer-tagline').textContent = t.footerTagline;
  }

  function render() {
    renderNavigation();
    renderMain();
  }

  menuToggle.addEventListener('click', () => {
    state.menuOpen = !state.menuOpen;
    renderNavigation();
  });

  document.querySelector('.wordmark').addEventListener('click', event => {
    event.preventDefault();
    setPage('home');
  });

  window.addEventListener('popstate', () => {
    parseLocation();
    state.menuOpen = false;
    render();
    window.scrollTo(0, 0);
  });

  parseLocation();
  updateLocation(true);
  render();
})();
