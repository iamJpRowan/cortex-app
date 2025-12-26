import gql from 'graphql-tag';

export const LIST_CONVERSATIONS = gql`
  query ListConversations($includeArchived: Boolean) {
    conversations(includeArchived: $includeArchived) {
      id
      title
      updatedAt
      archived
      pinned
      messageCount
    }
  }
`;

export const GET_CONVERSATION = gql`
  query GetConversation($id: String!) {
    conversation(id: $id) {
      id
      title
      messages {
        role
        content
        timestamp
        results
        query
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
      createdAt
      updatedAt
      archived
      pinned
    }
  }
`;

export const CREATE_OR_UPDATE_CONVERSATION = gql`
  mutation CreateOrUpdateConversation($id: String, $title: String, $draft: String) {
    createOrUpdateConversation(id: $id, title: $title, draft: $draft) {
      id
      title
      createdAt
      updatedAt
      archived
      pinned
    }
  }
`;

export const RENAME_CONVERSATION = gql`
  mutation RenameConversation($id: String!, $title: String!) {
    renameConversation(id: $id, title: $title) {
      id
      title
    }
  }
`;

export const ARCHIVE_CONVERSATION = gql`
  mutation ArchiveConversation($id: String!) {
    archiveConversation(id: $id) {
      id
      archived
    }
  }
`;

export const UNARCHIVE_CONVERSATION = gql`
  mutation UnarchiveConversation($id: String!) {
    unarchiveConversation(id: $id) {
      id
      archived
    }
  }
`;

export const DELETE_CONVERSATION = gql`
  mutation DeleteConversation($id: String!) {
    deleteConversation(id: $id)
  }
`;

export const PIN_CONVERSATION = gql`
  mutation PinConversation($id: String!) {
    pinConversation(id: $id) {
      id
      pinned
    }
  }
`;

export const UNPIN_CONVERSATION = gql`
  mutation UnpinConversation($id: String!) {
    unpinConversation(id: $id) {
      id
      pinned
    }
  }
`;
