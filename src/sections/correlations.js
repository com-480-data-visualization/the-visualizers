import * as d3 from 'd3';
import { pearsonR } from '../utils/data-transforms.js';
import { showTooltip, moveTooltip, hideTooltip, earthquakeTooltipHTML, countryTooltipHTML } from '../components/tooltip.js';

let svg, g, cells;
let eventsData, countriesData;
let selectedCountries = new Set();
let width, height;

// Each panel matches the granularity the notebook uses for that variable:
//
//   Magnitude — notebook cell-48 (EDA section 5.5):
//     deadly = eq[eq['deaths'] > 0]
//     stats.pearsonr(deadly['mag'], np.log10(deadly['deaths']))   → r ≈ 0.33
//
//   GDP, HDI, hospital beds, urban %, pop density — notebook cell-50 (EDA section 5.6):
//     country_agg = eq.groupby('country_wb').agg(...).query('events >= 5')
//     y = np.log10(country_agg['deaths_per_event'].clip(lower=0.01))
//     r = pearson(country_agg[indicator], y)
//
// Cross-panel highlighting keys on country name so hovering a country dot also
// highlights all of that country's event dots in the magnitude panel (and vice versa).
const INDICATORS = [
  { source: 'country', key: 'avg_gdp',           label: 'GDP per capita'   },
  { source: 'country', key: 'hdi',               label: 'HDI'              },
  { source: 'country', key: 'avg_hospital_beds', label: 'Hospital beds/1K' },
  { source: 'country', key: 'avg_urban_pct',     label: 'Urban %'          },
  { source: 'country', key: 'avg_pop_density',   label: 'Pop. density'     },
  { source: 'event',   key: 'mag',               label: 'Magnitude'        },
];

const DEATHS_CLIP = 0.01;
const logDeathsPerEvent = (d) => Math.log10(Math.max(d.deaths_per_event, DEATHS_CLIP));

export function initCorrelations(earthquakes, countries) {
  eventsData = earthquakes.filter(d => d.deaths != null && d.deaths > 0);
  countriesData = countries.filter(d => d.events >= 5);

  const container = document.getElementById('correlations-chart');
  const rect = container.getBoundingClientRect();
  width = rect.width;
  height = rect.height;

  svg = d3.select(container).append('svg')
    .attr('width', width)
    .attr('height', height);

  g = svg.append('g').attr('transform', 'translate(10, 10)');

  renderGrid();
}

