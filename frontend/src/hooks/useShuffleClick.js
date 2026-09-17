// frontend/src/hooks/useShuffleClick.js
import { usePlayerStore } from '../store/playerStore';
import { useDoubleTap } from './useDoubleTap';

export function useShuffleClick() {
  const cycleShuffle   = usePlayerStore(s => s.cycleShuffle);
  const setShuffleMode = usePlayerStore(s => s.setShuffleMode);

  return useDoubleTap({
    onSingle: () => cycleShuffle(),        // off <-> on
    onDouble: () => setShuffleMode('smart'), // smart shuffle
  });
}