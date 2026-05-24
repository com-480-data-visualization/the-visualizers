import * as d3 from 'd3';
import { displayName, REGION_COLORS } from '../utils/constants.js';
import { fmtValue } from '../utils/formats.js';
import { showTooltip, moveTooltip, hideTooltip, earthquakeTooltipHTML } from '../components/tooltip.js';

let earthquakesData, countriesData;
let currentA, currentB;

const RADAR_INDICATORS = [
  { key: 'avg_gdp', label: 'GDP/capita', max: 80000 },
  { key: 'hdi', label: 'HDI', max: 1 },
  { key: 'avg_hospital_beds', label: 'Hospital beds', max: 12 },
  { key: 'avg_urban_pct', label: 'Urban %', max: 100 },
  { key: 'deaths_per_event', label: 'Deaths/event', max: 50000, invert: true },
];

export function initComparison(earthquakes, countries) {
  earthquakesData = earthquakes;
  countriesData = countries;

  const sortedCountries = countries
    .filter(d => d.events >= 2)
    .sort((a, b) => a.country.localeCompare(b.country));

  const selectA = document.getElementById('country-a');
  const selectB = document.getElementById('country-b');

  sortedCountries.forEach(c => {
    const name = displayName(c.country);
    selectA.add(new Option(name, c.country));
    selectB.add(new Option(name, c.country));
  });

  selectA.value = 'Haiti';
  selectB.value = 'Chile';

  selectA.addEventListener('change', () => updateComparison(selectA.value, selectB.value));
  selectB.addEventListener('change', () => updateComparison(selectA.value, selectB.value));

  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.suggestion-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const a = chip.dataset.a;
      const b = chip.dataset.b;
      selectA.value = a;
      selectB.value = b;
      updateComparison(a, b);
    });
  });

  updateComparison('Haiti', 'Chile');
}

function updateComparison(countryA, countryB) {
  currentA = countryA;
  currentB = countryB;

  const dataA = countriesData.find(d => d.country === countryA);
  const dataB = countriesData.find(d => d.country === countryB);

  if (!dataA || !dataB) return;

  renderPanel('panel-a', dataA, countryA, '#dc2626');
  renderPanel('panel-b', dataB, countryB, '#3b82f6');
  renderRadar(dataA, dataB);
  renderComparisonTimeline(countryA, countryB);
}

function renderPanel(containerId, data, country, color) {
  const container = document.getElementById(containerId);
  const eqs = earthquakesData.filter(d => d.country === country);

  container.innerHTML = `
    <h3 class="panel-title" style="color: ${color}">${displayName(country)}</h3>
    <div class="stat-card">
      <span class="stat-card-label">Total events</span>
      <span class="stat-card-value">${data.events}</span>
    </div>
    <div class="stat-card">
      <span class="stat-card-label">Total deaths</span>
      <span class="stat-card-value">${fmtValue(data.total_deaths, 'deaths')}</span>
    </div>
    <div class="stat-card">
      <span class="stat-card-label">Deaths per event</span>
      <span class="stat-card-value">${fmtValue(data.deaths_per_event, 'deaths')}</span>
    </div>
    <div class="stat-card">
      <span class="stat-card-label">Avg GDP/capita</span>
      <span class="stat-card-value">${fmtValue(data.avg_gdp, 'gdp')}</span>
    </div>
    <div class="stat-card">
      <span class="stat-card-label">HDI</span>
      <span class="stat-card-value">${fmtValue(data.hdi, 'hdi')}</span>
    </div>
    <div class="stat-card">
      <span class="stat-card-label">Hospital beds/1K</span>
      <span class="stat-card-value">${fmtValue(data.avg_hospital_beds, 'beds')}</span>
    </div>
    <div class="stat-card">
      <span class="stat-card-label">Avg magnitude</span>
      <span class="stat-card-value">${fmtValue(data.avg_mag, 'mag')}</span>
    </div>
  `;
}

