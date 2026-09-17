// frontend/src/pages/Home.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, Sunrise, Sun, Sunset, Moon,
  Music2, Sparkles, Disc3, Radio,
} from 'lucide-react';
import { getAudiusPopular } from '../api/audius';
import { getJamendoPopular } from '../api/jamendo';
import { getRecentLocalTracks } from '../api/localTracks';
import { getMultiCharts } from '../api/charts';
import { TOP_COUNTRIES, CITY_CHARTS, CONTINENT_CHARTS } from '../data/chartConfig';
import TrackRow from '../components/common/TrackRow';
import ChartCard from '../components/common/ChartCard';
import './Home.css';

/* External sources get a longer cache so we're not hammering them.
   Local uploads are fetched fresh every time so new arrivals appear immediately. */
const EXTERNAL_CACHE_KEY = 'sonara_discover_external_v2';
const EXTERNAL_TTL_MS = 1000 * 60 * 30;
const EXTERNAL_STALE_MS = 1000 * 60 * 5;

const LOCAL_LIMIT = 6;          // slots reserved for Sonara uploads at the top of Discover
const DISCOVER_LIMIT = 12;      // total tracks shown in Discover
const EXTERNAL_FETCH = 15;      // per external source before mixing

function fisherYates(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function readExternalCache() {
  try {
    const raw = localStorage.getItem(EXTERNAL_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.tracks) || !parsed?.at) return null;
    return parsed;
  } catch { return null; }
}

function writeExternalCache(tracks) {
  try {
    localStorage.setItem(EXTERNAL_CACHE_KEY, JSON.stringify({ tracks, at: Date.now() }));
  } catch {}
}

