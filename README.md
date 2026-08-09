# Dr. Osvaldo L. Santos-Pereira — Personal Academic Site

Site acadêmico estático bilíngue (PT/EN), publicado via GitHub Pages. O site final continua composto apenas por HTML, CSS, JavaScript e assets estáticos. A manutenção das páginas PT/EN usa um pequeno gerador em Python, sem framework de frontend, npm ou dependências de terceiros.

## Estrutura

```text
ozsp12.github.io/
├── index.html                       # raiz neutra; não é gerada pelo build PT/EN
├── 404.html                         # fallback publicado; artefato gerado
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
│   ├── base.html                    # estrutura HTML comum PT/EN
│   ├── 404.html                     # fonte neutra da página de erro
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

A raiz `index.html` permanece uma página neutra de seleção/detecção de idioma e não participa da geração das páginas PT/EN. O GitHub Pages publica diretamente a raiz da branch `main`.

## Fontes e artefatos publicados

As fontes editáveis das páginas ficam em `templates/pages/pt/` e `templates/pages/en/`. Cada arquivo contém apenas o `<head>` específico da página e seu `<main>`. Header, navegação desktop/mobile, seletor PT/EN e footer são definidos de forma compartilhada.

Os arquivos em `pt/` e `en/` são os HTMLs finais publicados pelo GitHub Pages. Eles devem ser regenerados após alterações nas fontes ou nos componentes compartilhados; não devem ser tratados como a fonte primária da estrutura comum.

A navegação é definida uma única vez em `scripts/build_site.py`. O gerador determina automaticamente idioma, URLs correspondentes PT/EN, item ativo e `aria-current="page"`. `js/navigation.js` continua responsável somente pela interação do menu mobile.

`templates/404.html` é a fonte da página de erro neutra e bilíngue. O build a publica deterministicamente como `/404.html`. Essa página usa `lang="und"`, `robots=noindex`, não define canonical, não executa JavaScript nem redirecionamento automático e oferece links explícitos para `/pt/` e `/en/`.

## Gerar o site

Na raiz do repositório:

```bash
python scripts/build_site.py
```

O comando é determinístico e atualiza os HTMLs finais em `pt/`, `en/` e `404.html`.

Para apenas verificar se os artefatos publicados estão sincronizados com as fontes:

```bash
python scripts/build_site.py --check
```

## Validação local

Depois do build:

```bash
python scripts/validate_site.py
```

A validação verifica HTML, links internos, arquivos essenciais, simetria PT/EN, canonical, hreflang, navegação, `aria-current`, presença do PhysLab, ausência de geração permanente da navegação em JavaScript e as regras específicas do `404.html`.

Para o 404, o validador verifica também `lang="und"`, links para PT/EN, referência a `/css/styles.css`, ausência de canonical, ausência de scripts/redirecionamentos automáticos e presença de `noindex`.

## CI

`.github/workflows/validate.yml` é executado em `push` e `pull_request` para `main`, com permissão somente de leitura (`contents: read`). O workflow executa:

```bash
python scripts/build_site.py --check
python scripts/build_site.py
python scripts/validate_site.py
```

Assim, uma alteração futura no menu/header/footer pode ser feita em uma única fonte e propagada para todas as páginas com `python scripts/build_site.py`.

## Fluxo recomendado de contribuição

Para mudanças no site:

1. criar uma branch a partir de `main`;
2. editar templates, fontes de página, CSS, JavaScript ou scripts conforme necessário;
3. executar localmente o build e a validação;
4. commitar também os artefatos HTML regenerados;
5. abrir Pull Request para `main`;
6. integrar somente após o check `Validate static site` passar.

Esse fluxo permite que o CI funcione como gate técnico antes da publicação pelo GitHub Pages.

## Governança da branch `main`

No estado inspecionado em 9 de agosto de 2026, a branch `main` **não possui proteção ativa** (`protected: false`), não possui required status checks e o repositório não possui Rulesets. Portanto, o CI existe e executa em Pull Requests, mas ainda não é imposto pelo GitHub como condição obrigatória de merge.

A integração utilizada para manutenção deste repositório consegue consultar esse estado, mas não dispõe de uma operação de escrita para criar ou modificar branch protection/Rulesets. A configuração abaixo precisa ser aplicada manualmente no GitHub para completar o hardening:

1. em **Settings → Rules → Rulesets**, criar um branch ruleset para `main` e deixá-lo ativo;
2. exigir Pull Request antes de alterações chegarem a `main`;
3. exigir o status check do workflow **Validate static site** (job `validate`) antes do merge;
4. habilitar a exigência de branch atualizada antes do merge, quando disponível para o status check;
5. bloquear force pushes;
6. bloquear exclusão da branch `main`;
7. não exigir reviewers adicionais ou CODEOWNERS, salvo decisão posterior do mantenedor;
8. manter bypasses no mínimo necessário.

Depois dessa configuração, um PR cujo job `validate` falhar não deverá poder ser integrado pelo fluxo normal de merge.

O GitHub Pages continua usando a publicação nativa a partir de `main:/`; não há segundo mecanismo de deployment e o workflow de validação não possui permissão de escrita.

Os mockups de desenvolvimento anteriormente mantidos em `mockups/` foram removidos da branch publicada `main` e preservados na branch `development-assets`.