function renderRadar(dataA, dataB) {
  const container = document.getElementById('radar-chart');
  container.innerHTML = '';

  const size = Math.min(container.clientWidth, 300);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 40;

  const svg = d3.select(container).append('svg')
    .attr('width', size)
    .attr('height', size);

  const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

  const n = RADAR_INDICATORS.length;
  const angleSlice = (2 * Math.PI) / n;

  [0.25, 0.5, 0.75, 1].forEach(level => {
    const r = radius * level;
    g.append('circle')
      .attr('class', 'radar-grid')
      .attr('r', r);
  });

  RADAR_INDICATORS.forEach((ind, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const x2 = Math.cos(angle) * radius;
    const y2 = Math.sin(angle) * radius;

    g.append('line')
      .attr('class', 'radar-axis')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', x2).attr('y2', y2);

    g.append('text')
      .attr('class', 'radar-label')
      .attr('x', Math.cos(angle) * (radius + 18))
      .attr('y', Math.sin(angle) * (radius + 18))
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .text(ind.label);
  });

  function getRadarPoints(data) {
    return RADAR_INDICATORS.map((ind, i) => {
      let val = data[ind.key] || 0;
      let norm = Math.min(1, val / ind.max);
      if (ind.invert) norm = 1 - norm;
      const angle = angleSlice * i - Math.PI / 2;
      return [Math.cos(angle) * radius * norm, Math.sin(angle) * radius * norm];
    });
  }

  const pointsA = getRadarPoints(dataA);
  const pointsB = getRadarPoints(dataB);

  function drawPolygon(points, color) {
    const pathStr = 'M' + points.map(p => p.join(',')).join('L') + 'Z';
    g.append('path')
      .attr('class', 'radar-area')
      .attr('d', pathStr)
      .attr('fill', color);
    g.append('path')
      .attr('class', 'radar-line')
      .attr('d', pathStr)
      .attr('stroke', color);
  }

  drawPolygon(pointsA, '#dc2626');
  drawPolygon(pointsB, '#3b82f6');
}

function renderComparisonTimeline(countryA, countryB) {
  const container = document.getElementById('comparison-timeline');
  container.innerHTML = '<h3 style="text-align:center; margin-bottom: 1rem; font-family: IBM Plex Serif, serif;">Earthquake Events Over Time</h3>';

  const eqsA = earthquakesData.filter(d => d.country === countryA);
  const eqsB = earthquakesData.filter(d => d.country === countryB);

  const rect = container.getBoundingClientRect();
  const margin = { top: 10, right: 20, bottom: 30, left: 20 };
  const w = rect.width - margin.left - margin.right;
  const h = 140;

  const svg = d3.select(container).append('svg')
    .attr('width', rect.width)
    .attr('height', h + margin.top + margin.bottom);

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const allEqs = [...eqsA, ...eqsB];
  const xScale = d3.scaleLinear()
    .domain([d3.min(allEqs, d => d.year) - 1, d3.max(allEqs, d => d.year) + 1])
    .range([0, w]);

  const rScale = d3.scaleSqrt()
    .domain([0, d3.max(allEqs, d => d.deaths)])
    .range([3, 25]);

  g.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${h})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));

  g.selectAll('.eq-a')
    .data(eqsA)
    .join('circle')
    .attr('cx', d => xScale(d.year))
    .attr('cy', h / 3)
    .attr('r', d => rScale(d.deaths || 1))
    .attr('fill', '#dc2626')
    .attr('opacity', 0.5)
    .on('mouseenter', (event, d) => showTooltip(earthquakeTooltipHTML(d), event))
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip);

  g.selectAll('.eq-b')
    .data(eqsB)
    .join('circle')
    .attr('cx', d => xScale(d.year))
    .attr('cy', 2 * h / 3)
    .attr('r', d => rScale(d.deaths || 1))
    .attr('fill', '#3b82f6')
    .attr('opacity', 0.5)
    .on('mouseenter', (event, d) => showTooltip(earthquakeTooltipHTML(d), event))
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip);

  g.append('text')
    .attr('x', 0).attr('y', h / 3 - 20)
    .attr('font-size', 11).attr('fill', '#dc2626').attr('font-weight', 600)
    .text(displayName(countryA));

  g.append('text')
    .attr('x', 0).attr('y', 2 * h / 3 - 20)
    .attr('font-size', 11).attr('fill', '#3b82f6').attr('font-weight', 600)
    .text(displayName(countryB));
}
