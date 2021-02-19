import { assertNever, ListForExperiment, RealDBField } from '@keystone-next/types';

export function generatePrismaSchemaFromModels(lists: Record<string, ListForExperiment>) {
  let enums: string[] = [];

  return `
  datasource data {
    provider = "postgres"
    url      = "postgres://keystone5:password@localhost:5432/keystone"
  }
  
  generator gen {
    provider = "prisma-client-js"
  }
  
  ${Object.entries(lists)
    .map(([listKey, { fields }]) => {
      const flattenedDBFields = Object.fromEntries(
        Object.entries(fields).flatMap(([fieldPath, { dbField }]): [string, RealDBField][] => {
          if (dbField.kind === 'none') return [];
          if (dbField.kind === 'multi') {
            return Object.entries(dbField.fields).map(([key, dbField]) => [
              `${fieldPath}__${key}`,
              dbField,
            ]);
          }
          return [[fieldPath, dbField]];
        })
      );
      return `model ${listKey} {
        ${Object.entries(flattenedDBFields)
          .map(([key, dbField]): string => {
            switch (dbField.kind) {
              case 'scalar': {
                return `${key} ${dbField.scalar}${
                  { many: '[]', optional: '?', required: '' }[dbField.mode]
                }${dbField.isUnique && key !== 'id' ? ' @unique' : ''}${
                  key === 'id' ? ` @id @default(uuid())` : ''
                }`;
              }
              case 'enum': {
                let enumName = `${listKey}_${key}`;
                enums.push(`enum ${enumName} {\n${dbField.enum.join('\n')}\n}`);
                return `${key} ${enumName}${
                  { many: '[]', optional: '?', required: '' }[dbField.mode]
                } ${dbField.isUnique ? ' @unique' : ''}`;
              }
              case 'relation': {
                const foreignField =
                  lists[dbField.relation.model].fields[dbField.relation.field].dbField;
                if (foreignField.kind !== 'relation') {
                  throw new Error(
                    `The field at ${listKey}.${key} is a relation to ${dbField.relation.model}.${dbField.relation.field} but that field is not a relation`
                  );
                }
                if (foreignField.relation.model !== listKey) {
                  throw new Error(
                    `The field at ${listKey}.${key} is a relation to ${dbField.relation.model}.${dbField.relation.field} but that field at ${dbField.relation.model}.${dbField.relation.field} is a relation to ${foreignField.relation.model}.${foreignField.relation.field}`
                  );
                }
                if (foreignField.relation.field !== key) {
                  throw new Error(
                    `The field at ${listKey}.${key} is a relation to ${dbField.relation.model}.${dbField.relation.field} but that field is a relation to a different field`
                  );
                }
                const orderedRelations = consistentlyOrderRelations(
                  foreignField.relation,
                  dbField.relation
                );
                if (dbField.mode === 'one' && foreignField.mode === 'one') {
                  if (orderedRelations[0] === foreignField.relation) {
                    return `${key} ${
                      dbField.relation.model
                    }? @relation("${stringifyBothSidesOfRelation(
                      orderedRelations
                    )}", references: [id], fields: [${key}Id])
${key}Id String? @unique
                `;
                  }
                  return `${key} ${
                    dbField.relation.model
                  }? @relation("${stringifyBothSidesOfRelation(orderedRelations)}")`;
                }
                if (dbField.mode === 'many' && foreignField.mode === 'many') {
                  return `${key} ${
                    dbField.relation.model
                  }[] @relation("${stringifyBothSidesOfRelation(orderedRelations)}")`;
                }
                if (dbField.mode === 'many') {
                  return `${key} ${
                    dbField.relation.model
                  }[] @relation("${stringifyBothSidesOfRelation(orderedRelations)}")`;
                }
                if (dbField.mode === 'one') {
                  return `${key} ${
                    dbField.relation.model
                  }? @relation("${stringifyBothSidesOfRelation(
                    orderedRelations
                  )}", references: [id], fields: [${key}Id])
${key}Id String?`;
                }
                assertNever(dbField.mode);
              }
            }
          })
          .join('\n')}
      }`;
    })
    .join('\n')}
  
  ${enums.join('\n')}
  
  `;
}

type Relation = {
  model: string;
  field: string;
};

function stringifyBothSidesOfRelation(relations: readonly [Relation, Relation]) {
  return `${stringifyRelation(relations[0])}___${stringifyRelation(relations[0])}`;
}

function stringifyRelation(relation: Relation) {
  return `${relation.model}___${relation.field}`;
}

function consistentlyOrderRelations(relationA: Relation, relationB: Relation) {
  const concatenatedA = stringifyRelation(relationA);
  const concatenatedB = stringifyRelation(relationB);
  if (concatenatedA > concatenatedB) {
    return [relationA, relationB] as const;
  }
  return [relationB, relationA] as const;
}
