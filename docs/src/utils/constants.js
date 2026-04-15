// Region color palette (muted, accessible)
export const REGION_COLORS = {
  'East Asia & Pacific': '#1b9e77',
  'Europe & Central Asia': '#7570b3',
  'Latin America & Caribbean': '#d95f02',
  'Middle East & North Africa': '#e7298a',
  'North America': '#66a61e',
  'South Asia': '#e6ab02',
  'Sub-Saharan Africa': '#a6761d',
};

export const REGION_ORDER = [
  'East Asia & Pacific',
  'Europe & Central Asia',
  'Latin America & Caribbean',
  'Middle East & North Africa',
  'North America',
  'South Asia',
  'Sub-Saharan Africa',
];

export const INCOME_GROUPS = [
  'High income',
  'Upper middle income',
  'Lower middle income',
  'Low income',
];

export const INCOME_COLORS = {
  'High income': '#10b981',
  'Upper middle income': '#3b82f6',
  'Lower middle income': '#f59e0b',
  'Low income': '#dc2626',
};

// Featured countries for annotations
export const FEATURED_COUNTRIES = [
  'Haiti', 'Chile', 'Japan', 'United States', 'China',
  'Iran, Islamic Rep.', 'Turkiye', 'Nepal', 'Indonesia', 'Pakistan',
  'New Zealand', 'Italy',
];

// Short display names for countries
export const DISPLAY_NAMES = {
  'Iran, Islamic Rep.': 'Iran',
  'Korea, Rep.': 'South Korea',
  "Korea, Dem. People's Rep.": 'North Korea',
  'Russian Federation': 'Russia',
  'Venezuela, RB': 'Venezuela',
  'Egypt, Arab Rep.': 'Egypt',
  'Syrian Arab Republic': 'Syria',
  'Yemen, Rep.': 'Yemen',
  'Congo, Dem. Rep.': 'DR Congo',
  'Kyrgyz Republic': 'Kyrgyzstan',
  'Slovak Republic': 'Slovakia',
  'Lao PDR': 'Laos',
  'Macao SAR, China': 'Macau',
  'Hong Kong SAR, China': 'Hong Kong',
  "Cote d'Ivoire": 'Ivory Coast',
  'Cabo Verde': 'Cape Verde',
  'Micronesia, Fed. Sts.': 'Micronesia',
  'Gambia, The': 'Gambia',
  'Brunei Darussalam': 'Brunei',
  'Turkiye': 'Turkey',
};

export function displayName(country) {
  return DISPLAY_NAMES[country] || country;
}

export const MARGIN = { top: 40, right: 30, bottom: 50, left: 60 };
