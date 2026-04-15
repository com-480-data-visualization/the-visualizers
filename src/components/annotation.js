export function addAnnotation(g, { x, y, dx, dy, text, color = '#555' }) {
  const ann = g.append('g').attr('class', 'annotation');

  // Line from point to label
  ann.append('line')
    .attr('class', 'annotation-line')
    .attr('x1', x)
    .attr('y1', y)
    .attr('x2', x + dx)
    .attr('y2', y + dy)
    .attr('stroke', color);

  // Text label
  ann.append('text')
    .attr('class', 'annotation-text')
    .attr('x', x + dx)
    .attr('y', y + dy - 4)
    .attr('text-anchor', dx > 0 ? 'start' : 'end')
    .attr('fill', color)
    .text(text);

  // Small dot at the data point
  ann.append('circle')
    .attr('cx', x)
    .attr('cy', y)
    .attr('r', 3)
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', 1.5);

  return ann;
}
