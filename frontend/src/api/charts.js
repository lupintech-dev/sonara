// frontend/src/api/charts.js
import { apiGet } from './client';

export async function getTopChart(country, limit = 100) {
  return apiGet(`/api/charts/top/${encodeURIComponent(country)}?limit=${limit}`);
}

export async function getMultiCharts(countries, limit = 25) {
  const list = countries.join(',');
  const { charts } = await apiGet(`/api/charts/multi?countries=${encodeURIComponent(list)}&limit=${limit}`);
  return charts || [];
}

/**
 * Fetch the top charts for several countries and merge them into a single
 * continent-wide list. Dedupes by title+artist, keeps the highest (lowest)
 * rank per track, then renumbers 1..N.
 */
export async function getContinentChart(countries, perCountry = 25) {
  const charts = await getMultiCharts(countries, perCountry);

  const byKey = new Map(); // "title|artist" -> track with best rank

  for (const chart of charts) {
    for (const track of chart.preview || []) {
      const key = `${(track.title || '').toLowerCase()}|${(track.artist || '').toLowerCase()}`;
      const existing = byKey.get(key);
      if (!existing || track.rank < existing.rank) {
        byKey.set(key, {
          ...track,
          // Remember which country this rank came from
          country: chart.country,
        });
      }
    }
  }

  const merged = [...byKey.values()]
    .sort((a, b) => a.rank - b.rank)
    .map((t, i) => ({ ...t, rank: i + 1 }));

  return {
    tracks: merged,
    countries,
    updatedAt: charts.find(c => c.updatedAt)?.updatedAt || null,
  };
}