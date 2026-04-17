import * as d3 from 'd3';
import { MARGIN, displayName } from '../utils/constants.js';
import { addXAxis, addYAxis, addGrid } from '../components/axis.js';
import { addAnnotation } from '../components/annotation.js';
import { linearRegression, pearsonR } from '../utils/data-transforms.js';
import {
  showTooltip, moveTooltip, hideTooltip,
} from '../components/tooltip.js';

let svg, g, dots, stats;
let xRawScale, yRawScale, xResidScale, yResidScale;
let xAxisGroup, yAxisGroup, xLabel, yLabel;
let regressionLine, regressionBand;
let width, height;
let data = [];
let annotationsGroup;

const FEATURED = new Set([
  'Haiti-2010', 'Chile-2010', 'Japan-2011', 'China-2008',
  'Iran, Islamic Rep.-2003', 'Turkiye-2023', 'Pakistan-2005', 'Nepal-2015',
]);

function eventKey(d) { return `${d.country}-${d.year}`; }

function fmtDollars(v) {
  if (v >= 1000) return '$' + d3.format('.2s')(v).replace('G', 'B');
  return '$' + Math.round(v);
}

function tooltipHTML(d) {
  const dollars = d.gdp_pc != null ? fmtDollars(d.gdp_pc) : '—';
  const deaths = d.deaths != null ? d.deaths.toLocaleString() : '—';
  return `
    <div class="tooltip-title">${d.location || d.country}</div>
    <div class="tooltip-row"><span class="tooltip-label">Year</span><span class="tooltip-value">${d.year}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Magnitude</span><span class="tooltip-value">${d.mag?.toFixed(1) ?? '—'}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Depth</span><span class="tooltip-value">${d.depth?.toFixed(0) ?? '—'} km</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Deaths</span><span class="tooltip-value">${deaths}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">GDP/capita</span><span class="tooltip-value">${dollars}</span></div>
  `;
}

// Draw a regression line across the current x domain.
function setRegressionLine(xScale, yScale, slope, intercept, opacity) {
  const [x0, x1] = xScale.domain();
  regressionLine
    .transition().duration(700)
    .attr('x1', xScale(x0))
    .attr('y1', yScale(intercept + slope * x0))
    .attr('x2', xScale(x1))
    .attr('y2', yScale(intercept + slope * x1))
    .attr('opacity', opacity);
}

