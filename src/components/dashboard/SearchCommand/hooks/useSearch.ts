import { useCallback, useRef, useState } from 'react';
import { getUnifiedData } from '../../../../lib/queries/localData';
import type { Entity } from '../../../../lib/queries';
import { SEARCH_DEBOUNCE_MS } from '../constants';

export const useSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(
    (value: string, onSearch?: (query: string) => void) => {
      setQuery(value);

      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }

      if (value.trim().length === 0) {
        setResults([]);
        setIsOpen(false);
        if (onSearch) onSearch('');
        return;
      }

      setLoading(true);
      setIsOpen(true);

      searchTimeout.current = setTimeout(async () => {
        try {
          const { candidates, surveys } = await getUnifiedData();
          const q = value.toLowerCase();
          
          const filteredCandidates = candidates.filter(c => 
            c.label?.toLowerCase().includes(q) || 
            c.role?.toLowerCase().includes(q) ||
            c.territorio?.toLowerCase().includes(q)
          );

          const filteredSurveys = surveys.filter(s => 
            s.label?.toLowerCase().includes(q) ||
            s.autorLabel?.toLowerCase().includes(q)
          ).map(s => ({ ...s, isSurvey: true }));

          const combined = [...filteredCandidates, ...filteredSurveys].slice(0, 5);
          
          setResults(combined);
          if (onSearch) onSearch(value);
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, SEARCH_DEBOUNCE_MS);
    },
    []
  );

  const clearSearch = useCallback((onSearch?: (query: string) => void) => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    if (onSearch) onSearch('');
  }, []);

  return {
    query,
    setQuery,
    results,
    setResults,
    loading,
    isOpen,
    setIsOpen,
    handleSearch,
    clearSearch,
  };
};
