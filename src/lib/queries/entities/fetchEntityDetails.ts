import { fetchEntityById } from '../search/queries';
import { PROPERTY_IDS } from '../../constants/entity-types';

/**
 * Fetch full entity details (Mocked for CSV)
 */
export async function fetchEntityDetails(entityId: string) {
  try {
    const entity = await fetchEntityById(entityId);
    
    if (!entity) {
      throw new Error(`Entity not found: ${entityId}`);
    }

    const type = ((entity as any).type || 'PERSONA').toUpperCase();
    const claims: any[] = [];
    
    if (type === 'ENCUESTA') {
      const e = entity as any;
      
      // Map results to claims
      if (e.resultados && Array.isArray(e.resultados)) {
        e.resultados.forEach((r: any, idx: number) => {
          claims.push({
            $id: `res_${idx}_${r.item}`,
            property: { label: 'Resultado', $id: PROPERTY_IDS.RESULTADO_ENCUESTA },
            value_raw: r.porcentaje.toString(),
            value_relation: { label: r.label || r.item },
            qualifiers: [
              {
                property: { label: 'Opción / Candidato' },
                value_relation: { label: r.label || r.item }
              },
              {
                property: { label: 'Porcentaje' },
                value_raw: r.porcentaje.toString()
              },
              {
                property: { label: 'Pregunta' },
                value_raw: r.pregunta || ''
              }
            ]
          });
        });
      }

      // Metadata claims
      if (e.autorLabel) {
        claims.push({
          $id: 'claim_autor',
          property: { label: 'Autor', $id: PROPERTY_IDS.AUTOR_ENCUESTA },
          value_relation: { label: e.autorLabel },
          value_raw: e.autorLabel
        });
      }
      if (e.coberturaLabel) {
        claims.push({
          $id: 'claim_cobertura',
          property: { label: 'Cobertura', $id: PROPERTY_IDS.COBERTURA_ENCUESTA },
          value_relation: { label: e.coberturaLabel },
          value_raw: e.coberturaLabel
        });
      }
      if (e.muestra) {
        claims.push({
          $id: 'claim_muestra',
          property: { label: 'Muestra', $id: PROPERTY_IDS.MUESTRA_ENCUESTA },
          value_raw: e.muestra.toString()
        });
      }
      if (e.margen) {
        claims.push({
          $id: 'claim_margen',
          property: { label: 'Margen de Error', $id: PROPERTY_IDS.MARGEN_ERROR_ENCUESTA },
          value_raw: e.margen.toString()
        });
      }
      if (e.nivelConfianza) {
        claims.push({
          $id: 'claim_confianza',
          property: { label: 'Nivel de Confianza', $id: PROPERTY_IDS.NIVEL_DE_CONFIANZA_ENCUESTA },
          value_raw: e.nivelConfianza.toString()
        });
      }
      if (e.fechaInicio) {
        claims.push({
          $id: 'claim_inicio',
          property: { label: 'Fecha Inicio', $id: PROPERTY_IDS.FECHA_INICIO_ENCUESTA },
          value_raw: e.fechaInicio
        });
      }
      if (e.fechaFin) {
        claims.push({
          $id: 'claim_fin',
          property: { label: 'Fecha Fin', $id: PROPERTY_IDS.FECHA_FIN_ENCUESTA },
          value_raw: e.fechaFin
        });
      }
      if (e.publicacion) {
        claims.push({
          $id: 'claim_publi',
          property: { label: 'Fecha Publicación', $id: PROPERTY_IDS.FECHA_PUBLICACION },
          value_raw: e.publicacion
        });
      }
      if (e.archivo) {
        claims.push({
          $id: 'claim_archivo',
          property: { label: 'Archivo', $id: PROPERTY_IDS.ARCHIVO },
          value_raw: e.archivo
        });
      }
    }

    return {
      entity,
      claims,
      entityType: type as any,
    };
  } catch (error) {
    console.error('Error fetching entity details (CSV):', error);
    throw error;
  }
}

