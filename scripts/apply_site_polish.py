#!/usr/bin/env python3
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, text):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"missing replacement target: {label}")
    return text.replace(old, new, 1)


research_en = r'''<!-- PAGE_HEAD -->
<title>Research — Physics, Gravitation, Cosmology &amp; AI | Dr. Osvaldo L. Santos-Pereira</title>
<meta content="Research areas of Dr. Osvaldo L. Santos-Pereira in general relativity, warp drives, gravitation, cosmology, computational physics, quantum computing, AI, and mathematics." name="description"/>
<link href="https://ozsp12.github.io/en/research/" rel="canonical"/>
<meta content="website" property="og:type"/>
<meta content="Research — Physics, Gravitation, Cosmology &amp; AI | Dr. Osvaldo L. Santos-Pereira" property="og:title"/>
<meta content="Research areas of Dr. Osvaldo L. Santos-Pereira in general relativity, warp drives, gravitation, cosmology, computational physics, quantum computing, AI, and mathematics." property="og:description"/>
<meta content="https://ozsp12.github.io/en/research/" property="og:url"/>
<meta content="Dr. Osvaldo L. Santos-Pereira" property="og:site_name"/>
<meta content="en_US" property="og:locale"/>
<meta content="pt_BR" property="og:locale:alternate"/>
<meta content="https://ozsp12.github.io/assets/research-gravitation.jpg" property="og:image"/>
<meta content="Abstract illustration of gravitation and curved spacetime" property="og:image:alt"/>
<meta content="summary_large_image" name="twitter:card"/>
<meta content="Research — Physics, Gravitation, Cosmology &amp; AI | Dr. Osvaldo L. Santos-Pereira" name="twitter:title"/>
<meta content="Research areas of Dr. Osvaldo L. Santos-Pereira in general relativity, warp drives, gravitation, cosmology, computational physics, quantum computing, AI, and mathematics." name="twitter:description"/>
<meta content="https://ozsp12.github.io/assets/research-gravitation.jpg" name="twitter:image"/>
<meta content="Abstract illustration of gravitation and curved spacetime" name="twitter:image:alt"/>
<link href="https://ozsp12.github.io/pt/research/" hreflang="pt" rel="alternate"/>
<link href="https://ozsp12.github.io/en/research/" hreflang="en" rel="alternate"/>
<link href="https://ozsp12.github.io/" hreflang="x-default" rel="alternate"/>

<!-- MAIN -->
<main id="main-content">
<div class="container"><section class="page-section research-page-section">
<div class="research-intro">
<h1 class="page-title">Research</h1>
<p class="lead">My research spans theoretical and computational physics, pure and applied mathematics, artificial intelligence, data science, quantum computing, and complex systems. I am particularly interested in problems that combine mathematical modelling, physical theory, computational methods, and data-driven approaches.</p>
</div>

<section class="research-rail" aria-labelledby="research-gravitation-title">
<h2 class="research-rail-title" id="research-gravitation-title">Gravitation &amp; Fundamental Physics</h2>
<div class="research-lane">
<article class="research-card"><div class="research-card-media"><img alt="Curved spacetime around a compact gravitational object" loading="lazy" src="/assets/research-gravitation.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Warp-Drive Spacetimes</h3><p>Research on superluminal spacetime geometries, including the Alcubierre metric, exact solutions of Einstein’s field equations, matter sources, energy conditions, causal structure, fluid descriptions, and the mathematical and physical viability of warp-drive models within general relativity.</p></div></article>
<article class="research-card"><div class="research-card-media media-position-center"><img alt="Geometric representation of gravitation and spacetime" loading="lazy" src="/assets/research-gravitation.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>General Relativity and Classical and Quantum Gravity</h3><p>Research on Einstein’s field equations, exact spacetime solutions, differential geometry, gravitational dynamics, black holes, wormholes, energy-momentum tensors, and matter and fields in curved spacetime. My interests also include semiclassical gravity, quantum fields in curved spacetime, and theoretical approaches to the quantum description of gravitational systems.</p></div></article>
<article class="research-card"><div class="research-card-media media-position-right"><img alt="Cosmological geometry and gravitational field lines" loading="lazy" src="/assets/research-gravitation.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Cosmology</h3><p>Research on the theoretical and observational aspects of relativistic cosmology. This includes testing standard and non-standard cosmological models through astronomical observations, refining classical cosmological tests by fully accounting for null-geodesic effects, and comparing alternative cosmologies with the predictions of standard Friedmannian cosmology. I am also interested in modelling the large-scale distribution of galaxies as a fractal structure.</p></div></article>
<article class="research-card"><div class="research-card-media media-position-left"><img alt="Abstract fundamental-physics diagram" loading="lazy" src="/assets/research-gravitation.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Quantum Computing</h3><p>Research on quantum information, quantum algorithms, quantum simulation, quantum machine learning, and computational applications of quantum systems. My interests include the use of quantum methods in physics, artificial intelligence, optimization, complex systems, and scientific modelling.</p></div></article>
</div></section>

<section class="research-rail" aria-labelledby="research-complex-title">
<h2 class="research-rail-title" id="research-complex-title">Complex Systems &amp; Econophysics</h2>
<div class="research-lane">
<article class="research-card"><div class="research-card-media"><img alt="Network and economic-data illustration" loading="lazy" src="/assets/research-complex-systems.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Econophysics and Complex Systems</h3><p>Research on complexity and nonlinear dynamics in economic and social systems, particularly the distributions of personal income, city population size, and sectoral industrial revenue. My work includes applications of the Gompertz–Pareto distribution, as well as the study of economic inequality, economic bubbles, business cycles, interacting-agent systems, and financial-market dynamics.</p></div></article>
<article class="research-card"><div class="research-card-media media-position-right"><img alt="Complex network with computational and statistical structures" loading="lazy" src="/assets/research-complex-systems.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Computational Physics</h3><p>Development of numerical models, scientific simulations, symbolic and numerical methods, and computational experiments for problems in physics. My interests include numerical modelling, physics-informed neural networks, spin-glass models, numerical relativity, dynamical systems, scientific machine learning, and applications of neural networks and machine-learning methods to the analysis of physical data.</p></div></article>
</div></section>

<section class="research-rail" aria-labelledby="research-ai-title">
<h2 class="research-rail-title" id="research-ai-title">Artificial Intelligence &amp; Data Science</h2>
<div class="research-lane">
<article class="research-card"><div class="research-card-media"><img alt="Abstract neural network and computational graph" loading="lazy" src="/assets/research-ai-data.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Artificial Intelligence, Machine Learning, and Neural Networks</h3><p>Research and development in artificial intelligence, machine learning, deep learning, neural networks, transformers, natural language processing, computer vision, large language models, Bayesian networks, recommendation systems, clustering, classification, regression, time series, anomaly detection, and generative models. My work focuses on the design, evaluation, and application of intelligent systems to scientific, industrial, educational, healthcare, and business problems.</p></div></article>
<article class="research-card"><div class="research-card-media media-position-right"><img alt="Data-science network and analytical structures" loading="lazy" src="/assets/research-ai-data.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Data Science and Advanced Analytics</h3><p>Research and applied work in statistical modelling, predictive analytics, data mining, experimentation, forecasting, optimization, business intelligence, data visualization, and decision support. My interests include integrating data engineering, machine learning, statistics, and analytical methods to extract insights, develop predictive systems, and support strategic decisions in scientific, industrial, and business environments.</p></div></article>
</div></section>

<section class="research-rail" aria-labelledby="research-mathematics-title">
<h2 class="research-rail-title" id="research-mathematics-title">Mathematics</h2>
<div class="research-lane">
<article class="research-card"><div class="research-card-media"><img alt="Abstract mathematical surface and geometric constructions" loading="lazy" src="/assets/research-mathematics.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Pure Mathematics</h3><p>Research interests in analytic number theory, algebra, mathematical analysis, non-Euclidean geometry, differential geometry, and topology. I am particularly interested in the relationship between spacetime diffeomorphisms, geometric invariance, coordinate transformations, and the physical equivalence of mathematical descriptions in gravitation.</p></div></article>
<article class="research-card"><div class="research-card-media media-position-right"><img alt="Applied mathematical diagrams, curves and geometry" loading="lazy" src="/assets/research-mathematics.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Applied Mathematics</h3><p>Research interests in industrial mathematics, operations research, linear and nonlinear optimization, Lie-group symmetries of differential equations, ordinary and partial differential equations, probability, statistics, numerical analysis, mathematical biology, and financial mathematics. My work emphasizes mathematical modelling, analytical methods, computational solutions, optimization, and decision-making under uncertainty.</p></div></article>
</div></section>

<section class="research-rail research-rail-last" aria-labelledby="research-broader-title">
<h2 class="research-rail-title" id="research-broader-title">Broader Interests</h2>
<div class="research-lane">
<article class="research-card"><div class="research-card-media"><img alt="Open book and scientific diagrams" loading="lazy" src="/assets/research-broader-interests.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Education &amp; Scientific Computing</h3><p>My broader interests include physics and mathematics education, programming, scientific computing, and the teaching of computational methods for science and engineering.</p></div></article>
<article class="research-card"><div class="research-card-media media-position-right"><img alt="Human network and scientific-knowledge illustration" loading="lazy" src="/assets/research-broader-interests.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Social Physics</h3><p>I am interested in the application of physical and mathematical models to collective human behaviour, social networks, population dynamics, and socioeconomic systems.</p></div></article>
<article class="research-card"><div class="research-card-media media-position-center"><img alt="Scientific knowledge, geometry and philosophical foundations" loading="lazy" src="/assets/research-broader-interests.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Philosophy of Science</h3><p>My interests include the foundations of physics and mathematics, scientific realism, epistemology, the nature of space and time, and the relationship between mathematical structures and physical reality.</p></div></article>
</div></section>
</section></div>
</main>
'''

