// frontend/src/pages/SocialPage.jsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, UserCheck, Loader2 } from 'lucide-react';
import { getFollowers, getFollowing } from '../api/social';
import { useAuth } from '../contexts/AuthContext';
import './SocialPage.css';

function initials(name) {
  if (!name) return 'U';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function SocialPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const tab = params.get('tab') === 'following' ? 'following' : 'followers';
  const userIdParam = params.get('userId');
  const viewingUserId = userIdParam ? parseInt(userIdParam, 10) : (user?.id ?? null);
  const isOwn = !userIdParam || (user && viewingUserId === user.id);

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!viewingUserId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetcher = tab === 'following' ? getFollowing : getFollowers;

    fetcher(viewingUserId)
      .then(users => { if (!cancelled) setList(users || []); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [tab, viewingUserId]);

  const Icon = tab === 'following' ? UserCheck : Users;

  const switchTab = (next) => {
    const nextParams = { tab: next };
    if (userIdParam) nextParams.userId = userIdParam;
    setParams(nextParams);
  };

  const backPath = isOwn ? '/profile' : `/artist/${viewingUserId}`;

  return (
    <div className="sp">
      <header className="sp-header">
        <button className="btn-icon" onClick={() => navigate(backPath)} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1>{tab === 'following' ? 'Following' : 'Followers'}</h1>
      </header>

      <div className="sp-tabs">
        <button
          className={tab === 'followers' ? 'active' : ''}
          onClick={() => switchTab('followers')}
        >
          Followers
        </button>
        <button
          className={tab === 'following' ? 'active' : ''}
          onClick={() => switchTab('following')}
        >
          Following
        </button>
      </div>

      {loading && (
        <div className="sp-loading">
          <Loader2 size={22} className="sp-spin" />
          <p>Loading…</p>
        </div>
      )}

      {!loading && error && <p className="sp-error">{error}</p>}

      {!loading && !error && list.length === 0 && (
        <div className="sp-empty">
          <div className="sp-empty-art"><Icon size={48} /></div>
          <h2>{tab === 'following' ? 'Not following anyone yet' : 'No followers yet'}</h2>
          <p>
            {tab === 'following'
              ? 'Find artists you love and follow them from their profile.'
              : 'When people follow this account, they’ll show up here.'}
          </p>
        </div>
      )}

      {!loading && !error && list.length > 0 && (
        <ul className="sp-list">
          {list.map(u => (
            <li key={u.id} className="sp-user-item">
              <button
                className="sp-user"
                onClick={() => navigate(`/artist/${u.id}`)}
              >
                <span className="sp-user-avatar">
                  {u.avatar_path
                    ? <img src={u.avatar_path} alt="" />
                    : <span>{initials(u.display_name || u.username)}</span>}
                </span>
                <span className="sp-user-meta">
                  <span className="sp-user-name truncate">
                    {u.display_name || u.username}
                  </span>
                  <span className="sp-user-handle truncate">@{u.username}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}