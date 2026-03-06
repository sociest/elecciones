import type { Entity, Claim } from '../../../../lib/queries';
import type {
  TimelineItem,
  EducationItem,
  LinkItem,
  SocialLink,
} from '../types';
import { normalizeText } from './formatters';
import {
  getQualifierValue,
  getQualifierEntity,
  getQualifierValueByLabels,
  isIdLike,
  getEntityId,
  getEntityLink,
  extractLabel,
} from './claimHelpers';

export const processClaimsData = (claims: Claim[], entity: Entity) => {
  const trayectoriaItems: TimelineItem[] = [];
  const educacionItems: EducationItem[] = [];
  const encuestasItems: LinkItem[] = [];
  const vinculosItems: LinkItem[] = [];
  const partido: Claim[] = [];
  let lugarNacimiento = 'Ubicación desconocida';
  let lugarNacimientoId: string | null = null;
  const socialLinks: SocialLink[] = [];
  let perfil = 'Perfil Verificado'; // Default category

  // Check aliases or entity type for category
  if (entity.aliases && entity.aliases.length > 0) {
    perfil = entity.aliases[0];
  }

  const ignoredProperties = [
    'carnet',
    'fecha de aparición',
    'fecha de nacimiento',
    'género',
    'fotografía',
    'es instancia de',
    'imagen',
    'foto',
    'logo',
    'emblema',
    'escudo',
  ];

  const usedClaims = new Set<string>();

  const isSurveyClaim = (claim: Claim) => {
    const propertyLabel = normalizeText(extractLabel(claim.property));
    const valueLabel = normalizeText(extractLabel(claim.value_relation));
    const subjectLabel = normalizeText(extractLabel(claim.subject));
    return (
      propertyLabel.includes('resultado') ||
      propertyLabel.includes('encuesta') ||
      valueLabel.includes('encuesta') ||
      subjectLabel.includes('encuesta')
    );
  };

  const getRelatedEntityForClaim = (claim: Claim) => {
    const subjectId = getEntityId(claim.subject);
    const valueId = getEntityId(claim.value_relation);

    if (valueId && valueId === entity.$id) return claim.subject;
    if (subjectId && subjectId === entity.$id) return claim.value_relation;

    if (claim.value_relation) return claim.value_relation;
    if (claim.subject && typeof claim.subject !== 'string')
      return claim.subject;

    return null;
  };

  const isLeadershipClaim = (claim: Claim) => {
    const propertyLabel = normalizeText(extractLabel(claim.property));
    const roleQualifier =
      getQualifierValueByLabels(claim, [
        'titular',
        'presidente',
        'fundador',
        'lider',
      ]) || '';
    return (
      propertyLabel.includes('partido') ||
      propertyLabel.includes('lider') ||
      roleQualifier.length > 0
    );
  };

  const makeReferences = (claim: Claim) =>
    (claim.references || [])
      .map((ref) => {
        const label = extractLabel(ref.reference);
        const link = getEntityLink(ref.reference);
        if (!label || isIdLike(label)) return null;
        return { label, link };
      })
      .filter(Boolean) as { label: string; link?: string | null }[];

  const getReadableValue = (value: unknown) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return (value as { label?: string }).label || '';
  };

  (claims || []).forEach((claim) => {
    const propertyLabel =
      typeof claim.property === 'object'
        ? (claim.property as { label?: string }).label?.toLowerCase() || ''
        : '';

    const valueRaw = claim.value_raw || '';

    // Blacklist check
    if (ignoredProperties.some((ignored) => propertyLabel.includes(ignored))) {
      return;
    }

    // Social Media Detection
    if (
      claim.datatype === 'url' ||
      propertyLabel.includes('url') ||
      propertyLabel.includes('red social')
    ) {
      const urlLower = valueRaw.toLowerCase();
      if (urlLower.includes('facebook')) {
        socialLinks.push({ type: 'facebook', url: valueRaw });
        return;
      } else if (urlLower.includes('twitter') || urlLower.includes('x.com')) {
        socialLinks.push({ type: 'twitter', url: valueRaw });
        return;
      } else if (urlLower.includes('instagram')) {
        socialLinks.push({ type: 'instagram', url: valueRaw });
        return;
      } else if (urlLower.includes('linkedin')) {
        socialLinks.push({ type: 'linkedin', url: valueRaw });
        return;
      } else if (
        propertyLabel.includes('web') ||
        propertyLabel.includes('sitio')
      ) {
        socialLinks.push({ type: 'web', url: valueRaw });
        return;
      }
      // If it's a generic URL claim that's not caught above, we might leave it or push to 'other'
    }

    const normalizedPropertyLabel = normalizeText(propertyLabel);
    const cargoValue = getQualifierValueByLabels(claim, [
      'cargo de trabajo',
      'cargo',
      'puesto',
    ]);

    if (
      cargoValue ||
      normalizedPropertyLabel.includes('cargo de trabajo') ||
      normalizedPropertyLabel.includes('cargo') ||
      normalizedPropertyLabel.includes('puesto') ||
      normalizedPropertyLabel.includes('trabajo')
    ) {
      const entidad = extractLabel(claim.value_relation) || null;
      const entidadId = getEntityId(claim.value_relation);
      trayectoriaItems.push({
        id: claim.$id,
        cargo: cargoValue || claim.value_raw || entidad || 'Cargo',
        entidad: entidad && !isIdLike(entidad) ? entidad : null,
        entidadId,
        inicio:
          getQualifierValueByLabels(claim, ['fecha de inicio', 'inicio']) ||
          null,
        fin: getQualifierValueByLabels(claim, ['fecha de fin', 'fin']) || null,
        territorio: getQualifierValue(claim, 'territorio'),
      });
      usedClaims.add(claim.$id);
      return;
    }

    const gradoAcademico = getQualifierValue(claim, 'grado academico');
    if (
      gradoAcademico ||
      normalizedPropertyLabel.includes('estudio') ||
      normalizedPropertyLabel.includes('universidad') ||
      normalizedPropertyLabel.includes('educacion') ||
      normalizedPropertyLabel.includes('titulo')
    ) {
      const universidadEntity =
        getQualifierEntity(claim, 'universidad') || claim.value_relation;
      const universidad = universidadEntity
        ? extractLabel(universidadEntity)
        : null;
      const universidadId = getEntityId(universidadEntity);

      educacionItems.push({
        id: claim.$id,
        titulo:
          gradoAcademico ||
          claim.value_raw ||
          extractLabel(claim.value_relation) ||
          'Formación académica',
        universidad: universidad && !isIdLike(universidad) ? universidad : null,
        universidadId,
        fecha:
          getQualifierValueByLabels(claim, [
            'fecha de fin',
            'fecha de inicio',
          ]) || null,
      });
      usedClaims.add(claim.$id);
      return;
    }
    // Partido (Political Organization)
    else if (
      normalizedPropertyLabel.includes('partido') ||
      normalizedPropertyLabel.includes('organizacion politica') ||
      normalizedPropertyLabel.includes('filiacion') ||
      normalizedPropertyLabel.includes('movimiento') ||
      normalizedPropertyLabel.includes('alianza') ||
      normalizedPropertyLabel.includes('militan')
    ) {
      partido.push(claim);
    }
    // Lugar de Nacimiento (Birthplace) / Origin
    else if (
      normalizedPropertyLabel.includes('lugar') ||
      normalizedPropertyLabel.includes('nacimiento') ||
      normalizedPropertyLabel.includes('origen')
    ) {
      lugarNacimiento =
        extractLabel(claim.value_relation) ||
        claim.value_raw ||
        lugarNacimiento;
      lugarNacimientoId =
        getEntityId(claim.value_relation) || lugarNacimientoId;
    }
    // Other links/connections (Vinculos/Ecosistema)
    if (
      isSurveyClaim(claim) ||
      normalizeText(extractLabel(claim.property)).includes('resultado')
    ) {
      const relatedEntity = getRelatedEntityForClaim(claim);
      const label =
        extractLabel(relatedEntity) ||
        claim.value_raw ||
        extractLabel(claim.property);
      const references = makeReferences(claim);
      encuestasItems.push({
        id: claim.$id,
        tipo: 'Encuesta',
        detalle: label,
        link: getEntityLink(relatedEntity),
        relacion: extractLabel(claim.property) || references[0]?.label || null,
        referencias: references,
      });
      usedClaims.add(claim.$id);
      return;
    }

    if (!usedClaims.has(claim.$id)) {
      const references = makeReferences(claim);
      const tipo = isLeadershipClaim(claim)
        ? 'Liderazgo'
        : extractLabel(claim.property) || 'Relacion';
      const relatedEntity = getRelatedEntityForClaim(claim);
      const detalle =
        extractLabel(relatedEntity) ||
        getReadableValue(claim.value_raw) ||
        'Detalle';

      if (isIdLike(detalle)) {
        const fixed = references.find((ref) => ref.label)?.label;
        if (fixed) {
          vinculosItems.push({
            id: claim.$id,
            tipo,
            detalle: fixed,
            link: references.find((ref) => ref.label)?.link,
            relacion:
              references[0]?.label ||
              getQualifierValueByLabels(claim, [
                'titular',
                'presidente',
                'fundador',
              ]) ||
              null,
            referencias: references,
          });
          return;
        }
      }
      vinculosItems.push({
        id: claim.$id,
        tipo,
        detalle,
        link: getEntityLink(relatedEntity),
        relacion:
          references[0]?.label ||
          getQualifierValueByLabels(claim, [
            'titular',
            'presidente',
            'fundador',
          ]) ||
          null,
        referencias: references,
      });
    }
  });

  // Try to infer location from qualifiers
  if (lugarNacimiento === 'Ubicación desconocida') {
    const territoryQualifierEntity = (claims || [])
      .map(
        (claim) =>
          getQualifierEntity(claim, 'lugar de nacimiento') ||
          getQualifierEntity(claim, 'territorio')
      )
      .find((value) => !!value);

    if (territoryQualifierEntity) {
      lugarNacimiento =
        extractLabel(territoryQualifierEntity) || lugarNacimiento;
      lugarNacimientoId =
        getEntityId(territoryQualifierEntity) || lugarNacimientoId;
    } else {
      const territoryQualifierRaw = (claims || [])
        .map((claim) =>
          getQualifierValueByLabels(claim, [
            'lugar de nacimiento',
            'territorio',
          ])
        )
        .find((value) => !!value);
      if (territoryQualifierRaw) {
        lugarNacimiento = territoryQualifierRaw;
      }
    }
  }

  // Try to infer location from roles if unknown
  if (lugarNacimiento === 'Ubicación desconocida') {
    const roleWithLocation = trayectoriaItems.find((item) => {
      const raw = (item.cargo || '').toLowerCase();
      return (
        raw.includes('la paz') ||
        raw.includes('el alto') ||
        raw.includes('cochabamba') ||
        raw.includes('santa cruz')
      );
    });
    if (roleWithLocation) {
      if ((roleWithLocation.cargo || '').toLowerCase().includes('la paz')) {
        lugarNacimiento = 'Departamento de La Paz';
        lugarNacimientoId = '698c9f28d8defbb3b4cf';
      } // Use known ID for La Paz or let it be generic
      else if (
        (roleWithLocation.cargo || '').toLowerCase().includes('cochabamba')
      )
        lugarNacimiento = 'Departamento de Cochabamba';
      else if (
        (roleWithLocation.cargo || '').toLowerCase().includes('santa cruz')
      )
        lugarNacimiento = 'Departamento de Santa Cruz';
    }
  }

  return {
    trayectoriaItems,
    educacionItems,
    encuestasItems,
    vinculosItems,
    partido,
    lugarNacimiento,
    lugarNacimientoId,
    socialLinks,
    perfil,
  };
};
