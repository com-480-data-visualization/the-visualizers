export function groupByCountry(earthquakes) {
  const map = new Map();
  for (const eq of earthquakes) {
    if (!eq.country) continue;
    if (!map.has(eq.country)) {
      map.set(eq.country, []);
    }
    map.get(eq.country).push(eq);
  }
  return map;
}

export function getCountryYearData(countryYearData, year) {
  return countryYearData.filter(d => d.year === year);
}

export function aggregateByDecade(earthquakes) {
  const decades = new Map();
  for (const eq of earthquakes) {
    const decade = Math.floor(eq.year / 10) * 10;
    if (!decades.has(decade)) {
      decades.set(decade, { events: 0, deaths: 0, decade });
    }
    const d = decades.get(decade);
    d.events++;
    d.deaths += eq.deaths || 0;
  }
  return Array.from(decades.values()).sort((a, b) => a.decade - b.decade);
}

export function pearsonR(x, y) {
  const n = x.length;
  if (n < 3) return null;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i] - mx;
    const yi = y[i] - my;
    num += xi * yi;
    dx += xi * xi;
    dy += yi * yi;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : num / denom;
}

export function linearRegression(x, y) {
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    den += (x[i] - mx) * (x[i] - mx);
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = my - slope * mx;
  return { slope, intercept };
}
