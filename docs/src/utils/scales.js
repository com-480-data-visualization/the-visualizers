import * as d3 from 'd3';
import { REGION_COLORS } from './constants.js';

export function deathColorScale(maxDeaths = 300000) {
  return d3.scaleSequential(d3.interpolateReds)
    .domain([0, Math.log10(maxDeaths + 1)]);
}

export function deathColor(deaths, scale) {
  return scale(Math.log10((deaths || 0) + 1));
}

export function gdpColorScale() {
  return d3.scaleDiverging(t => d3.interpolateRdYlBu(t))
    .domain([Math.log10(200), Math.log10(5000), Math.log10(80000)]);
}

export function gdpColor(gdp, scale) {
  if (gdp == null) return '#ccc';
  return scale(Math.log10(gdp));
}

export function regionColor(region) {
  return REGION_COLORS[region] || '#999';
}

export function magRadius(mag, range = [2, 18]) {
  const scale = d3.scaleSqrt().domain([4, 9.5]).range(range).clamp(true);
  return scale(mag);
}
