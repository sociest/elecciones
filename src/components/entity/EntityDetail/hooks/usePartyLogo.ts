import { useEffect, useState } from 'react';

export const usePartyLogo = (
  partyId: string | undefined,
  existingLogo: string | null | undefined
) => {
  const [fetchedLogo, setFetchedLogo] = useState<string | null>(null);

  useEffect(() => {
    if (existingLogo) {
      setFetchedLogo(existingLogo);
    }
  }, [partyId, existingLogo]);

  return fetchedLogo;
};
