// frontend/src/data/chartConfig.js
// Static metadata for the chart cards: display names, gradient palettes, cities.

/* Daily Top 100 — one card per country */
export const TOP_COUNTRIES = [
  {
    id: 'global',
    country: 'us',
    label: 'Global',
    fullName: 'Global',
    palette: ['#ff2d55', '#ff6b9d', '#ffb3c6', '#fff5f8'],
  },
  {
    id: 'nigeria',
    country: 'ng',
    label: 'Nigeria',
    fullName: 'Nigeria',
    palette: ['#00b96b', '#4ade80', '#a7f3d0', '#f0fdf4'],
  },
  {
    id: 'uk',
    country: 'gb',
    label: 'United Kingdom',
    fullName: 'UK',
    palette: ['#5b21b6', '#8b5cf6', '#c4b5fd', '#f5f3ff'],
  },
  {
    id: 'usa',
    country: 'us',
    label: 'United States of America',
    fullName: 'USA',
    palette: ['#1e40af', '#3b82f6', '#93c5fd', '#eff6ff'],
  },
  {
    id: 'south-africa',
    country: 'za',
    label: 'South Africa',
    fullName: 'South Africa',
    palette: ['#065f46', '#10b981', '#6ee7b7', '#ecfdf5'],
  },
];

/* Continental Top 100 — merges Apple Music top charts from multiple countries */
export const CONTINENT_CHARTS = [
  {
    id: 'africa',
    label: 'Africa',
    fullName: 'Africa',
    countries: ['ng', 'za', 'gh', 'ke', 'ci'],
    palette: ['#ea580c', '#f59e0b', '#fbbf24', '#fef3c7'],
  },
  {
    id: 'asia',
    label: 'Asia',
    fullName: 'Asia',
    countries: ['jp', 'kr', 'in', 'id', 'sg'],
    palette: ['#dc2626', '#ef4444', '#fca5a5', '#fee2e2'],
  },
  {
    id: 'europe',
    label: 'Europe',
    fullName: 'Europe',
    countries: ['gb', 'de', 'fr', 'it', 'es'],
    palette: ['#1e40af', '#3b82f6', '#60a5fa', '#dbeafe'],
  },
  {
    id: 'latin-america',
    label: 'Latin America',
    fullName: 'Latin America',
    countries: ['br', 'mx', 'ar', 'co', 'cl'],
    palette: ['#15803d', '#16a34a', '#4ade80', '#dcfce7'],
  },
];

/* City Charts */
export const CITY_CHARTS = [
  { id: 'lagos',         country: 'ng', label: 'Lagos',         fullName: 'Lagos',         palette: ['#f59e0b', '#fbbf24', '#fde68a', '#fffbeb'] },
  { id: 'london',        country: 'gb', label: 'London',        fullName: 'London',        palette: ['#0f172a', '#475569', '#94a3b8', '#f1f5f9'] },
  { id: 'accra',         country: 'gh', label: 'Accra',         fullName: 'Accra',         palette: ['#dc2626', '#f87171', '#fecaca', '#fef2f2'] },
  { id: 'johannesburg',  country: 'za', label: 'Johannesburg',  fullName: 'Johannesburg',  palette: ['#7c3aed', '#a78bfa', '#ddd6fe', '#f5f3ff'] },
  { id: 'nairobi',       country: 'ke', label: 'Nairobi',       fullName: 'Nairobi',       palette: ['#0891b2', '#22d3ee', '#a5f3fc', '#ecfeff'] },
];

/* Lookup by id across all chart families */
export function findChartById(id) {
  return (
    TOP_COUNTRIES.find(c => c.id === id) ||
    CONTINENT_CHARTS.find(c => c.id === id) ||
    CITY_CHARTS.find(c => c.id === id) ||
    null
  );
}

/* Mesh gradient from a 4-color palette */
export function meshGradient(palette) {
  const [c1, c2, c3, c4] = palette;
  return [
    `radial-gradient(circle at 15% 20%, ${c1} 0%, transparent 55%)`,
    `radial-gradient(circle at 85% 10%, ${c2} 0%, transparent 50%)`,
    `radial-gradient(circle at 90% 90%, ${c3} 0%, transparent 55%)`,
    `radial-gradient(circle at 15% 90%, ${c4} 0%, transparent 60%)`,
    `${c3}`,
  ].join(', ');
}