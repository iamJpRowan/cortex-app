import gql from 'graphql-tag';

export const GET_GRAPH_SCHEMA = gql`
  query GetGraphSchema($forceRefresh: Boolean) {
    graphSchema(forceRefresh: $forceRefresh) {
      nodeLabels {
        name
        count
      }
      relationshipTypes {
        name
        count
      }
      allProperties {
        name
        type
      }
    }
  }
`;

