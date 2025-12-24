import { gql } from 'graphql-tag';

export const typeDefs = gql`
  type Query {
    health: String!
    graphSchema(forceRefresh: Boolean): GraphSchema!
  }

  type Mutation {
    sendMessage(message: String!, requestId: String): ChatResponse!
  }

  type Subscription {
    chatStepUpdates(requestId: String!): ChatStepUpdate!
  }

  type ChatResponse {
    response: String!
    cypherQuery: String
    requestId: String!
    steps: [ChatStep!]!
    resultCount: Int
  }

  type ChatStep {
    id: String!
    name: String!
    status: StepStatus!
    duration: Float
    cypherQuery: String
    resultCount: Int
    error: String
  }

  type ChatStepUpdate {
    requestId: String!
    step: ChatStep!
  }

  enum StepStatus {
    PENDING
    RUNNING
    COMPLETED
    ERROR
  }

  type GraphSchema {
    nodeLabels: [NodeLabel!]!
    relationshipTypes: [RelationshipType!]!
    allProperties: [Property!]!
  }

  type NodeLabel {
    name: String!
    count: Int!
  }

  type RelationshipType {
    name: String!
    count: Int!
  }

  type Property {
    name: String!
    type: String!
  }
`;

