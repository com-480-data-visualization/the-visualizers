"""
Export processed earthquake + socioeconomic data to JSON for the web visualization.
Run from the project root: python scripts/export_data.py
"""

import os
import json
import zipfile
import numpy as np
import pandas as pd

BASE = os.path.join(os.path.dirname(__file__), '..', 'data')
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
os.makedirs(OUT, exist_ok=True)


# --- 1. Load earthquake data ---
eq_raw = pd.read_csv(
    os.path.join(BASE, 'earthquakes-2026-03-14_15-39-57_+0100.tsv'),
    sep='\t', header=0, skiprows=[1]
)

eq = eq_raw.copy()
eq['year'] = pd.to_numeric(eq['Year'], errors='coerce')
eq['month'] = pd.to_numeric(eq['Mo'], errors='coerce')
eq['day'] = pd.to_numeric(eq['Dy'], errors='coerce')
eq['mag'] = pd.to_numeric(eq['Mag'], errors='coerce')
eq['deaths'] = pd.to_numeric(eq['Total Deaths'], errors='coerce').fillna(0)
eq['depth'] = pd.to_numeric(eq['Focal Depth (km)'], errors='coerce')
eq['injuries'] = pd.to_numeric(eq['Total Injuries'], errors='coerce').fillna(0)
eq['damage'] = pd.to_numeric(eq['Total Damage ($Mil)'], errors='coerce').fillna(0)
eq['houses_destroyed'] = pd.to_numeric(eq['Total Houses Destroyed'], errors='coerce').fillna(0)
eq['lat'] = pd.to_numeric(eq['Latitude'], errors='coerce')
eq['lon'] = pd.to_numeric(eq['Longitude'], errors='coerce')
eq['year_int'] = eq['year'].astype('Int64')
eq['tsu'] = pd.to_numeric(eq['Tsu'], errors='coerce').fillna(0).astype(int)

# --- 2. Extract and standardize country names ---
def extract_country(loc):
    if pd.isna(loc):
        return None
    loc = str(loc).strip().strip('"')
    if ':' in loc:
        return loc.split(':')[0].strip()
    return loc.strip()

eq['country_raw'] = eq['Location Name'].apply(extract_country)

US_STATES = [
    'California', 'Alaska', 'Hawaii', 'Montana', 'Washington', 'Oregon',
    'Nevada', 'Utah', 'Idaho', 'Wyoming', 'Missouri', 'South Carolina',
    'Oklahoma', 'Tennessee', 'New York', 'Puerto Rico', 'Texas', 'Arizona',
    'New Mexico', 'Colorado', 'Guam', 'American Samoa', 'Virginia',
    'Illinois', 'Kentucky', 'Maine', 'Massachusetts', 'North Carolina',
    'Arkansas', 'Nebraska', 'Connecticut', 'Alabama', 'Kansas',
    'Mississippi', 'West Virginia', 'Michigan', 'Georgia', 'Pennsylvania',
]

COUNTRY_MAP = {
    'Usa': 'United States', 'Us': 'United States', 'Turkey': 'Turkiye',
    'Iran': 'Iran, Islamic Rep.', 'Ussr': 'Russian Federation',
    'Russia': 'Russian Federation', 'Venezuela': 'Venezuela, RB',
    'Egypt': 'Egypt, Arab Rep.', 'Syria': 'Syrian Arab Republic',
    'South Korea': 'Korea, Rep.', 'Korea': 'Korea, Rep.',
    'North Korea': "Korea, Dem. People's Rep.", 'Taiwan': 'China',
    'Congo': 'Congo, Dem. Rep.', 'Kyrgyzstan': 'Kyrgyz Republic',
    'Slovakia': 'Slovak Republic', 'Laos': 'Lao PDR',
    'Yemen': 'Yemen, Rep.', 'Macau': 'Macao SAR, China',
    'Hong Kong': 'Hong Kong SAR, China', 'Ivory Coast': "Cote d'Ivoire",
    'Cape Verde': 'Cabo Verde', 'Czech Republic': 'Czechia',
    'Swaziland': 'Eswatini', 'Macedonia': 'North Macedonia',
    'Brunei': 'Brunei Darussalam', 'Micronesia': 'Micronesia, Fed. Sts.',
    'Gambia': 'Gambia, The', 'Burma': 'Myanmar', 'East Timor': 'Timor-Leste',
    'Myanmar (Burma)': 'Myanmar', 'Vanuatu Islands': 'Vanuatu',
    'Fiji Islands': 'Fiji', 'Kermadec Islands': 'New Zealand',
    'Tonga Islands': 'Tonga', 'Samoa Islands': 'Samoa',
    'Solomon Islands': 'Solomon Islands',
    'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
    'The Netherlands': 'Netherlands', 'Trinidad': 'Trinidad and Tobago',
    'Tobago': 'Trinidad and Tobago', 'Hawaiian Islands': 'United States',
    'Vietnam': 'Viet Nam', 'Taiwan Region': 'China',
    'Alaska Peninsula': 'United States', 'Guadeloupe': 'France',
    'Martinique': 'France', 'Azores': 'Portugal',
}
for s in US_STATES:
    COUNTRY_MAP[s] = 'United States'

