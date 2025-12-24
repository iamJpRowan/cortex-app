import { sendMessage } from './chat.js';
import type { Context } from './chat.js';

export const resolvers = {
  Query: {
    health: () => 'OK',
  },
  Mutation: {
    sendMessage: (
      _parent: unknown,
      args: { message: string },
      context: Context
    ) => sendMessage(_parent, args, context),
  },
};

