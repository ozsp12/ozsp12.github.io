---
title: "Geodésicas radiais em um espaço-tempo esfericamente simétrico"
date: 2026-09-24
author: "Osvaldo L. Santos-Pereira"
categories: [Física, Relatividade Geral, Notas]
lang: pt
---

Este é um post de demonstração para testar uma área de blog científico no site. A proposta é usar Markdown como formato de autoria e renderizar equações LaTeX no navegador com MathJax.

![Representação de espaço-tempo curvo](/assets/cinematic/general_relativity.png)

Considere a métrica estática e esfericamente simétrica

$$
ds^2=-A(r)\,dt^2+B(r)\,dr^2+r^2d\Omega^2,
$$

onde

$$
d\Omega^2=d\theta^2+\sin^2\theta\,d\phi^2.
$$

Para movimento radial, temos $d\theta=d\phi=0$, e podemos escolher o Lagrangiano geodésico

$$
\mathcal{L}=\frac12\left[-A(r)\dot t^2+B(r)\dot r^2\right].
$$

Como $t$ é uma coordenada cíclica,

$$
p_t=\frac{\partial\mathcal{L}}{\partial\dot t}=-A(r)\dot t=-E,
$$

logo

$$
\dot t=\frac{E}{A(r)}.
$$

Para uma partícula massiva parametrizada pelo tempo próprio, a normalização da quadrivelocidade fornece

$$
-1=-A(r)\dot t^2+B(r)\dot r^2,
$$

e portanto

$$
B(r)\dot r^2=\frac{E^2}{A(r)}-1.
$$

Esta forma já evidencia como a simetria temporal reduz a dinâmica radial a uma equação de primeira ordem.

![Ilustração de um objeto gravitacional compacto](/assets/cinematic/black_hole.png)

O objetivo deste post não é desenvolver toda a teoria das geodésicas, mas verificar o fluxo editorial: Markdown no repositório, imagens versionadas junto ao site e matemática escrita diretamente em sintaxe LaTeX.