research_pt = r'''<!-- PAGE_HEAD -->
<title>Pesquisa — Física, Gravitação, Cosmologia e IA | Dr. Osvaldo L. Santos-Pereira</title>
<meta content="Linhas de pesquisa de Dr. Osvaldo L. Santos-Pereira em relatividade geral, warp drive, gravitação, cosmologia, física computacional, computação quântica, IA e matemática." name="description"/>
<link href="https://ozsp12.github.io/pt/research/" rel="canonical"/>
<meta content="website" property="og:type"/>
<meta content="Pesquisa — Física, Gravitação, Cosmologia e IA | Dr. Osvaldo L. Santos-Pereira" property="og:title"/>
<meta content="Linhas de pesquisa de Dr. Osvaldo L. Santos-Pereira em relatividade geral, warp drive, gravitação, cosmologia, física computacional, computação quântica, IA e matemática." property="og:description"/>
<meta content="https://ozsp12.github.io/pt/research/" property="og:url"/>
<meta content="Dr. Osvaldo L. Santos-Pereira" property="og:site_name"/>
<meta content="pt_BR" property="og:locale"/>
<meta content="en_US" property="og:locale:alternate"/>
<meta content="https://ozsp12.github.io/assets/research-gravitation.jpg" property="og:image"/>
<meta content="Ilustração abstrata de gravitação e espaço-tempo curvo" property="og:image:alt"/>
<meta content="summary_large_image" name="twitter:card"/>
<meta content="Pesquisa — Física, Gravitação, Cosmologia e IA | Dr. Osvaldo L. Santos-Pereira" name="twitter:title"/>
<meta content="Linhas de pesquisa de Dr. Osvaldo L. Santos-Pereira em relatividade geral, warp drive, gravitação, cosmologia, física computacional, computação quântica, IA e matemática." name="twitter:description"/>
<meta content="https://ozsp12.github.io/assets/research-gravitation.jpg" name="twitter:image"/>
<meta content="Ilustração abstrata de gravitação e espaço-tempo curvo" name="twitter:image:alt"/>
<link href="https://ozsp12.github.io/pt/research/" hreflang="pt" rel="alternate"/>
<link href="https://ozsp12.github.io/en/research/" hreflang="en" rel="alternate"/>
<link href="https://ozsp12.github.io/" hreflang="x-default" rel="alternate"/>

<!-- MAIN -->
<main id="main-content">
<div class="container"><section class="page-section research-page-section">
<div class="research-intro">
<h1 class="page-title">Pesquisa</h1>
<p class="lead">Minha pesquisa abrange física teórica e computacional, matemática pura e aplicada, inteligência artificial, ciência de dados, computação quântica e sistemas complexos. Tenho particular interesse em problemas que combinam modelagem matemática, teoria física, métodos computacionais e abordagens orientadas a dados.</p>
</div>
<section class="research-rail" aria-labelledby="pesquisa-gravitacao-title"><h2 class="research-rail-title" id="pesquisa-gravitacao-title">Gravitação e Física Fundamental</h2><div class="research-lane">
<article class="research-card"><div class="research-card-media"><img alt="Espaço-tempo curvo em torno de um objeto gravitacional compacto" loading="lazy" src="/assets/research-gravitation.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Geometrias de Warp Drive (Teoria de Dobra Espacial)</h3><p>Pesquisa sobre geometrias espaço-temporais superluminais, incluindo a métrica de Alcubierre, soluções exatas das equações de campo de Einstein, fontes de matéria, condições de energia, estrutura causal, descrições fluidas e a viabilidade matemática e física de modelos de warp drive dentro da relatividade geral.</p></div></article>
<article class="research-card"><div class="research-card-media media-position-center"><img alt="Representação geométrica de gravitação e espaço-tempo" loading="lazy" src="/assets/research-gravitation.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Relatividade Geral e Gravitação Clássica e Quântica</h3><p>Pesquisa sobre as equações de campo de Einstein, soluções exatas do espaço-tempo, geometria diferencial, dinâmica gravitacional, buracos negros, buracos de verme, tensores de energia-momento e matéria e campos em espaço-tempo curvo. Meus interesses também incluem gravidade semiclássica, campos quânticos em espaço-tempo curvo e abordagens teóricas para a descrição quântica de sistemas gravitacionais.</p></div></article>
<article class="research-card"><div class="research-card-media media-position-right"><img alt="Geometria cosmológica e linhas de campo gravitacional" loading="lazy" src="/assets/research-gravitation.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Cosmologia</h3><p>Pesquisa sobre os aspectos teóricos e observacionais da cosmologia relativística. Isso inclui testar modelos cosmológicos padrão e não padrão por meio de observações astronômicas, refinar testes cosmológicos clássicos considerando plenamente os efeitos de geodésicas nulas, e comparar cosmologias alternativas com as previsões da cosmologia friedmanniana padrão. Também tenho interesse em modelar a distribuição de galáxias em grande escala como uma estrutura fractal.</p></div></article>
<article class="research-card"><div class="research-card-media media-position-left"><img alt="Diagrama abstrato de física fundamental" loading="lazy" src="/assets/research-gravitation.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Computação Quântica</h3><p>Pesquisa sobre informação quântica, algoritmos quânticos, simulação quântica, aprendizado de máquina quântico e aplicações computacionais de sistemas quânticos. Meus interesses incluem o uso de métodos quânticos em física, inteligência artificial, otimização, sistemas complexos e modelagem científica.</p></div></article>
</div></section>
<section class="research-rail" aria-labelledby="pesquisa-complexos-title"><h2 class="research-rail-title" id="pesquisa-complexos-title">Sistemas Complexos e Econofísica</h2><div class="research-lane">
<article class="research-card"><div class="research-card-media"><img alt="Rede complexa e representação de dados econômicos" loading="lazy" src="/assets/research-complex-systems.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Econofísica e Sistemas Complexos</h3><p>Pesquisa sobre complexidade e dinâmica não linear em sistemas econômicos e sociais, particularmente as distribuições de renda pessoal, tamanho populacional de cidades e receita industrial setorial. Meu trabalho inclui aplicações da distribuição Gompertz–Pareto, além do estudo de desigualdade econômica, bolhas econômicas, ciclos de negócios, sistemas de agentes interagentes e dinâmica de mercados financeiros.</p></div></article>
<article class="research-card"><div class="research-card-media media-position-right"><img alt="Rede complexa com estruturas computacionais e estatísticas" loading="lazy" src="/assets/research-complex-systems.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Física Computacional</h3><p>Desenvolvimento de modelos numéricos, simulações científicas, métodos simbólicos e numéricos e experimentos computacionais para problemas em física. Meus interesses incluem modelagem numérica, redes neurais informadas por física (physics-informed), modelos de vidro de spin, relatividade numérica, sistemas dinâmicos, machine learning científico e aplicações de redes neurais e métodos de machine learning à análise de dados físicos.</p></div></article>
</div></section>
<section class="research-rail" aria-labelledby="pesquisa-ia-title"><h2 class="research-rail-title" id="pesquisa-ia-title">Inteligência Artificial e Ciência de Dados</h2><div class="research-lane">
<article class="research-card"><div class="research-card-media"><img alt="Rede neural abstrata e grafo computacional" loading="lazy" src="/assets/research-ai-data.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Inteligência Artificial, Machine Learning e Redes Neurais</h3><p>Pesquisa e desenvolvimento em inteligência artificial, machine learning, deep learning, redes neurais, transformers, processamento de linguagem natural, visão computacional, large language models, redes bayesianas, sistemas de recomendação, clustering, classificação, regressão, séries temporais, detecção de anomalias e modelos generativos. Meu trabalho foca no design, avaliação e aplicação de sistemas inteligentes a problemas científicos, industriais, educacionais, de saúde e de negócios.</p></div></article>
<article class="research-card"><div class="research-card-media media-position-right"><img alt="Rede de ciência de dados e estruturas analíticas" loading="lazy" src="/assets/research-ai-data.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Ciência de Dados e Analytics Avançado</h3><p>Pesquisa e trabalho aplicado em modelagem estatística, analytics preditivo, mineração de dados, experimentação, previsão (forecasting), otimização, business intelligence, visualização de dados e suporte à decisão. Meus interesses incluem integrar engenharia de dados, machine learning, estatística e métodos analíticos para extrair insights, desenvolver sistemas preditivos e apoiar decisões estratégicas em ambientes científicos, industriais e de negócios.</p></div></article>
</div></section>
<section class="research-rail" aria-labelledby="pesquisa-matematica-title"><h2 class="research-rail-title" id="pesquisa-matematica-title">Matemática</h2><div class="research-lane">
<article class="research-card"><div class="research-card-media"><img alt="Superfície matemática abstrata e construções geométricas" loading="lazy" src="/assets/research-mathematics.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Matemática Pura</h3><p>Interesses de pesquisa em teoria analítica dos números, álgebra, análise matemática, geometria não euclidiana, geometria diferencial e topologia. Tenho interesse particular na relação entre difeomorfismos do espaço-tempo, invariância geométrica, transformações de coordenadas e a equivalência física de descrições matemáticas na gravitação.</p></div></article>
<article class="research-card"><div class="research-card-media media-position-right"><img alt="Diagramas, curvas e geometria de matemática aplicada" loading="lazy" src="/assets/research-mathematics.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Matemática Aplicada</h3><p>Interesses de pesquisa em matemática industrial, pesquisa operacional, otimização linear e não linear, simetrias de grupos de Lie em equações diferenciais, equações diferenciais ordinárias e parciais, probabilidade, estatística, análise numérica, biologia matemática e matemática financeira. Meu trabalho enfatiza modelagem matemática, métodos analíticos, soluções computacionais, otimização e tomada de decisão sob incerteza.</p></div></article>
</div></section>
<section class="research-rail research-rail-last" aria-labelledby="pesquisa-ampla-title"><h2 class="research-rail-title" id="pesquisa-ampla-title">Interesses Mais Amplos</h2><div class="research-lane">
<article class="research-card"><div class="research-card-media"><img alt="Livro aberto e diagramas científicos" loading="lazy" src="/assets/research-broader-interests.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Educação e Computação Científica</h3><p>Meus interesses mais amplos incluem o ensino de física e matemática, programação, computação científica e o ensino de métodos computacionais para ciência e engenharia.</p></div></article>
<article class="research-card"><div class="research-card-media media-position-right"><img alt="Rede humana e representação de conhecimento científico" loading="lazy" src="/assets/research-broader-interests.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Física Social</h3><p>Tenho interesse na aplicação de modelos físicos e matemáticos ao comportamento humano coletivo, redes sociais, dinâmica populacional e sistemas socioeconômicos.</p></div></article>
<article class="research-card"><div class="research-card-media media-position-center"><img alt="Conhecimento científico, geometria e fundamentos filosóficos" loading="lazy" src="/assets/research-broader-interests.jpg" width="480" height="350"/></div><div class="research-card-body"><h3>Filosofia da Ciência</h3><p>Meus interesses incluem os fundamentos da física e da matemática, realismo científico, epistemologia, a natureza do espaço e do tempo, e a relação entre estruturas matemáticas e a realidade física.</p></div></article>
</div></section>
</section></div>
</main>
'''

