const tooltipEl = document.getElementById('tooltip');

export function showTooltip(html, event) {
  tooltipEl.innerHTML = html;
  tooltipEl.classList.add('visible');
  positionTooltip(event);
}

export function moveTooltip(event) {
  positionTooltip(event);
}

export function hideTooltip() {
  tooltipEl.classList.remove('visible');
}

function positionTooltip(event) {
  const pad = 12;
  const rect = tooltipEl.getBoundingClientRect();
  let x = event.clientX + pad;
  let y = event.clientY - rect.height / 2;

  if (x + rect.width > window.innerWidth - pad) {
    x = event.clientX - rect.width - pad;
  }
  y = Math.max(pad, Math.min(y, window.innerHeight - rect.height - pad));

  tooltipEl.style.left = `${x}px`;
  tooltipEl.style.top = `${y}px`;
}

export function earthquakeTooltipHTML(d) {
  const deaths = d.deaths != null ? d.deaths.toLocaleString() : '—';
  const gdp = d.gdp_pc != null ? `$${d.gdp_pc.toLocaleString()}` : '—';
  return `
    <div class="tooltip-title">${d.location || d.country}</div>
    <div class="tooltip-row"><span class="tooltip-label">Year</span><span class="tooltip-value">${d.year}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Magnitude</span><span class="tooltip-value">${d.mag?.toFixed(1) || '—'}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Deaths</span><span class="tooltip-value">${deaths}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">GDP/capita</span><span class="tooltip-value">${gdp}</span></div>
  `;
}

export function countryTooltipHTML(d) {
  const deaths = d.total_deaths != null ? d.total_deaths.toLocaleString() : '—';
  const dpe = d.deaths_per_event != null ? d.deaths_per_event.toFixed(1) : '—';
  const gdp = d.avg_gdp != null ? `$${Math.round(d.avg_gdp).toLocaleString()}` : '—';
  return `
    <div class="tooltip-title">${d.country}</div>
    <div class="tooltip-row"><span class="tooltip-label">Events</span><span class="tooltip-value">${d.events}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Total deaths</span><span class="tooltip-value">${deaths}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Deaths/event</span><span class="tooltip-value">${dpe}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">Avg GDP/cap</span><span class="tooltip-value">${gdp}</span></div>
    <div class="tooltip-row"><span class="tooltip-label">HDI</span><span class="tooltip-value">${d.hdi?.toFixed(3) || '—'}</span></div>
  `;
}