# Compound / sub-region locations from NOAA. For cross-border events (X; Y or X-Y),
# we attribute to the country listed first (usually the epicenter).
EXTRA_MAP = {
    'Anatahan Region, N. Mariana Islands': 'United States',
    'Antigua And Barbuda; St Kitts': 'Antigua and Barbuda',
    'Armenia-Azerbaijan-Iran': 'Armenia',
    'Bolivia-Peru': 'Bolivia',
    'California-Nevada': 'United States',
    'Canada; Maine': 'Canada',
    'Cayman Is; Honduras': 'Cayman Islands',
    'Colombia-Panama': 'Colombia',
    'Colombia; San Cristobal, Venezuela': 'Colombia',
    'Costa Rica-Panama': 'Costa Rica',
    'Ecuador; Colombia': 'Ecuador',
    'El Salvador-Guatemala': 'El Salvador',
    'El Salvador; Guatemala': 'El Salvador',
    'Greece, Turkey': 'Greece',
    'Greece-Albania': 'Greece',
    'Greece-Bulgaria Border Region': 'Greece',
    'Guam, Northern Mariana Islands': 'United States',
    'Honduras-Guatemala-El Salvador': 'Honduras',
    'Honduras;  N Guatemala': 'Honduras',
    'Honshu Island, Japan': 'Japan',
    'Ibaraki, Japan': 'Japan',
    'India-Bangladesh': 'India',
    'India-Bangladesh Border': 'India',
    'Indonesia-Malaysia': 'Indonesia',
    'Iran; Pakistan': 'Iran, Islamic Rep.',
    'Italy-Balkans Nw': 'Italy',
    'Iwate, Japan': 'Japan',
    'Japan Trench': 'Japan',
    'Laos;  Vietnam': 'Lao PDR',
    'Lebanon-Syria': 'Lebanon',
    'Macquarie Island': 'Australia',
    'Mexico-Guatemala': 'Mexico',
    'Mexico; Guatemala': 'Mexico',
    'Mindanao Island, Philippines': 'Philippines',
    'Mozambique; Zimbabwe': 'Mozambique',
    'Myanmar (Burma);  India': 'Myanmar',
    'Myanmar (Burma); Thailand': 'Myanmar',
    'Nepal-India': 'Nepal',
    'Nevada-California Border': 'United States',
    'North Corinth Gulf': 'Greece',
    'Noshiro, Japan': 'Japan',
    'Pakistan-Nw Afghanistan': 'Pakistan',
    'Pakistan; India': 'Pakistan',
    'Panama-Colombia': 'Panama',
    'Panama-Costa Rica': 'Panama',
    'Peru-Brazil': 'Peru',
    'Peru-Ecuador': 'Peru',
    'Portugal; Morocco': 'Portugal',
    'Sanriku, Japan': 'Japan',
    'Seikaido, Japan': 'Japan',
    'South Africa; Swaziland': 'South Africa',
    'Syria; Lebanon': 'Syrian Arab Republic',
    'Tajikistan; Afghanistan': 'Tajikistan',
    'Tonga Trench': 'Tonga',
    'Turkey; Syria': 'Turkiye',
    'Venezuela-N Colombia': 'Venezuela, RB',
    'Washington-Oregon Border': 'United States',
    'Afghanistan-Tajikistan': 'Afghanistan',
    'Afghanistan; Pakistan': 'Afghanistan',
    'Afghanistan; Tajikistan': 'Afghanistan',
}

