# Dr. Osvaldo L. Santos-Pereira — Personal Academic Site

Site estático completo (PT/EN), sem framework e sem build, pronto para GitHub Pages.

# Estrutura

```
osvaldo-personal-site/
├── index.html              redireciona para /pt/ ou /en/ (conforme idioma do navegador)
├── pt/                      versão em português
│   ├── index.html           Landing Page  → /pt/
│   ├── about/index.html     → /pt/about/
│   ├── teaching/index.html  → /pt/teaching/
│   ├── research/index.html  → /pt/research/
│   ├── publications/index.html → /pt/publications/
│   ├── blog/index.html      → /pt/blog/
│   └── contact/index.html   → /pt/contact/
├── en/                      mesma estrutura, em inglês
├── css/styles.css           todo o estilo do site (cores, tipografia, layout responsivo)
├── js/navigation.js         só o menu mobile (abrir/fechar)
├── assets/profile-placeholder.jpg   foto de perfil usada na Landing Page
├── mockups/                 capturas de referência (desktop 1440×900, mobile 390×844)
└── .nojekyll                impede o GitHub Pages de processar o site com Jekyll
```

Cada página é um arquivo HTML puro — sem dependências de build, Node.js ou framework.

# Publicar no GitHub Pages (ozsp12/ozsp12.github.io)

1. Copie todo o conteúdo desta pasta para a raiz do repositório `ozsp12/ozsp12.github.io` (substituindo o que já existir lá).
2. Commit e push na branch usada pelo Pages (normalmente `main`).
3. Em Settings → Pages, confirme fonte = essa branch, pasta raiz (`/`).
4. Acesse `https://ozsp12.github.io/` — o redirecionamento leva a `/pt/` (ou `/en/`, conforme o idioma do navegador).

## Como editar

- **Textos/bios**: cada função `homeBody`, `aboutBody`, `teachingBody` etc. já foi convertida em HTML puro dentro de cada página — edite o texto diretamente no `.html` correspondente (PT e EN são arquivos separados, então edite os dois quando alterar conteúdo).
- **Foto**: troque `assets/profile-placeholder.jpg` por outra imagem com o mesmo nome (ou atualize o `src` em `pt/index.html` e `en/index.html`).
- **Cores/fontes**: tudo centralizado em `css/styles.css`, no bloco `:root` (`--bg`, `--text`, `--accent`, `--serif`, `--sans`). Trocar a cor de destaque ali atualiza links, navegação ativa e a linha vertical da página de contato em todas as páginas.
- **Navegação**: os 7 itens (Landing Page, About, Teaching, Research, Publications, Blog, Contact) e os links acadêmicos (Lattes, ORCID, GitHub etc.) estão repetidos em cada página — para adicionar/remover um item, replique a mudança em todos os arquivos `.html`.

## Decisões de design

- Paleta restrita: fundo marfim muito claro, texto grafite, um único destaque em azul-petróleo.
- Serifada (Source Serif 4) para nome/títulos + sem serifa (Public Sans) para navegação/corpo, com fallback de sistema caso as fontes do Google não carreguem.
- Landing Page minimalista: só cabeçalho, foto, nome, subtítulo, bio, links acadêmicos e rodapé — sem estatísticas, carrosséis ou CTAs comerciais.
- Menu mobile via `js/navigation.js` (poucas linhas, sem dependência).
- Rotas reais `/pt/...` e `/en/...` (arquivos físicos), com `hreflang`, canonical e Open Graph por página, e dados estruturados `Person` (JSON-LD) na Landing Page de cada idioma.
- Conteúdo de Teaching/Research usa descrições reais fornecidas; a listagem do Blog é claramente marcada como `[Placeholder]` — nenhuma informação foi inventada.
- Página de Contato mostra apenas o e-mail institucional (`olsp@if.ufrj.br`) e o endereço institucional — sem telefone, formulário ou segundo e-mail.

## Mockups

`mockups/landing-desktop.png` (1440×900) e `mockups/landing-mobile.png` (390×844) — capturas de referência da Landing Page.
