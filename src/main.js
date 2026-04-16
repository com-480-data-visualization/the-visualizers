import * as d3 from 'd3';
import { initScrollManager } from './utils/scroll-manager.js';
import { initHook } from './sections/hook.js';
import { initGlobe, onGlobeStep } from './sections/globe.js';
import { initCorrelations, onCorrelationStep } from './sections/correlations.js';
import { initComparison } from './sections/comparison.js';
import { initTakeaway } from './sections/takeaway.js';

async function main() {
  // Load all data in parallel
  const [earthquakes, countries, countryYear] = await Promise.all([
    d3.json(import.meta.env.BASE_URL + 'data/earthquakes.json'),
    d3.json(import.meta.env.BASE_URL + 'data/countries.json'),
    d3.json(import.meta.env.BASE_URL + 'data/country_year.json'),
  ]);

  console.log(`Loaded: ${earthquakes.length} earthquakes, ${countries.length} countries, ${countryYear.length} country-year records`);

  // Initialize all sections
  initHook(earthquakes);
  await initGlobe(earthquakes);
  initCorrelations(earthquakes, countries);
  initComparison(earthquakes, countries);
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
      id: 'correlations',
      onStepEnter: ({ element }) => {
        const step = element.dataset.step;
        onCorrelationStep(step);
      },
    }
  ]);
}

main().catch(err => console.error('Initialization error:', err));