function renderGrid() {
  const cols = 3;
  const rows = 2;
  const cellW = (width - 40) / cols;
  const cellH = (height - 40) / rows;
  const pad = { top: 28, right: 10, bottom: 30, left: 40 };

  cells = INDICATORS.map((indicator, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = col * cellW + 15;
    const cy = row * cellH + 15;
    const plotW = cellW - pad.left - pad.right;
    const plotH = cellH - pad.top - pad.bottom;

    const isEvent = indicator.source === 'event';
    const baseData = isEvent ? eventsData : countriesData;
    const getY = isEvent ? (d) => Math.log10(d.deaths) : logDeathsPerEvent;
    const validData = baseData.filter(d => d[indicator.key] != null);

    const xVals = validData.map(d => d[indicator.key]);
    const yVals = validData.map(getY);
    const r = pearsonR(xVals, yVals);

    const cellG = g.append('g')
      .attr('class', 'corr-cell')
      .attr('transform', `translate(${cx},${cy})`);

    cellG.append('rect')
      .attr('width', cellW - 10)
      .attr('height', cellH - 10)
      .attr('rx', 8);

    cellG.append('text')
      .attr('class', 'corr-indicator-label')
      .attr('x', pad.left + plotW / 2)
      .attr('y', 16)
      .attr('text-anchor', 'middle')
      .text(indicator.label);

    cellG.append('text')
      .attr('class', 'corr-r-value')
      .attr('x', cellW - pad.right - 15)
      .attr('y', 18)
      .attr('text-anchor', 'end')
      .attr('fill', r < -0.3 ? '#dc2626' : r < -0.1 ? '#f59e0b' : r > 0.3 ? '#2563eb' : '#666')
      .text(`r = ${r?.toFixed(2)}`);

    const plotG = cellG.append('g')
      .attr('transform', `translate(${pad.left},${pad.top})`);

    const xExtent = d3.extent(xVals);
    const yExtent = d3.extent(yVals);
    const xScale = d3.scaleLinear().domain(xExtent).range([0, plotW]).nice();
    const yScale = d3.scaleLinear().domain(yExtent).range([plotH, 0]).nice();

    plotG.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(0,${plotH})`)
      .call(d3.axisBottom(xScale).ticks(4).tickSize(3));

    plotG.append('g')
      .attr('class', 'axis')
      .call(d3.axisLeft(yScale).ticks(4).tickSize(3));

    const baseOpacity = isEvent ? 0.35 : 0.55;
    const baseR = isEvent ? 3 : 4;

    const dotsG = plotG.selectAll('.corr-dot')
      .data(validData)
      .join('circle')
      .attr('class', 'corr-dot')
      .attr('cx', d => xScale(d[indicator.key]))
      .attr('cy', d => yScale(getY(d)))
      .attr('r', baseR)
      .attr('fill', '#1a1a2e')
      .attr('opacity', baseOpacity)
      .attr('stroke', 'none')
      .on('mouseenter', (event, d) => {
        const html = isEvent ? earthquakeTooltipHTML(d) : countryTooltipHTML(d);
        showTooltip(html, event);
        highlightCountry(d.country, true);
      })
      .on('mousemove', moveTooltip)
      .on('mouseleave', (event, d) => {
        hideTooltip();
        highlightCountry(d.country, false);
      });

    return { cellG, plotG, dotsG, xScale, yScale, indicator, validData, isEvent, getY, baseOpacity, baseR };
  });

  cells.forEach(cell => {
    const plotW = cell.xScale.range()[1];
    const plotH = cell.yScale.range()[0];
    const brush = d3.brush()
      .extent([[0, 0], [plotW, plotH]])
      .on('brush end', (event) => {
        if (!event.selection) {
          selectedCountries.clear();
          updateHighlights();
          return;
        }
        const [[x0, y0], [x1, y1]] = event.selection;
        selectedCountries.clear();
        cell.validData.forEach(d => {
          const cx = cell.xScale(d[cell.indicator.key]);
          const cy = cell.yScale(cell.getY(d));
          if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) {
            selectedCountries.add(d.country);
          }
        });
        updateHighlights();
      });

    cell.plotG.append('g')
      .attr('class', 'brush')
      .call(brush);
  });
}

function highlightCountry(country, on) {
  cells.forEach(cell => {
    cell.dotsG
      .attr('opacity', d => {
        if (on && d.country === country) return 1;
        if (!on && selectedCountries.size === 0) return cell.baseOpacity;
        if (selectedCountries.has(d.country)) return 0.8;
        return cell.baseOpacity;
      })
      .attr('r', d => {
        if (on && d.country === country) return cell.baseR + 1.5;
        return cell.baseR;
      })
      .attr('stroke', d => {
        if (on && d.country === country) return '#1a1a2e';
        if (selectedCountries.has(d.country)) return '#1a1a2e';
        return 'none';
      })
      .attr('stroke-width', d => {
        if (on && d.country === country) return 1.5;
        if (selectedCountries.has(d.country)) return 1;
        return 0;
      });
  });
}

function updateHighlights() {
  cells.forEach(cell => {
    cell.dotsG
      .transition().duration(200)
      .attr('opacity', d => selectedCountries.size === 0 ? cell.baseOpacity : selectedCountries.has(d.country) ? 0.85 : 0.06)
      .attr('r', d => selectedCountries.has(d.country) ? cell.baseR + 1 : cell.baseR)
      .attr('stroke', d => selectedCountries.has(d.country) ? '#1a1a2e' : 'none')
      .attr('stroke-width', d => selectedCountries.has(d.country) ? 1 : 0);
  });
}

export function onCorrelationStep(stepId) {
  // Steps just control narrative; chart is always interactive
}