# Locations that cannot be attributed to any single country: oceans, Antarctic
# regions, and tectonic features in international waters. These rows are dropped.
DROP_LOCATIONS = {
    'Antarctica', 'Atlantic Ocean', 'Balleny Islands', 'Bering Sea',
    'Gulf Of Mexico', 'Indian Ocean', 'Scotia Sea',
    'South Sandwich Islands', 'W. Solomon Sea', 'Balkans Nw',
    'Futuna Island',
}

def map_country(raw):
    if pd.isna(raw):
        return None
    raw = str(raw).strip()
    raw_title = raw.title()
    if raw in DROP_LOCATIONS or raw_title in DROP_LOCATIONS:
        return None
    if raw in COUNTRY_MAP:
        return COUNTRY_MAP[raw]
    if raw in EXTRA_MAP:
        return EXTRA_MAP[raw]
    if raw_title in COUNTRY_MAP:
        return COUNTRY_MAP[raw_title]
    if raw_title in EXTRA_MAP:
        return EXTRA_MAP[raw_title]
    if raw_title in US_STATES:
        return 'United States'
    return raw_title

eq['country'] = eq['country_raw'].apply(map_country)

# --- 3. Filter ---
eq = eq[eq['year'] >= 1960].copy()
eq = eq[eq['mag'].notna()].copy()
eq = eq[eq['country'].notna()].copy()

# --- 4. Load World Bank data ---
def load_wb_zip(zip_path, value_name):
    with zipfile.ZipFile(zip_path) as z:
        csv_name = [n for n in z.namelist() if n.startswith('API_')][0]
        with z.open(csv_name) as f:
            df = pd.read_csv(f, skiprows=4)
    year_cols = [c for c in df.columns if c.isdigit()]
    melted = df.melt(
        id_vars=['Country Name', 'Country Code'],
        value_vars=year_cols,
        var_name='year_str', value_name=value_name
    )
    melted['year_int'] = pd.to_numeric(melted['year_str'], errors='coerce').astype('Int64')
    melted = melted.drop(columns='year_str')
    melted = melted.rename(columns={'Country Name': 'country', 'Country Code': 'country_code'})
    return melted

gdp = load_wb_zip(os.path.join(BASE, 'API_NY.GDP.PCAP.CD_DS2_en_csv_v2_46.zip'), 'gdp_pc')
pop_dens = load_wb_zip(os.path.join(BASE, 'API_EN.POP.DNST_DS2_en_csv_v2_460.zip'), 'pop_density')
urban = load_wb_zip(os.path.join(BASE, 'API_SP.URB.TOTL.IN.ZS_DS2_en_csv_v2_249.zip'), 'urban_pct')
beds = load_wb_zip(os.path.join(BASE, 'API_SH.MED.BEDS.ZS_DS2_en_csv_v2_4542.zip'), 'hospital_beds')

# --- 5. Load HDI ---
hdi_df = pd.read_excel(os.path.join(BASE, 'HDR25_Statistical_Annex_HDI_Table.xlsx'), header=None)
hdi_df = hdi_df.iloc[7:].reset_index(drop=True)
hdi_df = hdi_df.rename(columns={hdi_df.columns[1]: 'country_hdi', hdi_df.columns[2]: 'hdi'})
hdi_df = hdi_df[['country_hdi', 'hdi']].dropna(subset=['country_hdi'])
hdi_df['hdi'] = pd.to_numeric(hdi_df['hdi'], errors='coerce')
hdi_df = hdi_df.dropna(subset=['hdi'])

