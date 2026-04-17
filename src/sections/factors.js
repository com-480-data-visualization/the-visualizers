import * as d3 from 'd3';
import { showTooltip, moveTooltip, hideTooltip } from '../components/tooltip.js';
import { displayName } from '../utils/constants.js';

// Beeswarm of curated earthquake-prone countries on one axis: deaths/event (log).
// Dot size = avg magnitude. Dot color = simplified income bucket (2 groups).
// Payoff: color sorts left-to-right (rich → poor = safe → deadly), but dot size
// (magnitude) is scattered everywhere — proving magnitude isn't what separates them.

export const FEATURED = [
  'Haiti', 'Afghanistan', 'Nepal',
  'Pakistan', 'Iran, Islamic Rep.', 'Philippines',
  'Japan', 'Chile', 'New Zealand', 'Italy', 'United States',
];

// Collapse WB income groups to two buckets. Upper middle income countries
// are excluded from the curated set.
export function incomeBucket(income_group) {
  if (income_group === 'High income') return 'High income';
  if (income_group === 'Low income' || income_group === 'Lower middle income') {
    return 'Low & lower-middle income';
  }
  return null;
}

export const BUCKET_COLORS = {
  'High income': '#10b981',
  'Low & lower-middle income': '#dc2626',
};

let svg, g, width, height;
let dotsG;
let data;
let rScale;

