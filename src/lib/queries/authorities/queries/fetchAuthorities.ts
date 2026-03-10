import { databases, DATABASE_ID, COLLECTIONS, Query } from '../../../appwrite';
import type { Entity, Claim, Authority } from '../../types';
import { PROPERTY_IDS } from '../../constants';
import { getRoleIds, getAllRoleIds } from '../cache';
import { normalizeText } from '../helpers';
import { attachImagesToEntities } from '../utils';

export async function fetchAuthorities(
  options: { search?: string; limit?: number; offset?: number } = {}
): Promise<{ documents: Authority[]; total: number }> {
  const { search, limit = 25, offset = 0 } = options;

  try {
    await getRoleIds();
    const validRoleIds = await getAllRoleIds();

    if (validRoleIds.length === 0) {
      return { documents: [], total: 0 };
    }

    if (!search) {
      const roleClaims = await databases.listDocuments<Claim>(
        DATABASE_ID,
        COLLECTIONS.CLAIMS,
        [
          Query.equal('property', PROPERTY_IDS.CANDIDATO_POLITICO),
          Query.equal('value_relation', validRoleIds),
          Query.orderDesc('$createdAt'),
          Query.limit(100),
        ]
      );

      const authorityIds = Array.from(
        new Set(
          roleClaims.documents.map((c) =>
            typeof c.subject === 'object' ? c.subject.$id : c.subject
          )
        )
      );

      const pageIds = authorityIds.slice(offset, offset + limit);

      if (pageIds.length === 0)
        return { documents: [], total: roleClaims.total };

      const response = await databases.listDocuments<Entity>(
        DATABASE_ID,
        COLLECTIONS.ENTITIES,
        [Query.equal('$id', pageIds)]
      );

      const finalDocs = await attachImagesToEntities(response.documents);

      return {
        documents: finalDocs,
        total: roleClaims.total,
      };
    }

    const searchResponse = await databases.listDocuments<Entity>(
      DATABASE_ID,
      COLLECTIONS.ENTITIES,
      [Query.search('label', search), Query.limit(100)]
    );

    if (searchResponse.documents.length === 0) {
      const fallbackClaims = await databases.listDocuments<Claim>(
        DATABASE_ID,
        COLLECTIONS.CLAIMS,
        [
          Query.equal('property', PROPERTY_IDS.CANDIDATO_POLITICO),
          Query.equal('value_relation', validRoleIds),
          Query.limit(1000),
        ]
      );

      const fallbackIds = Array.from(
        new Set(
          fallbackClaims.documents.map((c) =>
            typeof c.subject === 'object' ? c.subject.$id : c.subject
          )
        )
      );

      if (fallbackIds.length === 0) return { documents: [], total: 0 };

      const batchSize = 50;
      const batches: Promise<Entity[]>[] = [];
      for (let i = 0; i < fallbackIds.length; i += batchSize) {
        const batch = fallbackIds.slice(i, i + batchSize);
        batches.push(
          databases
            .listDocuments<Entity>(DATABASE_ID, COLLECTIONS.ENTITIES, [
              Query.equal('$id', batch),
              Query.limit(batchSize),
            ])
            .then((r) => r.documents)
        );
      }
      const batchResults = await Promise.all(batches);
      const entities = batchResults.flat();

      const searchKey = normalizeText(search);
      const filtered = entities.filter((doc) => {
        const label = normalizeText(doc.label || '');
        const description = normalizeText(doc.description || '');
        const aliases = (doc.aliases || []).map((a) => normalizeText(a));
        return (
          label.includes(searchKey) ||
          description.includes(searchKey) ||
          aliases.some((a) => a.includes(searchKey))
        );
      });

      const finalDocs = await attachImagesToEntities(
        filtered.slice(offset, offset + limit)
      );

      return {
        documents: finalDocs,
        total: filtered.length,
      };
    }

    const candidateIds = searchResponse.documents.map((doc) => doc.$id);

    const roleClaims = await databases.listDocuments<Claim>(
      DATABASE_ID,
      COLLECTIONS.CLAIMS,
      [
        Query.equal('subject', candidateIds),
        Query.equal('property', PROPERTY_IDS.CANDIDATO_POLITICO),
        Query.equal('value_relation', validRoleIds),
        Query.limit(100),
      ]
    );

    const authorityIds = new Set(
      roleClaims.documents.map((c) =>
        typeof c.subject === 'object' ? c.subject.$id : c.subject
      )
    );

    const filteredDocuments = searchResponse.documents.filter((doc) =>
      authorityIds.has(doc.$id)
    );

    const finalDocs = await attachImagesToEntities(
      filteredDocuments.slice(offset, offset + limit)
    );

    return {
      documents: finalDocs,
      total: filteredDocuments.length,
    };
  } catch (error) {
    console.error('Error fetching authorities:', error);
    return { documents: [], total: 0 };
  }
}
