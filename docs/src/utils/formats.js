import { format } from 'd3';

export const fmtComma = format(',');
export const fmtSI = format('.2s');
export const fmtPercent = format('.1%');
export const fmtDecimal = format('.1f');
export const fmtDollar = d => d >= 1000 ? `$${format('.1s')(d)}` : `$${format(',.0f')(d)}`;
export const fmtDeaths = d => d === 0 ? '0' : d >= 1000 ? format('.3s')(d) : format(',.0f')(d);
export const fmtMag = format('.1f');

export function fmtValue(value, type) {
  if (value == null || isNaN(value)) return '—';
  switch (type) {
    case 'deaths': return fmtDeaths(value);
    case 'gdp': return fmtDollar(value);
    case 'mag': return fmtMag(value);
    case 'hdi': return format('.3f')(value);
    case 'percent': return fmtDecimal(value) + '%';
    case 'density': return fmtComma(Math.round(value));
    case 'beds': return fmtDecimal(value);
    default: return fmtComma(Math.round(value));
  }
}
