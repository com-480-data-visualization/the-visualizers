import * as d3 from 'd3';
import { MARGIN, displayName } from '../utils/constants.js';
import { regionColor } from '../utils/scales.js';
import { addXAxis, addYAxis, addGrid } from '../components/axis.js';
import { addRegionLegend } from '../components/legend.js';
import { showTooltip, moveTooltip, hideTooltip } from '../components/tooltip.js';

let svg, g, bubblesG, trailsG, yearLabel;
let xScale, yScale, rScale;
let countryYearMap, allCountries, pinnedCountries;
let yearMin, yearMax;
let currentYear;
let playing = false;
let playInterval;
let width, height;

export function initGapminder(countryYearData, countriesData) {
  const container = document.getElementById('gapminder-chart');
  const rect = container.getBoundingClientRect();
  width = rect.width - MARGIN.left - MARGIN.right - 20;
  height = rect.height - MARGIN.top - MARGIN.bottom - 60;

  // Build lookup: country -> year -> record
  countryYearMap = new Map();
  for (const d of countryYearData) {
    if (!d.gdp_pc || !d.country) continue;
    if (!countryYearMap.has(d.country)) countryYearMap.set(d.country, new Map());
    countryYearMap.get(d.country).set(d.year, d);
  }

  // Derive year range from actual data
  const years = countryYearData.map(d => d.year).filter(y => y != null);
  yearMin = d3.min(years);
  yearMax = d3.max(years);
  currentYear = yearMin;

  allCountries = countriesData.filter(d => d.avg_gdp != null && d.events >= 3);
  pinnedCountries = new Set();

  svg = d3.select(container).append('svg')
    .attr('width', rect.width)
    .attr('height', rect.height);

  g = svg.append('g')
    .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  xScale = d3.scaleLog()
    .domain([200, 120000])
    .range([0, width]);

  yScale = d3.scaleLog()
    .domain([0.1, 100000])
    .range([height, 0]);

  rScale = d3.scaleSqrt()
    .domain([1, 80])
    .range([4, 30]);

  addGrid(g, xScale, yScale, width, height);
  addXAxis(g, xScale, height, 'GDP per capita (current US$)', {
    tickFormat: d => d >= 1000 ? `$${d3.format('.0s')(d)}` : `$${d}`,
    tickValues: [200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000]
  });
  addYAxis(g, yScale, 'Deaths per earthquake event', {
    tickFormat: d => d >= 1000 ? d3.format('.0s')(d) : d < 1 ? d3.format('.1f')(d) : d,
    tickValues: [0.1, 1, 10, 100, 1000, 10000, 100000]
  });

  // Big year label in background
  yearLabel = g.append('text')
    .attr('class', 'gapminder-year-label')
    .attr('x', width / 2)
    .attr('y', height / 2 + 25)
    .attr('text-anchor', 'middle')
    .text(yearMin);

  // Legend
  addRegionLegend(g, width - 150, 10);

  // Trail paths
  trailsG = g.append('g').attr('class', 'trails');

  // Bubbles
  bubblesG = g.append('g').attr('class', 'bubbles');

  // Controls
  const playBtn = document.getElementById('gapminder-play');
  const slider = document.getElementById('gapminder-slider');
  const yearDisplay = document.getElementById('gapminder-year');

  slider.min = yearMin;
  slider.max = yearMax;
  slider.value = yearMin;
  yearDisplay.textContent = yearMin;

  playBtn.addEventListener('click', () => {
    if (playing) {
      stopPlay();
      playBtn.textContent = '▶ Play';
    } else {
      startPlay();
      playBtn.textContent = '⏸ Pause';
    }
  });

  slider.addEventListener('input', () => {
    const year = parseInt(slider.value, 10);
    setYear(year);
    yearDisplay.textContent = year;
    if (playing) {
      stopPlay();
      playBtn.textContent = '▶ Play';
    }
  });

  // Initial render
  updateBubbles(yearMin);
}

function getYearData(year) {
  // Aggregate country data for a given year (use ±2 year window for smoothing)
  const result = [];
  for (const country of allCountries) {
    const yearMap = countryYearMap.get(country.country);
    if (!yearMap) continue;

    // Find closest year with data
    let rec = yearMap.get(year);
    if (!rec) {
      for (let delta = 1; delta <= 2; delta++) {
        rec = yearMap.get(year - delta) || yearMap.get(year + delta);
        if (rec) break;
      }
    }
    if (!rec || !rec.gdp_pc) continue;

    result.push({
      country: country.country,
      region: country.region,
      gdp_pc: rec.gdp_pc,
      deaths_per_event: Math.max(0.1, rec.deaths_per_event || 0.1),
      events: rec.events || 1,
      year: year,
      total_deaths: rec.total_deaths || 0,
    });
  }
  return result;
}

