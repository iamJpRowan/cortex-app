import type { Driver } from 'neo4j-driver';
import { Logger } from '../logging/Logger.js';

export interface PropertyInfo {
  name: string;
  types: string[]; // Array of possible types (e.g., ["String"] or ["Integer", "Long"])
}

export interface GraphSchema {
  nodeLabels: string[];
  relationshipTypes: string[];
  nodeProperties: Record<string, string[]>; // label -> property names (kept for internal use)
  relationshipProperties: Record<string, string[]>; // relationship type -> property names (kept for internal use)
  allProperties: PropertyInfo[]; // All unique properties with their types
}

interface SchemaCache {
  schema: GraphSchema | null;
  lastUpdated: number;
}

// Session-based cache: schema is cached for the entire server session
// Cache persists until server restart or manual refresh via forceRefresh parameter
let schemaCache: SchemaCache = {
  schema: null,
  lastUpdated: 0,
};

/**
 * Introspects the Neo4j graph schema to get labels, relationships, and properties
 * 
 * Schema is cached for the entire server session. Use forceRefresh=true to manually
 * refresh the cache when schema changes are made to the database.
 */
export async function introspectSchema(
  driver: Driver,
  logger: Logger,
  forceRefresh = false
): Promise<GraphSchema> {
  const now = Date.now();
  
  // Return cached schema if available and not forcing refresh
  // Session-based: cache persists until server restart or manual refresh
  if (!forceRefresh && schemaCache.schema) {
    await logger.debug('Using cached schema', { 
      age: now - schemaCache.lastUpdated,
      cacheAgeMs: now - schemaCache.lastUpdated,
    });
    return schemaCache.schema;
  }

  const session = driver.session();
  
  try {
    await logger.info('Introspecting Neo4j schema...');
    
    // Get all node labels
    const labelsResult = await session.run(`
      CALL db.labels()
      YIELD label
      RETURN label
      ORDER BY label
    `);
    const nodeLabels = labelsResult.records.map(record => 
      record.get('label') as string
    );

    // Get all relationship types
    const relTypesResult = await session.run(`
      CALL db.relationshipTypes()
      YIELD relationshipType
      RETURN relationshipType
      ORDER BY relationshipType
    `);
    const relationshipTypes = relTypesResult.records.map(record => 
      record.get('relationshipType') as string
    );

    // Get node properties by label (with types)
    const nodePropsResult = await session.run(`
      CALL db.schema.nodeTypeProperties()
      YIELD nodeType, propertyName, propertyTypes
      RETURN nodeType, propertyName, propertyTypes
      ORDER BY nodeType, propertyName
    `);
    
    const nodeProperties: Record<string, string[]> = {};
    const propertyTypeMap = new Map<string, Set<string>>(); // property name -> set of types
    
    for (const record of nodePropsResult.records) {
      const nodeType = record.get('nodeType') as string;
      const propertyName = record.get('propertyName') as string;
      const propertyTypes = record.get('propertyTypes') as string[] | null;
      
      // Collect property types
      if (propertyName) {
        if (!propertyTypeMap.has(propertyName)) {
          propertyTypeMap.set(propertyName, new Set());
        }
        if (propertyTypes && Array.isArray(propertyTypes)) {
          propertyTypes.forEach((type: string) => {
            propertyTypeMap.get(propertyName)?.add(type);
          });
        }
      }
      
      // nodeType format is like ":`Label1`:`Label2`" or just ":`Label`"
      // Extract labels (remove backticks and colons)
      const labels = nodeType
        .split(':')
        .map(l => l.replace(/`/g, '').trim())
        .filter(l => l.length > 0);
      
      for (const label of labels) {
        if (!nodeProperties[label]) {
          nodeProperties[label] = [];
        }
        // Merge properties, avoiding duplicates
        if (propertyName && !nodeProperties[label].includes(propertyName)) {
          nodeProperties[label].push(propertyName);
        }
      }
    }

    // Get relationship properties by type (with types)
    const relPropsResult = await session.run(`
      CALL db.schema.relTypeProperties()
      YIELD relType, propertyName, propertyTypes
      RETURN relType, propertyName, propertyTypes
      ORDER BY relType, propertyName
    `);
    
    const relationshipProperties: Record<string, string[]> = {};
    for (const record of relPropsResult.records) {
      const relType = record.get('relType') as string;
      const propertyName = record.get('propertyName') as string;
      const propertyTypes = record.get('propertyTypes') as string[] | null;
      
      // Collect property types
      if (propertyName) {
        if (!propertyTypeMap.has(propertyName)) {
          propertyTypeMap.set(propertyName, new Set());
        }
        if (propertyTypes && Array.isArray(propertyTypes)) {
          propertyTypes.forEach((type: string) => {
            propertyTypeMap.get(propertyName)?.add(type);
          });
        }
      }
      
      // relType format is like ":`TYPE`", extract the type name
      const typeName = relType.replace(/[`:]/g, '').trim();
      if (typeName && propertyName) {
        if (!relationshipProperties[typeName]) {
          relationshipProperties[typeName] = [];
        }
        if (!relationshipProperties[typeName].includes(propertyName)) {
          relationshipProperties[typeName].push(propertyName);
        }
      }
    }
    
    // Build allProperties array with types
    const allProperties: PropertyInfo[] = Array.from(propertyTypeMap.entries())
      .map(([name, typesSet]) => ({
        name,
        types: Array.from(typesSet).sort(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const schema: GraphSchema = {
      nodeLabels,
      relationshipTypes,
      nodeProperties,
      relationshipProperties,
      allProperties,
    };

    // Update cache
    schemaCache = {
      schema,
      lastUpdated: now,
    };

    await logger.info('Schema introspection completed', {
      nodeLabelCount: nodeLabels.length,
      relationshipTypeCount: relationshipTypes.length,
      propertyCount: allProperties.length,
    });

    return schema;
  } catch (error) {
    await logger.error('Failed to introspect schema', { error });
    // Return empty schema on error rather than failing completely
    return {
      nodeLabels: [],
      relationshipTypes: [],
      nodeProperties: {},
      relationshipProperties: {},
      allProperties: [],
    };
  } finally {
    await session.close();
  }
}

/**
 * Formats the schema into a human-readable string for LLM prompts
 */
export function formatSchemaForPrompt(schema: GraphSchema): string {
  const parts: string[] = [];

  if (schema.nodeLabels.length > 0) {
    parts.push('NODE LABELS:');
    for (const label of schema.nodeLabels) {
      const properties = schema.nodeProperties[label] || [];
      if (properties.length > 0) {
        parts.push(`  - ${label} (properties: ${properties.join(', ')})`);
      } else {
        parts.push(`  - ${label}`);
      }
    }
  } else {
    parts.push('NODE LABELS: (none)');
  }

  if (schema.relationshipTypes.length > 0) {
    parts.push('\nRELATIONSHIP TYPES:');
    for (const relType of schema.relationshipTypes) {
      const properties = schema.relationshipProperties[relType] || [];
      if (properties.length > 0) {
        parts.push(`  - ${relType} (properties: ${properties.join(', ')})`);
      } else {
        parts.push(`  - ${relType}`);
      }
    }
  } else {
    parts.push('\nRELATIONSHIP TYPES: (none)');
  }

  return parts.join('\n');
}

/**
 * Clears the schema cache (useful for testing or when schema changes are known)
 * 
 * Note: This clears the in-memory cache. The cache will be automatically
 * repopulated on the next schema introspection call.
 */
export function clearSchemaCache(): void {
  schemaCache = {
    schema: null,
    lastUpdated: 0,
  };
}