HDI_COUNTRY_MAP = {
    'Türkiye': 'Turkiye',
    'Iran (Islamic Republic of)': 'Iran, Islamic Rep.',
    'Venezuela (Bolivarian Republic of)': 'Venezuela, RB',
    'Egypt': 'Egypt, Arab Rep.',
    'Korea (Republic of)': 'Korea, Rep.',
    "Korea (Democratic People's Rep. of)": "Korea, Dem. People's Rep.",
    'Congo (Democratic Republic of the)': 'Congo, Dem. Rep.',
    'Kyrgyzstan': 'Kyrgyz Republic',
    'Slovakia': 'Slovak Republic',
    "Lao People's Democratic Republic": 'Lao PDR',
    'Yemen': 'Yemen, Rep.',
    'Hong Kong, China (SAR)': 'Hong Kong SAR, China',
    "Côte d'Ivoire": "Cote d'Ivoire",
    'Eswatini (Kingdom of)': 'Eswatini',
    'Micronesia (Federated States of)': 'Micronesia, Fed. Sts.',
    'Gambia': 'Gambia, The',
    'Bolivia (Plurinational State of)': 'Bolivia',
    'Tanzania (United Republic of)': 'Tanzania',
    'Moldova (Republic of)': 'Moldova',
    'Viet Nam': 'Viet Nam',
}
hdi_df['country'] = hdi_df['country_hdi'].map(HDI_COUNTRY_MAP).fillna(hdi_df['country_hdi'])

# --- 6. Merge all ---
country_codes = gdp[['country', 'country_code']].drop_duplicates().set_index('country')['country_code'].to_dict()

eq = eq.merge(gdp[['country', 'year_int', 'gdp_pc']], on=['country', 'year_int'], how='left')
eq = eq.merge(pop_dens[['country', 'year_int', 'pop_density']], on=['country', 'year_int'], how='left')
eq = eq.merge(urban[['country', 'year_int', 'urban_pct']], on=['country', 'year_int'], how='left')
eq = eq.merge(beds[['country', 'year_int', 'hospital_beds']], on=['country', 'year_int'], how='left')
eq = eq.merge(hdi_df[['country', 'hdi']], on='country', how='left')

eq['seismic_energy'] = 10 ** (1.5 * eq['mag'])
eq['country_code'] = eq['country'].map(country_codes)

# --- 7. Region & income from World Bank metadata ---
def get_wb_metadata(zip_path):
    with zipfile.ZipFile(zip_path) as z:
        meta_name = [n for n in z.namelist() if 'Metadata_Country' in n][0]
        with z.open(meta_name) as f:
            meta = pd.read_csv(f)
    return meta

wb_meta = get_wb_metadata(os.path.join(BASE, 'API_NY.GDP.PCAP.CD_DS2_en_csv_v2_46.zip'))
wb_regions = wb_meta.dropna(subset=['Region']).set_index('Country Code')['Region'].to_dict()
wb_income = wb_meta.dropna(subset=['IncomeGroup']).set_index('Country Code')['IncomeGroup'].to_dict()

eq['region'] = eq['country_code'].map(wb_regions)
eq['income_group'] = eq['country_code'].map(wb_income)

# Sanity check: print any countries that still failed to merge.
missing_cc = eq[eq['country_code'].isna()]['country'].unique()
if len(missing_cc):
    print(f'WARNING: {len(missing_cc)} country names did not match any WB country_code:')
    for n in sorted(missing_cc):
        print(f'  - {n}')


# ============================================================
# EXPORT 1: earthquakes.json (individual events)
# ============================================================
def clean_val(v):
    if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        return round(float(v), 2)
    if pd.isna(v):
        return None
    return v

eq_export = eq[[
    'year_int', 'month', 'day', 'country', 'country_code', 'Location Name',
    'lat', 'lon', 'mag', 'depth', 'deaths', 'injuries', 'damage',
    'houses_destroyed', 'tsu',
    'gdp_pc', 'pop_density', 'urban_pct', 'hospital_beds', 'hdi',
    'seismic_energy', 'region', 'income_group'
]].copy()

eq_export = eq_export.rename(columns={
    'year_int': 'year', 'Location Name': 'location',
})

records = []
for _, row in eq_export.iterrows():
    rec = {k: clean_val(v) for k, v in row.items()}
    records.append(rec)

with open(os.path.join(OUT, 'earthquakes.json'), 'w') as f:
    json.dump(records, f)

