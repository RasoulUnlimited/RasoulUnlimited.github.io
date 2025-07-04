document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.credential-card');
    if (!('IntersectionObserver' in window) || !cards.length) return;
  
    cards.forEach((card) => card.classList.add('card-hidden'));
  
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('card-visible');
          entry.target.classList.remove('card-hidden');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
  
    cards.forEach((card) => observer.observe(card));
  });