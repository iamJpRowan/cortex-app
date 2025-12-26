import gql from 'graphql-tag';

export const SEND_MESSAGE = gql`
  mutation SendMessage($message: String!, $requestId: String) {
    sendMessage(message: $message, requestId: $requestId) {
      response
      requestId
      steps {
        id
        name
        status
        duration
        error
        outputs {
          query
          results {
            count
            data
          }
          text
          plan {
            tools
            reasoning
            parameters
          }
          data
        }
      }
    }
  }
`;

export const CHAT_STEP_UPDATES = gql`
  subscription ChatStepUpdates($requestId: String!) {
    chatStepUpdates(requestId: $requestId) {
      requestId
      step {
        id
        name
        status
        duration
        error
        outputs {
          query
          results {
            count
            data
          }
          text
          plan {
            tools
            reasoning
            parameters
          }
          data
        }
      }
    }
  }
`;