write("templates/pages/en/research.html", research_en)
write("templates/pages/pt/research.html", research_pt)

research_css = r'''/* Horizontal research rails: Netflix-style information architecture, academic-site visual language. */
.research-page-section { max-width: none; width: 100%; }
.research-intro { max-width: 760px; }
.research-rail { margin-top: 42px; }
.research-rail-title { margin: 0 0 14px; font-family: var(--serif); font-size: 22px; font-weight: 600; line-height: 1.25; color: var(--text); }
.research-lane { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(260px, 300px); gap: 16px; overflow-x: auto; overscroll-behavior-inline: contain; scroll-snap-type: inline proximity; padding: 3px 2px 16px; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
.research-card { scroll-snap-align: start; min-width: 0; overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); display: flex; flex-direction: column; }
.research-card-media { aspect-ratio: 48 / 35; overflow: hidden; background: var(--bg-alt); border-bottom: 1px solid var(--border); }
.research-card-media img { width: 100%; height: 100%; object-fit: cover; object-position: 44% center; }
.research-card-media.media-position-left img { object-position: 22% center; }
.research-card-media.media-position-center img { object-position: center; }
.research-card-media.media-position-right img { object-position: 78% center; }
.research-card-body { padding: 15px 16px 18px; }
.research-card-body h3 { margin: 0 0 9px; font-family: var(--serif); font-size: 18px; font-weight: 600; line-height: 1.3; color: var(--text); }
.research-card-body p { margin: 0; font-family: var(--sans); font-size: 14px; line-height: 1.62; color: var(--text-muted); }
.research-rail-last { margin-bottom: 18px; }
@media (max-width: 640px) { .research-rail { margin-top: 34px; } .research-rail-title { font-size: 20px; } .research-lane { grid-auto-columns: minmax(245px, 82vw); gap: 13px; } }
'''
write("css/research.css", research_css)

