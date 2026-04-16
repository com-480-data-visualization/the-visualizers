import * as d3 from 'd3';
import { INCOME_GROUPS, INCOME_COLORS, MARGIN, displayName } from '../utils/constants.js';
import { showTooltip, moveTooltip, hideTooltip, earthquakeTooltipHTML } from '../components/tooltip.js';
import { addAnnotation } from '../components/annotation.js';

let svg, g, dots;
let data;
let xScale, yScale, rScale;
let width, height;
let currentStep = 'time-1';

export function initTimeline(earthquakes) {
  data = earthquakes.filter(d => d.income_group != null);

  const container = document.getElementById('timeline-chart');
  const rect = container.getBoundingClientRect();
  const margin = { top: 30, right: 30, bottom: 40, left: 130 };
  width = rect.width - margin.left - margin.right;
  height = rect.height - margin.top - margin.bottom;

  svg = d3.select(container).append('svg')
    .attr('width', rect.width)
    .attr('height', rect.height);

  g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const [yMin, yMax] = d3.extent(data, d => d.year);
  xScale = d3.scaleLinear()
    .domain([yMin, yMax + 1])
    .range([0, width]);

  yScale = d3.scaleBand()
    .domain(INCOME_GROUPS)
    .range([0, height])
    .padding(0.1);

  rScale = d3.scaleSqrt()
    .domain([0, d3.max(data, d => d.deaths)])
    .range([1.5, 30]);

  // Income group bands
  INCOME_GROUPS.forEach((group, i) => {
    g.append('rect')
      .attr('class', 'income-band')
      .attr('x', 0)
      .attr('y', yScale(group))
      .attr('width', width)
      .attr('height', yScale.bandwidth())
      .attr('fill', i % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.05)');

    g.append('text')
      .attr('class', 'timeline-band-label')
      .attr('x', -10)
      .attr('y', yScale(group) + yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .text(group);
  });

  // X axis
  g.append('g')
    .attr('class', 'axis')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format('d')).ticks(12));

  // Earthquake dots
  dots = g.selectAll('.timeline-dot')
    .data(data)
    .join('circle')
    .attr('class', 'timeline-dot')
    .attr('cx', d => xScale(d.year) + (Math.random() - 0.5) * 4)
    .attr('cy', d => yScale(d.income_group) + yScale.bandwidth() / 2 + (Math.random() - 0.5) * yScale.bandwidth() * 0.6)
    .attr('r', d => rScale(d.deaths || 0))
    .attr('fill', d => INCOME_COLORS[d.income_group] || '#999')
    .attr('opacity', 0.45)
    .attr('stroke', '#fff')
    .attr('stroke-width', 0.3)
    .on('mouseenter', (event, d) => showTooltip(earthquakeTooltipHTML(d), event))
    .on('mousemove', moveTooltip)
    .on('mouseleave', hideTooltip);
}

export function onTimelineStep(stepId) {
  currentStep = stepId;

  switch (stepId) {
    case 'time-1':
      dots.transition().duration(600)
        .attr('opacity', 0.45);
      g.selectAll('.annotation').remove();
      break;

    case 'time-2':
      // Highlight deadliest events
      const top20 = [...data].sort((a, b) => (b.deaths || 0) - (a.deaths || 0)).slice(0, 15);
      const topSet = new Set(top20.map(d => `${d.country}-${d.year}-${d.mag}`));

      dots.transition().duration(600)
        .attr('opacity', d => {
          const key = `${d.country}-${d.year}-${d.mag}`;
          return topSet.has(key) ? 0.85 : 0.1;
        });

      // Add annotations for top 5
      g.selectAll('.annotation').remove();
      top20.slice(0, 5).forEach(d => {
        const cx = xScale(d.year);
        const cy = yScale(d.income_group) + yScale.bandwidth() / 2;
        addAnnotation(g, {
          x: cx, y: cy,
          dx: 30, dy: -20,
          text: `${displayName(d.country)} ${d.year}`,
          color: INCOME_COLORS[d.income_group]
        });
      });
      break;

    case 'time-3':
      dots.transition().duration(600)
        .attr('opacity', 0.5);
      g.selectAll('.annotation').remove();
      break;
  }
}
