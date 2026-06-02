import { useEffect } from 'react';
import { useCharacterStore } from '../character-store';

export const useFetchCustomTemplates = () => {
  const loadCustomTemplates = useCharacterStore((s) => s.loadCustomTemplates);

  useEffect(() => {
    loadCustomTemplates();
  }, [loadCustomTemplates]);
};
