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

// Per-country, per-decade aggregation for the Gapminder-style decades scatter.
// For each (country × decade) where the country had at least one fatal event with
// gdp_pc data in that decade, emit one frame: mean gdp_pc, deaths-per-event (mean
// deaths across that decade's events), and the event count. income_group / region
// are carried from the most recent event in the decade (they're effectively static).
export function aggregateByCountryDecade(earthquakes) {
  const byKey = new Map();
  for (const eq of earthquakes) {
    if (!eq.country || eq.gdp_pc == null || eq.year == null) continue;
    if (eq.deaths == null || eq.deaths <= 0) continue;
    const decade = Math.floor(eq.year / 10) * 10;
    const key = `${eq.country}__${decade}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        country: eq.country,
        country_code: eq.country_code,
        income_group: eq.income_group,
        region: eq.region,
        decade,
        _gdpSum: 0, _gdpN: 0,
        _deathsSum: 0,
        n_events: 0,
      });
    }
    const a = byKey.get(key);
    a._gdpSum += eq.gdp_pc;
    a._gdpN += 1;
    a._deathsSum += eq.deaths;
    a.n_events += 1;
  }
  return Array.from(byKey.values()).map(a => ({
    country: a.country,
    country_code: a.country_code,
    income_group: a.income_group,
    region: a.region,
    decade: a.decade,
    mean_gdp_pc: a._gdpSum / a._gdpN,
    deaths_per_event: a._deathsSum / a.n_events,
    n_events: a.n_events,
  }));
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
