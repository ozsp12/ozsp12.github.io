# Dr. Osvaldo L. Santos-Pereira — Personal Academic Site

Site acadêmico bilíngue (PT/EN) publicado via GitHub Pages. O repositório contém o site estático, os templates compartilhados e os scripts usados para gerar e validar as páginas publicadas.

## Estrutura

```text
ozsp12.github.io/
├── index.html
├── 404.html
├── pt/
├── en/
├── templates/
├── scripts/
├── css/
├── js/
├── assets/
└── .github/workflows/validate.yml
```

## Manutenção local

Na raiz do repositório:

```bash
python scripts/build_site.py
python scripts/build_site.py --check
python scripts/validate_site.py
```

O site utiliza GitHub Actions para validar o build e GitHub Pages para publicação.
