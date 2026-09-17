// frontend/src/api/radio.js
import { apiGet } from './client';

export async function getFeaturedStations(limit = 30) {
  const { stations } = await apiGet(`/api/radio/featured?limit=${limit}`);
  return stations || [];
}

export async function getStationsByTag(tag, limit = 30) {
  const { stations } = await apiGet(`/api/radio/tag/${encodeURIComponent(tag)}?limit=${limit}`);
  return stations || [];
}

export async function getStationsByCountry(code, limit = 30) {
  const { stations } = await apiGet(`/api/radio/country/${encodeURIComponent(code)}?limit=${limit}`);
  return stations || [];
}

export async function searchRadio(query, limit = 30) {
  if (!query?.trim()) return [];
  const { stations } = await apiGet(`/api/radio/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  return stations || [];
}

export async function getRadioTags(limit = 24) {
  const { tags } = await apiGet(`/api/radio/tags?limit=${limit}`);
  return tags || [];
}

export async function getRadioCountries(limit = 30) {
  const { countries } = await apiGet(`/api/radio/countries?limit=${limit}`);
  return countries || [];
}