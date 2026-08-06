# Dr. Osvaldo L. Santos-Pereira — Personal Academic Site

Site estático bilíngue (PT/EN), sem framework e sem etapa de build, pronto para GitHub Pages.

## Estrutura

```text
osvaldo-personal-site-v03/
├── index.html
├── pt/
│   ├── index.html
│   ├── about/index.html
│   ├── teaching/index.html
│   ├── research/index.html
│   ├── publications/index.html
│   ├── repos/index.html
│   └── contact/index.html
├── en/                      mesma estrutura, em inglês
├── css/styles.css
├── js/navigation.js
├── assets/profile-placeholder.jpg
├── mockups/
└── .nojekyll
```

## Alterações da versão 03

- “Landing Page” foi substituído por “Home”.
- A seção Blog e suas páginas de demonstração foram removidas.
- A seção Repos foi adicionada em português e inglês, com nomes legíveis, slugs e URLs clicáveis.
- Publications passou a exibir DOI, arXiv, ISBN e repositórios institucionais como campos estruturados e clicáveis.
- Entradas bibliográficas receberam separadores visuais internos.
- Os textos da Home e da página About foram ajustados para alinhamento justificado; parágrafos subsequentes em About usam recuo de primeira linha.
- “Matemática / Mathematics” foi incluído no rodapé.

## Publicação no GitHub Pages

Copie todo o conteúdo desta pasta para a raiz do repositório `ozsp12/ozsp12.github.io`, faça commit e push na branch configurada no GitHub Pages. O arquivo `.nojekyll` deve permanecer na raiz.

## Edição

Os textos estão diretamente nos arquivos HTML. O estilo global está em `css/styles.css`; o menu mobile está em `js/navigation.js`; a imagem de perfil está em `assets/profile-placeholder.jpg`.

## Revisão de layout

- O wordmark passou a exibir “Dr. Osvaldo L. Santos-Pereira”.
- A Home usa a mesma grade do cabeçalho: o texto começa no mesmo eixo do item Home e a fotografia fica alinhada ao topo do nome.
- Os blocos introdutório e profissional de About foram consolidados em parágrafos únicos.
- As linhas institucionais principais de Contact permanecem em uma única linha; em telas estreitas, o bloco pode ser rolado horizontalmente.
- Repos foi convertido em uma lista única, ordenada alfabeticamente.
