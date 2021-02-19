import { types } from './experiment';
import * as tsgql from '@ts-gql/schema';

const caseSensitivityEnum = types.enum({
  name: 'StringFilterCaseSensitivity',
  values: types.enumValues(['default', 'insensitive']),
});

type StringFilter = tsgql.InputObjectType<{
  equals: tsgql.Arg<tsgql.ScalarType<string>>;
  in: tsgql.Arg<tsgql.ListType<tsgql.NonNullType<tsgql.ScalarType<string>>>>;
  notIn: tsgql.Arg<tsgql.ListType<tsgql.NonNullType<tsgql.ScalarType<string>>>>;
  lt: tsgql.Arg<tsgql.ScalarType<string>>;
  lte: tsgql.Arg<tsgql.ScalarType<string>>;
  gt: tsgql.Arg<tsgql.ScalarType<string>>;
  gte: tsgql.Arg<tsgql.ScalarType<string>>;
  contains: tsgql.Arg<tsgql.ScalarType<string>>;
  startsWith: tsgql.Arg<tsgql.ScalarType<string>>;
  endsWith: tsgql.Arg<tsgql.ScalarType<string>>;
  mode: tsgql.Arg<tsgql.NonNullType<typeof caseSensitivityEnum>, 'default'>;
  not: tsgql.Arg<StringFilter>;
}>;

function getStringFilter(type: tsgql.ScalarType<string>, name: string): StringFilter {
  const stringFilter: StringFilter = types.inputObject({
    name,
    fields: () => ({
      equals: types.arg({ type }),
      in: types.arg({
        type: types.list(types.nonNull(type)),
      }),
      notIn: types.arg({
        type: types.list(types.nonNull(type)),
      }),
      lt: types.arg({ type }),
      lte: types.arg({ type }),
      gt: types.arg({ type }),
      gte: types.arg({ type }),
      contains: types.arg({ type }),
      startsWith: types.arg({ type }),
      endsWith: types.arg({ type }),
      mode: types.arg({
        type: types.nonNull(caseSensitivityEnum),
        defaultValue: 'default',
      }),
      not: types.arg({ type: stringFilter }),
    }),
  });
  return stringFilter;
}

const StringFilter = getStringFilter(types.String, 'StringFilter');
const IDFilter = getStringFilter(types.ID, 'IDFilter');

type NumberFilter = tsgql.InputObjectType<{
  equals: tsgql.Arg<tsgql.ScalarType<number>>;
  in: tsgql.Arg<tsgql.ListType<tsgql.NonNullType<tsgql.ScalarType<number>>>>;
  notIn: tsgql.Arg<tsgql.ListType<tsgql.NonNullType<tsgql.ScalarType<number>>>>;
  lt: tsgql.Arg<tsgql.ScalarType<number>>;
  lte: tsgql.Arg<tsgql.ScalarType<number>>;
  gt: tsgql.Arg<tsgql.ScalarType<number>>;
  gte: tsgql.Arg<tsgql.ScalarType<number>>;
  not: tsgql.Arg<NumberFilter>;
}>;

function getNumberFilter(scalar: tsgql.ScalarType<number>, name: string): NumberFilter {
  const numberFilter: NumberFilter = types.inputObject({
    name,
    fields: () => ({
      equals: { type: types.Int },
      in: { type: types.list(types.nonNull(types.Int)) },
      notIn: { type: types.list(types.nonNull(types.Int)) },
      lt: { type: types.Int },
      lte: { type: types.Int },
      gt: { type: types.Int },
      gte: { type: types.Int },
      not: { type: numberFilter },
    }),
  });
  return numberFilter;
}

const FloatFilter = getNumberFilter(types.Float, 'FloatFilter');
const IntFilter = getNumberFilter(types.Int, 'IntFilter');

export type BooleanFilter = tsgql.InputObjectType<{
  equals: tsgql.Arg<typeof types.Boolean>;
  not: tsgql.Arg<BooleanFilter>;
}>;

const BooleanFilter: BooleanFilter = types.inputObject({
  name: 'BooleanFilter',
  fields: () => ({
    equals: { type: types.Boolean },
    not: { type: BooleanFilter },
  }),
});

type DateTimeFilter = tsgql.InputObjectType<{
  equals: tsgql.Arg<typeof types.String>;
  in: tsgql.Arg<tsgql.ListType<tsgql.NonNullType<typeof types.String>>>;
  notIn: tsgql.Arg<tsgql.ListType<tsgql.NonNullType<typeof types.String>>>;
  lt: tsgql.Arg<typeof types.String>;
  lte: tsgql.Arg<typeof types.String>;
  gt: tsgql.Arg<typeof types.String>;
  gte: tsgql.Arg<typeof types.String>;
  not: tsgql.Arg<DateTimeFilter>;
}>;

const DateTimeFilter: DateTimeFilter = types.inputObject({
  name: 'DateTimeFilter',
  fields: () => ({
    equals: types.arg({ type: types.String }),
    in: { type: types.list(types.nonNull(types.String)) },
    notIn: { type: types.list(types.nonNull(types.String)) },
    lt: types.arg({ type: types.String }),
    lte: types.arg({ type: types.String }),
    gt: types.arg({ type: types.String }),
    gte: types.arg({ type: types.String }),
    not: { type: DateTimeFilter },
  }),
});

type BasicStringEnum = tsgql.EnumType<Record<string, tsgql.EnumValue<string>>>;

type EnumFilter = tsgql.InputObjectType<{
  equals: tsgql.Arg<BasicStringEnum>;
  in: tsgql.Arg<tsgql.ListType<tsgql.NonNullType<BasicStringEnum>>>;
  notIn: tsgql.Arg<tsgql.ListType<tsgql.NonNullType<BasicStringEnum>>>;
  not: tsgql.Arg<EnumFilter>;
}>;

export const getEnumFilter = (name: string, enumType: BasicStringEnum): EnumFilter => {
  const enumFilterType: EnumFilter = types.inputObject({
    name,
    fields: () => ({
      equals: types.arg({ type: enumType }),
      in: types.arg({ type: types.list(types.nonNull(enumType)) }),
      notIn: types.arg({ type: types.list(types.nonNull(enumType)) }),
      not: types.arg({ type: enumFilterType }),
    }),
  });
  return enumFilterType;
};

export const scalarFilters = {
  ID: IDFilter,
  String: StringFilter,
  Boolean: BooleanFilter,
  Int: IntFilter,
  Float: FloatFilter,
  DateTime: DateTimeFilter,
  Json: undefined,
};
