import scrollama from 'scrollama';

export function initScrollManager(sections) {
  const nav = document.getElementById('nav');
  const progressBar = document.getElementById('progress-bar');

  const hookHeight = document.getElementById('hook')?.offsetHeight || window.innerHeight;

  let scrollRaf = false;
  window.addEventListener('scroll', () => {
    if (scrollRaf) return;
    scrollRaf = true;
    requestAnimationFrame(() => {
      scrollRaf = false;
      const scrollTop = window.scrollY;
      const docHeight = document.body.scrollHeight - window.innerHeight;
      progressBar.style.width = `${(scrollTop / docHeight) * 100}%`;
      nav.classList.toggle('visible', scrollTop > hookHeight * 0.8);
    });
  });

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

  window.addEventListener('resize', () => {
    scrollers.forEach(s => s.resize());
  });

  return scrollers;
}
