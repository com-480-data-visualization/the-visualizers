import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { magRadius, deathColorScale, deathColor } from '../utils/scales.js';
import { showTooltip, moveTooltip, hideTooltip, earthquakeTooltipHTML } from '../components/tooltip.js';

let svg, projection, path, g, earthquakeData, worldData;
let currentStep = 'globe-1';
let colorMode = 'uniform'; // 'uniform' | 'deaths'
let sizeMode = 'uniform';  // 'uniform' | 'magnitude'
let rotationTimer;

export async function initGlobe(earthquakes) {
  earthquakeData = earthquakes.filter(d => d.lat != null && d.lon != null);

  const resp = await fetch(import.meta.env.BASE_URL + 'data/world-110m.json');
  worldData = await resp.json();

  const container = document.getElementById('globe-chart');
  const { width, height } = container.getBoundingClientRect();
  const size = Math.min(width, height) - 20;
  const cx = width / 2;
  const cy = height / 2;

  svg = d3.select(container).append('svg')
    .attr('width', width)
    .attr('height', height);

  projection = d3.geoOrthographic()
    .scale(size / 2.2)
    .translate([cx, cy])
    .clipAngle(90)
    .rotate([-20, -20]);

  path = d3.geoPath().projection(projection);

  const dScale = deathColorScale();

  // Water
  svg.append('circle')
    .attr('class', 'globe-water')
    .attr('cx', cx)
    .attr('cy', cy)
    .attr('r', size / 2.2);

  // Graticule
  svg.append('path')
    .datum(d3.geoGraticule()())
    .attr('class', 'globe-graticule')
    .attr('d', path);

  // Land
  const countries = topojson.feature(worldData, worldData.objects.countries);
  g = svg.append('g');

  g.selectAll('.globe-land')
    .data(countries.features)
    .join('path')
    .attr('class', 'globe-land')
    .attr('d', path);

  // Earthquake dots
  const dots = svg.append('g').attr('class', 'earthquake-dots');

  dots.selectAll('.earthquake-dot')
    .data(earthquakeData)
    .join('circle')
    .attr('class', 'earthquake-dot')
    .attr('cx', d => {
      const p = projection([d.lon, d.lat]);
      return p ? p[0] : -100;
    })
    .attr('cy', d => {
      const p = projection([d.lon, d.lat]);
      return p ? p[1] : -100;
    })
    .attr('r', 2)
    .attr('fill', '#dc2626')
    .attr('opacity', d => {
      const p = projection([d.lon, d.lat]);
      const c = d3.geoDistance([d.lon, d.lat], projection.invert([cx, cy]));
      return c > Math.PI / 2 ? 0 : 0.6;
    })
    .on('mouseenter', (event, d) => showTooltip(earthquakeTooltipHTML(d), event))
    .on('mousemove', (event) => moveTooltip(event))
    .on('mouseleave', hideTooltip);

  // Drag rotation
  const drag = d3.drag()
    .on('start', () => { if (rotationTimer) rotationTimer.stop(); })
    .on('drag', (event) => {
      const r = projection.rotate();
      projection.rotate([r[0] + event.dx * 0.3, r[1] - event.dy * 0.3]);
      render();
    });

  svg.call(drag);

  // Start auto-rotation
  startAutoRotate();
}

function startAutoRotate() {
  rotationTimer = d3.timer(elapsed => {
    const r = projection.rotate();
    projection.rotate([r[0] + 0.08, r[1]]);
    render();
  });
}

function render() {
  const dScale = deathColorScale();
  const cx = +svg.select('.globe-water').attr('cx');
  const cy = +svg.select('.globe-water').attr('cy');

  svg.selectAll('.globe-land').attr('d', path);
  svg.selectAll('.globe-graticule').attr('d', path);

  svg.selectAll('.earthquake-dot')
    .attr('cx', d => {
      const p = projection([d.lon, d.lat]);
      return p ? p[0] : -100;
    })
    .attr('cy', d => {
      const p = projection([d.lon, d.lat]);
      return p ? p[1] : -100;
    })
    .attr('r', d => {
      if (sizeMode === 'magnitude') return magRadius(d.mag, [1.5, 12]);
      return 2;
    })
    .attr('fill', d => {
      if (colorMode === 'deaths') return deathColor(d.deaths, dScale);
      return '#dc2626';
    })
    .attr('opacity', d => {
      const dist = d3.geoDistance([d.lon, d.lat], projection.invert([cx, cy]));
      return dist > Math.PI / 2 ? 0 : 0.65;
    });
}

export function onGlobeStep(stepId) {
  currentStep = stepId;

  switch (stepId) {
    case 'globe-1':
      sizeMode = 'uniform';
      colorMode = 'uniform';
      break;
    case 'globe-2':
      sizeMode = 'magnitude';
      colorMode = 'uniform';
      break;
    case 'globe-3':
      sizeMode = 'magnitude';
      colorMode = 'deaths';
      break;
    case 'globe-4':
      sizeMode = 'magnitude';
      colorMode = 'deaths';
      // Rotate to Pacific
      if (rotationTimer) rotationTimer.stop();
      d3.transition().duration(2000).tween('rotate', () => {
        const r = d3.interpolate(projection.rotate(), [-170, -10]);
        return t => {
          projection.rotate(r(t));
          render();
        };
      });
      return;
  }

  render();
}
