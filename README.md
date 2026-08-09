# Dr. Osvaldo L. Santos-Pereira — Personal Academic Site

Site acadêmico estático bilíngue (PT/EN), publicado via GitHub Pages. O site final continua composto apenas por HTML, CSS, JavaScript e assets estáticos. A manutenção das páginas PT/EN usa um pequeno gerador em Python, sem framework de frontend, npm ou dependências de terceiros.

## Estrutura

```text
ozsp12.github.io/
├── index.html                       # raiz neutra; não é gerada pelo build PT/EN
├── pt/                              # HTML publicado (artefatos gerados)
│   ├── index.html
│   ├── about/index.html
│   ├── teaching/index.html
│   ├── research/index.html
│   ├── publications/index.html
│   ├── physlab/index.html
│   ├── repos/index.html
│   └── contact/index.html
├── en/                              # HTML publicado (artefatos gerados)
│   ├── index.html
│   ├── about/index.html
│   ├── teaching/index.html
│   ├── research/index.html
│   ├── publications/index.html
│   ├── physlab/index.html
│   ├── repos/index.html
│   └── contact/index.html
├── templates/
│   ├── base.html                    # estrutura HTML comum
│   ├── partials/
│   │   ├── header.html              # header, menus e seletor de idioma
│   │   └── footer.html              # footer compartilhado
│   └── pages/
│       ├── pt/                      # metadados específicos + <main> de cada página PT
│       └── en/                      # metadados específicos + <main> de cada página EN
├── scripts/
│   ├── build_site.py                # gerador estático determinístico
│   └── validate_site.py             # validação estrutural do site final
├── css/
│   ├── styles.css
│   └── physlab.css
├── js/
│   └── navigation.js
├── assets/
│   ├── profile-placeholder.jpg
│   └── physlab-loop-thumbnail-v2.jpg
├── .github/workflows/validate.yml
├── README.md
└── .nojekyll
```

A raiz `index.html` permanece uma página neutra de seleção/detecção de idioma e não participa da geração das páginas PT/EN.

## Fontes e artefatos publicados

As fontes editáveis das páginas ficam em `templates/pages/pt/` e `templates/pages/en/`. Cada arquivo contém apenas o `<head>` específico da página e seu `<main>`. Header, navegação desktop/mobile, seletor PT/EN e footer são definidos de forma compartilhada.

Os arquivos em `pt/` e `en/` são os HTMLs finais publicados pelo GitHub Pages. Eles devem ser regenerados após alterações nas fontes ou nos componentes compartilhados; não devem ser tratados como a fonte primária da estrutura comum.

A navegação é definida uma única vez em `scripts/build_site.py`. O gerador determina automaticamente idioma, URLs correspondentes PT/EN, item ativo e `aria-current="page"`. `js/navigation.js` continua responsável somente pela interação do menu mobile.

## Gerar o site

Na raiz do repositório:

```bash
python scripts/build_site.py
```

O comando é determinístico e atualiza os HTMLs finais em `pt/` e `en/`.

Para apenas verificar se os artefatos publicados estão sincronizados com as fontes:

```bash
python scripts/build_site.py --check
```

## Validação local

Depois do build:

```bash
python scripts/validate_site.py
```

A validação verifica HTML, links internos, arquivos essenciais, simetria PT/EN, canonical, hreflang, navegação, `aria-current`, presença do PhysLab e a ausência de geração permanente da navegação em JavaScript.

## CI

`.github/workflows/validate.yml` é executado em `push` e `pull_request` para `main`. O workflow:

1. verifica se os HTMLs publicados correspondem ao build determinístico;
2. executa novamente o gerador;
3. valida a estrutura estática final.

Assim, uma alteração futura no menu/header/footer pode ser feita em uma única fonte e propagada para todas as páginas com `python scripts/build_site.py`.

Os mockups de desenvolvimento anteriormente mantidos em `mockups/` foram removidos da branch publicada `main` e preservados na branch `development-assets`.
