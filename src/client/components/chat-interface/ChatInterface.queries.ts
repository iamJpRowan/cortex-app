import gql from 'graphql-tag';

export const SEND_MESSAGE = gql`
  mutation SendMessage($message: String!) {
    sendMessage(message: $message) {
      response
      cypherQuery
    }
  }
`;