home_css = r'''/* Compact selected-work module for the homepage. */
.home-featured { border-top: 1px solid var(--border); padding: 42px 0 72px; }
.home-featured-inner { max-width: 1200px; margin: 0 auto; padding: 0 32px; display: grid; grid-template-columns: 240px minmax(0, 520px); gap: 32px; align-items: center; }
.home-featured-media { display: block; overflow: hidden; border: 1px solid var(--border); border-radius: 6px; outline-offset: 3px; }
.home-featured-media img { width: 100%; aspect-ratio: 48 / 35; object-fit: cover; }
.home-featured-kicker { margin: 0 0 7px; font-family: var(--sans); font-size: 12px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase; color: var(--text-muted); }
.home-featured-title { margin: 0 0 8px; font-family: var(--serif); font-size: 23px; font-weight: 600; line-height: 1.25; }
.home-featured-copy { margin: 0 0 13px; font-family: var(--sans); font-size: 14.5px; line-height: 1.65; color: var(--text-muted); }
.home-featured-links { display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 0; padding: 0; list-style: none; }
.home-featured-links a { font-family: var(--sans); font-size: 13.5px; color: var(--accent); border-bottom: 1px solid transparent; }
.home-featured-links a:hover, .home-featured-links a:focus-visible { border-bottom-color: var(--accent); text-decoration: none; }
.home-featured-media:focus-visible, .home-featured-links a:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
@media (max-width: 720px) { .home-featured { padding: 34px 0 56px; } .home-featured-inner { grid-template-columns: minmax(0, 1fr); gap: 22px; } .home-featured-media { width: min(300px, 100%); } }
'''
write("css/home-featured.css", home_css)

