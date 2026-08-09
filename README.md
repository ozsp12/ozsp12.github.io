# Dr. Osvaldo L. Santos-Pereira — Personal Academic Site

Site estático bilíngue (PT/EN), sem framework, dependências ou etapa de build, publicado diretamente via GitHub Pages.

## Estrutura

```text
ozsp12.github.io/
├── index.html
├── pt/
│   ├── index.html
│   ├── about/index.html
│   ├── teaching/index.html
│   ├── research/index.html
│   ├── publications/index.html
│   ├── repos/index.html
│   ├── contact/index.html
│   └── physlab/index.html
├── en/
│   ├── index.html
│   ├── about/index.html
│   ├── teaching/index.html
│   ├── research/index.html
│   ├── publications/index.html
│   ├── repos/index.html
│   ├── contact/index.html
│   └── physlab/index.html
├── css/
│   ├── styles.css
│   └── physlab.css
├── js/
│   └── navigation.js
├── assets/
│   ├── profile-placeholder.jpg
│   └── physlab-loop-thumbnail-v2.jpg
├── README.md
└── .nojekyll
```

A raiz `index.html` funciona como página neutra de seleção e detecção de idioma. As versões completas do site são publicadas em `/pt/` e `/en/`.

Os mockups de desenvolvimento anteriormente mantidos em `mockups/` foram removidos da branch publicada `main` e preservados na branch `development-assets`, evitando que façam parte desnecessariamente da árvore pública do GitHub Pages.
