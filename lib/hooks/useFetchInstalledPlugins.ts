import { useEffect } from 'react';
import { useToolStore } from '../tool-store';

export const useFetchInstalledPlugins = () => {
  const loadInstalledPlugins = useToolStore((s) => s.loadInstalledPlugins);

  useEffect(() => {
    loadInstalledPlugins();
  }, [loadInstalledPlugins]);
};
