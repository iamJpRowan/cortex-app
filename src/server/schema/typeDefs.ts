import { gql } from 'graphql-tag';

export const typeDefs = gql`
  type Query {
    health: String!
  }

  type Mutation {
    sendMessage(message: String!): ChatResponse!
  }

  type ChatResponse {
    response: String!
    cypherQuery: String
  }
`;