export function initPartial(residuals) {
  data = residuals.events.map(d => ({
    ...d,
    logGdp: Math.log10(d.gdp_pc),
    logDeaths: Math.log10((d.deaths || 0) + 1),
  }));
  stats = residuals.stats;

  const container = document.getElementById('partial-chart');
  const rect = container.getBoundingClientRect();
  width = rect.width - MARGIN.left - MARGIN.right;
  height = rect.height - MARGIN.top - MARGIN.bottom;

  svg = d3.select(container).append('svg')
    .attr('width', rect.width)
    .attr('height', rect.height);

  g = svg.append('g')
    .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  // Raw-coordinate scales: log(GDP) × log(deaths+1)
  const gdpExtent = d3.extent(data, d => d.logGdp);
  const deathsExtent = d3.extent(data, d => d.logDeaths);
  xRawScale = d3.scaleLinear()
    .domain([gdpExtent[0] - 0.1, gdpExtent[1] + 0.1])
    .range([0, width]);
  yRawScale = d3.scaleLinear()
    .domain([deathsExtent[0] - 0.1, deathsExtent[1] + 0.1])
    .range([height, 0]);

  // Residual-coordinate scales: centered at zero, symmetric padding
  const gdpResidExt = d3.extent(data, d => d.gdp_resid);
  const deathsResidExt = d3.extent(data, d => d.deaths_resid);
  const gdpResidMax = Math.max(Math.abs(gdpResidExt[0]), Math.abs(gdpResidExt[1])) * 1.05;
  const deathsResidMax = Math.max(Math.abs(deathsResidExt[0]), Math.abs(deathsResidExt[1])) * 1.05;
  xResidScale = d3.scaleLinear().domain([-gdpResidMax, gdpResidMax]).range([0, width]);
  yResidScale = d3.scaleLinear().domain([-deathsResidMax, deathsResidMax]).range([height, 0]);

  // Gridlines + axes (rendered once, then updated via d3.transition)
  const gridRaw = g.append('g').attr('class', 'grid-raw');
  addGrid(gridRaw, xRawScale, yRawScale, width, height);

  // GDP tick formatting: show $100, $1K, $10K, $100K
  const dollarTicks = [2, 3, 4, 5].map(p => Math.pow(10, p));
  const xAxis = d3.axisBottom(xRawScale)
    .tickValues(dollarTicks.map(v => Math.log10(v)))
    .tickFormat(d => fmtDollars(Math.pow(10, d)));
  xAxisGroup = g.append('g')
    .attr('class', 'axis x-axis')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis);
  xLabel = xAxisGroup.append('text')
    .attr('class', 'axis-label')
    .attr('x', width / 2).attr('y', 40)
    .attr('text-anchor', 'middle')
    .text('GDP per capita (log)');

  // Death tick formatting: 1, 10, 100, 1K, 10K, 100K
  const deathTickVals = [0, 1, 2, 3, 4, 5].map(v => v);
  const yAxis = d3.axisLeft(yRawScale)
    .tickValues(deathTickVals)
    .tickFormat(d => {
      const n = Math.pow(10, d);
      if (n < 1) return '0';
      if (n >= 1000) return d3.format('.0s')(n);
      return Math.round(n);
    });
  yAxisGroup = g.append('g').attr('class', 'axis y-axis').call(yAxis);
  yLabel = yAxisGroup.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2).attr('y', -45)
    .attr('text-anchor', 'middle')
    .text('Deaths (log)');

  // Zero-reference lines for residual mode (initially hidden)
  const zeroX = g.append('line')
    .attr('class', 'zero-line zero-x')
    .attr('x1', 0).attr('x2', width)
    .attr('y1', yResidScale(0)).attr('y2', yResidScale(0))
    .attr('stroke', '#94a3b8').attr('stroke-dasharray', '2,4')
    .attr('opacity', 0);
  const zeroY = g.append('line')
    .attr('class', 'zero-line zero-y')
    .attr('x1', xResidScale(0)).attr('x2', xResidScale(0))
    .attr('y1', 0).attr('y2', height)
    .attr('stroke', '#94a3b8').attr('stroke-dasharray', '2,4')
    .attr('opacity', 0);
  svg.node().__zeroX = zeroX;
  svg.node().__zeroY = zeroY;

  // Dots
  dots = g.selectAll('.partial-dot')
    .data(data, eventKey)
    .join('circle')
    .attr('class', 'partial-dot')
    .attr('cx', d => xRawScale(d.logGdp))
    .attr('cy', d => yRawScale(d.logDeaths))
    .attr('r', 3.5)
    .attr('fill', '#64748b')
    .attr('opacity', 0.35)
    .on('mouseenter', (event, d) => showTooltip(tooltipHTML(d), event))
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip);

  // Regression line (hidden initially)
  regressionLine = g.append('line')
    .attr('class', 'regression-line')
    .attr('stroke', '#dc2626')
    .attr('stroke-width', 2)
    .attr('opacity', 0);

  annotationsGroup = g.append('g').attr('class', 'partial-annotations');
}

function annotate(xScale, yScale, xAccessor, yAccessor) {
  annotationsGroup.selectAll('*').remove();

  // Pick the deadliest event per country-year — avoids labelling an aftershock.
  const pick = k => data
    .filter(d => eventKey(d) === k)
    .sort((a, b) => (b.deaths || 0) - (a.deaths || 0))[0];
  const specs = [
    { key: 'Haiti-2010', dx: 40, dy: -25, color: '#dc2626', label: 'Haiti 2010' },
    { key: 'Chile-2010', dx: -80, dy: 20, color: '#10b981', label: 'Chile 2010' },
    { key: 'Japan-2011', dx: 40, dy: 30, color: '#3b82f6', label: 'Japan 2011 (Tōhoku)' },
    { key: 'Iran, Islamic Rep.-2003', dx: -70, dy: -25, color: '#f59e0b', label: 'Iran 2003 (Bam)' },
  ];
  for (const s of specs) {
    const d = pick(s.key);
    if (!d) continue;
    addAnnotation(annotationsGroup, {
      x: xScale(xAccessor(d)),
      y: yScale(yAccessor(d)),
      dx: s.dx, dy: s.dy,
      text: s.label,
      color: s.color,
    });
  }
}

