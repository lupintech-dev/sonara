// frontend/src/pages/LibraryAlbums.jsx
import { useEffect, useMemo } from 'react';
import { Disc3 } from 'lucide-react';
import { usePlayerStore } from '../store/playerStore';
import { fetchFavorites } from '../api/favorites';
import './Library.css';

export default function LibraryAlbums() {
  const liked = usePlayerStore(s => s.likedTracks);
  const hydrate = usePlayerStore(s => s.hydrateFavorites);

  useEffect(() => {
    fetchFavorites().then(t => t.length && hydrate(t)).catch(() => {});
  }, [hydrate]);

  // Placeholder grouping by artist until real album metadata lands
  const albums = useMemo(() => {
    const map = new Map();
    for (const t of Object.values(liked)) {
      const key = t.artist?.name || 'Unknown';
      if (!map.has(key)) map.set(key, { name: key, image: t.image, count: 0 });
      map.get(key).count++;
    }
    return [...map.values()];
  }, [liked]);

  if (albums.length === 0) {
    return (
      <div className="library-empty">
        <div className="library-empty-art"><Disc3 size={56} /></div>
        <h2>No albums saved</h2>
        <p>Albums you save will appear here.</p>
      </div>
    );
  }

  return (
    <div className="library">
      <header className="library-header"><h1>Albums</h1></header>
      <div className="album-grid">
        {albums.map(a => (
          <div key={a.name} className="album-card">
            <div className="album-card-art">
              {a.image ? <img src={a.image} alt="" /> : <Disc3 size={40} />}
            </div>
            <div className="album-card-name truncate">{a.name}</div>
            <div className="album-card-count">{a.count} songs</div>
          </div>
        ))}
      </div>
    </div>
  );
}