import { useEffect } from 'react';
import { useCharacterStore } from '../character-store';

export const useFetchCharacterMarket = () => {
  const loadCharacterMarket = useCharacterStore((s) => s.loadCharacterMarket);

  useEffect(() => {
    loadCharacterMarket();
  }, [loadCharacterMarket]);
};
