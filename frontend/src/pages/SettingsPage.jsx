// frontend/src/pages/SettingsPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User as UserIcon, Music2, Volume2, Palette, Shield,
  HardDrive, Info, LogOut, RotateCcw, ChevronRight, Sun, Moon, Monitor,
  SlidersHorizontal, HardDriveDownload, Trash2, Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettingsStore } from '../store/settingsStore';
import { useDownloadStore } from '../store/downloadStore';
import { EQ_PRESETS } from '../utils/eqPresets';
import './SettingsPage.css';

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`st-toggle ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
    />
  );
}

function initials(name) {
  if (!name) return 'U';
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  const mb = bytes / 1024 / 1024;
  if (mb < 1000) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function ownerLabel(owner) {
  if (owner === 'anon') return 'Anonymous sessions';
  if (owner.startsWith('user:')) return `User #${owner.slice(5)}`;
  return owner;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const s = useSettingsStore();

  const downloadEntries = useDownloadStore(st => st.entries);
  const totalSize = useDownloadStore(st => st.totalSize);
  const otherOwners = useDownloadStore(st => st.otherOwners);
  const refreshDownloads = useDownloadStore(st => st.refresh);
  const clearAllDownloads = useDownloadStore(st => st.clearAll);
  const clearOtherOwners = useDownloadStore(st => st.clearOtherOwners);

  const [clearingDl, setClearingDl] = useState(false);
  const [clearingOther, setClearingOther] = useState(false);

  useEffect(() => { refreshDownloads(); }, [refreshDownloads]);

  const handleLogout = () => { logout(); navigate('/'); };
  const eqLabel = EQ_PRESETS[s.eqPreset]?.name || 'Off';

  const downloadCount = Object.keys(downloadEntries).length;
  const otherTotal = otherOwners.reduce((sum, o) => sum + (o.size || 0), 0);
  const otherCount = otherOwners.reduce((sum, o) => sum + (o.count || 0), 0);

  const handleClearDownloads = async () => {
    if (downloadCount === 0) return;
    if (!confirm(`Remove all ${downloadCount} downloads? This can't be undone.`)) return;
    setClearingDl(true);
    try { await clearAllDownloads(); }
    catch (err) { alert(err.message); }
    finally { setClearingDl(false); }
  };

  const handleClearOthers = async () => {
    if (otherOwners.length === 0) return;
    const total = `${otherCount} tracks · ${formatBytes(otherTotal)}`;
    if (!confirm(`Remove downloads from ${otherOwners.length} other account(s) on this device?\n\n${total}\n\nThe current account's downloads are kept.`)) return;
    setClearingOther(true);
    try { await clearOtherOwners(); }
    catch (err) { alert(err.message); }
    finally { setClearingOther(false); }
  };

  return (
    <div className="st">
      <header className="st-header">
        <button className="btn-icon" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1>Settings</h1>
      </header>

      {user && (
        <section className="st-section">
          <h2><UserIcon size={16} /> Account</h2>
          <button className="st-row-link" onClick={() => navigate('/settings/account')}>
            <span className="st-row-link-avatar">
              {user.avatar_path
                ? <img src={user.avatar_path} alt="" />
                : <span>{initials(user.display_name || user.username)}</span>}
            </span>
            <span className="st-row-link-text">
              <strong>{user.display_name || user.username}</strong>
              <span>@{user.username} · Edit profile, avatar, bio</span>
            </span>
            <ChevronRight size={18} />
          </button>
        </section>
      )}

      {user?.is_admin && (
        <section className="st-section">
          <h2><Shield size={16} /> Administration</h2>
          <button className="st-row-link" onClick={() => navigate('/admin')}>
            <span className="st-row-link-icon"><Shield size={18} /></span>
            <span className="st-row-link-text">
              <strong>Admin dashboard</strong>
              <span>Manage users, uploads, and messages</span>
            </span>
            <ChevronRight size={18} />
          </button>
        </section>
      )}

      <section className="st-section">
        <h2><Music2 size={16} /> Playback</h2>

        <div className="st-row">
          <div className="st-row-text">
            <strong>Crossfade</strong>
            <span>Fade the current track into the next (0–12 seconds).</span>
          </div>
          <div className="st-slider-wrap">
            <input
              type="range" min={0} max={12} step={1}
              value={s.crossfadeSeconds}
              onChange={(e) => s.set('crossfadeSeconds', parseInt(e.target.value, 10))}
            />
            <span className="st-slider-value">
              {s.crossfadeSeconds === 0 ? 'Off' : `${s.crossfadeSeconds}s`}
            </span>
          </div>
        </div>

        <div className="st-row">
          <div className="st-row-text">
            <strong>Gapless playback</strong>
            <span>Remove silence between tracks.</span>
          </div>
          <Toggle checked={s.gapless} onChange={(v) => s.set('gapless', v)} />
        </div>
      </section>

      <section className="st-section">
        <h2><Volume2 size={16} /> Audio</h2>

        <div className="st-row">
          <div className="st-row-text">
            <strong>Volume level</strong>
            <span>Adjust how loud tracks play relative to your system volume.</span>
          </div>
          <div className="st-segmented">
            {['quiet', 'normal', 'loud'].map(level => (
              <button
                key={level}
                className={s.volumeLevel === level ? 'active' : ''}
                onClick={() => s.set('volumeLevel', level)}
              >
                {level[0].toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <button className="st-row-link" onClick={() => navigate('/settings/eq')}>
          <span className="st-row-link-icon"><SlidersHorizontal size={18} /></span>
          <span className="st-row-link-text">
            <strong>Equalizer</strong>
            <span>{eqLabel}</span>
          </span>
          <ChevronRight size={18} />
        </button>
      </section>

      <section className="st-section">
        <h2><Palette size={16} /> Appearance</h2>

        <div className="st-row">
          <div className="st-row-text">
            <strong>Theme</strong>
            <span>Choose how Sonara looks.</span>
          </div>
          <div className="st-segmented">
            {[
              { id: 'dark',   label: 'Dark',   Icon: Moon },
              { id: 'light',  label: 'Light',  Icon: Sun },
              { id: 'system', label: 'System', Icon: Monitor },
            ].map(({ id, label, Icon }) => (
              <button key={id}
                className={s.theme === id ? 'active' : ''}
                onClick={() => s.set('theme', id)}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="st-row">
          <div className="st-row-text">
            <strong>Now Playing animations</strong>
            <span>Idle fade and subtle transitions.</span>
          </div>
          <Toggle
            checked={s.showNowPlayingAnimations}
            onChange={(v) => s.set('showNowPlayingAnimations', v)} />
        </div>
      </section>

      <section className="st-section">
        <h2><Shield size={16} /> Privacy</h2>
        <div className="st-row">
          <div className="st-row-text">
            <strong>Show my listening activity</strong>
            <span>Let others see what you're playing. (Coming soon.)</span>
          </div>
          <Toggle checked={false} onChange={() => {}} />
        </div>
      </section>

      <section className="st-section">
        <h2><HardDrive size={16} /> Storage</h2>

        <button className="st-row-link" onClick={() => navigate('/downloads')}>
          <span className="st-row-link-icon"><HardDriveDownload size={18} /></span>
          <span className="st-row-link-text">
            <strong>Your offline downloads</strong>
            <span>
              {downloadCount === 0
                ? 'No tracks saved'
                : `${downloadCount} ${downloadCount === 1 ? 'track' : 'tracks'} · ${formatBytes(totalSize)}`}
            </span>
          </span>
          <ChevronRight size={18} />
        </button>

        {otherOwners.length > 0 && (
          <div className="st-row">
            <div className="st-row-text">
              <strong>
                <Users size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Other accounts on this device
              </strong>
              <span>
                {otherCount} {otherCount === 1 ? 'track' : 'tracks'} · {formatBytes(otherTotal)} across {otherOwners.length} {otherOwners.length === 1 ? 'account' : 'accounts'}
              </span>
            </div>
            <button
              className="st-action-btn danger"
              onClick={handleClearOthers}
              disabled={clearingOther}
            >
              <Trash2 size={14} /> Clear
            </button>
          </div>
        )}

        <div className="st-row">
          <div className="st-row-text">
            <strong>Clear local cache</strong>
            <span>Removes likes, settings, and search history from this device.</span>
          </div>
          <button className="st-action-btn"
            onClick={() => {
              if (confirm('Clear local cache? Your downloads and account data stay safe.')) {
                localStorage.removeItem('sonara_likes');
                localStorage.removeItem('sonara_settings');
                localStorage.removeItem('sonara_search_history');
                localStorage.removeItem('sonara_discover_cache_v1');
                location.reload();
              }
            }}>
            Clear
          </button>
        </div>

        {downloadCount > 0 && (
          <div className="st-row">
            <div className="st-row-text">
              <strong>Delete your downloads</strong>
              <span>Frees {formatBytes(totalSize)} of local storage.</span>
            </div>
            <button
              className="st-action-btn danger"
              onClick={handleClearDownloads}
              disabled={clearingDl}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </section>

      <section className="st-section">
        <h2><Info size={16} /> About</h2>
        <div className="st-row">
          <div className="st-row-text">
            <strong>Sonara v2.0</strong>
            <span>Powered by Audius & Jamendo</span>
          </div>
        </div>
      </section>

      <div className="st-danger">
        <div className="st-danger-text">
          <strong>Log out of Sonara</strong>
          <span>You'll need to sign in again to play music.</span>
        </div>
        <button className="st-logout" onClick={handleLogout}>
          <LogOut size={16} /> Log out
        </button>
      </div>

      <div className="st-reset">
        <button onClick={s.reset}>
          <RotateCcw size={14} /> Reset all settings to defaults
        </button>
      </div>
    </div>
  );
}