function updateBubbles(year) {
  currentYear = year;
  const yearData = getYearData(year);
  yearLabel.text(year);

  const bubbles = bubblesG.selectAll('.gapminder-bubble')
    .data(yearData, d => d.country);

  bubbles.exit()
    .transition().duration(300)
    .attr('r', 0)
    .remove();

  const entered = bubbles.enter()
    .append('circle')
    .attr('class', 'gapminder-bubble')
    .attr('cx', d => xScale(d.gdp_pc))
    .attr('cy', d => yScale(d.deaths_per_event))
    .attr('r', 0)
    .attr('fill', d => regionColor(d.region))
    .attr('opacity', 0.7)
    .on('mouseenter', (event, d) => {
      showTooltip(`
        <div class="tooltip-title">${displayName(d.country)}</div>
        <div class="tooltip-row"><span class="tooltip-label">Year</span><span class="tooltip-value">${d.year}</span></div>
        <div class="tooltip-row"><span class="tooltip-label">GDP/capita</span><span class="tooltip-value">$${Math.round(d.gdp_pc).toLocaleString()}</span></div>
        <div class="tooltip-row"><span class="tooltip-label">Deaths/event</span><span class="tooltip-value">${d.deaths_per_event.toFixed(1)}</span></div>
        <div class="tooltip-row"><span class="tooltip-label">Events</span><span class="tooltip-value">${d.events}</span></div>
      `, event);
    })
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip)
    .on('click', (event, d) => {
      if (pinnedCountries.has(d.country)) {
        pinnedCountries.delete(d.country);
      } else {
        pinnedCountries.add(d.country);
      }
      updateTrails();
      updateBubbleStyles();
    });

  entered.merge(bubbles)
    .transition().duration(400)
    .attr('cx', d => xScale(Math.max(200, d.gdp_pc)))
    .attr('cy', d => yScale(d.deaths_per_event))
    .attr('r', d => rScale(d.events))
    .attr('fill', d => regionColor(d.region));

  // Add country labels for large/notable bubbles
  bubblesG.selectAll('.gapminder-country-label').remove();
  yearData
    .filter(d => d.events >= 8 || d.total_deaths >= 10000 || pinnedCountries.has(d.country))
    .forEach(d => {
      bubblesG.append('text')
        .attr('class', 'gapminder-country-label')
        .attr('x', xScale(Math.max(200, d.gdp_pc)))
        .attr('y', yScale(d.deaths_per_event) - rScale(d.events) - 4)
        .attr('text-anchor', 'middle')
        .text(displayName(d.country));
    });
}

function updateBubbleStyles() {
  bubblesG.selectAll('.gapminder-bubble')
    .classed('pinned', d => pinnedCountries.has(d.country));
}

function updateTrails() {
  trailsG.selectAll('.gapminder-trail').remove();

  for (const country of pinnedCountries) {
    const yearMap = countryYearMap.get(country);
    if (!yearMap) continue;

    const points = [];
    for (let y = yearMin; y <= currentYear; y++) {
      const rec = yearMap.get(y);
      if (rec && rec.gdp_pc) {
        points.push([xScale(rec.gdp_pc), yScale(Math.max(0.1, rec.deaths_per_event || 0.1))]);
      }
    }

    if (points.length > 1) {
      const cData = allCountries.find(c => c.country === country);
      trailsG.append('path')
        .attr('class', 'gapminder-trail')
        .attr('d', d3.line().curve(d3.curveCatmullRom)(points))
        .attr('stroke', regionColor(cData?.region));
    }
  }
}

function setYear(year) {
  currentYear = year;
  updateBubbles(year);
  updateTrails();
  document.getElementById('gapminder-slider').value = year;
  document.getElementById('gapminder-year').textContent = year;
}

function startPlay() {
  playing = true;
  if (currentYear >= yearMax) currentYear = yearMin;

  playInterval = setInterval(() => {
    currentYear++;
    if (currentYear > yearMax) {
      stopPlay();
      document.getElementById('gapminder-play').textContent = '▶ Play';
      return;
    }
    setYear(currentYear);
  }, 200);
}

function stopPlay() {
  playing = false;
  if (playInterval) clearInterval(playInterval);
}

export function onGapminderStep(stepId) {
  switch (stepId) {
    case 'gap-1':
      setYear(yearMin);
      break;
    case 'gap-2':
      startPlay();
      document.getElementById('gapminder-play').textContent = '⏸ Pause';
      break;
    case 'gap-3':
      stopPlay();
      document.getElementById('gapminder-play').textContent = '▶ Play';
      break;
    case 'gap-4':
      stopPlay();
      setYear(2010);
      document.getElementById('gapminder-play').textContent = '▶ Play';
      break;
  }
}