async function fetchExternalMix() {
  const [audiusRes, jamendoRes] = await Promise.allSettled([
    getAudiusPopular(EXTERNAL_FETCH),
    getJamendoPopular(EXTERNAL_FETCH),
  ]);
  const audius  = audiusRes.status === 'fulfilled'  ? audiusRes.value  : [];
  const jamendo = jamendoRes.status === 'fulfilled' ? jamendoRes.value : [];

  const merged = [];
  const seen = new Set();
  for (const t of [...audius, ...jamendo]) {
    const key = `${(t.title || '').toLowerCase().trim()}|${(t.artist?.name || '').toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(t);
  }
  return fisherYates(merged);
}

function greetingFor(hour) {
  if (hour < 5)  return { text: 'Good night',     sub: 'Late-night listening, the world all yours.',   Icon: Moon,    mood: 'night' };
  if (hour < 12) return { text: 'Good morning',   sub: 'Fresh sounds from independent artists.',         Icon: Sunrise, mood: 'morning' };
  if (hour < 17) return { text: 'Good afternoon', sub: 'Something new for your midday mix.',             Icon: Sun,     mood: 'afternoon' };
  if (hour < 21) return { text: 'Good evening',   sub: 'Unwind with tracks picked for right now.',       Icon: Sunset,  mood: 'evening' };
  return { text: 'Good night', sub: 'Late-night listening, the world all yours.', Icon: Moon, mood: 'night' };
}

export default function Home() {
  const navigate = useNavigate();

  const [external, setExternal] = useState(() => readExternalCache()?.tracks || []);
  const [localTracks, setLocalTracks] = useState([]);
  const [loadingExternal, setLoadingExternal] = useState(() => !readExternalCache()?.tracks?.length);
  const [chartsByCountry, setChartsByCountry] = useState({});
  const [chartsLoading, setChartsLoading] = useState(true);

  const { text: greeting, sub: subtitle, Icon: GreetIcon, mood } = greetingFor(new Date().getHours());

  useEffect(() => {
    document.documentElement.setAttribute('data-mood', mood);
    return () => document.documentElement.removeAttribute('data-mood');
  }, [mood]);

  // ---- Local uploads: fetch fresh every time, no cache ----
  useEffect(() => {
    let cancelled = false;
    const loadLocal = () => {
      getRecentLocalTracks(LOCAL_LIMIT)
        .then(list => { if (!cancelled) setLocalTracks(list || []); })
        .catch(err => console.warn('[discover] local fetch failed:', err.message));
    };
    loadLocal();
    // Also refresh on window focus so a track uploaded in another tab appears
    const onFocus = () => loadLocal();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // ---- External mix: cached 30 min, silently refreshed ----
  useEffect(() => {
    let cancelled = false;
    const shouldFetch = () => {
      const cache = readExternalCache();
      if (!cache) return true;
      return Date.now() - cache.at > EXTERNAL_TTL_MS;
    };
    const refresh = async (silent) => {
      if (!silent) setLoadingExternal(true);
      try {
        const fresh = await fetchExternalMix();
        if (cancelled || !fresh.length) return;
        setExternal(fresh);
        writeExternalCache(fresh);
      } catch (err) {
        console.warn('[discover] external fetch failed:', err.message);
      } finally {
        if (!cancelled && !silent) setLoadingExternal(false);
      }
    };
    if (shouldFetch()) refresh(false);
    else setLoadingExternal(false);

    const onFocus = () => {
      const cache = readExternalCache();
      if (!cache) return;
      if (Date.now() - cache.at > EXTERNAL_STALE_MS) refresh(true);
    };
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // ---- Charts ----
  useEffect(() => {
    let cancelled = false;
    const codes = [...new Set([
      ...TOP_COUNTRIES.map(c => c.country),
      ...CITY_CHARTS.map(c => c.country),
    ])];
    getMultiCharts(codes, 25)
      .then(list => {
        if (cancelled) return;
        const byCountry = {};
        for (const c of list) byCountry[c.country] = c;
        setChartsByCountry(byCountry);
      })
      .catch(err => console.warn('[charts] fetch failed:', err.message))
      .finally(() => { if (!cancelled) setChartsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // ---- Merge: local tracks first, external fills the rest ----
  const localIds = new Set(localTracks.map(t => t.id));
  const externalFiltered = external.filter(t => !localIds.has(t.id));
  const remaining = Math.max(0, DISCOVER_LIMIT - localTracks.length);
  const discover = [...localTracks, ...externalFiltered.slice(0, remaining)];

  const loadingDiscover = loadingExternal && discover.length === 0;

  return (
    <div className={`home mood-${mood}`}>
      <div className="home-glow" aria-hidden="true" />

      <section className="home-hero">
        <div className="home-hero-content">
          <div className="home-hero-badge">
            <GreetIcon size={22} strokeWidth={2.2} />
          </div>
          <div className="home-hero-text">
            <h1 className="home-hero-title">{greeting}</h1>
            <p className="home-hero-sub">{subtitle}</p>
          </div>
        </div>
        <div className="home-hero-decor" aria-hidden="true">
          <Music2 size={22} className="home-hero-note note-1" />
          <Sparkles size={18} className="home-hero-note note-2" />
          <Disc3 size={24} className="home-hero-note note-3" />
          <Radio size={16} className="home-hero-note note-4" />
        </div>
      </section>

      <section className="home-shelf">
        <header className="shelf-header">
          <h2>Discover</h2>
          <button className="shelf-see-all" onClick={() => navigate('/search')}>
            Explore <ChevronRight size={14} />
          </button>
        </header>

        {loadingDiscover && (
          <p className="shelf-empty">Loading tracks…</p>
        )}
        {!loadingDiscover && discover.length === 0 && (
          <p className="shelf-empty shelf-error">Couldn't load any tracks right now.</p>
        )}
        {discover.length > 0 && (
          <div className="track-list">
            {discover.map(track => (
              <TrackRow key={track.id} track={track} queue={discover} />
            ))}
          </div>
        )}
      </section>

      <section className="home-shelf">
        <header className="shelf-header">
          <h2>Continental Top 100</h2>
        </header>
        <div className="chart-shelf-grid chart-shelf-grid-4">
          {CONTINENT_CHARTS.map(cfg => (
            <ChartCard
              key={cfg.id}
              chart={cfg}
              kind="continent"
              loading={chartsLoading && Object.keys(chartsByCountry).length === 0}
            />
          ))}
        </div>
      </section>

      <section className="home-shelf">
        <header className="shelf-header">
          <h2>Daily Top 100</h2>
          <button className="shelf-see-all" onClick={() => navigate('/charts/global')}>
            See all <ChevronRight size={14} />
          </button>
        </header>
        <div className="chart-shelf-grid">
          {TOP_COUNTRIES.map(cfg => (
            <ChartCard
              key={cfg.id}
              chart={cfg}
              kind="country"
              loading={chartsLoading && !chartsByCountry[cfg.country]}
            />
          ))}
        </div>
      </section>

      <section className="home-shelf">
        <header className="shelf-header">
          <h2>City Charts</h2>
        </header>
        <div className="chart-shelf-grid">
          {CITY_CHARTS.map(cfg => (
            <ChartCard
              key={cfg.id}
              chart={cfg}
              kind="city"
              loading={chartsLoading && !chartsByCountry[cfg.country]}
            />
          ))}
        </div>
      </section>
    </div>
  );
}