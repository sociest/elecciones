import { loadCSV } from '../../../lib/utils/csvLoader';

/**
 * Get total count of entities (Mock using CSV sizes)
 */
export async function getEntityCount(): Promise<number> {
  try {
    const candidatos = await loadCSV('/data/candidatos.csv');
    // Approximate count
    return candidatos.length;
  } catch (error) {
    console.error('Error getting entity count:', error);
    return 0;
  }
}

/**
 * Get total count of claims (Mock)
 */
export async function getClaimCount(): Promise<number> {
  try {
    const result = await loadCSV('/data/candidatos.csv');
    // Approximate: each row in candidatos.csv is roughly a set of claims
    return result.length * 5; 
  } catch (error) {
    console.error('Error getting claim count:', error);
    return 0;
  }
}

