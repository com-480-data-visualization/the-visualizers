import * as d3 from 'd3';
import { MARGIN } from '../utils/constants.js';
import { addXAxis, addYAxis, addGrid } from '../components/axis.js';
import { addAnnotation } from '../components/annotation.js';
import { gdpColorScale, gdpColor } from '../utils/scales.js';
import { linearRegression, pearsonR } from '../utils/data-transforms.js';
import { showTooltip, moveTooltip, hideTooltip, earthquakeTooltipHTML } from '../components/tooltip.js';

let svg, g, dots, data;
let xScale, yScale;
let width, height;
let currentStep = 'mag-1';

export function initMagnitudeMythChart(earthquakes) {
  data = earthquakes.filter(d => d.deaths > 0 && d.mag != null);

  const container = document.getElementById('magnitude-chart');
  const rect = container.getBoundingClientRect();
  width = rect.width - MARGIN.left - MARGIN.right;
  height = rect.height - MARGIN.top - MARGIN.bottom;

  svg = d3.select(container).append('svg')
    .attr('width', rect.width)
    .attr('height', rect.height);

  g = svg.append('g')
    .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

  xScale = d3.scaleLinear()
    .domain([d3.min(data, d => d.mag) - 0.2, d3.max(data, d => d.mag) + 0.2])
    .range([0, width]);

  yScale = d3.scaleLog()
    .domain([1, d3.max(data, d => d.deaths)])
    .range([height, 0]);

  addGrid(g, xScale, yScale, width, height);
  addXAxis(g, xScale, height, 'Magnitude');
  addYAxis(g, yScale, 'Deaths (log scale)', {
    tickFormat: d => d >= 1000 ? d3.format('.0s')(d) : d
  });

  // Dots
  dots = g.selectAll('.scatter-dot')
    .data(data)
    .join('circle')
    .attr('class', 'scatter-dot')
    .attr('cx', d => xScale(d.mag))
    .attr('cy', d => yScale(Math.max(1, d.deaths)))
    .attr('r', 4)
    .attr('fill', '#888')
    .attr('opacity', 0.5)
    .on('mouseenter', (event, d) => showTooltip(earthquakeTooltipHTML(d), event))
    .on('mousemove', (event) => moveTooltip(event))
    .on('mouseleave', hideTooltip);

  // Prepare regression lines (hidden initially)
  const magX = data.map(d => d.mag);
  const logDeaths = data.map(d => Math.log10(Math.max(1, d.deaths)));
  const magReg = linearRegression(magX, logDeaths);
  const magR = pearsonR(magX, logDeaths);

  const magLine = g.append('line')
    .attr('class', 'regression-line')
    .attr('x1', xScale(xScale.domain()[0]))
    .attr('y1', yScale(Math.pow(10, magReg.intercept + magReg.slope * xScale.domain()[0])))
    .attr('x2', xScale(xScale.domain()[1]))
    .attr('y2', yScale(Math.pow(10, magReg.intercept + magReg.slope * xScale.domain()[1])))
    .attr('stroke', '#888')
    .attr('opacity', 0);

  const magLabel = g.append('text')
    .attr('class', 'annotation-label')
    .attr('x', width - 10)
    .attr('y', yScale(Math.pow(10, magReg.intercept + magReg.slope * xScale.domain()[1])) - 8)
    .attr('text-anchor', 'end')
    .attr('fill', '#888')
    .attr('opacity', 0)
    .text(`Magnitude: r = ${magR?.toFixed(2)}`);

  // Store references
  svg.node().__magLine = magLine;
  svg.node().__magLabel = magLabel;
}

export function onMagnitudeStep(stepId) {
  currentStep = stepId;
  const gdpScale = gdpColorScale();
  const magLine = svg.node().__magLine;
  const magLabel = svg.node().__magLabel;

  switch (stepId) {
    case 'mag-1':
      dots.transition().duration(600)
        .attr('fill', '#888')
        .attr('opacity', 0.5);
      magLine.transition().duration(400).attr('opacity', 0);
      magLabel.transition().duration(400).attr('opacity', 0);
      g.selectAll('.annotation').remove();
      break;

    case 'mag-2':
      dots.transition().duration(600)
        .attr('fill', '#888')
        .attr('opacity', 0.5);
      magLine.transition().duration(600).attr('opacity', 0.7);
      magLabel.transition().duration(600).attr('opacity', 1);
      break;

    case 'mag-3':
      // Color by GDP — the "aha" moment
      dots.transition().duration(1200)
        .attr('fill', d => gdpColor(d.gdp_pc, gdpScale))
        .attr('opacity', 0.7);
      magLine.transition().duration(400).attr('opacity', 0.3);
      break;

    case 'mag-4':
      dots.transition().duration(600)
        .attr('fill', d => gdpColor(d.gdp_pc, gdpScale))
        .attr('opacity', d => {
          // Highlight Haiti and Chile 2010
          if (d.country === 'Haiti' && d.year === 2010) return 1;
          if (d.country === 'Chile' && d.year === 2010) return 1;
          return 0.35;
        })
        .attr('r', d => {
          if (d.country === 'Haiti' && d.year === 2010) return 8;
          if (d.country === 'Chile' && d.year === 2010) return 8;
          return 4;
        });

      // Annotations
      g.selectAll('.annotation').remove();
      const haiti = data.find(d => d.country === 'Haiti' && d.year === 2010);
      const chile = data.find(d => d.country === 'Chile' && d.year === 2010);

      const fmtDeaths = n => n >= 1000 ? `${Math.round(n / 1000)}K` : String(n);
      if (haiti) {
        addAnnotation(g, {
          x: xScale(haiti.mag),
          y: yScale(Math.max(1, haiti.deaths)),
          dx: -60, dy: -30,
          text: `Haiti ${haiti.year} (M${haiti.mag.toFixed(1)}, ${fmtDeaths(haiti.deaths)} deaths)`,
          color: '#dc2626'
        });
      }
      if (chile) {
        addAnnotation(g, {
          x: xScale(chile.mag),
          y: yScale(Math.max(1, chile.deaths)),
          dx: -80, dy: 30,
          text: `Chile ${chile.year} (M${chile.mag.toFixed(1)}, ${fmtDeaths(chile.deaths)} deaths)`,
          color: '#10b981'
        });
      }
      break;
  }
}