export function initFactors(countries) {
  const byName = Object.fromEntries(countries.map(c => [c.country, c]));
  data = FEATURED
    .map(name => byName[name])
    .filter(c => c && c.deaths_per_event > 0 && c.avg_mag != null && incomeBucket(c.income_group))
    .map(c => ({ ...c, bucket: incomeBucket(c.income_group) }));

  const container = document.getElementById('factors-chart');
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
  const margin = { top: 80, right: 60, bottom: 80, left: 60 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  g.attr('transform', `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLog()
    .domain([
      d3.min(data, d => d.deaths_per_event) * 0.5,
      d3.max(data, d => d.deaths_per_event) * 1.5,
    ])
    .range([0, plotW]);

  rScale = d3.scaleSqrt()
    .domain(d3.extent(data, d => d.avg_mag))
    .range([10, 26]);

  const axisY = plotH - 20;
  const centerY = axisY - 140;

  // Pre-compute final positions via force simulation
  data.forEach(d => {
    d.tx = xScale(d.deaths_per_event);
    d.ty = centerY;
    d.r = rScale(d.avg_mag);
  });
  const sim = d3.forceSimulation(data)
    .force('x', d3.forceX(d => d.tx).strength(0.7))
    .force('y', d3.forceY(d => d.ty).strength(0.2))
    .force('collide', d3.forceCollide(d => d.r + 3).strength(0.95))
    .stop();
  for (let i = 0; i < 300; i++) sim.tick();

  // Horizontal guide line
  g.append('line')
    .attr('class', 'beeswarm-guide')
    .attr('x1', 0).attr('x2', plotW)
    .attr('y1', axisY).attr('y2', axisY);

  // X axis
  g.append('g')
    .attr('class', 'axis beeswarm-axis')
    .attr('transform', `translate(0,${axisY})`)
    .call(
      d3.axisBottom(xScale)
        .tickValues([0.1, 1, 10, 100, 1000, 10000, 100000].filter(
          v => v >= xScale.domain()[0] && v <= xScale.domain()[1]
        ))
        .tickFormat(d3.format('~s'))
    );

  g.append('text')
    .attr('class', 'beeswarm-axis-title')
    .attr('x', plotW / 2)
    .attr('y', axisY + 45)
    .attr('text-anchor', 'middle')
    .text('Deaths per earthquake — log scale');

  // Polar-end labels
  g.append('text')
    .attr('class', 'beeswarm-endlabel')
    .attr('x', 0).attr('y', axisY + 22)
    .attr('fill', '#10b981')
    .text('← fewer deaths');

  g.append('text')
    .attr('class', 'beeswarm-endlabel')
    .attr('x', plotW).attr('y', axisY + 22)
    .attr('text-anchor', 'end')
    .attr('fill', '#dc2626')
    .text('more deaths →');

  // Dots
  dotsG = g.append('g').attr('class', 'beeswarm-dots');

  const dot = dotsG.selectAll('g.beeswarm-dot')
    .data(data)
    .join('g')
    .attr('class', 'beeswarm-dot')
    .attr('transform', d => `translate(${d.x},${centerY + 220})`)
    .style('opacity', 0);

  dot.append('circle')
    .attr('r', d => d.r)
    .attr('fill', d => BUCKET_COLORS[d.bucket])
    .attr('stroke', '#fff')
    .attr('stroke-width', 2);

  dot.append('text')
    .attr('class', 'beeswarm-label')
    .attr('y', d => -d.r - 6)
    .attr('text-anchor', 'middle')
    .text(d => displayName(d.country));

  dot.on('mouseenter', function (event, d) {
    d3.select(this).select('circle')
      .attr('stroke', '#1a1a2e')
      .attr('stroke-width', 3);
    d3.select(this).raise();
    showTooltip(tooltipHTML(d), event);
  })
  .on('mousemove', moveTooltip)
  .on('mouseleave', function () {
    d3.select(this).select('circle')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);
    hideTooltip();
  });

  // Entry animation: drop in, staggered
  dot.transition()
    .duration(900)
    .delay((d, i) => 80 + i * 45)
    .ease(d3.easeCubicOut)
    .style('opacity', 1)
    .attr('transform', d => `translate(${d.x},${d.y})`);

  renderLegend(margin);
}

function renderLegend(margin) {
  const categories = ['High income', 'Low & lower-middle income'];
  const legend = svg.append('g')
    .attr('class', 'beeswarm-legend')
    .attr('transform', `translate(${margin.left}, 24)`);

  const item = legend.selectAll('g.beeswarm-income-item')
    .data(categories)
    .join('g')
    .attr('class', 'beeswarm-income-item')
    .attr('transform', (d, i) => `translate(${i * 200}, 0)`);

  item.append('circle')
    .attr('r', 7).attr('cx', 8).attr('cy', 8)
    .attr('fill', d => BUCKET_COLORS[d])
    .attr('stroke', '#fff').attr('stroke-width', 1.5);

  item.append('text')
    .attr('class', 'beeswarm-legend-text')
    .attr('x', 22).attr('y', 12)
    .text(d => d);

  // Size legend (magnitude)
  const sizeLegend = svg.append('g')
    .attr('class', 'beeswarm-size-legend')
    .attr('transform', `translate(${width - margin.right - 160}, 24)`);

  const sizeStops = [
    { mag: d3.min(data, d => d.avg_mag), label: 'low mag' },
    { mag: d3.max(data, d => d.avg_mag), label: 'high mag' },
  ];

  sizeLegend.append('text')
    .attr('class', 'beeswarm-legend-text')
    .attr('x', 0).attr('y', 12)
    .text('Size = avg magnitude');

  sizeStops.forEach((s, i) => {
    const cx = 105 + i * 36;
    sizeLegend.append('circle')
      .attr('cx', cx).attr('cy', 8)
      .attr('r', rScale(s.mag) * 0.45)
      .attr('fill', '#888')
      .attr('stroke', '#fff').attr('stroke-width', 1.5);
  });
}

function tooltipHTML(d) {
  return `
    <div class="tooltip-title">${displayName(d.country)}</div>
    <div class="tooltip-row"><span class="tooltip-label">Income</span><span class="tooltip-value">${d.income_group}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Events</span><span class="tooltip-value">${d.events}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Avg magnitude</span><span class="tooltip-value">${d.avg_mag.toFixed(2)}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Deaths/event</span><span class="tooltip-value">${d.deaths_per_event.toFixed(1)}</span></div>
  `;
}

function highlight(predicate) {
  if (!dotsG) return;
  dotsG.selectAll('g.beeswarm-dot')
    .transition().duration(450)
    .style('opacity', d => predicate(d) ? 1 : 0.12);
}

export function onFactorsStep(stepId) {
  if (!dotsG) return;
  if (stepId === 'factors-2') {
    highlight(d => d.bucket === 'Low & lower-middle income');
  } else if (stepId === 'factors-3') {
    highlight(d => d.bucket === 'High income');
  } else {
    highlight(() => true);
  }
}