print(f'earthquakes.json: {len(records)} events')


# ============================================================
# EXPORT 2: countries.json (country-level aggregates)
# ============================================================
country_agg = eq.groupby('country').agg(
    events=('deaths', 'count'),
    total_deaths=('deaths', 'sum'),
    total_injuries=('injuries', 'sum'),
    total_damage=('damage', 'sum'),
    avg_mag=('mag', 'mean'),
    max_mag=('mag', 'max'),
    avg_gdp=('gdp_pc', 'mean'),
    avg_pop_density=('pop_density', 'mean'),
    avg_urban_pct=('urban_pct', 'mean'),
    avg_hospital_beds=('hospital_beds', 'mean'),
    avg_depth=('depth', 'mean'),
    hdi=('hdi', 'first'),
    country_code=('country_code', 'first'),
    region=('region', 'first'),
    income_group=('income_group', 'first'),
    avg_lat=('lat', 'mean'),
    avg_lon=('lon', 'mean'),
).reset_index()

country_agg['deaths_per_event'] = country_agg['total_deaths'] / country_agg['events']

countries_out = []
for _, row in country_agg.iterrows():
    countries_out.append({k: clean_val(v) for k, v in row.items()})

with open(os.path.join(OUT, 'countries.json'), 'w') as f:
    json.dump(countries_out, f)

print(f'countries.json: {len(countries_out)} countries')


# ============================================================
# EXPORT 3: country_year.json (for Gapminder animation)
# ============================================================
cy = eq.groupby(['country', 'year_int']).agg(
    events=('deaths', 'count'),
    total_deaths=('deaths', 'sum'),
    total_injuries=('injuries', 'sum'),
    avg_mag=('mag', 'mean'),
    gdp_pc=('gdp_pc', 'first'),
    pop_density=('pop_density', 'first'),
    urban_pct=('urban_pct', 'first'),
    hospital_beds=('hospital_beds', 'first'),
    hdi=('hdi', 'first'),
    country_code=('country_code', 'first'),
    region=('region', 'first'),
    income_group=('income_group', 'first'),
).reset_index()

cy['deaths_per_event'] = cy['total_deaths'] / cy['events']
cy = cy.rename(columns={'year_int': 'year'})

cy_out = []
for _, row in cy.iterrows():
    cy_out.append({k: clean_val(v) for k, v in row.items()})

with open(os.path.join(OUT, 'country_year.json'), 'w') as f:
    json.dump(cy_out, f)

print(f'country_year.json: {len(cy_out)} records')


# ============================================================
# EXPORT 4: paired_events.json (notable comparison pairs)
# ============================================================
paired = [
    {
        "id": "haiti-chile-2010",
        "title": "Haiti vs Chile, 2010",
        "description": "Seven weeks apart. Chile's earthquake released 500x more energy, yet killed 400x fewer people.",
        "country_a": "Haiti",
        "country_b": "Chile",
        "event_a": {"year": 2010, "mag": 7.0, "deaths": 316000, "gdp_pc": 671, "hdi": 0.552},
        "event_b": {"year": 2010, "mag": 8.8, "deaths": 562, "gdp_pc": 12785, "hdi": 0.862},
    },
    {
        "id": "iran-japan-2003",
        "title": "Iran vs Japan",
        "description": "Both earthquake-prone. Japan has 10x more events but a fraction of Iran's death toll.",
        "country_a": "Iran, Islamic Rep.",
        "country_b": "Japan",
    },
    {
        "id": "nepal-newzealand",
        "title": "Nepal vs New Zealand",
        "description": "Similar seismic exposure, vastly different outcomes driven by building codes and emergency response.",
        "country_a": "Nepal",
        "country_b": "New Zealand",
    },
    {
        "id": "turkey-italy",
        "title": "Turkey vs Italy",
        "description": "Mediterranean neighbors with similar geology but different enforcement of building standards.",
        "country_a": "Turkiye",
        "country_b": "Italy",
    },
]

with open(os.path.join(OUT, 'paired_events.json'), 'w') as f:
    json.dump(paired, f, indent=2)

print(f'paired_events.json: {len(paired)} pairs')
print('\nDone! All data exported to', OUT)
