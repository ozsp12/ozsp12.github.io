#!/usr/bin/env python3
"""Dependency-free structural validation for the static GitHub Pages site."""

from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]

ESSENTIAL_FILES = [
    "index.html",
    "404.html",
    "pt/index.html",
    "en/index.html",
    "pt/about/index.html",
    "en/about/index.html",
    "pt/teaching/index.html",
    "en/teaching/index.html",
    "pt/research/index.html",
    "en/research/index.html",
    "pt/publications/index.html",
    "en/publications/index.html",
    "pt/physlab/index.html",
    "en/physlab/index.html",
    "pt/repos/index.html",
    "en/repos/index.html",
    "pt/contact/index.html",
    "en/contact/index.html",
    "en/lstm_ftw/index.html",
    "en/lstm_ftw/dashboard-data.json",
    "css/styles.css",
    "css/physlab.css",
    "css/lstm-dashboard.css",
    "js/navigation.js",
    "js/lstm-dashboard.js",
]

STANDALONE_EN_PAGES = {"lstm_ftw/index.html"}

VOID_ELEMENTS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
}

EXPECTED_PAGE_PATHS = {
    "": "/",
    "about": "/about/",
    "teaching": "/teaching/",
    "research": "/research/",
    "publications": "/publications/",
    "physlab": "/physlab/",
    "repos": "/repos/",
    "contact": "/contact/",
}


class SiteHTMLParser(HTMLParser):
    def __init__(self, source: Path) -> None:
        super().__init__(convert_charrefs=True)
        self.source = source
        self.errors: list[str] = []
        self.stack: list[str] = []
        self.tags: set[str] = set()
        self.ids: set[str] = set()
        self.references: list[tuple[str, str, str]] = []
        self.anchors: list[dict[str, str]] = []
        self.canonical: list[str] = []
        self.alternates: dict[str, str] = {}
        self.html_lang: str | None = None
        self.title_depth = 0
        self.title_text: list[str] = []

    @staticmethod
    def attrs_dict(attrs: list[tuple[str, str | None]]) -> dict[str, str]:
        return {key: value or "" for key, value in attrs}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_map = self.attrs_dict(attrs)
        self.tags.add(tag)

        if tag == "html":
            self.html_lang = attrs_map.get("lang")

        element_id = attrs_map.get("id")
        if element_id:
            if element_id in self.ids:
                self.errors.append(f"duplicate id #{element_id}")
            self.ids.add(element_id)

        if tag == "a":
            self.anchors.append(attrs_map)
            href = attrs_map.get("href")
            if href:
                self.references.append((tag, "href", href))
        elif tag == "link":
            href = attrs_map.get("href")
            if href:
                self.references.append((tag, "href", href))
            rel = {item.lower() for item in attrs_map.get("rel", "").split()}
            if "canonical" in rel and href:
                self.canonical.append(href)
            if "alternate" in rel and href and attrs_map.get("hreflang"):
                self.alternates[attrs_map["hreflang"]] = href
        elif tag in {"script", "img"}:
            src = attrs_map.get("src")
            if src:
                self.references.append((tag, "src", src))

        if tag == "title":
            self.title_depth += 1

        if tag not in VOID_ELEMENTS:
            self.stack.append(tag)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag not in VOID_ELEMENTS and self.stack and self.stack[-1] == tag:
            self.stack.pop()

    def handle_endtag(self, tag: str) -> None:
        if tag == "title" and self.title_depth:
            self.title_depth -= 1

        if tag in VOID_ELEMENTS:
            return
        if not self.stack:
            self.errors.append(f"unexpected closing </{tag}>")
            return
        if self.stack[-1] == tag:
            self.stack.pop()
            return

        if tag in self.stack:
            expected = self.stack[-1]
            self.errors.append(f"misnested </{tag}>; expected </{expected}>")
            while self.stack and self.stack[-1] != tag:
                self.stack.pop()
            if self.stack:
                self.stack.pop()
        else:
            self.errors.append(f"closing </{tag}> without matching start tag")

    def handle_data(self, data: str) -> None:
        if self.title_depth:
            self.title_text.append(data)

    def finish(self) -> None:
        if self.stack:
            self.errors.append("unclosed tags: " + ", ".join(self.stack))


