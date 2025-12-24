import { sendMessage } from './chat.js';
import type { Context } from './chat.js';
import { pubsub } from '../pubsub.js';
import type { ChatStep } from '../../shared/types/ChatStep.js';

export const resolvers = {
  Query: {
    health: () => 'OK',
  },
  Mutation: {
    sendMessage: (
      _parent: unknown,
      args: { message: string; requestId?: string },
      context: Context
    ) => sendMessage(_parent, args, context),
  },
  Subscription: {
    chatStepUpdates: {
      subscribe: async function* (_parent: unknown, args: { requestId: string }) {
        const topic = `step:${args.requestId}`;
        const asyncIterator = pubsub.asyncIterator<{
          requestId: string;
          step: ChatStep;
        }>(topic);
        
        for await (const payload of asyncIterator) {
          yield {
            chatStepUpdates: payload,
          };
        }
      },
    },
  },
};

