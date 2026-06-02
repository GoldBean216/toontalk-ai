import { useEffect } from 'react';
import { useToolStore } from '../tool-store';

export const useFetchPluginStore = () => {
  const loadPluginStore = useToolStore((s) => s.loadPluginStore);

  useEffect(() => {
    loadPluginStore();
  }, [loadPluginStore]);
};
