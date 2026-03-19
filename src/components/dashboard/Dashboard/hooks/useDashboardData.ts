import { useState, useEffect } from 'react';
import {
  fetchAuthorities,
  getEntityCount,
  getClaimCount,
  getPropertyCount,
  getAuthoritiesByMunicipalityStreaming,
  fetchEntitiesFiltered,
} from '../../../../lib/queries';
import type { Entity, Authority } from '../../../../lib/queries';

/**
 * Rearrange a flat entity list so the first slots show a
 * balanced mix of roles (up to 2 Alcaldes, 2 Concejales, 2 Asambleístas,
 * 2 Gobernadores) followed by the remainder in original order.
 * Does NOT mutate the input array.
 */
function rearrangeEntities(entities: Entity[]): Entity[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alcaldes = entities.filter((e) => (e as any).role === 'Alcalde');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const concejales = entities.filter((e) => (e as any).role === 'Concejal');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gobernadores = entities.filter((e) => (e as any).role === 'Gobernador');
  const asambleistas = entities.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e) => (e as any).role === 'Asambleísta'
  );
  const otros = entities.filter(
    (e) =>
      !['Alcalde', 'Concejal', 'Gobernador', 'Asambleísta'].includes(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e as any).role || ''
      )
  );

  const rearranged: Entity[] = [
    ...alcaldes.slice(0, 2),
    ...concejales.slice(0, 2),
    ...asambleistas.slice(0, 2),
    ...gobernadores.slice(0, 2),
  ];

  const usedIds = new Set(rearranged.map((e) => e.$id));
  const pool = [
    ...alcaldes,
    ...concejales,
    ...asambleistas,
    ...gobernadores,
    ...otros,
  ].filter((e) => !usedIds.has(e.$id));

  rearranged.push(...pool);

  return rearranged;
}

/**
 * Hook to fetch dashboard data including entities and statistics
 */
export const useDashboardData = (municipalityId: string | null = null) => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [surveys, setSurveys] = useState<Entity[]>([]);
  const [stats, setStats] = useState({ entities: 0, claims: 0, properties: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cacheKey = municipalityId
    ? `dashboard_muni_${municipalityId}`
    : 'dashboard_global';
  const cacheTimeKey = `${cacheKey}_time`;
  const cacheDuration = 5 * 60 * 1000;

  const loadFromCache = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      const cachedTime = sessionStorage.getItem(cacheTimeKey);
      if (!cached || !cachedTime) return false;
      const age = Date.now() - Number(cachedTime);
      if (Number.isNaN(age) || age > cacheDuration) return false;
      const parsed = JSON.parse(cached);
      if (parsed?.entities && parsed?.stats) {
        setEntities(parsed.entities);
        setStats(parsed.stats);
        setLoading(false);
        return true;
      }
    } catch (error) {
      console.warn('[useDashboardData] Cache read failed:', error);
    }
    return false;
  };

  const saveToCache = (
    nextEntities: Entity[],
    nextStats: { entities: number; claims: number; properties: number }
  ) => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({ entities: nextEntities, stats: nextStats })
      );
      sessionStorage.setItem(cacheTimeKey, Date.now().toString());
    } catch (error) {
      console.warn('[useDashboardData] Cache write failed:', error);
    }
  };

  useEffect(() => {
    let active = true;
    const hasCache = loadFromCache();

    async function loadData() {
      try {
        if (!hasCache && active) setLoading(true);
        if (active) setRefreshing(true);

        let finalEntities: Entity[] = [];

        if (municipalityId) {
          let firstBatchReceived = false;

          await getAuthoritiesByMunicipalityStreaming(
            municipalityId,
            (batch: Authority[], replace: boolean) => {
              if (!active) return;

              if (replace) {
                const arranged = rearrangeEntities(batch);
                finalEntities = arranged;
                setEntities(arranged);
                setLoading(false);
                firstBatchReceived = true;
              } else {
                setEntities((prev) => {
                  const seen = new Set(prev.map((e) => e.$id));
                  const newItems = batch.filter((e) => !seen.has(e.$id));
                  const merged = [...prev, ...newItems];
                  const arranged = rearrangeEntities(merged);
                  finalEntities = arranged;
                  return arranged;
                });
              }
            }
          );

          if (!firstBatchReceived && active) {
            finalEntities = [];
            setEntities([]);
            setLoading(false);
          }
        } else {
          // Global view: fetch up to limit
          const authoritiesData = await fetchAuthorities({ limit: 1000 });
          const loadedEntities =
            (authoritiesData as { documents: Entity[] }).documents || [];
          const arranged = rearrangeEntities(loadedEntities);
          finalEntities = arranged;

          if (active) {
            setEntities(arranged);
          }
        }

        // Fetch Surveys
        const { documents: loadedSurveys } = await fetchEntitiesFiltered({
          department: municipalityId || undefined,
          entityType: 'Encuesta',
          limit: 10,
        });
        if (active) {
          setSurveys(loadedSurveys);
        }

        const fetchStats = async () => {
          try {
            const [entityCount, claimCount, propertyCount] = await Promise.all([
              getEntityCount(),
              getClaimCount(),
              getPropertyCount(),
            ]);

            const nextStats = {
              entities: entityCount,
              claims: claimCount,
              properties: propertyCount,
            };

            if (active) {
              setStats(nextStats);
              saveToCache(finalEntities, nextStats);
            }
          } catch (error) {
            console.error('[useDashboardData] Error loading stats:', error);
          } finally {
            if (active) setRefreshing(false);
          }
        };

        if (hasCache) {
          fetchStats();
        } else {
          await fetchStats();
        }
      } catch (error) {
        console.error(
          '[useDashboardData] Error loading dashboard data:',
          error
        );
        if (active && !hasCache) {
          setEntities([]);
          setSurveys([]);
          setStats({ entities: 0, claims: 0, properties: 0 });
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipalityId]);

  return { entities, surveys, stats, loading, refreshing };
};
