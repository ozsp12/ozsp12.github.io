---
title: "Radial geodesics in a spherically symmetric spacetime"
date: 2026-09-24
author: "Osvaldo L. Santos-Pereira"
categories: [Physics, General Relativity, Notes]
lang: en
---

This is a demonstration post for testing a scientific blog area on the site. The proposed workflow uses Markdown as the authoring format and renders LaTeX equations in the browser with MathJax.

![Representation of curved spacetime](/assets/cinematic/general_relativity.png)

Consider the static and spherically symmetric metric

$$
ds^2=-A(r)\,dt^2+B(r)\,dr^2+r^2d\Omega^2,
$$

where

$$
d\Omega^2=d\theta^2+\sin^2\theta\,d\phi^2.
$$

For radial motion, $d\theta=d\phi=0$, and we may choose the geodesic Lagrangian

$$
\mathcal{L}=\frac12\left[-A(r)\dot t^2+B(r)\dot r^2\right].
$$

Since $t$ is a cyclic coordinate,

$$
p_t=\frac{\partial\mathcal{L}}{\partial\dot t}=-A(r)\dot t=-E,
$$

so that

$$
\dot t=\frac{E}{A(r)}.
$$

For a massive particle parametrized by proper time, normalization of the four-velocity gives

$$
-1=-A(r)\dot t^2+B(r)\dot r^2,
$$

and therefore

$$
B(r)\dot r^2=\frac{E^2}{A(r)}-1.
$$

This form already shows how time-translation symmetry reduces the radial dynamics to a first-order equation.

![Illustration of a compact gravitational object](/assets/cinematic/black_hole.png)

The purpose of this post is not to develop the full theory of geodesics, but to verify the editorial workflow: Markdown stored in the repository, images versioned with the site, and mathematics written directly in LaTeX syntax.
