import scrollama from 'scrollama';

export function initScrollManager(sections) {
  const nav = document.getElementById('nav');
  const progressBar = document.getElementById('progress-bar');

  // Show nav after scrolling past hook
  const hookHeight = document.getElementById('hook')?.offsetHeight || window.innerHeight;

  window.addEventListener('scroll', () => {
    // Progress bar
    const scrollTop = window.scrollY;
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const progress = (scrollTop / docHeight) * 100;
    progressBar.style.width = `${progress}%`;

    // Nav visibility
    if (scrollTop > hookHeight * 0.8) {
      nav.classList.add('visible');
    } else {
      nav.classList.remove('visible');
    }
  });

  // Nav link active state
  const navLinks = document.querySelectorAll('.nav-link');
  const sectionEls = document.querySelectorAll('.section');

  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(l => l.classList.remove('active'));
        const active = document.querySelector(`.nav-link[href="#${id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { threshold: 0.3 });

  sectionEls.forEach(s => sectionObserver.observe(s));

  // Initialize scrollama for each scrollytelling section
  const scrollers = [];

  sections.forEach(({ id, onStepEnter, onStepExit }) => {
    const container = document.querySelector(`#${id} .scrolly`);
    if (!container) return;

    const scroller = scrollama();
    scroller
      .setup({
        step: `#${id} .step`,
        offset: 0.5,
        debug: false,
      })
      .onStepEnter(response => {
        // Mark active step
        const steps = container.querySelectorAll('.step');
        steps.forEach(s => s.classList.remove('is-active'));
        response.element.classList.add('is-active');

        if (onStepEnter) onStepEnter(response);
      })
      .onStepExit(response => {
        if (onStepExit) onStepExit(response);
      });

    scrollers.push(scroller);
  });

  // Handle resize
  window.addEventListener('resize', () => {
    scrollers.forEach(s => s.resize());
  });

  return scrollers;
}
