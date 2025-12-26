import { gql } from 'graphql-tag';

export const typeDefs = gql`
  type Query {
    health: String!
    graphSchema(forceRefresh: Boolean): GraphSchema!
    conversations(includeArchived: Boolean): [ConversationSummary!]!
    conversation(id: String!): Conversation
  }

  type Mutation {
    sendMessage(
      message: String!
      requestId: String
      conversationId: String
      conversationHistory: [ConversationMessageInput!]
      contextNodes: [ContextNodeInput!]
    ): ChatResponse!
    createOrUpdateConversation(
      id: String
      title: String
      draft: String
    ): Conversation!
    renameConversation(id: String!, title: String!): Conversation!
    archiveConversation(id: String!): Conversation!
    unarchiveConversation(id: String!): Conversation!
    deleteConversation(id: String!): Boolean!
    pinConversation(id: String!): Conversation!
    unpinConversation(id: String!): Conversation!
  }

  type Subscription {
    chatStepUpdates(requestId: String!): ChatStepUpdate!
  }

  type ChatResponse {
    response: String!
    requestId: String!
    conversationId: String!
    steps: [ChatStep!]!
  }

  type ConversationMessage {
    role: MessageRole!
    content: String!
    timestamp: String!
    results: JSON
    query: String
    steps: [ChatStep!]
  }

  type ConversationSummary {
    id: String!
    title: String
    updatedAt: String!
    archived: Boolean!
    pinned: Boolean!
    messageCount: Int!
  }

  type Conversation {
    id: String!
    title: String
    messages: [ConversationMessage!]!
    createdAt: String!
    updatedAt: String!
    archived: Boolean!
    pinned: Boolean!
  }

  input ConversationMessageInput {
    role: MessageRole!
    content: String!
    timestamp: String!
    results: JSON
    query: String
  }

  type ContextNode {
    id: String!
    labels: [String!]
    properties: JSON
  }

  input ContextNodeInput {
    id: String!
    labels: [String!]
    properties: JSON
  }

  enum MessageRole {
    user
    assistant
  }

  type ChatStep {
    id: String!
    name: String!
    status: StepStatus!
    duration: Float
    error: String
    outputs: StepOutputs
  }

  type StepOutputs {
    query: String
    results: QueryResults
    text: String
    plan: PlanResult
    data: JSON
  }

  type QueryResults {
    count: Int!
    data: JSON
  }

  type PlanResult {
    tools: [String!]!
    reasoning: String!
    parameters: JSON
  }

  scalar JSON

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

