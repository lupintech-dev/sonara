// frontend/src/pages/EQPage.jsx
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { EQ_PRESETS, EQ_PRESET_ORDER } from '../utils/eqPresets';
import './EQPage.css';

export default function EQPage() {
  const navigate = useNavigate();
  const eqPreset = useSettingsStore(s => s.eqPreset);
  const setSetting = useSettingsStore(s => s.set);

  return (
    <div className="eqp">
      <header className="eqp-header">
        <button className="btn-icon" onClick={() => navigate('/settings')} aria-label="Back">
          <ArrowLeft size={22} />
        </button>
        <h1>EQ</h1>
      </header>

      <ul className="eqp-list">
        {EQ_PRESET_ORDER.map(key => {
          const preset = EQ_PRESETS[key];
          const active = eqPreset === key;
          return (
            <li key={key}>
              <button
                className={`eqp-row ${active ? 'active' : ''}`}
                onClick={() => setSetting('eqPreset', key)}
              >
                <span className="eqp-row-label">{preset.name}</span>
                {active && <Check size={22} className="eqp-check" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}