class Validation:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.parsers: dict[Path, SiteHTMLParser] = {}

    def fail(self, message: str) -> None:
        self.errors.append(message)

    def check_essential_files(self) -> None:
        for relative in ESSENTIAL_FILES:
            if not (ROOT / relative).is_file():
                self.fail(f"missing essential file: {relative}")

    def parse_html(self) -> None:
        html_files = sorted(
            {ROOT / "index.html", ROOT / "404.html"}
            | set((ROOT / "pt").rglob("*.html"))
            | set((ROOT / "en").rglob("*.html"))
        )
        for path in html_files:
            relative = path.relative_to(ROOT)
            text = path.read_text(encoding="utf-8")
            if not re.match(r"\s*<!DOCTYPE\s+html\s*>", text, flags=re.IGNORECASE):
                self.fail(f"{relative}: missing <!DOCTYPE html>")

            parser = SiteHTMLParser(path)
            try:
                parser.feed(text)
                parser.close()
            except Exception as exc:
                self.fail(f"{relative}: parser error: {exc}")
                continue
            parser.finish()
            self.parsers[path] = parser

            for error in parser.errors:
                self.fail(f"{relative}: {error}")
            for required_tag in ("html", "head", "title", "body"):
                if required_tag not in parser.tags:
                    self.fail(f"{relative}: missing <{required_tag}>")
            if not "".join(parser.title_text).strip():
                self.fail(f"{relative}: empty <title>")

    def check_languages_and_seo(self) -> None:
        for path, parser in self.parsers.items():
            relative = path.relative_to(ROOT)
            rel_posix = relative.as_posix()

            if rel_posix == "404.html":
                if parser.html_lang != "und":
                    self.fail("404.html: neutral error page must use lang=\"und\"")
                if parser.canonical:
                    self.fail(f"404.html: must not define canonical; found {parser.canonical!r}")
                continue

            if rel_posix == "index.html":
                if parser.html_lang != "und":
                    self.fail("index.html: root page must use lang=\"und\"")
                expected_canonical = "https://ozsp12.github.io/"
                expected_alternates = {
                    "pt": "https://ozsp12.github.io/pt/",
                    "en": "https://ozsp12.github.io/en/",
                    "x-default": "https://ozsp12.github.io/",
                }
            elif rel_posix.startswith("pt/"):
                if not (parser.html_lang or "").lower().startswith("pt"):
                    self.fail(f"{relative}: Portuguese page must declare lang=pt")
                suffix = self.page_suffix(relative, "pt")
                expected_canonical = f"https://ozsp12.github.io/pt{suffix}"
                expected_alternates = {
                    "pt": f"https://ozsp12.github.io/pt{suffix}",
                    "en": f"https://ozsp12.github.io/en{suffix}",
                    "x-default": "https://ozsp12.github.io/",
                }
            elif rel_posix.startswith("en/"):
                if not (parser.html_lang or "").lower().startswith("en"):
                    self.fail(f"{relative}: English page must declare lang=en")
                suffix = self.page_suffix(relative, "en")
                expected_canonical = f"https://ozsp12.github.io/en{suffix}"
                standalone = relative.relative_to("en").as_posix() in STANDALONE_EN_PAGES
                if standalone:
                    expected_alternates = {
                        "en": f"https://ozsp12.github.io/en{suffix}",
                        "x-default": "https://ozsp12.github.io/",
                    }
                else:
                    expected_alternates = {
                        "pt": f"https://ozsp12.github.io/pt{suffix}",
                        "en": f"https://ozsp12.github.io/en{suffix}",
                        "x-default": "https://ozsp12.github.io/",
                    }
            else:
                continue

            if parser.canonical != [expected_canonical]:
                self.fail(
                    f"{relative}: canonical must be exactly {expected_canonical!r}; "
                    f"found {parser.canonical!r}"
                )
            for language, expected in expected_alternates.items():
                if parser.alternates.get(language) != expected:
                    self.fail(
                        f"{relative}: hreflang={language!r} must point to {expected!r}; "
                        f"found {parser.alternates.get(language)!r}"
                    )

    @staticmethod
    def page_suffix(relative: Path, language: str) -> str:
        parts = relative.parts
        inner = parts[1:-1]
        if not inner:
            return "/"
        return "/" + "/".join(inner) + "/"

    def check_bilingual_symmetry(self) -> None:
        pt_pages = {
            path.relative_to(ROOT / "pt").as_posix()
            for path in (ROOT / "pt").rglob("index.html")
        }
        en_pages = {
            path.relative_to(ROOT / "en").as_posix()
            for path in (ROOT / "en").rglob("index.html")
        }
        en_pages -= STANDALONE_EN_PAGES
        if pt_pages != en_pages:
            missing_en = sorted(pt_pages - en_pages)
            missing_pt = sorted(en_pages - pt_pages)
            if missing_en:
                self.fail("missing EN counterparts: " + ", ".join(missing_en))
            if missing_pt:
                self.fail("missing PT counterparts: " + ", ".join(missing_pt))

    def check_navigation(self) -> None:
        for path, parser in self.parsers.items():
            relative = path.relative_to(ROOT)
            rel_posix = relative.as_posix()
            if not (rel_posix.startswith("pt/") or rel_posix.startswith("en/")):
                continue

            language = "pt" if rel_posix.startswith("pt/") else "en"
            physlab_href = f"/{language}/physlab/"
            nav_links = [
                a for a in parser.anchors
                if "nav-link" in a.get("class", "").split()
            ]
            physlab_links = [a for a in nav_links if a.get("href") == physlab_href]
            if len(physlab_links) != 2:
                self.fail(
                    f"{relative}: expected PhysLab in desktop and mobile navigation "
                    f"(2 links), found {len(physlab_links)}"
                )
                continue

            is_physlab = "/physlab/" in f"/{rel_posix}"
            for link in physlab_links:
                classes = link.get("class", "").split()
                current = link.get("aria-current") == "page"
                if is_physlab and ("active" not in classes or not current):
                    self.fail(f"{relative}: PhysLab link must be active/current on PhysLab page")
                if not is_physlab and ("active" in classes or current):
                    self.fail(f"{relative}: PhysLab link must not be active/current off PhysLab page")

            if rel_posix == "en/lstm_ftw/index.html":
                expected_current = "/en/repos/"
            else:
                expected_current = self.expected_nav_href(relative, language)
            current_nav_links = [
                a for a in nav_links if a.get("aria-current") == "page"
            ]
            if len(current_nav_links) != 2:
                self.fail(
                    f"{relative}: expected exactly 2 current nav links "
                    f"(desktop/mobile), found {len(current_nav_links)}"
                )
            elif any(a.get("href") != expected_current for a in current_nav_links):
                self.fail(
                    f"{relative}: current nav link must point to {expected_current}"
                )

    @staticmethod
    def expected_nav_href(relative: Path, language: str) -> str:
        inner = relative.parts[1:-1]
        suffix = "" if not inner else "/".join(inner) + "/"
        return f"/{language}/{suffix}"

    def check_404(self) -> None:
        path = ROOT / "404.html"
        parser = self.parsers.get(path)
        if parser is None:
            return

        hrefs = {anchor.get("href") for anchor in parser.anchors}
        for required in ("/pt/", "/en/"):
            if required not in hrefs:
                self.fail(f"404.html: missing fallback link to {required}")

        css_refs = {
            raw_ref for tag, attr, raw_ref in parser.references
            if tag == "link" and attr == "href"
        }
        if "/css/styles.css" not in css_refs:
            self.fail("404.html: must reference /css/styles.css")

        if "script" in parser.tags:
            self.fail("404.html: must not depend on JavaScript")

        text = path.read_text(encoding="utf-8")
        if re.search(r'<meta[^>]+http-equiv=["\']?refresh', text, flags=re.IGNORECASE):
            self.fail("404.html: automatic redirect via meta refresh is forbidden")
        if re.search(r'window\.location|location\.replace|location\.href', text, flags=re.IGNORECASE):
            self.fail("404.html: automatic JavaScript redirect is forbidden")
        if not re.search(r'<meta[^>]+content=["\'][^"\']*noindex[^"\']*["\'][^>]+name=["\']robots["\']|<meta[^>]+name=["\']robots["\'][^>]+content=["\'][^"\']*noindex', text, flags=re.IGNORECASE):
            self.fail("404.html: robots meta must include noindex")

    def check_internal_references(self) -> None:
        for source, parser in self.parsers.items():
            for tag, attr, raw_ref in parser.references:
                self.check_reference(source, tag, attr, raw_ref)

    def check_reference(self, source: Path, tag: str, attr: str, raw_ref: str) -> None:
        ref = raw_ref.strip()
        if not ref or ref.startswith(("mailto:", "tel:", "javascript:", "data:")):
            return

        parsed = urlsplit(ref)
        if parsed.scheme or parsed.netloc:
            return

        clean_path = unquote(parsed.path)
        if not clean_path:
            target = source
        elif clean_path.startswith("/"):
            target = ROOT / clean_path.lstrip("/")
        else:
            target = source.parent / clean_path

        if clean_path.endswith("/") or target.is_dir():
            target = target / "index.html"

        try:
            target = target.resolve()
            target.relative_to(ROOT.resolve())
        except ValueError:
            self.fail(f"{source.relative_to(ROOT)}: reference escapes repository: {raw_ref}")
            return

        if not target.exists():
            self.fail(
                f"{source.relative_to(ROOT)}: broken internal {tag} {attr}={raw_ref!r} "
                f"-> {target.relative_to(ROOT)}"
            )
            return

        if parsed.fragment and target.suffix.lower() == ".html":
            target_parser = self.parsers.get(target)
            if target_parser is None:
                text = target.read_text(encoding="utf-8")
                target_parser = SiteHTMLParser(target)
                target_parser.feed(text)
                target_parser.close()
                target_parser.finish()
            if parsed.fragment not in target_parser.ids:
                self.fail(
                    f"{source.relative_to(ROOT)}: missing anchor #{parsed.fragment} "
                    f"in {target.relative_to(ROOT)}"
                )

    def check_css_and_javascript_guards(self) -> None:
        for css_path in (ROOT / "css/styles.css", ROOT / "css/lstm-dashboard.css"):
            if not css_path.is_file():
                continue
            css = css_path.read_text(encoding="utf-8")
            stripped = re.sub(r"/\*.*?\*/", "", css, flags=re.DOTALL)
            if stripped.count("{") != stripped.count("}"):
                self.fail(f"{css_path.relative_to(ROOT)}: unbalanced braces")

        js_path = ROOT / "js/navigation.js"
        if js_path.is_file():
            js = js_path.read_text(encoding="utf-8")
            forbidden = ["physLabHref", "addPhysLabLink", "document.createElement("]
            for token in forbidden:
                if token in js:
                    self.fail(
                        f"js/navigation.js: permanent navigation generation returned ({token})"
                    )

    def check_lstm_dashboard_data(self) -> None:
        path = ROOT / "en/lstm_ftw/dashboard-data.json"
        if not path.is_file():
            return
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            self.fail(f"en/lstm_ftw/dashboard-data.json: invalid JSON: {exc}")
            return

        reviews = data.get("reviews")
        kpis = data.get("kpis", {})
        if not isinstance(reviews, list) or not reviews:
            self.fail("en/lstm_ftw/dashboard-data.json: reviews must be a non-empty list")
            return
        ids = [review.get("id") for review in reviews]
        if len(ids) != len(set(ids)):
            self.fail("en/lstm_ftw/dashboard-data.json: review IDs must be unique")
        if kpis.get("test_reviews") != len(reviews):
            self.fail("en/lstm_ftw/dashboard-data.json: KPI review count does not match rows")
        required = {
            "id", "text", "expected_sentiment", "predicted_sentiment",
            "expected_topic", "predicted_topic", "sentiment_confidence",
            "topic_confidence", "both_correct",
        }
        for index, review in enumerate(reviews):
            missing = required - set(review)
            if missing:
                self.fail(
                    "en/lstm_ftw/dashboard-data.json: "
                    f"review {index} missing fields: {', '.join(sorted(missing))}"
                )
                break

        joint_correct = sum(bool(review.get("both_correct")) for review in reviews)
        if kpis.get("joint_correct") != joint_correct:
            self.fail("en/lstm_ftw/dashboard-data.json: joint-correct KPI does not match rows")

    def run(self) -> int:
        self.check_essential_files()
        self.parse_html()
        self.check_languages_and_seo()
        self.check_bilingual_symmetry()
        self.check_navigation()
        self.check_404()
        self.check_internal_references()
        self.check_css_and_javascript_guards()
        self.check_lstm_dashboard_data()

        if self.errors:
            print(f"Validation failed with {len(self.errors)} error(s):", file=sys.stderr)
            for error in self.errors:
                print(f"  - {error}", file=sys.stderr)
            return 1

        print(
            f"Validation passed: {len(self.parsers)} HTML files checked; "
            "essential files, internal links, bilingual structure, navigation, 404, CSS, and JS guards are valid."
        )
        return 0


if __name__ == "__main__":
    raise SystemExit(Validation().run())
