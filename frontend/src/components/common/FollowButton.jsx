// frontend/src/components/common/FollowButton.jsx
import { useFollowStore } from '../../store/followStore';
import { useAuth } from '../../contexts/AuthContext';
import './FollowButton.css';

export default function FollowButton({ userId, size = 'sm' }) {
  const { user } = useAuth();
  const isFollowing = useFollowStore(s => s.following.has(userId));
  const toggle = useFollowStore(s => s.toggle);

  if (!user || user.id === userId) return null;

  const handleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    toggle(userId);
  };

  return (
    <button
      className={`follow-btn ${size} ${isFollowing ? 'following' : ''}`}
      onClick={handleClick}
    >
      <span className="follow-btn-label">{isFollowing ? 'Following' : 'Follow'}</span>
      {isFollowing && <span className="follow-btn-unfollow">Unfollow</span>}
    </button>
  );
}