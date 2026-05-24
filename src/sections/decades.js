import * as d3 from 'd3';
import { aggregateByCountryDecade } from '../utils/data-transforms.js';
import { INCOME_COLORS, INCOME_GROUPS, displayName } from '../utils/constants.js';
import { fmtDollar, fmtDeaths } from '../utils/formats.js';
import { addXAxis, addYAxis } from '../components/axis.js';
import { showTooltip, moveTooltip, hideTooltip } from '../components/tooltip.js';

const DECADES = [1960, 1970, 1980, 1990, 2000, 2010, 2020];
const STEP_MS = 1400;
const FREEZE_MS = 900;
const FADED_OPACITY = 0.15;
const ACTIVE_OPACITY = 0.85;

const ANCHOR_COUNTRIES = new Set([
  'Haiti', 'Nepal', 'Iran, Islamic Rep.',
  'Chile', 'United States', 'Japan',
]);

let svg, g, plotG, labelsG, medianG, decadeLabel, replayBtn;
let xScale, yScale;
let plotW, plotH;
let countries;
let decadeMedians;
let currentDecade = null;
let autoplayToken = 0;

export function initDecades(earthquakes) {
  const flat = aggregateByCountryDecade(earthquakes);

  const byCountry = new Map();
  for (const row of flat) {
    if (!byCountry.has(row.country)) {
      byCountry.set(row.country, {
        country: row.country,
        country_code: row.country_code,
        income_group: row.income_group,
        region: row.region,
        frames: new Map(),
      });
    }
    byCountry.get(row.country).frames.set(row.decade, row);
  }
  countries = Array.from(byCountry.values())
    .filter(c => c.frames.size > 0 && INCOME_COLORS[c.income_group]);

  decadeMedians = DECADES.map(decade => {
    const deaths = countries
      .map(c => c.frames.get(decade))
      .filter(Boolean)
      .map(f => f.deaths_per_event);
    return {
      decade,
      deaths: d3.median(deaths),
      n: deaths.length,
    };
  });

  const container = document.getElementById('decades-chart');
  const rect = container.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  svg = d3.select(container).append('svg')
    .attr('width', width)
    .attr('height', height);

  const margin = { top: 40, right: 90, bottom: 60, left: 70 };
  plotW = width - margin.left - margin.right;
  plotH = height - margin.top - margin.bottom;

  g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  xScale = d3.scaleLog().domain([50, 120000]).range([0, plotW]).clamp(true);
  yScale = d3.scaleLog().domain([1, 1_000_000]).range([plotH, 0]);

  decadeMedians.forEach(m => { m.y = yScale(m.deaths); });

  decadeLabel = g.append('text')
    .attr('class', 'gapminder-year-label')
    .attr('x', plotW - 20)
    .attr('y', 80)
    .attr('text-anchor', 'end')
    .text('');

  addXAxis(g, xScale, plotH, 'GDP per capita (USD, log scale)', {
    tickValues: [50, 100, 500, 2000, 10000, 50000],
    tickFormat: fmtDollar,
  });
  addYAxis(g, yScale, 'Deaths per earthquake (log scale)', {
    tickValues: [1, 10, 100, 1000, 10000, 100000, 1000000],
    tickFormat: fmtDeaths,
  });

  plotG = g.append('g').attr('class', 'decades-dots');

  plotG.selectAll('circle.gapminder-bubble')
    .data(countries, d => d.country)
    .join('circle')
    .attr('class', 'gapminder-bubble')
    .attr('r', 7)
    .attr('fill', d => INCOME_COLORS[d.income_group])
    .attr('cx', plotW / 2)
    .attr('cy', plotH / 2)
    .attr('opacity', 0)
    .on('mouseenter', function (event, d) {
      d3.select(this).attr('r', 10);
      showTooltip(tooltipHTML(d), event);
    })
    .on('mousemove', moveTooltip)
    .on('mouseleave', function () {
      d3.select(this).attr('r', 7);
      hideTooltip();
    });

  labelsG = g.append('g').attr('class', 'decades-labels').attr('pointer-events', 'none');
  const anchors = countries.filter(c => ANCHOR_COUNTRIES.has(c.country));
  labelsG.selectAll('text.gapminder-country-label')
    .data(anchors, d => d.country)
    .join('text')
    .attr('class', 'gapminder-country-label')
    .attr('text-anchor', 'middle')
    .attr('x', plotW / 2)
    .attr('y', plotH / 2)
    .attr('opacity', 0)
    .text(d => displayName(d.country));

  medianG = g.append('g').attr('class', 'decades-median').attr('pointer-events', 'none');

  const medianRow = medianG.selectAll('g.decades-median-row')
    .data(decadeMedians, m => m.decade)
    .join('g')
    .attr('class', 'decades-median-row')
    .attr('transform', m => `translate(0, ${m.y})`)
    .attr('opacity', 0);

  medianRow.append('line')
    .attr('x1', 0).attr('x2', plotW)
    .attr('y1', 0).attr('y2', 0)
    .attr('stroke', '#1a1a2e')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4 3');

  medianRow.append('text')
    .attr('x', plotW + 8)
    .attr('y', 4)
    .attr('font-family', "'IBM Plex Mono', monospace")
    .attr('font-size', 11)
    .attr('font-weight', 500)
    .attr('fill', '#1a1a2e')
    .text(m => `${m.decade}s · ${fmtDeaths(Math.round(m.deaths))}`);

  renderLegend();

  replayBtn = document.createElement('button');
  replayBtn.className = 'decades-replay-btn';
  replayBtn.textContent = '↻ Replay';
  replayBtn.style.display = 'none';
  replayBtn.addEventListener('click', () => {
    playAutoplay();
  });
  container.appendChild(replayBtn);

  setDecade(1960, { animate: false });
  setMedianReveal(1960, { animate: false });
}

