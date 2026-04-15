import * as d3 from 'd3';

export function addXAxis(g, scale, height, label, opts = {}) {
  const { tickFormat, ticks, tickValues } = opts;
  const axis = d3.axisBottom(scale);
  if (tickFormat) axis.tickFormat(tickFormat);
  if (tickValues) axis.tickValues(tickValues);
  else if (ticks) axis.ticks(ticks);

  const gAxis = g.append('g')
    .attr('class', 'axis x-axis')
    .attr('transform', `translate(0,${height})`)
    .call(axis);

  if (label) {
    gAxis.append('text')
      .attr('class', 'axis-label')
      .attr('x', scale.range()[1] / 2 + scale.range()[0] / 2)
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .text(label);
  }

  return gAxis;
}

export function addYAxis(g, scale, label, opts = {}) {
  const { tickFormat, ticks, tickValues } = opts;
  const axis = d3.axisLeft(scale);
  if (tickFormat) axis.tickFormat(tickFormat);
  if (tickValues) axis.tickValues(tickValues);
  else if (ticks) axis.ticks(ticks);

  const gAxis = g.append('g')
    .attr('class', 'axis y-axis')
    .call(axis);

  if (label) {
    gAxis.append('text')
      .attr('class', 'axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -(scale.range()[0] + scale.range()[1]) / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .text(label);
  }

  return gAxis;
}

export function addGrid(g, xScale, yScale, width, height) {
  g.append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickSize(-height).tickFormat(''))
    .select('.domain').remove();

  g.append('g')
    .attr('class', 'grid')
    .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(''))
    .select('.domain').remove();
}
