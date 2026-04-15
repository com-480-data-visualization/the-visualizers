import * as d3 from 'd3';
import { pearsonR } from '../utils/data-transforms.js';
import { showTooltip, moveTooltip, hideTooltip, countryTooltipHTML } from '../components/tooltip.js';
import { displayName } from '../utils/constants.js';

let svg, g, cells;
let countriesData;
let selectedCountries = new Set();
let width, height;

const INDICATORS = [
  { key: 'avg_gdp', label: 'GDP per capita', log: true },
  { key: 'hdi', label: 'HDI', log: false },
  { key: 'avg_hospital_beds', label: 'Hospital beds/1K', log: false },
  { key: 'avg_urban_pct', label: 'Urban %', log: false },
  { key: 'avg_pop_density', label: 'Pop. density', log: true },
  { key: 'avg_mag', label: 'Avg magnitude', log: false },
];

export function initCorrelations(countries) {
  countriesData = countries.filter(d => d.events >= 5 && d.deaths_per_event > 0);

  const container = document.getElementById('correlations-chart');
  const rect = container.getBoundingClientRect();
  width = rect.width;
  height = rect.height;

  svg = d3.select(container).append('svg')
    .attr('width', width)
    .attr('height', height);

  g = svg.append('g').attr('transform', 'translate(10, 10)');

  renderGrid();
}

function renderGrid() {
  const cols = 3;
  const rows = 2;
  const cellW = (width - 40) / cols;
  const cellH = (height - 40) / rows;
  const pad = { top: 28, right: 10, bottom: 30, left: 40 };

  cells = INDICATORS.map((indicator, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = col * cellW + 15;
    const cy = row * cellH + 15;
    const plotW = cellW - pad.left - pad.right;
    const plotH = cellH - pad.top - pad.bottom;

    const validData = countriesData.filter(d => d[indicator.key] != null);

    const xVals = validData.map(d => indicator.log ? Math.log10(d[indicator.key]) : d[indicator.key]);
    const yVals = validData.map(d => Math.log10(d.deaths_per_event));
    const r = pearsonR(xVals, yVals);

    const cellG = g.append('g')
      .attr('class', 'corr-cell')
      .attr('transform', `translate(${cx},${cy})`);

    // Background
    cellG.append('rect')
      .attr('width', cellW - 10)
      .attr('height', cellH - 10)
      .attr('rx', 8);

    // Title
    cellG.append('text')
      .attr('class', 'corr-indicator-label')
      .attr('x', pad.left + plotW / 2)
      .attr('y', 16)
      .attr('text-anchor', 'middle')
      .text(indicator.label);

    // R value
    cellG.append('text')
      .attr('class', 'corr-r-value')
      .attr('x', cellW - pad.right - 15)
      .attr('y', 18)
      .attr('text-anchor', 'end')
      .attr('fill', r < -0.3 ? '#dc2626' : r < -0.1 ? '#f59e0b' : '#666')
      .text(`r = ${r?.toFixed(2)}`);

    const plotG = cellG.append('g')
      .attr('transform', `translate(${pad.left},${pad.top})`);

    // Scales
    const xExtent = d3.extent(xVals);
    const yExtent = d3.extent(yVals);
    const xScale = d3.scaleLinear().domain(xExtent).range([0, plotW]).nice();
    const yScale = d3.scaleLinear().domain(yExtent).range([plotH, 0]).nice();

    // Axes
    plotG.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0,${plotH})`)
      .call(d3.axisBottom(xScale).ticks(4).tickSize(3));

    plotG.append('g')
      .attr('class', 'axis')
      .call(d3.axisLeft(yScale).ticks(4).tickSize(3));

    // Dots
    const dotsG = plotG.selectAll('.corr-dot')
      .data(validData)
      .join('circle')
      .attr('class', 'corr-dot')
      .attr('cx', d => xScale(indicator.log ? Math.log10(d[indicator.key]) : d[indicator.key]))
      .attr('cy', d => yScale(Math.log10(d.deaths_per_event)))
      .attr('r', 4)
      .attr('fill', '#1a1a2e')
      .attr('opacity', 0.55)
      .attr('stroke', 'none')
      .on('mouseenter', (event, d) => {
        showTooltip(countryTooltipHTML(d), event);
        highlightCountry(d.country, true);
      })
      .on('mousemove', moveTooltip)
      .on('mouseleave', (event, d) => {
        hideTooltip();
        highlightCountry(d.country, false);
      });

    return { cellG, plotG, dotsG, xScale, yScale, indicator, validData };
  });

  // Brush on each cell
  cells.forEach(cell => {
    const plotW = cell.xScale.range()[1];
    const plotH = cell.yScale.range()[0];
    const brush = d3.brush()
      .extent([[0, 0], [plotW, plotH]])
      .on('brush end', (event) => {
        if (!event.selection) {
          selectedCountries.clear();
          updateHighlights();
          return;
        }
        const [[x0, y0], [x1, y1]] = event.selection;
        selectedCountries.clear();
        cell.validData.forEach(d => {
          const key = cell.indicator.key;
          const cx = cell.xScale(cell.indicator.log ? Math.log10(d[key]) : d[key]);
          const cy = cell.yScale(Math.log10(d.deaths_per_event));
          if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) {
            selectedCountries.add(d.country);
          }
        });
        updateHighlights();
      });

    cell.plotG.append('g')
      .attr('class', 'brush')
      .call(brush);
  });
}

function highlightCountry(country, on) {
  cells.forEach(cell => {
    cell.dotsG
      .attr('opacity', d => {
        if (on && d.country === country) return 1;
        if (!on && selectedCountries.size === 0) return 0.55;
        if (selectedCountries.has(d.country)) return 0.8;
        return 0.55;
      })
      .attr('r', d => {
        if (on && d.country === country) return 5;
        return 3.5;
      })
      .attr('stroke', d => {
        if (on && d.country === country) return '#1a1a2e';
        if (selectedCountries.has(d.country)) return '#1a1a2e';
        return 'none';
      })
      .attr('stroke-width', d => {
        if (on && d.country === country) return 1.5;
        if (selectedCountries.has(d.country)) return 1;
        return 0;
      });
  });
}

function updateHighlights() {
  cells.forEach(cell => {
    cell.dotsG
      .transition().duration(200)
      .attr('opacity', d => selectedCountries.size === 0 ? 0.35 : selectedCountries.has(d.country) ? 0.85 : 0.08)
      .attr('r', d => selectedCountries.has(d.country) ? 5 : 3.5)
      .attr('stroke', d => selectedCountries.has(d.country) ? '#1a1a2e' : 'none')
      .attr('stroke-width', d => selectedCountries.has(d.country) ? 1 : 0);
  });
}

export function onCorrelationStep(stepId) {
  // Steps just control narrative; chart is always interactive
}