function renderLegend() {
  const legend = g.append('g')
    .attr('class', 'decades-legend')
    .attr('transform', `translate(10, 10)`);

  INCOME_GROUPS.forEach((group, i) => {
    const row = legend.append('g').attr('transform', `translate(0, ${i * 18})`);
    row.append('circle').attr('r', 5).attr('cx', 6).attr('cy', 6)
      .attr('fill', INCOME_COLORS[group]);
    row.append('text')
      .attr('x', 18).attr('y', 10)
      .attr('class', 'decades-legend-text')
      .text(group);
  });

  const medianRow = legend.append('g')
    .attr('transform', `translate(0, ${INCOME_GROUPS.length * 18 + 6})`);
  medianRow.append('line')
    .attr('x1', 0).attr('x2', 14).attr('y1', 7).attr('y2', 7)
    .attr('stroke', '#1a1a2e').attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '3 2');
  medianRow.append('text')
    .attr('x', 20).attr('y', 10)
    .attr('class', 'decades-legend-text')
    .text('Decade median');
}

function frameFor(country, decade) {
  if (country.frames.has(decade)) {
    return { frame: country.frames.get(decade), exact: true };
  }
  for (let d = decade - 10; d >= DECADES[0]; d -= 10) {
    if (country.frames.has(d)) return { frame: country.frames.get(d), exact: false };
  }
  for (let d = decade + 10; d <= DECADES[DECADES.length - 1]; d += 10) {
    if (country.frames.has(d)) return { frame: country.frames.get(d), exact: false };
  }
  return null;
}

function setDecade(decade, { animate = true, durationMs = FREEZE_MS } = {}) {
  currentDecade = decade;
  decadeLabel.text(`${decade}s`);

  const ease = d3.easeCubicInOut;
  const xOf = d => { const h = frameFor(d, decade); return h ? xScale(h.frame.mean_gdp_pc) : plotW / 2; };
  const yOf = d => { const h = frameFor(d, decade); return h ? yScale(h.frame.deaths_per_event) : plotH / 2; };
  const opOf = d => { const h = frameFor(d, decade); if (!h) return 0; return h.exact ? ACTIVE_OPACITY : FADED_OPACITY; };

  const dots = plotG.selectAll('circle.gapminder-bubble');
  const labels = labelsG.selectAll('text.gapminder-country-label');

  const dotTrans = animate ? dots.transition().duration(durationMs).ease(ease) : dots;
  dotTrans.attr('cx', xOf).attr('cy', yOf).attr('opacity', opOf);

  const labelTrans = animate ? labels.transition().duration(durationMs).ease(ease) : labels;
  labelTrans
    .attr('x', xOf)
    .attr('y', d => yOf(d) - 14)
    .attr('opacity', d => {
      const h = frameFor(d, decade);
      if (!h) return 0;
      return h.exact ? 1 : 0.4;
    });
}

function setMedianReveal(upToDecade, { animate = true } = {}) {
  const dur = animate ? 400 : 0;
  const rows = medianG.selectAll('g.decades-median-row');

  if (upToDecade === null) {
    rows.transition().duration(dur).attr('opacity', 0);
    return;
  }

  rows.transition().duration(dur)
    .attr('opacity', m => {
      if (m.decade > upToDecade) return 0;
      return m.decade === upToDecade ? 1 : 0.35;
    });

  rows.select('line').transition().duration(dur)
    .attr('stroke-width', m => m.decade === upToDecade ? 2 : 1);
}

function playAutoplay() {
  autoplayToken += 1;
  const myToken = autoplayToken;

  if (replayBtn) replayBtn.style.display = 'none';

  setDecade(DECADES[0], { animate: false });
  setMedianReveal(DECADES[0], { animate: false });

  let i = 1;
  function tick() {
    if (myToken !== autoplayToken) return;
    if (i >= DECADES.length) {
      if (replayBtn) replayBtn.style.display = 'inline-block';
      return;
    }
    const d = DECADES[i];
    setDecade(d, { animate: true, durationMs: STEP_MS - 100 });
    setMedianReveal(d, { animate: true });
    i += 1;
    setTimeout(tick, STEP_MS);
  }
  setTimeout(tick, 600);
}

function tooltipHTML(d) {
  const hit = frameFor(d, currentDecade ?? DECADES[0]);
  if (!hit) {
    return `<div class="tooltip-title">${displayName(d.country)}</div>
            <div class="tooltip-row"><span class="tooltip-label">No fatal events</span></div>`;
  }
  const f = hit.frame;
  const note = hit.exact ? '' : ' <em style="color:#999">(last seen)</em>';
  return `
    <div class="tooltip-title">${displayName(d.country)}</div>
    <div class="tooltip-row"><span class="tooltip-label">Decade</span><span class="tooltip-value">${f.decade}s${note}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Income</span><span class="tooltip-value">${d.income_group}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">GDP/capita</span><span class="tooltip-value">${fmtDollar(f.mean_gdp_pc)}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Deaths/event</span><span class="tooltip-value">${fmtDeaths(f.deaths_per_event)}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Events</span><span class="tooltip-value">${f.n_events}</span></div>
  `;
}

export function onDecadesStep(stepId) {
  if (!plotG) return;
  autoplayToken += 1;
  if (replayBtn) replayBtn.style.display = 'none';

  if (stepId === 'decades-1') {
    setDecade(1960, { animate: true });
    setMedianReveal(1960, { animate: true });
  } else if (stepId === 'decades-2') {
    setDecade(2020, { animate: true });
    setMedianReveal(2020, { animate: true });
  } else if (stepId === 'decades-3') {
    playAutoplay();
  }
}
