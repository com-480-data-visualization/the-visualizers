import * as d3 from 'd3';
import { showTooltip, moveTooltip, hideTooltip } from '../components/tooltip.js';
import { displayName } from '../utils/constants.js';
import { FEATURED, incomeBucket, BUCKET_COLORS } from './factors.js';

// Parallel-coordinates plot for the same curated country sample as the beeswarm.
// 7 axes (GDP → Deaths/event). Lines colored by simplified income bucket
// (High income vs Low & lower-middle income). No brushing — scrollytelling
// steps drive the opacity filter.

let svg, g, width, height;
let data;
let xScale;
const yScales = {};
let paths;

const DIMENSIONS = [
  { key: 'avg_gdp',           label: 'GDP per capita',   scale: 'log',    fmt: (v) => '$' + d3.format(',.0f')(v) },
  { key: 'hdi',               label: 'HDI',              scale: 'linear', fmt: d3.format('.2f') },
  { key: 'avg_hospital_beds', label: 'Hospital beds/1K', scale: 'linear', fmt: d3.format('.1f') },
  { key: 'avg_urban_pct',     label: 'Urban %',          scale: 'linear', fmt: (v) => d3.format('.0f')(v) + '%' },
  { key: 'avg_pop_density',   label: 'Pop. density',     scale: 'log',    fmt: d3.format(',.0f') },
  { key: 'avg_mag',           label: 'Avg magnitude',    scale: 'linear', fmt: d3.format('.2f') },
  { key: 'deaths_per_event',  label: 'Deaths/event',     scale: 'log',    fmt: d3.format(',.1f') },
];

export function initProfiles(countries) {
  const byName = Object.fromEntries(countries.map(c => [c.country, c]));
  data = FEATURED
    .map(name => byName[name])
    .filter(c =>
      c && c.deaths_per_event > 0 && incomeBucket(c.income_group) &&
      DIMENSIONS.every(dim => c[dim.key] != null && c[dim.key] > 0)
    )
    .map(c => ({ ...c, bucket: incomeBucket(c.income_group) }));

  const container = document.getElementById('profiles-chart');
  const rect = container.getBoundingClientRect();
  width = rect.width;
  height = rect.height;

  svg = d3.select(container).append('svg')
    .attr('width', width)
    .attr('height', height);

  g = svg.append('g');

  render();
}

function render() {
  const margin = { top: 70, right: 100, bottom: 50, left: 80 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  g.attr('transform', `translate(${margin.left},${margin.top})`);

  xScale = d3.scalePoint()
    .domain(DIMENSIONS.map(d => d.key))
    .range([0, plotW])
    .padding(0.1);

  DIMENSIONS.forEach(dim => {
    const values = data.map(d => d[dim.key]);
    const extent = d3.extent(values);
    const padded = dim.scale === 'log'
      ? [extent[0] * 0.85, extent[1] * 1.15]
      : [extent[0] - (extent[1] - extent[0]) * 0.05, extent[1] + (extent[1] - extent[0]) * 0.05];
    yScales[dim.key] = dim.scale === 'log'
      ? d3.scaleLog().domain(padded).range([plotH, 0]).nice()
      : d3.scaleLinear().domain(padded).range([plotH, 0]).nice();
  });

  const linePath = (d) => {
    const pts = DIMENSIONS.map(dim => [xScale(dim.key), yScales[dim.key](d[dim.key])]);
    return d3.line().curve(d3.curveMonotoneX)(pts);
  };

  paths = g.append('g')
    .attr('class', 'pc-lines')
    .selectAll('path')
    .data(data)
    .join('path')
    .attr('class', 'pc-line')
    .attr('d', linePath)
    .attr('fill', 'none')
    .attr('stroke', d => BUCKET_COLORS[d.bucket])
    .attr('stroke-width', 2.5)
    .attr('opacity', 0)
    .on('mouseenter', function (event, d) {
      d3.select(this).attr('stroke-width', 4.5).raise();
      showTooltip(tooltipHTML(d), event);
    })
    .on('mousemove', moveTooltip)
    .on('mouseleave', function () {
      d3.select(this).attr('stroke-width', 2.5);
      hideTooltip();
    });

  paths.transition()
    .duration(800)
    .delay((d, i) => i * 60)
    .ease(d3.easeCubicOut)
    .attr('opacity', 0.75);

  // Country labels at the right (next to deaths/event axis)
  g.append('g').attr('class', 'pc-labels')
    .selectAll('text')
    .data(data)
    .join('text')
    .attr('class', 'pc-country-label')
    .attr('x', xScale('deaths_per_event') + 8)
    .attr('y', d => yScales['deaths_per_event'](d.deaths_per_event))
    .attr('dy', '0.32em')
    .attr('fill', d => BUCKET_COLORS[d.bucket])
    .style('opacity', 0)
    .text(d => displayName(d.country))
    .transition().delay(800).duration(600)
    .style('opacity', 1);

  // Axes
  const axisRoot = g.append('g').attr('class', 'pc-axes');

  DIMENSIONS.forEach(dim => {
    const axisG = axisRoot.append('g')
      .attr('class', 'pc-axis')
      .attr('transform', `translate(${xScale(dim.key)},0)`);

    const yScale = yScales[dim.key];
    const axis = d3.axisLeft(yScale).ticks(5);
    if (dim.scale === 'log') axis.tickFormat(d3.format('~s'));
    else if (dim.key === 'hdi') axis.tickFormat(d3.format('.2f'));
    axisG.call(axis);

    axisG.append('text')
      .attr('class', 'pc-axis-label')
      .attr('y', -22)
      .attr('text-anchor', 'middle')
      .text(dim.label);
  });

  renderLegend(margin);
}

function renderLegend(margin) {
  const categories = ['High income', 'Low & lower-middle income'];
  const legend = svg.append('g')
    .attr('class', 'pc-legend')
    .attr('transform', `translate(${margin.left}, 24)`);

  const item = legend.selectAll('g')
    .data(categories)
    .join('g')
    .attr('transform', (d, i) => `translate(${i * 200}, 0)`);

  item.append('line')
    .attr('x1', 0).attr('x2', 24).attr('y1', 8).attr('y2', 8)
    .attr('stroke', d => BUCKET_COLORS[d])
    .attr('stroke-width', 3);

  item.append('text')
    .attr('class', 'pc-legend-label')
    .attr('x', 30).attr('y', 12)
    .text(d => d);
}

function tooltipHTML(d) {
  const rows = DIMENSIONS.map(dim => `
    <div class="tooltip-row">
      <span class="tooltip-label">${dim.label}</span>
      <span class="tooltip-value">${dim.fmt(d[dim.key])}</span>
    </div>
  `).join('');
  return `
    <div class="tooltip-title">${displayName(d.country)}</div>
    <div class="tooltip-row"><span class="tooltip-label">Income</span><span class="tooltip-value">${d.income_group}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Events</span><span class="tooltip-value">${d.events}</span></div>
    ${rows}
  `;
}

function filterLines(predicate) {
  if (!paths) return;
  paths.transition().duration(450)
    .attr('opacity', d => predicate(d) ? 0.9 : 0.05);
}

export function onProfilesStep(stepId) {
  if (!paths) return;
  if (stepId === 'profiles-2') {
    filterLines(d => d.bucket === 'Low & lower-middle income');
  } else if (stepId === 'profiles-3') {
    filterLines(d => d.bucket === 'High income');
  } else {
    filterLines(() => true);
  }
}
