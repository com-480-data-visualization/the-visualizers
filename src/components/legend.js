import * as d3 from 'd3';
import { REGION_COLORS, REGION_ORDER } from '../utils/constants.js';

export function addRegionLegend(g, x, y) {
  const legend = g.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${x},${y})`);

  legend.append('text')
    .attr('class', 'legend-title')
    .attr('y', -8)
    .text('Region');

  REGION_ORDER.forEach((region, i) => {
    const item = legend.append('g')
      .attr('class', 'legend-item')
      .attr('transform', `translate(0,${i * 18})`);

    item.append('circle')
      .attr('r', 5)
      .attr('fill', REGION_COLORS[region]);

    item.append('text')
      .attr('x', 12)
      .attr('y', 4)
      .text(region);
  });

  return legend;
}

export function addContinuousLegend(g, scale, x, y, width, label) {
  const legend = g.append('g')
    .attr('transform', `translate(${x},${y})`);

  const defs = g.select(function() { return this.ownerSVGElement; }).append('defs');
  const gradientId = `gradient-${Math.random().toString(36).slice(2, 8)}`;

  const gradient = defs.append('linearGradient')
    .attr('id', gradientId);

  const domain = scale.domain();
  const nStops = 10;
  for (let i = 0; i <= nStops; i++) {
    const t = i / nStops;
    const val = domain[0] + t * (domain[domain.length - 1] - domain[0]);
    gradient.append('stop')
      .attr('offset', `${t * 100}%`)
      .attr('stop-color', scale(val));
  }

  legend.append('rect')
    .attr('width', width)
    .attr('height', 10)
    .attr('rx', 2)
    .style('fill', `url(#${gradientId})`);

  legend.append('text')
    .attr('class', 'legend-title')
    .attr('y', -6)
    .text(label);

  const tickScale = d3.scaleLinear().domain(domain).range([0, width]);
  legend.append('g')
    .attr('transform', 'translate(0,10)')
    .call(d3.axisBottom(tickScale).ticks(4).tickSize(4))
    .select('.domain').remove();

  return legend;
}
