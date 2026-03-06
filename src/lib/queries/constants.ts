export const PROPERTY_IDS = {
  INSTANCE_OF: '69814ee90009513e4f69',
  PART_OF: '6983977fdc3b15edf3f5',
  TERRITORIAL_CODE: '6982c462b97710531954',
  TERRITORY: '6982cd215f22d1c5d613',
  CANDIDATO_POLITICO: '69857da6142c6cf1636b',
  POLITICAL_PARTY: '6985697dce1378ac55e9',
  COLOR: '69860e969885b01c0bb4',
} as const;

export const DEPARTMENT_IDS = {
  'La Paz': '6983986f27930b142391',
  'Santa Cruz': '69839869e17caed5adf0',
  Cochabamba: '698398675bb38121fa86',
  Oruro: '6983986c6c9ac55f6440',
  Potosí: '6983986da5e5ba7df366',
  Chuquisaca: '698398662dbd3f8849d5',
  Tarija: '6983986b655f81d387ea',
  Beni: '6983986484ff3fbbd1ce',
  Pando: '69839868858161e0b8a0',
} as const;

const CACHE_DURATION = 5 * 60 * 1000;
export { CACHE_DURATION };

export const ROLE_IDS = {
  ALCALDE: 'Alcalde',
  GOBERNADOR: 'Gobernador',
  CONCEJAL: 'Concejal',
  ASAMBLEISTA: 'Asambleísta',
} as const;
