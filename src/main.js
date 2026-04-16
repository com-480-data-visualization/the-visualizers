import * as d3 from 'd3';
import { initScrollManager } from './utils/scroll-manager.js';
import { pearsonR } from './utils/data-transforms.js';
import { displayName } from './utils/constants.js';
import { initHook } from './sections/hook.js';
import { initGlobe, onGlobeStep } from './sections/globe.js';
import { initMagnitudeMythChart, onMagnitudeStep } from './sections/magnitude-myth.js';
import { initGapminder, onGapminderStep } from './sections/gapminder.js';
import { initCorrelations, onCorrelationStep } from './sections/correlations.js';
import { initComparison } from './sections/comparison.js';
import { initTimeline, onTimelineStep } from './sections/timeline.js';
import { initTakeaway } from './sections/takeaway.js';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function fmtCount(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return Math.round(n / 1000) + 'K';
  return String(n);
}

function fmtR(r) {
  return (r >= 0 ? '+' : '−') + Math.abs(r).toFixed(2);
}

function setFact(key, value) {
  document.querySelectorAll(`[data-fact="${key}"]`).forEach(el => { el.textContent = value; });
}

function setR(key, value) {
  document.querySelectorAll(`[data-r="${key}"]`).forEach(el => { el.textContent = value; });
}

function injectFacts(earthquakes, countries) {
  // --- Aggregates ---
  const years = earthquakes.map(d => d.year).filter(y => y != null);
  const yMin = Math.min(...years);
  const yMax = Math.max(...years);
  const yearSpan = yMax - yMin + 1;

  setFact('event-count', earthquakes.length.toLocaleString());
  setFact('year-min', yMin);
  setFact('year-max', yMax);
  setFact('year-span', yearSpan);

  // --- Specific events powering the hook narrative ---
  const haiti = earthquakes.find(d => d.country === 'Haiti' && d.year === 2010 && d.month === 1);
  const chile = earthquakes.find(d => d.country === 'Chile' && d.year === 2010 && d.month === 2);

  if (haiti) {
    setFact('haiti-2010-mag', haiti.mag.toFixed(1));
    setFact('haiti-2010-deaths', haiti.deaths.toLocaleString());
    setFact('haiti-2010-deaths-short', fmtCount(haiti.deaths));
    setFact('haiti-2010-date', `${MONTHS[haiti.month - 1]} ${haiti.day}, ${haiti.year}`);
    document.querySelectorAll('[data-counter="haiti-2010-deaths"]').forEach(el => {
      el.dataset.target = haiti.deaths;
    });
  }
  if (chile) {
    setFact('chile-2010-mag', chile.mag.toFixed(1));
    setFact('chile-2010-deaths', chile.deaths.toLocaleString());
    setFact('chile-2010-deaths-short', fmtCount(chile.deaths));
    setFact('chile-2010-date', `${MONTHS[chile.month - 1]} ${chile.day}, ${chile.year}`);
    document.querySelectorAll('[data-counter="chile-2010-deaths"]').forEach(el => {
      el.dataset.target = chile.deaths;
    });
  }
  if (haiti && chile) {
    setFact('energy-ratio', Math.round(chile.seismic_energy / haiti.seismic_energy).toLocaleString());
    setFact('death-ratio', Math.round(haiti.deaths / chile.deaths).toLocaleString());
  }

  // --- Top deadliest events (used in the gapminder story step) ---
  const topList = document.querySelector('[data-fact-html="top-deadliest"]');
  if (topList) {
    const top = [...earthquakes].sort((a, b) => b.deaths - a.deaths).slice(0, 4);
    topList.innerHTML = top.map(d =>
      `<strong>${d.year} ${displayName(d.country)}</strong> (${fmtCount(d.deaths)} dead)`,
    ).join(', ');
  }

  // --- Pearson r values used in prose ---
  const dead = earthquakes.filter(d => d.deaths > 0 && d.mag != null);
  const magR = pearsonR(
    dead.map(d => d.mag),
    dead.map(d => Math.log10(Math.max(1, d.deaths))),
  );
  setR('mag-vs-deaths', magR.toFixed(2));

  const cf = countries.filter(d => d.events >= 5 && d.deaths_per_event > 0);
  const corrAgainstDpe = (key, log) => {
    const v = cf.filter(d => d[key] != null);
    return pearsonR(
      v.map(d => log ? Math.log10(d[key]) : d[key]),
      v.map(d => Math.log10(d.deaths_per_event)),
    );
  };
  setR('gdp-vs-dpe', fmtR(corrAgainstDpe('avg_gdp', true)));
  setR('hdi-vs-dpe', fmtR(corrAgainstDpe('hdi', false)));
  setR('beds-vs-dpe', fmtR(corrAgainstDpe('avg_hospital_beds', false)));
}

async function main() {
  // Load all data in parallel
  const [earthquakes, countries, countryYear] = await Promise.all([
    d3.json(import.meta.env.BASE_URL + 'data/earthquakes.json'),
    d3.json(import.meta.env.BASE_URL + 'data/countries.json'),
    d3.json(import.meta.env.BASE_URL + 'data/country_year.json'),
  ]);

  console.log(`Loaded: ${earthquakes.length} earthquakes, ${countries.length} countries, ${countryYear.length} country-year records`);

  // Inject all live facts/r-values into prose before sections render
  injectFacts(earthquakes, countries);

  // Initialize all sections
  initHook();
  await initGlobe(earthquakes);
  initMagnitudeMythChart(earthquakes);
  initGapminder(countryYear, countries);
  initCorrelations(countries);
  initComparison(earthquakes, countries);
  initTimeline(earthquakes);
  initTakeaway();

  // Set up scrollytelling
  initScrollManager([
    {
      id: 'globe',
      onStepEnter: ({ element }) => {
        const step = element.dataset.step;
        onGlobeStep(step);
      },
    },
    {
      id: 'magnitude',
      onStepEnter: ({ element }) => {
        const step = element.dataset.step;
        onMagnitudeStep(step);
      },
    },
    {
      id: 'gapminder',
      onStepEnter: ({ element }) => {
        const step = element.dataset.step;
        onGapminderStep(step);
      },
    },
    {
      id: 'correlations',
      onStepEnter: ({ element }) => {
        const step = element.dataset.step;
        onCorrelationStep(step);
      },
    },
    {
      id: 'timeline',
      onStepEnter: ({ element }) => {
        const step = element.dataset.step;
        onTimelineStep(step);
      },
    },
  ]);
}

main().catch(err => console.error('Initialization error:', err));
