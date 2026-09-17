// frontend/src/components/common/VerifiedBadge.jsx
import { BadgeCheck } from 'lucide-react';
import './VerifiedBadge.css';

export default function VerifiedBadge({ size = 'sm', title = 'Verified Artist' }) {
  const px = size === 'lg' ? 20 : size === 'md' ? 16 : 12;
  return (
    <span className={`verified-badge ${size}`} title={title} aria-label={title}>
      <BadgeCheck size={px} />
    </span>
  );
}