# Projects: replace textual placeholder with real project media and upgrade social preview.
for lang in ("en", "pt"):
    path = f"templates/pages/{lang}/projects.html"
    text = read(path)
    if lang == "en":
        old = '''<a aria-label="Open LSTM for the Win live dashboard" class="physlab-thumb-link project-thumb-card" href="/en/projects/lstm_ftw/">\n<strong>LSTM</strong>\n<span>Sentiment + Topic</span>\n<small>Live model results</small>\n</a>'''
        new = '''<a aria-label="Open LSTM for the Win live dashboard" class="physlab-thumb-link" href="/en/projects/lstm_ftw/">\n<img alt="LSTM text-classification pipeline for product reviews" class="physlab-thumb" loading="lazy" src="/assets/project-lstm.jpg" width="480" height="350"/>\n</a>'''
    else:
        old = '''<a aria-label="Abrir dashboard ao vivo do LSTM for the Win" class="physlab-thumb-link project-thumb-card" href="/en/projects/lstm_ftw/">\n<strong>LSTM</strong>\n<span>Sentimento + Tópico</span>\n<small>Resultados ao vivo</small>\n</a>'''
        new = '''<a aria-label="Abrir dashboard ao vivo do LSTM for the Win" class="physlab-thumb-link" href="/en/projects/lstm_ftw/">\n<img alt="Pipeline LSTM de classificação de texto para avaliações de produtos" class="physlab-thumb" loading="lazy" src="/assets/project-lstm.jpg" width="480" height="350"/>\n</a>'''
    text = replace_once(text, old, new, f"{lang} projects thumbnail")
    text = replace_once(text, '<meta content="summary" name="twitter:card"/>', '<meta content="summary_large_image" name="twitter:card"/>', f"{lang} projects twitter card")
    insert_after = '<meta content="Dr. Osvaldo L. Santos-Pereira" property="og:site_name"/>'
    alt = "LSTM for the Win project illustration" if lang == "en" else "Ilustração do projeto LSTM for the Win"
    text = replace_once(text, insert_after, insert_after + f'\n<meta content="https://ozsp12.github.io/assets/project-lstm.jpg" property="og:image"/>\n<meta content="{alt}" property="og:image:alt"/>', f"{lang} projects og image")
    twitter_desc = 'name="twitter:description"/>'
    pos = text.find(twitter_desc)
    if pos < 0:
        raise RuntimeError(f"missing twitter description in {path}")
    line_end = text.find('\n', pos) + 1
    text = text[:line_end] + f'<meta content="https://ozsp12.github.io/assets/project-lstm.jpg" name="twitter:image"/>\n<meta content="{alt}" name="twitter:image:alt"/>\n' + text[line_end:]
    write(path, text)

