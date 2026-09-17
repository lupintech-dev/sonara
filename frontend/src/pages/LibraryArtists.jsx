// frontend/src/pages/LibraryArtists.jsx
import { useEffect, useState } from 'react';
import { User as UserIcon } from 'lucide-react';
import { useFollowStore } from '../store/followStore';
import { getFollowing } from '../api/social';
import './Library.css';

const initialsOf = (s) => s ? s.split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase() : '?';

export default function LibraryArtists() {
  const [artists, setArtists] = useState([]);
  const refresh = useFollowStore(s => s.refresh);

  useEffect(() => {
    getFollowing().then(setArtists).catch(() => {});
    refresh();
  }, [refresh]);

  if (artists.length === 0) {
    return (
      <div className="library-empty">
        <div className="library-empty-art"><UserIcon size={56} /></div>
        <h2>No artists followed</h2>
        <p>Search for users and hit Follow.</p>
      </div>
    );
  }

  return (
    <div className="library">
      <header className="library-header"><h1>Artists</h1></header>
      <div className="artist-grid">
        {artists.map(a => (
          <div key={a.id} className="artist-card">
            <div className="artist-card-avatar">
              {a.avatar_path
                ? <img src={a.avatar_path} alt="" />
                : <span>{initialsOf(a.display_name || a.username)}</span>}
            </div>
            <div className="artist-card-name truncate">{a.display_name || a.username}</div>
            <div className="artist-card-handle truncate">@{a.username}</div>
          </div>
        ))}
      </div>
    </div>
  );
}