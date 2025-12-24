import type { GraphQLResolveInfo } from 'graphql';

export type Resolvers = {
  Query: {
    health: (parent: unknown, args: unknown, context: unknown, info: GraphQLResolveInfo) => string;
  };
  Mutation: {
    _empty?: (parent: unknown, args: unknown, context: unknown, info: GraphQLResolveInfo) => string | null;
  };
};

