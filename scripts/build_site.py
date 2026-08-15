#!/usr/bin/env python3
"""Build the bilingual static site from shared templates and structured data.

No third-party dependencies are required. The published HTML remains fully static.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

ROOT = Path(__file__).resolve().parents[1]
TEMPLATES = ROOT / "templates"
PAGES = TEMPLATES / "pages"
DATA = ROOT / "data"
ERROR_SOURCE = TEMPLATES / "404.html"
ERROR_OUTPUT = ROOT / "404.html"
ROOT_OUTPUT = ROOT / "index.html"
SITEMAP_OUTPUT = ROOT / "sitemap.xml"
ROBOTS_OUTPUT = ROOT / "robots.txt"

PAGE_KEYS = ("home", "about", "teaching", "research", "publications", "physlab", "projects", "repos", "contact")
PAGE_PATHS = {
    "home": "index.html",
    "about": "about/index.html",
    "teaching": "teaching/index.html",
    "research": "research/index.html",
    "publications": "publications/index.html",
    "physlab": "physlab/index.html",
    "projects": "projects/index.html",
    "repos": "repos/index.html",
    "contact": "contact/index.html",
}

NAVIGATION = (
    ("home", {"pt": "Início", "en": "Home"}),
    ("about", {"pt": "Sobre", "en": "About"}),
    ("teaching", {"pt": "Notas", "en": "Notes"}),
    ("research", {"pt": "Pesquisa", "en": "Research"}),
    ("publications", {"pt": "Publicações", "en": "Papers"}),
    ("physlab", {"pt": "PhysLab", "en": "PhysLab"}),
    ("projects", {"pt": "Projetos", "en": "Projects"}),
    ("contact", {"pt": "Contato", "en": "Contact"}),
)

NAV_PARENT = {
    "repos": "about",
}

LANGUAGE_TEXT = {
    "pt": {
        "skip": "Ir para o conteúdo",
        "nav": "Navegação principal",
        "menu": "Abrir menu",
        "footer_line": "© 2026 Dr. Osvaldo L. Santos-Pereira. Todos os direitos reservados.",
        "footer_tagline": "Física · Matemática · Inteligência Artificial · Ciência de Dados",
    },
    "en": {
        "skip": "Skip to content",
        "nav": "Primary navigation",
        "menu": "Open menu",
        "footer_line": "© 2026 Dr. Osvaldo L. Santos-Pereira. All rights reserved.",
        "footer_tagline": "Physics · Mathematics · Artificial Intelligence · Data Science",
    },
}

SOURCE_HEAD = "<!-- PAGE_HEAD -->"
SOURCE_MAIN = "<!-- MAIN -->"

COMMON_HEAD_PATTERNS = (
    r'<meta\s+charset="utf-8"\s*/?>',
    r'<meta\s+content="width=device-width, initial-scale=1"\s+name="viewport"\s*/?>',
    r'<link\s+href="https://fonts\.googleapis\.com"\s+rel="preconnect"\s*/?>',
    r'<link\s+crossorigin=""\s+href="https://fonts\.gstatic\.com"\s+rel="preconnect"\s*/?>',
    r'<link\s+href="https://fonts\.googleapis\.com/css2\?family=Source\+Serif\+4:opsz,wght@8\.\.60,400;8\.\.60,600;8\.\.60,700&amp;family=Public\+Sans:wght@400;500;600&amp;display=swap"\s+rel="stylesheet"\s*/?>',
    r'<link\s+href="/css/styles\.css"\s+rel="stylesheet"\s*/?>',
    r'<link\s+href="/css/physlab\.css\?v=2"\s+rel="stylesheet"\s*/?>',
)


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def read_json(path: Path):
    return json.loads(read(path))


def write_if_changed(path: Path, content: str) -> bool:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and read(path) == content:
        return False
    path.write_text(content, encoding="utf-8")
    return True


def href(lang: str, key: str) -> str:
    path = PAGE_PATHS[key]
    if path == "index.html":
        return f"/{lang}/"
    return f"/{lang}/{path[:-10]}"


def nav_links(lang: str, active_key: str) -> str:
    active_nav_key = NAV_PARENT.get(active_key, active_key)
    lines = []
    for key, labels in NAVIGATION:
        attrs = ' class="nav-link"'
        if key == active_nav_key:
            attrs = ' aria-current="page" class="nav-link active"'
        lines.append(f'<a{attrs} href="{href(lang, key)}">{labels[lang]}</a>')
    return "\n".join(lines)


def language_switch(lang: str, key: str, desktop: bool) -> str:
    current_attrs = ' class="lang-btn active"'
    other_attrs = ' class="lang-btn"'
    if desktop:
        current_attrs = ' aria-current="true" class="lang-btn active"'
        other_attrs = ' aria-current="false" class="lang-btn"'
    if lang == "pt":
        pt = f'<a{current_attrs} href="{href("pt", key)}">PT</a>'
        en = f'<a{other_attrs} href="{href("en", key)}">EN</a>'
    else:
        pt = f'<a{other_attrs} href="{href("pt", key)}">PT</a>'
        en = f'<a{current_attrs} href="{href("en", key)}">EN</a>'
    return f'{pt}\n<span class="lang-sep">|</span>\n{en}'


def replace_tokens(template: str, values: dict[str, str]) -> str:
    for key, value in values.items():
        template = template.replace("{{" + key + "}}", value)
    leftovers = sorted(set(re.findall(r"\{\{([A-Z_]+)\}\}", template)))
    if leftovers:
        raise ValueError("unresolved template tokens: " + ", ".join(leftovers))
    return template


def parse_source(source: str, source_path: Path) -> tuple[str, str]:
    if SOURCE_HEAD not in source or SOURCE_MAIN not in source:
        raise ValueError(f"{source_path}: missing source markers")
    head_part, main_part = source.split(SOURCE_MAIN, 1)
    head = head_part.split(SOURCE_HEAD, 1)[1].strip()
    main = main_part.strip()
    if not head or not main.startswith("<main") or not main.endswith("</main>"):
        raise ValueError(f"{source_path}: invalid page source")
    return head, main


def render_header(lang: str, key: str) -> str:
    text = LANGUAGE_TEXT[lang]
    return replace_tokens(
        read(TEMPLATES / "partials/header.html"),
        {
            "LANG": lang,
            "SKIP_LABEL": text["skip"],
            "NAV_LABEL": text["nav"],
            "MENU_LABEL": text["menu"],
            "DESKTOP_NAV": nav_links(lang, key),
            "MOBILE_NAV": nav_links(lang, key),
            "DESKTOP_LANGUAGE_SWITCH": language_switch(lang, key, desktop=True),
            "MOBILE_LANGUAGE_SWITCH": language_switch(lang, key, desktop=False),
        },
    ).rstrip()


def render_footer(lang: str) -> str:
    text = LANGUAGE_TEXT[lang]
    return replace_tokens(
        read(TEMPLATES / "partials/footer.html"),
        {"FOOTER_LINE": text["footer_line"], "FOOTER_TAGLINE": text["footer_tagline"]},
    ).rstrip()


def format_authors(authors: list[str], lang: str) -> str:
    if len(authors) <= 1:
        return authors[0] if authors else ""
    conjunction = "e" if lang == "pt" else "and"
    if len(authors) == 2:
        return f"{authors[0]} {conjunction} {authors[1]}"
    return ", ".join(authors[:-1]) + f", {conjunction} {authors[-1]}"


def render_publications(lang: str) -> str:
    entries = read_json(DATA / "publications.json")
    by_year: dict[int, list[dict]] = defaultdict(list)
    for entry in entries:
        by_year[int(entry["year"])].append(entry)
    blocks: list[str] = []
    for year in sorted(by_year, reverse=True):
        blocks.append('<div class="pub-year-block">')
        blocks.append(f'<h2 class="block-title">{year}</h2>')
        for index, entry in enumerate(by_year[year]):
            classes = "pub-entry" if index == 0 else "pub-entry pub-entry-separated"
            blocks.append(f'<div class="{classes}">')
            blocks.append(f'<h3 class="sub-title">{html.escape(entry["title"])}</h3>')
            author_line = format_authors(entry["authors"], lang)
            note = entry.get("author_note", {}).get(lang)
            if note:
                author_line = f"{author_line}, {note}"
            blocks.append(f'<p class="pub-meta">{html.escape(author_line)}.</p>')
            blocks.append(f'<p class="pub-meta">{html.escape(entry["venue"][lang])}</p>')
            for key, label in (("doi", "DOI"), ("arxiv", "arXiv")):
                url = entry.get(key)
                if url:
                    blocks.append(
                        f'<p class="pub-link-line"><strong>{label}:</strong> '
                        f'<a href="{html.escape(url, quote=True)}" rel="noopener noreferrer" target="_blank">{html.escape(url)}</a></p>'
                    )
            if entry.get("repository"):
                label = "Repositório institucional" if lang == "pt" else "Institutional repository"
                url = entry["repository"]
                blocks.append(
                    f'<p class="pub-link-line"><strong>{label}:</strong> '
                    f'<a href="{html.escape(url, quote=True)}" rel="noopener noreferrer" target="_blank">{html.escape(url)}</a></p>'
                )
            if entry.get("isbn"):
                blocks.append(f'<p class="pub-meta"><strong>ISBN:</strong> {html.escape(entry["isbn"])}</p>')
            blocks.append("</div>")
        blocks.append("</div>")
    return "\n".join(blocks)


def render_repositories(lang: str) -> str:
    entries = sorted(read_json(DATA / "repositories.json"), key=lambda item: item["title"].casefold())
    blocks: list[str] = []
    for entry in entries:
        url = entry["url"]
        name = entry["name"]
        title = entry["title"]
        description = entry["description"][lang]
        blocks.extend([
            '<div class="repo-item">',
            f'<h3 class="repo-name-heading"><a aria-label="{html.escape(title)} ({html.escape(name)}) — GitHub" class="repo-name-link" href="{html.escape(url, quote=True)}" rel="noopener noreferrer" target="_blank">{html.escape(title)} <span class="repo-slug">({html.escape(name)})</span></a></h3>',
            f'<p class="repo-path"><a href="{html.escape(url, quote=True)}" rel="noopener noreferrer" target="_blank">github.com/ozsp12/{html.escape(name)}</a></p>',
            f'<p class="repo-desc">{html.escape(description)}</p>',
            "</div>",
        ])
    return "\n".join(blocks)


def render_page(lang: str, key: str) -> str:
    source_path = PAGES / lang / f"{key}.html"
    page_head, main = parse_source(read(source_path), source_path)
    if key == "publications":
        main = replace_tokens(main, {"PUBLICATION_LIST": render_publications(lang)})
    elif key == "repos":
        main = replace_tokens(main, {"REPOSITORY_LIST": render_repositories(lang)})
    extra_styles = '<link href="/css/physlab.css?v=2" rel="stylesheet"/>' if key in {"physlab", "projects"} else ""
    return replace_tokens(
        read(TEMPLATES / "base.html"),
        {
            "LANG": lang,
            "PAGE_HEAD": page_head,
            "EXTRA_STYLES": extra_styles,
            "HEADER": render_header(lang, key),
            "MAIN": main,
            "FOOTER": render_footer(lang),
        },
    )


def render_root() -> str:
    """Render the root URL as the English home while preserving /en/ as a valid URL."""
    root = render_page("en", "home")
    root = root.replace('<html lang="en">', '<html lang="und">', 1)
    root = root.replace("<body>", '<body lang="en">', 1)
    root = root.replace(
        '<link href="https://ozsp12.github.io/en/" rel="canonical"/>',
        '<link href="https://ozsp12.github.io/" rel="canonical"/>',
        1,
    )
    root = root.replace(
        '<meta content="https://ozsp12.github.io/en/" property="og:url"/>',
        '<meta content="https://ozsp12.github.io/" property="og:url"/>',
        1,
    )
    root = root.replace('href="/en/"', 'href="/"')
    return root


def published_path(lang: str, key: str) -> Path:
    return ROOT / lang / PAGE_PATHS[key]


def source_path(lang: str, key: str) -> Path:
    return PAGES / lang / f"{key}.html"


def extract_page_source(html_text: str, published: Path) -> str:
    head_match = re.search(r"<head>(.*?)</head>", html_text, flags=re.DOTALL | re.IGNORECASE)
    main_match = re.search(r"(<main\b.*?</main>)", html_text, flags=re.DOTALL | re.IGNORECASE)
    if not head_match or not main_match:
        raise ValueError(f"{published}: unable to extract head/main")
    head = head_match.group(1)
    for pattern in COMMON_HEAD_PATTERNS:
        head = re.sub(pattern, "", head, flags=re.IGNORECASE)
    head = re.sub(r"\n{3,}", "\n\n", head).strip()
    main = main_match.group(1).strip()
    return f"{SOURCE_HEAD}\n{head}\n\n{SOURCE_MAIN}\n{main}\n"


def bootstrap_sources() -> int:
    created = 0
    for lang in ("pt", "en"):
        for key in PAGE_KEYS:
            target = source_path(lang, key)
            if target.exists():
                continue
            published = published_path(lang, key)
            source = extract_page_source(read(published), published)
            if write_if_changed(target, source):
                created += 1
    print(f"Bootstrap complete: {created} page source file(s) created.")
    return created


def sitemap_entry(location: str, alternates: dict[str, str] | None = None) -> str:
    lines = ["  <url>", f"    <loc>{xml_escape(location)}</loc>"]
    if alternates:
        for lang, href_value in alternates.items():
            lines.append(f'    <xhtml:link rel="alternate" hreflang="{lang}" href="{xml_escape(href_value)}" />')
    lines.append("  </url>")
    return "\n".join(lines)


def render_sitemap() -> str:
    base = "https://ozsp12.github.io"
    entries = [sitemap_entry(f"{base}/", {"pt": f"{base}/pt/", "en": f"{base}/en/", "x-default": f"{base}/"})]
    for key in PAGE_KEYS:
        pt_url = base + href("pt", key)
        en_url = base + href("en", key)
        alternates = {"pt": pt_url, "en": en_url, "x-default": f"{base}/"}
        entries.append(sitemap_entry(pt_url, alternates))
        entries.append(sitemap_entry(en_url, alternates))
    entries.append(sitemap_entry(f"{base}/en/projects/lstm_ftw/", {"en": f"{base}/en/projects/lstm_ftw/", "x-default": f"{base}/"}))
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )


def render_robots() -> str:
    return "User-agent: *\nAllow: /\n\nSitemap: https://ozsp12.github.io/sitemap.xml\n"


def generated_artifacts() -> list[tuple[Path, str]]:
    artifacts: list[tuple[Path, str]] = []
    for lang in ("pt", "en"):
        for key in PAGE_KEYS:
            artifacts.append((published_path(lang, key), render_page(lang, key)))
    artifacts.extend([
        (ERROR_OUTPUT, read(ERROR_SOURCE)),
        (ROOT_OUTPUT, render_root()),
        (SITEMAP_OUTPUT, render_sitemap()),
        (ROBOTS_OUTPUT, render_robots()),
    ])
    return artifacts


def build(check: bool = False) -> int:
    mismatches: list[str] = []
    changed = 0
    for output, generated in generated_artifacts():
        if check:
            if not output.exists() or read(output) != generated:
                mismatches.append(output.relative_to(ROOT).as_posix())
        elif write_if_changed(output, generated):
            changed += 1
    if check:
        if mismatches:
            print("Generated files are out of sync:", file=sys.stderr)
            for path in mismatches:
                print(f"  - {path}", file=sys.stderr)
            print("Run: python scripts/build_site.py", file=sys.stderr)
            return 1
        print("Build consistency check passed: HTML, sitemap, robots.txt, and generated content are in sync.")
        return 0
    print(f"Build complete: {changed} generated file(s) updated.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bootstrap", action="store_true", help="extract initial page sources from current published HTML")
    parser.add_argument("--check", action="store_true", help="fail if generated files differ from deterministic build output")
    args = parser.parse_args()
    if args.bootstrap and args.check:
        parser.error("--bootstrap and --check cannot be combined")
    if args.bootstrap:
        bootstrap_sources()
        return build(check=False)
    return build(check=args.check)


if __name__ == "__main__":
    raise SystemExit(main())
