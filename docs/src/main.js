import * as d3 from 'd3';
import { initScrollManager } from './utils/scroll-manager.js';
import { initHook } from './sections/hook.js';
import { initGlobe, onGlobeStep } from './sections/globe.js';
import { initMagnitudeMythChart, onMagnitudeStep } from './sections/magnitude-myth.js';
import { initGapminder, onGapminderStep } from './sections/gapminder.js';
import { initCorrelations, onCorrelationStep } from './sections/correlations.js';
import { initComparison } from './sections/comparison.js';
import { initTimeline, onTimelineStep } from './sections/timeline.js';
import { initTakeaway } from './sections/takeaway.js';

async function main() {
  // Load all data in parallel
  const [earthquakes, countries, countryYear] = await Promise.all([
    d3.json('/data/earthquakes.json'),
    d3.json('/data/countries.json'),
    d3.json('/data/country_year.json'),
  ]);

  console.log(`Loaded: ${earthquakes.length} earthquakes, ${countries.length} countries, ${countryYear.length} country-year records`);

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
