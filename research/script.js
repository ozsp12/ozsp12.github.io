const menuIcon = document.getElementById('menu-icon');
const closeIcon = document.getElementById('close-icon');
const navbar = document.querySelector('.navbar');

// Abrir o menu ao clicar no ícone de menu
menuIcon.addEventListener('click', () => {
  navbar.classList.add('active');
  menuIcon.style.display = 'none'; // Esconde o ícone de menu
  closeIcon.style.display = 'block'; // Mostra o ícone de fechar
});

// Fechar o menu ao clicar no ícone de fechar
closeIcon.addEventListener('click', () => {
  navbar.classList.remove('active');
  closeIcon.style.display = 'none'; // Esconde o ícone de fechar
  menuIcon.style.display = 'block'; // Mostra o ícone de menu
});

// Monitora redimensionamento da janela
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    // Em telas maiores, garante que o menu e ícones estejam no estado correto
    navbar.classList.remove('active');
    menuIcon.style.display = 'none'; // Esconde o ícone de menu
    closeIcon.style.display = 'none'; // Esconde o ícone de fechar
  } else {
    // Em telas menores, redefine o estado inicial
    menuIcon.style.display = 'block'; // Mostra o ícone de menu
  }
});


// Seleciona os elementos de texto de título
const roleTextElements = document.querySelectorAll('.role-text');
const nameElement = document.querySelector('h1');
let currentIndex = 0;
let isNameAnimating = false; // Flag para controlar a animação do nome

// Função para animar a troca de palavras
function animateRoleText() {
  roleTextElements.forEach((element, index) => {
    element.style.opacity = index === currentIndex ? '1' : '0';
  });

  currentIndex = (currentIndex + 1) % roleTextElements.length;

  // Quando a última palavra desaparecer, faz uma pausa de 3 segundos e depois anima o nome
  if (currentIndex === 0) { 
    setTimeout(() => {
      pauseWordsAndAnimateName();
    }, 3000); // Pausa de 3 segundos (sem palavras visíveis)
  }
}

// Função para pausar a exibição de palavras e animar o nome
function pauseWordsAndAnimateName() {
  // Faz todas as palavras desaparecerem
  roleTextElements.forEach((element) => {
    element.style.opacity = '0';
  });
}

// Inicializa a animação
setInterval(animateRoleText, 3000); // Troca a palavra a cada 3 segundos

// JavaScript para revelar o about ao rolar a página
document.addEventListener('scroll', function () {
  const aboutSection = document.getElementById('about');
  const sectionPosition = aboutSection.getBoundingClientRect().top;
  const screenPosition = window.innerHeight / 1.5;

  if (sectionPosition < screenPosition) {
      aboutSection.classList.add('active');
  }
});


