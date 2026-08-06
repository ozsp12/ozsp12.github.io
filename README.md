# Dr. Osvaldo L. Santos-Pereira — Personal Website

Static GitHub Pages implementation reconstructed from the approved standalone design.

## Deployment

1. Back up the current repository or create a separate branch.
2. Copy all files and directories from this project to the root of `ozsp12/ozsp12.github.io`.
3. Commit and push to the `main` branch.
4. In **Settings → Pages**, confirm that GitHub Pages publishes from the `main` branch and the repository root.

No build command, package manager, framework, or server-side component is required.

## Local preview

Run from the project root:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/`.

## Structure

```text
.
├── index.html
├── 404.html
├── .nojekyll
├── robots.txt
├── sitemap.xml
└── assets
    ├── css/styles.css
    ├── images/profile.jpg
    └── js
        ├── data.js
        └── app.js
```

## Notes

- Portuguese is the default language, matching the standalone configuration.
- The interface preserves the standalone navigation, typography, colors, spacing, content, responsive breakpoint, language selector, and contact block.
- Page and language state are represented through query parameters so individual views can be linked directly.
