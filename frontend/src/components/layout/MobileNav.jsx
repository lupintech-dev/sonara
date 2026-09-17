// frontend/src/components/layout/MobileNav.jsx
import { NavLink } from 'react-router-dom';
import { Home, Search, Radio, Sparkles, Library } from 'lucide-react';
import './MobileNav.css';

export default function MobileNav() {
  return (
    <nav className="mobile-nav">
      <NavLink to="/" end className={({isActive}) => `mnav-item ${isActive ? 'active' : ''}`}>
        <Home size={20} /><span>Home</span>
      </NavLink>
      <NavLink to="/search" className={({isActive}) => `mnav-item ${isActive ? 'active' : ''}`}>
        <Search size={20} /><span>Search</span>
      </NavLink>
      <NavLink to="/radio" className={({isActive}) => `mnav-item mnav-item-radio ${isActive ? 'active' : ''}`}>
        <Radio size={20} /><span>Radio</span>
      </NavLink>
      <NavLink to="/ai-playlist" className={({isActive}) => `mnav-item mnav-item-ai ${isActive ? 'active' : ''}`}>
        <Sparkles size={20} /><span>AI</span>
      </NavLink>
      <NavLink to="/library" className={({isActive}) => `mnav-item ${isActive ? 'active' : ''}`}>
        <Library size={20} /><span>Library</span>
      </NavLink>
    </nav>
  );
}