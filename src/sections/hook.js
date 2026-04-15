import * as d3 from 'd3';

export function initHook() {
  // Animate death counters when they come into view
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounters();
        observer.disconnect();
      }
    });
  }, { threshold: 0.5 });

  const comparison = document.querySelector('.hook-comparison');
  if (comparison) observer.observe(comparison);
}

function animateCounters() {
  const counters = document.querySelectorAll('.hook-deaths');

  counters.forEach(el => {
    const target = parseInt(el.dataset.target, 10);
    const duration = 2500;
    const interpolator = d3.interpolateRound(0, target);

    d3.select(el)
      .transition()
      .duration(duration)
      .ease(d3.easeCubicOut)
      .tween('text', function() {
        return function(t) {
          this.textContent = interpolator(t).toLocaleString();
        };
      });
  });
}
