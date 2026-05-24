import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { magRadius, deathColorScale, deathColor } from '../utils/scales.js';
import { showTooltip, moveTooltip, hideTooltip, earthquakeTooltipHTML } from '../components/tooltip.js';

let svg, projection, path, g, earthquakeData, worldData;
let currentStep = 'globe-1';
let colorMode = 'uniform';
let sizeMode = 'uniform';
let rotationTimer;
let renderQueued = false;
let dotSelection;
let landSelection;
let graticuleSelection;
let globeCenter = [0, 0];
let globeCx = 0;
let globeCy = 0;
let deathScale;
let globeVisible = true;
const horizonMargin = 0.03;

export async function initGlobe(earthquakes) {
  earthquakeData = earthquakes.filter(d => d.lat != null && d.lon != null);

  const resp = await fetch(import.meta.env.BASE_URL + 'data/world-110m.json');
  worldData = await resp.json();

  const container = document.getElementById('globe-chart');
  const { width, height } = container.getBoundingClientRect();
  const size = Math.min(width, height) - 20;
  const cx = width / 2;
  const cy = height / 2;
  globeCx = cx;
  globeCy = cy;

  svg = d3.select(container).append('svg')
    .attr('width', width)
    .attr('height', height);

  projection = d3.geoOrthographic()
    .scale(size / 2.2)
    .translate([cx, cy])
    .clipAngle(90)
    .rotate([-20, -20]);

  path = d3.geoPath().projection(projection);

  deathScale = deathColorScale();

  svg.append('circle')
    .attr('class', 'globe-water')
    .attr('cx', cx)
    .attr('cy', cy)
    .attr('r', size / 2.2);

  graticuleSelection = svg.append('path')
    .datum(d3.geoGraticule()())
    .attr('class', 'globe-graticule')
    .attr('d', path);

  const countries = topojson.feature(worldData, worldData.objects.countries);
  g = svg.append('g');

  landSelection = g.selectAll('.globe-land')
    .data(countries.features)
    .join('path')
    .attr('class', 'globe-land')
    .attr('d', path);

  const dots = svg.append('g').attr('class', 'earthquake-dots');

  dotSelection = dots.selectAll('.earthquake-dot')
    .data(earthquakeData)
    .join('circle')
    .attr('class', 'earthquake-dot')
    .attr('transform', d => {
      const p = projection([d.lon, d.lat]);
      return p ? `translate(${p[0]},${p[1]})` : 'translate(-100,-100)';
    })
    .attr('r', 2)
    .attr('fill', '#dc2626')
    .attr('opacity', d => {
      const p = projection([d.lon, d.lat]);
      const c = d3.geoDistance([d.lon, d.lat], projection.invert([cx, cy]));
      return c > Math.PI / 2 - horizonMargin ? 0 : 0.6;
    })
    .on('mouseenter', (event, d) => showTooltip(earthquakeTooltipHTML(d), event))
    .on('mousemove', (event) => moveTooltip(event))
    .on('mouseleave', hideTooltip);

  const controls = d3.select(container).append('div')
    .attr('id', 'globe-controls')
    .attr('class', 'globe-controls')
    .style('display', 'none');

  const sizeGroup = controls.append('div').attr('class', 'ctrl-group');
  sizeGroup.append('span').attr('class', 'ctrl-label').text('Dot size');
  [['uniform', 'Uniform'], ['magnitude', 'Magnitude']].forEach(([val, label]) => {
    sizeGroup.append('button')
      .attr('class', val === 'uniform' ? 'ctrl-btn active' : 'ctrl-btn')
      .attr('data-mode', 'size')
      .attr('data-value', val)
      .text(label)
      .on('click', () => { sizeMode = val; syncButtons(); render(); });
  });

  const colorGroup = controls.append('div').attr('class', 'ctrl-group');
  colorGroup.append('span').attr('class', 'ctrl-label').text('Color');
  [['uniform', 'Uniform'], ['deaths', 'Deaths']].forEach(([val, label]) => {
    colorGroup.append('button')
      .attr('class', val === 'uniform' ? 'ctrl-btn active' : 'ctrl-btn')
      .attr('data-mode', 'color')
      .attr('data-value', val)
      .text(label)
      .on('click', () => { colorMode = val; syncButtons(); render(); });
  });

  const drag = d3.drag()
    .on('start', () => { if (rotationTimer) rotationTimer.stop(); })
    .on('drag', (event) => {
      const r = projection.rotate();
      projection.rotate([r[0] + event.dx * 0.3, r[1] - event.dy * 0.3]);
      scheduleRender();
    });

  svg.call(drag);

  const globeSection = document.getElementById('globe');
  if (globeSection) {
    const observer = new IntersectionObserver(entries => {
      globeVisible = entries[0].isIntersecting;
      if (globeVisible && !rotationTimer) startAutoRotate();
      else if (!globeVisible && rotationTimer) { rotationTimer.stop(); rotationTimer = null; }
    }, { threshold: 0.05 });
    observer.observe(globeSection);
  }

  startAutoRotate();
}