# Home: root is the canonical English homepage; add a compact featured-project proof point.
for lang in ("en", "pt"):
    path = f"templates/pages/{lang}/home.html"
    text = read(path)
    if lang == "en":
        text = text.replace('https://ozsp12.github.io/en/\" rel=\"canonical', 'https://ozsp12.github.io/\" rel=\"canonical')
        text = text.replace('https://ozsp12.github.io/en/\" property=\"og:url', 'https://ozsp12.github.io/\" property=\"og:url')
        text = text.replace('https://ozsp12.github.io/en/\" hreflang=\"en', 'https://ozsp12.github.io/\" hreflang=\"en')
        feature = '''\n<section aria-labelledby="featured-project-title" class="home-featured">\n<div class="home-featured-inner">\n<a aria-label="Explore LSTM for the Win" class="home-featured-media" href="/en/projects/lstm_ftw/"><img alt="LSTM text-classification pipeline for product reviews" loading="lazy" src="/assets/project-lstm.jpg" width="480" height="350"/></a>\n<div><p class="home-featured-kicker">Featured project</p><h2 class="home-featured-title" id="featured-project-title">LSTM for the Win</h2><p class="home-featured-copy">An LSTM text-classification pipeline for newly generated product reviews, with separate sentiment and topic models, automated validation, versioned outputs, and a live results dashboard.</p><ul class="home-featured-links"><li><a href="/en/projects/lstm_ftw/">Explore project</a></li><li><a href="/en/projects/">View all projects</a></li></ul></div>\n</div>\n</section>\n'''
    else:
        text = text.replace('https://ozsp12.github.io/en/\" hreflang=\"en', 'https://ozsp12.github.io/\" hreflang=\"en')
        feature = '''\n<section aria-labelledby="featured-project-title" class="home-featured">\n<div class="home-featured-inner">\n<a aria-label="Explorar LSTM for the Win" class="home-featured-media" href="/en/projects/lstm_ftw/"><img alt="Pipeline LSTM de classificação de texto para avaliações de produtos" loading="lazy" src="/assets/project-lstm.jpg" width="480" height="350"/></a>\n<div><p class="home-featured-kicker">Projeto em destaque</p><h2 class="home-featured-title" id="featured-project-title">LSTM for the Win</h2><p class="home-featured-copy">Pipeline LSTM de classificação de texto para novas avaliações sintéticas de produtos, com modelos separados de sentimento e tópico, validação automatizada, saídas versionadas e dashboard de resultados.</p><ul class="home-featured-links"><li><a href="/en/projects/lstm_ftw/">Explorar projeto</a></li><li><a href="/pt/projects/">Ver todos os projetos</a></li></ul></div>\n</div>\n</section>\n'''
    text = replace_once(text, '\n</main>\n', feature + '</main>\n', f"{lang} featured project")
    write(path, text)

