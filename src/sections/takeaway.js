export function initTakeaway() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.3 });

  const headline = document.querySelector('.takeaway-headline');
  if (headline) observer.observe(headline);
}
