import { useCallback, useEffect, useRef } from "react";

export type RemoteSelectOption = {
  value: string;
  label: string;
  domisili?: string;
};

export function useDebouncedOptionLoader<Option extends RemoteSelectOption>(
  loader: (query: string) => Promise<Option[]>,
  delay = 300
) {
  const loaderRef = useRef(loader);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingResolversRef = useRef<Array<(options: Option[]) => void>>([]);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    pendingResolversRef.current.splice(0).forEach((resolve) => resolve([]));
  }, []);

  return useCallback((query: string) => new Promise<Option[]>((resolve) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    pendingResolversRef.current.push(resolve);
    timerRef.current = setTimeout(async () => {
      const resolvers = pendingResolversRef.current.splice(0);
      try {
        const options = await loaderRef.current(query.trim());
        resolvers.forEach((complete) => complete(options));
      } catch {
        resolvers.forEach((complete) => complete([]));
      }
    }, delay);
  }), [delay]);
}