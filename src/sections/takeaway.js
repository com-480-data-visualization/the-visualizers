export function initTakeaway() {
  // Animate takeaway section when it enters view
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
