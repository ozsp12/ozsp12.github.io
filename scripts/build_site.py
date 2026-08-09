#!/usr/bin/env python3
"""Build the bilingual static site from page sources and shared layout templates.

No third-party dependencies are required. The published HTML remains fully static.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATES = ROOT / "templates"
PAGES = TEMPLATES / "pages"

PAGE_KEYS = ("home", "about", "teaching", "research", "publications", "physlab", "repos", "contact")
PAGE_PATHS = {
    "home": "index.html",
    "about": "about/index.html",
    "teaching": "teaching/index.html",
    "research": "research/index.html",
    "publications": "publications/index.html",
    "physlab": "physlab/index.html",
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
    ("repos", {"pt": "Código", "en": "Code"}),
    ("contact", {"pt": "Contato", "en": "Contact"}),
)

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
    return f"/{lang}/{path[:-10]}"  # strip index.html, retain trailing slash


def nav_links(lang: str, active_key: str) -> str:
    lines = []
    for key, labels in NAVIGATION:
        attrs = ' class="nav-link"'
        if key == active_key:
            attrs = ' aria-current="page" class="nav-link active"'
        lines.append(f'<a{attrs} href="{href(lang, key)}">{labels[lang]}</a>')
    return "\n".join(lines)


def language_switch(lang: str, key: str, desktop: bool) -> str:
    other = "en" if lang == "pt" else "pt"
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
        {
            "FOOTER_LINE": text["footer_line"],
            "FOOTER_TAGLINE": text["footer_tagline"],
        },
    ).rstrip()


def render_page(lang: str, key: str) -> str:
    source_path = PAGES / lang / f"{key}.html"
    page_head, main = parse_source(read(source_path), source_path)
    extra_styles = '<link href="/css/physlab.css?v=2" rel="stylesheet"/>' if key == "physlab" else ""
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


def published_path(lang: str, key: str) -> Path:
    return ROOT / lang / PAGE_PATHS[key]


def source_path(lang: str, key: str) -> Path:
    return PAGES / lang / f"{key}.html"


def extract_page_source(html: str, published: Path) -> str:
    head_match = re.search(r"<head>(.*?)</head>", html, flags=re.DOTALL | re.IGNORECASE)
    main_match = re.search(r"(<main\b.*?</main>)", html, flags=re.DOTALL | re.IGNORECASE)
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


def build(check: bool = False) -> int:
    mismatches: list[str] = []
    changed = 0
    for lang in ("pt", "en"):
        for key in PAGE_KEYS:
            output = published_path(lang, key)
            generated = render_page(lang, key)
            if check:
                if not output.exists() or read(output) != generated:
                    mismatches.append(output.relative_to(ROOT).as_posix())
            elif write_if_changed(output, generated):
                changed += 1

    if check:
        if mismatches:
            print("Generated HTML is out of sync:", file=sys.stderr)
            for path in mismatches:
                print(f"  - {path}", file=sys.stderr)
            print("Run: python scripts/build_site.py", file=sys.stderr)
            return 1
        print("Build consistency check passed: published HTML matches templates and page sources.")
        return 0

    print(f"Build complete: {changed} published HTML file(s) updated.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bootstrap", action="store_true", help="extract initial page sources from current published HTML")
    parser.add_argument("--check", action="store_true", help="fail if published HTML differs from deterministic build output")
    args = parser.parse_args()

    if args.bootstrap and args.check:
        parser.error("--bootstrap and --check cannot be combined")
    if args.bootstrap:
        bootstrap_sources()
        return build(check=False)
    return build(check=args.check)


if __name__ == "__main__":
    raise SystemExit(main())
