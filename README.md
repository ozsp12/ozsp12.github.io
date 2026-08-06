# Dr. Osvaldo L. Santos-Pereira — Personal Website

Static, bilingual, multipage website prepared for `ozsp12/ozsp12.github.io`.

# What is included

- Real static routes in Portuguese and English
- No React, Babel, Node.js, build process, or server dependency
- Responsive navigation and accessible focus states
- Page-specific SEO metadata, canonical URLs, and `hreflang`
- Publications organized by year with clickable DOI and arXiv links
- Institutional contact page
- Compatibility redirects for `/research/`, `/notes/`, and `/repos/`
- `404.html`, `robots.txt`, `sitemap.xml`, and `.nojekyll`

# Deployment

The ZIP is structured with `index.html` at its root. To replace the current site cleanly:

```bash
git clone https://github.com/ozsp12/ozsp12.github.io.git
cd ozsp12.github.io

git branch backup-before-redesign
git push origin backup-before-redesign

# Remove the previous working-tree files, preserving .git
git rm -r --ignore-unmatch .

# Extract the contents of ozsp12-github-pages-final.zip into this directory
git add .
git commit -m "Rebuild personal website as a bilingual static site"
git push origin main
```

GitHub Pages should publish from the `main` branch and repository root.

## Local preview

```bash
python -m http.server 8000
```

Open `http://localhost:8000/`.

## Notes

- The public root `/` is the Portuguese homepage.
- The English homepage is `/en/`.
- `/pt/` redirects to `/`.
- Publication records reproduce the supplied standalone content and were not independently re-verified during this build.
