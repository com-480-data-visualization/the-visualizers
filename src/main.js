import * as d3 from 'd3';
import { initScrollManager } from './utils/scroll-manager.js';
import { initHook } from './sections/hook.js';
import { initGlobe, onGlobeStep } from './sections/globe.js';
import { initFactors, onFactorsStep } from './sections/factors.js';
import { initProfiles, onProfilesStep } from './sections/profiles.js';
import { initCorrelations, onCorrelationStep } from './sections/correlations.js';
import { initDecades, onDecadesStep } from './sections/decades.js';
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
  initFactors(countries);
  initProfiles(countries);
  initCorrelations(earthquakes, countries);
  initDecades(earthquakes);
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
      id: 'factors',
      onStepEnter: ({ element }) => {
        const step = element.dataset.step;
        onFactorsStep(step);
      },
    },
    {
      id: 'profiles',
      onStepEnter: ({ element }) => {
        const step = element.dataset.step;
        onProfilesStep(step);
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
      id: 'decades',
      onStepEnter: ({ element }) => {
        const step = element.dataset.step;
        onDecadesStep(step);
      },
    }
  ]);
}

main().catch(err => console.error('Initialization error:', err));
