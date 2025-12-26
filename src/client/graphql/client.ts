import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

const httpLink = createHttpLink({
  uri: '/graphql',
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: `ws://localhost:4000/graphql`,
    shouldRetry: () => false, // Don't retry on connection failure
    on: {
      error: (error) => {
        console.warn('WebSocket connection error:', error);
      },
      closed: () => {
        console.warn('WebSocket connection closed');
      },
    },
  })
);

// Split link: use WebSocket for subscriptions, HTTP for queries and mutations
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});