# Header: distinguish landmarks and use the native hidden state for the mobile menu.
header = read("templates/partials/header.html")
header = header.replace('<nav aria-hidden="true" aria-label="{{NAV_LABEL}}" class="mobile-nav-panel" data-mobile-nav="" id="mobile-navigation">', '<nav aria-label="{{MOBILE_NAV_LABEL}}" class="mobile-nav-panel" data-mobile-nav="" hidden id="mobile-navigation">')
write("templates/partials/header.html", header)

nav = read("js/navigation.js")
nav = nav.replace("    panel.setAttribute('aria-hidden', open ? 'false' : 'true');\n", "    panel.hidden = !open;\n")
write("js/navigation.js", nav)

# Build: home/root canonicalization, page-specific CSS, mobile landmark label, and sitemap deduplication.
build = read("scripts/build_site.py")
build = build.replace('        "nav": "Navegação principal",\n        "menu": "Abrir menu",', '        "nav": "Navegação principal",\n        "mobile_nav": "Navegação móvel",\n        "menu": "Abrir menu",')
build = build.replace('        "nav": "Primary navigation",\n        "menu": "Open menu",', '        "nav": "Primary navigation",\n        "mobile_nav": "Mobile navigation",\n        "menu": "Open menu",')
build = build.replace('            "MOBILE_NAV": nav_links(lang, key),\n            "DESKTOP_LANGUAGE_SWITCH":', '            "MOBILE_NAV": nav_links(lang, key),\n            "MOBILE_NAV_LABEL": text["mobile_nav"],\n            "DESKTOP_LANGUAGE_SWITCH":')
old_styles = '    extra_styles = \'<link href="/css/physlab.css?v=2" rel="stylesheet"/>\' if key in {"physlab", "projects"} else ""'
new_styles = '''    extra_style_links = []\n    if key in {"physlab", "projects"}:\n        extra_style_links.append('<link href="/css/physlab.css?v=2" rel="stylesheet"/>')\n    if key == "research":\n        extra_style_links.append('<link href="/css/research.css?v=1" rel="stylesheet"/>')\n    if key == "home":\n        extra_style_links.append('<link href="/css/home-featured.css?v=1" rel="stylesheet"/>')\n    extra_styles = "\\n".join(extra_style_links)'''
build = replace_once(build, old_styles, new_styles, "build extra styles")
old_root = '''def render_root() -> str:\n    """Render the root URL as the English home while preserving /en/ as a valid URL."""\n    root = render_page("en", "home")\n    root = root.replace('<html lang="en">', '<html lang="und">', 1)\n    root = root.replace("<body>", '<body lang="en">', 1)\n    root = root.replace(\n        '<link href="https://ozsp12.github.io/en/" rel="canonical"/>',\n        '<link href="https://ozsp12.github.io/" rel="canonical"/>',\n        1,\n    )\n    root = root.replace(\n        '<meta content="https://ozsp12.github.io/en/" property="og:url"/>',\n        '<meta content="https://ozsp12.github.io/" property="og:url"/>',\n        1,\n    )\n    root = root.replace('href="/en/"', 'href="/"')\n    return root\n'''
new_root = '''def render_root() -> str:\n    """Render the root URL as the canonical English homepage."""\n    root = render_page("en", "home")\n    root = root.replace('href="/en/"', 'href="/"')\n    return root\n'''
build = replace_once(build, old_root, new_root, "render_root")
start = build.index('def render_sitemap() -> str:')
end = build.index('\n\ndef render_robots()', start)
new_sitemap = '''def render_sitemap() -> str:\n    base = "https://ozsp12.github.io"\n    home_alternates = {"pt": f"{base}/pt/", "en": f"{base}/", "x-default": f"{base}/"}\n    entries = [\n        sitemap_entry(f"{base}/", home_alternates),\n        sitemap_entry(f"{base}/pt/", home_alternates),\n    ]\n    for key in PAGE_KEYS:\n        if key == "home":\n            continue\n        pt_url = base + href("pt", key)\n        en_url = base + href("en", key)\n        alternates = {"pt": pt_url, "en": en_url, "x-default": f"{base}/"}\n        entries.append(sitemap_entry(pt_url, alternates))\n        entries.append(sitemap_entry(en_url, alternates))\n    entries.append(sitemap_entry(f"{base}/en/projects/lstm_ftw/", {"en": f"{base}/en/projects/lstm_ftw/", "x-default": f"{base}/"}))\n    return (\n        '<?xml version="1.0" encoding="UTF-8"?>\\n'\n        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\\n'\n        + "\\n".join(entries)\n        + "\\n</urlset>\\n"\n    )\n'''
build = build[:start] + new_sitemap + build[end:]
write("scripts/build_site.py", build)

