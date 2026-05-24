import * as d3 from 'd3';

export function initHook(earthquakes) {
  const haiti = earthquakes.find(d => d.country === 'Haiti' && d.year === 2010 && d.mag === 7.0);
  const chile = earthquakes.find(d => d.country === 'Chile' && d.year === 2010 && d.mag === 8.8);

  if (haiti && chile) {
    const haitiEl = document.querySelector('.hook-card-haiti .hook-deaths');
    const chileEl = document.querySelector('.hook-card-chile .hook-deaths');
    if (haitiEl) haitiEl.dataset.target = Math.round(haiti.deaths);
    if (chileEl) chileEl.dataset.target = Math.round(chile.deaths);

    const energyRatio = Math.round(chile.seismic_energy / haiti.seismic_energy);
    const deathRatio = Math.round(haiti.deaths / chile.deaths);
    const questionEl = document.querySelector('.hook-question');
    if (questionEl) {
      const p = questionEl.querySelector('p');
      if (p) {
        p.innerHTML = `Chile's earthquake released <strong>${energyRatio.toLocaleString()} times</strong> more energy.<br>Yet Haiti lost <strong>${deathRatio.toLocaleString()} times</strong> more lives.`;
      }
    }
  }

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
