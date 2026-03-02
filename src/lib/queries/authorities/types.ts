import type { Authority } from '../types';

export type AuthorityRole =
  | 'Alcalde'
  | 'Gobernador'
  | 'Concejal'
  | 'Asambleísta';

export interface AuthoritiesByMunicipality {
  alcalde: Authority[];
  gobernador: Authority[];
  concejales: Authority[];
  asambleistas: Authority[];
}