function startAutoRotate() {
  let lastTick = 0;
  rotationTimer = d3.timer(elapsed => {
    if (elapsed - lastTick < 33) return;
    lastTick = elapsed;
    const r = projection.rotate();
    projection.rotate([r[0] + 0.15, r[1]]);
    scheduleRender();
  });
}

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

function syncButtons() {
  d3.selectAll('#globe-controls .ctrl-btn').each(function() {
    const btn = d3.select(this);
    const mode = btn.attr('data-mode');
    const val = btn.attr('data-value');
    const active = (mode === 'size' && val === sizeMode) || (mode === 'color' && val === colorMode);
    btn.classed('active', active);
  });
}

function render() {
  globeCenter = projection.invert([globeCx, globeCy]);
  const halfPi = Math.PI / 2 - horizonMargin;

  landSelection.attr('d', path);
  graticuleSelection.attr('d', path);

  dotSelection.each(function(d) {
    const dist = d3.geoDistance([d.lon, d.lat], globeCenter);
    const hidden = dist > halfPi;
    const el = this;
    if (hidden) {
      el.setAttribute('opacity', 0);
      return;
    }
    const p = projection([d.lon, d.lat]);
    if (!p) { el.setAttribute('opacity', 0); return; }
    el.setAttribute('transform', `translate(${p[0]},${p[1]})`);
    el.setAttribute('r', sizeMode === 'magnitude' ? magRadius(d.mag, [1.5, 12]) : 2);
    el.setAttribute('fill', colorMode === 'deaths' ? deathColor(d.deaths, deathScale) : '#dc2626');
    el.setAttribute('opacity', 0.65);
  });
}

export function onGlobeStep(stepId) {
  currentStep = stepId;

  const panel = document.getElementById('globe-controls');

  switch (stepId) {
    case 'globe-1':
      sizeMode = 'uniform';
      colorMode = 'uniform';
      if (panel) panel.style.display = 'none';
      break;
    case 'globe-2':
      sizeMode = 'magnitude';
      colorMode = 'uniform';
      if (panel) panel.style.display = 'flex';
      break;
    case 'globe-3':
      sizeMode = 'magnitude';
      colorMode = 'deaths';
      if (panel) panel.style.display = 'flex';
      break;
    case 'globe-4':
      sizeMode = 'magnitude';
      colorMode = 'deaths';
      if (panel) panel.style.display = 'flex';
      syncButtons();
      if (rotationTimer) rotationTimer.stop();
      d3.transition().duration(2000).tween('rotate', () => {
        const r = d3.interpolate(projection.rotate(), [-170, -10]);
        return t => {
          projection.rotate(r(t));
          scheduleRender();
        };
      });
      return;
  }

  syncButtons();
  scheduleRender();
}
