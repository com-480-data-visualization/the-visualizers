# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| Tamar Alphaidze | 393635 |
| Manuel Curnis | 394237 |
| Alessandro Di Maria | 395246 |

[Milestone 1](#milestone-1) • [Milestone 2](#milestone-2) • [Milestone 3](#milestone-3)

## Milestone 1 (20th March, 5pm)

**10% of the final grade**

This is a preliminary milestone to let you set up goals for your final project and assess the feasibility of your ideas.
Please, fill the following sections about your project.

*(max. 2000 characters per section)*

### Dataset

1. **Earthquake data**
   National Geophysical Data Center / World Data Service (NGDC/WDS). *NCEI/WDS Global Significant Earthquake Database, 2150 BC to Present.* NOAA National Centers for Environmental Information. [https://doi.org/10.7289/V5TD9V7K](https://doi.org/10.7289/V5TD9V7K) (accessed March 14, 2026)

2. **GDP per capita**
   World Bank. (2024). *GDP per capita (current US$)* [Dataset]. World Bank Open Data. [https://data.worldbank.org/indicator/NY.GDP.PCAP.CD](https://data.worldbank.org/indicator/NY.GDP.PCAP.CD)

3. **Population density**
   World Bank. (2024). *Population density (people per sq. km of land area)* [Dataset]. World Bank Open Data. [https://data.worldbank.org/indicator/EN.POP.DNST](https://data.worldbank.org/indicator/EN.POP.DNST)

4. **Urban population %**
   World Bank. (2024). *Urban population (% of total population)* [Dataset]. World Bank Open Data. [https://data.worldbank.org/indicator/SP.URB.TOTL.IN.ZS](https://data.worldbank.org/indicator/SP.URB.TOTL.IN.ZS)

5. **Hospital beds**
   World Bank. (2024). *Hospital beds (per 1,000 people)* [Dataset]. World Bank Open Data. [https://data.worldbank.org/indicator/SH.MED.BEDS.ZS](https://data.worldbank.org/indicator/SH.MED.BEDS.ZS)

6. **Human Development Index**
   United Nations Development Programme (UNDP). (2025). *Human Development Report 2025 — Statistical Annex: Human Development Index and its components.* Human Development Reports. [https://hdr.undp.org/data-center/documentation-and-downloads](https://hdr.undp.org/data-center/documentation-and-downloads)

### Problematic

When a magnitude 7.0 earthquake struck Haiti in January 2010, it killed over 220,000 people. Seven weeks later, a magnitude 8.8 earthquake, releasing roughly 500 times more seismic energy, hit Chile, killing fewer than 600. The difference was not geology but rather wealth, infrastructure, and preparedness.
This project visualizes the human cost of earthquakes from 1960 to 2026, with the central argument that mortality is not determined by seismic force alone, but by the socioeconomic conditions of the countries affected. Using the NOAA Significant Earthquake Database combined with World Bank and UNDP indicators, we explore how GDP per capita, human development, urbanization, and healthcare infrastructure correlate with earthquake death rates across earthquake-prone countries.
Our visualization aims to show three things: first, that a strong negative correlation exists between national wealth and deaths per earthquake event; second, that this relationship persists and strengthens when controlling for earthquake magnitude and population size; and third, that no single indicator fully explains the gap, motivating a multi-dimensional view of vulnerability.
The target audience is the informed general public and policy-oriented readers, people who understand that earthquakes are natural, but disasters are not. We intentionally avoid a purely scientific framing in favour of a narrative one: the same earthquake, in a different country, tells a completely different story.
The project is motivated by the observation that existing visualizations of earthquake data almost exclusively focus on where earthquakes happen and how strong they are, not on why some kill thousands while others kill none. We aim to fill that gap.

### Exploratory Data Analysis

**Pre-processing.**
We merged six datasets: NOAA significant earthquakes (1960–2026), four World Bank indicators (GDP per capita, population density, urban %, hospital beds), and the UNDP Human Development Index. The earthquake data required parsing 39 columns from TSV, extracting country names from location strings (e.g., "PERU: AREQUIPA" → Peru), and harmonizing naming conventions across all sources (e.g., "Iran" - "Iran, Islamic Rep." to match World Bank). We filtered to events from 1960 onward with valid magnitudes, yielding ~2,700 events across ~182 countries. Each event was enriched with country-year socioeconomic indicators via left joins. Hospital beds data had the highest missingness (~41.3%), particularly for low-income countries.

**Key findings.**
Countries with the most earthquakes are not the deadliest: Japan and the US dominate event counts but have low mortality per event, while Haiti and Pakistan show the opposite pattern. Deaths are extremely skewed - several major earthquakes account for the majority of all recorded fatalities. A correlation analysis across country-level aggregates (Fig. 1) reveals that GDP per capita (r = −0.47), HDI (r = −0.37), and hospital beds (r = −0.35) are the strongest negative correlates of log deaths per event, while magnitude and depth show weaker associations. This relationship is visible in Fig. 2, where wealthier countries cluster toward lower mortality and poorer countries like Haiti are dramatic outliers. This supports our central hypothesis: earthquake mortality is shaped as well by socioeconomic conditions and not by seismic force alone.

Figure 1. Correlation matrix: development indicators vs earthquake mortality
<img width="594" height="562" alt="Screenshot 2026-03-19 at 1 54 37 AM" src="https://github.com/user-attachments/assets/68c3c1dc-d744-43f8-a955-e7e72a2a075c" />

Figure 2. GDP per capita vs earthquake deaths per event
<img width="626" height="493" alt="Screenshot 2026-03-19 at 1 55 45 AM" src="https://github.com/user-attachments/assets/5df92650-43f1-423e-a2c4-c7022e4846af" />

### Related work


Existing earthquake visualizations fall into two categories: real-time seismic maps and raw death toll timelines. The USGS Latest Earthquakes map (earthquake.usgs.gov) and Naymanova's Earthquake Pulse Map (webgpu.com, 2025) plot magnitude and location on interactive globes but ignore human outcomes entirely. Our World in Data's natural disasters section (Ritchie, Rosado & Roser, 2022, ourworldindata.org/natural-disasters), presents global death totals over time, but with no socioeconomic overlay, and no normalization by magnitude or population.
Academic literature has studied the GDP–mortality link statistically. Kahn (2005, Review of Economics and Statistics, 87(2), 271–284) showed that wealthier nations suffer significantly fewer disaster deaths. Escaleras, Anbarci & Register (2007, Public Choice, 132, 209–230) demonstrated that corruption specifically amplifies earthquake fatalities. Ambraseys & Bilham (2011, Nature, 469, 153–155) found that 83% of all earthquake building-collapse deaths over 30 years occurred in corrupt countries. None of these findings have been translated into an accessible interactive visualization.
Our approach is original in three ways: we combine seismic data with five socioeconomic indicators simultaneously; we normalize deaths by population and seismic energy for fair cross-country comparison; and we anchor the narrative in concrete paired events, Haiti vs. Chile 2010, to make inequality human rather than statistical. Visual inspiration comes from Rosling's Gapminder bubble charts (gapminder.org) and NYT scrollytelling formats.
This dataset has not been used in any prior EPFL course by our team.


## Milestone 2 (17th April, 5pm)

**10% of the final grade**


## Milestone 3 (29th May, 5pm)

**80% of the final grade**


## Late policy

- < 24h: 80% of the grade for the milestone
- < 48h: 70% of the grade for the milestone