export function onPartialStep(stepId) {
  if (!svg) return;
  const zeroX = svg.node().__zeroX;
  const zeroY = svg.node().__zeroY;

  const DURATION = 900;
  const fadeLines = opacity => {
    zeroX.transition().duration(DURATION).attr('opacity', opacity);
    zeroY.transition().duration(DURATION).attr('opacity', opacity);
  };

  switch (stepId) {
    case 'partial-1': {
      xAxisGroup.transition().duration(DURATION).call(
        d3.axisBottom(xRawScale)
          .tickValues([2, 3, 4, 5].map(p => p))
          .tickFormat(d => fmtDollars(Math.pow(10, d)))
      );
      yAxisGroup.transition().duration(DURATION).call(
        d3.axisLeft(yRawScale)
          .tickValues([0, 1, 2, 3, 4, 5])
          .tickFormat(d => {
            const n = Math.pow(10, d);
            if (n < 1) return '0';
            if (n >= 1000) return d3.format('.0s')(n);
            return Math.round(n);
          })
      );
      xLabel.text('GDP per capita');
      yLabel.text('Deaths');
      fadeLines(0);
      regressionLine.transition().duration(DURATION).attr('opacity', 0);
      annotationsGroup.selectAll('*').transition().duration(300).attr('opacity', 0).remove();
      dots.transition().duration(DURATION)
        .attr('cx', d => xRawScale(d.logGdp))
        .attr('cy', d => yRawScale(d.logDeaths))
        .attr('fill', '#64748b')
        .attr('opacity', 0.35)
        .attr('r', 3.5);
      break;
    }

    case 'partial-2': {
      // Fit on raw log(GDP) vs log(deaths+1) and draw
      const xs = data.map(d => d.logGdp);
      const ys = data.map(d => d.logDeaths);
      const { slope, intercept } = linearRegression(xs, ys);
      dots.transition().duration(DURATION)
        .attr('cx', d => xRawScale(d.logGdp))
        .attr('cy', d => yRawScale(d.logDeaths))
        .attr('opacity', 0.45);
      setRegressionLine(xRawScale, yRawScale, slope, intercept, 0.9);
      fadeLines(0);
      annotationsGroup.selectAll('*').transition().duration(300).attr('opacity', 0).remove();
      break;
    }

    case 'partial-3': {
      // Switch axes + scatter to residual coordinates
      xAxisGroup.transition().duration(DURATION).call(
        d3.axisBottom(xResidScale).ticks(6).tickFormat(d3.format('+.1f'))
      );
      yAxisGroup.transition().duration(DURATION).call(
        d3.axisLeft(yResidScale).ticks(6).tickFormat(d3.format('+.1f'))
      );
      xLabel.text('Wealth — after removing mag & depth');
      yLabel.text('Death toll — after removing mag & depth');

      fadeLines(1);

      // Fit regression on residuals
      const xs = data.map(d => d.gdp_resid);
      const ys = data.map(d => d.deaths_resid);
      const { slope, intercept } = linearRegression(xs, ys);

      dots.transition().duration(DURATION)
        .attr('cx', d => xResidScale(d.gdp_resid))
        .attr('cy', d => yResidScale(d.deaths_resid))
        .attr('fill', d => d.deaths_resid > 0.3 ? '#dc2626' : d.deaths_resid < -0.3 ? '#10b981' : '#64748b')
        .attr('opacity', 0.55);
      setRegressionLine(xResidScale, yResidScale, slope, intercept, 0.95);
      annotationsGroup.selectAll('*').transition().duration(300).attr('opacity', 0).remove();
      break;
    }

    case 'partial-4': {
      // Residual axes stay; emphasize featured events
      fadeLines(1);
      dots.transition().duration(DURATION)
        .attr('cx', d => xResidScale(d.gdp_resid))
        .attr('cy', d => yResidScale(d.deaths_resid))
        .attr('opacity', d => FEATURED.has(eventKey(d)) ? 1 : 0.2)
        .attr('r', d => FEATURED.has(eventKey(d)) ? 7 : 3);
      annotate(
        xResidScale, yResidScale,
        d => d.gdp_resid, d => d.deaths_resid,
      );
      break;
    }
  }
}

export function getPartialStats() { return stats; }