# Validator: encode the new canonical English root and validate new assets/styles.
validator = read("scripts/validate_site.py")
validator = validator.replace('    "css/physlab.css",\n', '    "css/physlab.css",\n    "css/research.css",\n    "css/home-featured.css",\n')
validator = validator.replace('    "js/lstm-dashboard.js",\n]', '    "js/lstm-dashboard.js",\n    "assets/research-gravitation.jpg",\n    "assets/research-complex-systems.jpg",\n    "assets/research-ai-data.jpg",\n    "assets/research-mathematics.jpg",\n    "assets/research-broader-interests.jpg",\n    "assets/project-lstm.jpg",\n]')
validator = validator.replace('''            if rel_posix == "index.html":\n                if parser.html_lang != "und":\n                    self.fail("index.html: root page must use lang=\\\"und\\\"")\n                expected_canonical = "https://ozsp12.github.io/"\n                expected_alternates = {\n                    "pt": "https://ozsp12.github.io/pt/",\n                    "en": "https://ozsp12.github.io/en/",\n                    "x-default": "https://ozsp12.github.io/",\n                }''', '''            if rel_posix == "index.html":\n                if not (parser.html_lang or "").lower().startswith("en"):\n                    self.fail("index.html: canonical root homepage must declare lang=en")\n                expected_canonical = "https://ozsp12.github.io/"\n                expected_alternates = {\n                    "pt": "https://ozsp12.github.io/pt/",\n                    "en": "https://ozsp12.github.io/",\n                    "x-default": "https://ozsp12.github.io/",\n                }''')
old_pt = '''                expected_canonical = f"https://ozsp12.github.io/pt{suffix}"\n                expected_alternates = {\n                    "pt": f"https://ozsp12.github.io/pt{suffix}",\n                    "en": f"https://ozsp12.github.io/en{suffix}",\n                    "x-default": "https://ozsp12.github.io/",\n                }'''
new_pt = '''                expected_canonical = f"https://ozsp12.github.io/pt{suffix}"\n                en_alternate = "https://ozsp12.github.io/" if suffix == "/" else f"https://ozsp12.github.io/en{suffix}"\n                expected_alternates = {\n                    "pt": f"https://ozsp12.github.io/pt{suffix}",\n                    "en": en_alternate,\n                    "x-default": "https://ozsp12.github.io/",\n                }'''
validator = replace_once(validator, old_pt, new_pt, "validator PT SEO")
old_en = '''                expected_canonical = f"https://ozsp12.github.io/en{suffix}"\n                standalone = relative.relative_to("en").as_posix() in STANDALONE_EN_PAGES\n                if standalone:\n                    expected_alternates = {\n                        "en": f"https://ozsp12.github.io/en{suffix}",\n                        "x-default": "https://ozsp12.github.io/",\n                    }\n                else:\n                    expected_alternates = {\n                        "pt": f"https://ozsp12.github.io/pt{suffix}",\n                        "en": f"https://ozsp12.github.io/en{suffix}",\n                        "x-default": "https://ozsp12.github.io/",\n                    }'''
new_en = '''                if suffix == "/":\n                    expected_canonical = "https://ozsp12.github.io/"\n                    expected_alternates = {\n                        "pt": "https://ozsp12.github.io/pt/",\n                        "en": "https://ozsp12.github.io/",\n                        "x-default": "https://ozsp12.github.io/",\n                    }\n                else:\n                    expected_canonical = f"https://ozsp12.github.io/en{suffix}"\n                    standalone = relative.relative_to("en").as_posix() in STANDALONE_EN_PAGES\n                    if standalone:\n                        expected_alternates = {\n                            "en": f"https://ozsp12.github.io/en{suffix}",\n                            "x-default": "https://ozsp12.github.io/",\n                        }\n                    else:\n                        expected_alternates = {\n                            "pt": f"https://ozsp12.github.io/pt{suffix}",\n                            "en": f"https://ozsp12.github.io/en{suffix}",\n                            "x-default": "https://ozsp12.github.io/",\n                        }'''
validator = replace_once(validator, old_en, new_en, "validator EN SEO")
validator = validator.replace('for css_path in (ROOT / "css/styles.css", ROOT / "css/lstm-dashboard.css"):', 'for css_path in (ROOT / "css/styles.css", ROOT / "css/lstm-dashboard.css", ROOT / "css/research.css", ROOT / "css/home-featured.css"):')
write("scripts/validate_site.py", validator)

# Re-enable landmark/focus/ARIA semantics now that the mobile nav has distinct accessible structure.
config = json.loads(read(".htmlvalidate.json"))
for rule in ("aria-label-misuse", "hidden-focusable", "unique-landmark"):
    config["rules"].pop(rule, None)
write(".htmlvalidate.json", json.dumps(config, indent=2) + "\n")

# Documentation: explain the new visual modules without turning README into product copy.
readme = read("README.md")
needle = "Standalone project dashboards may live below their corresponding project route, such as `/en/projects/lstm_ftw/`."
replacement = needle + " Research is presented as horizontal thematic rails, while generated research/project card artwork is versioned locally under `assets/`."
readme = replace_once(readme, needle, replacement, "README visual modules")
write("README.md", readme)

print("Site-polish source migration applied.")
