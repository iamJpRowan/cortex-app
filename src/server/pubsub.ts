import { EventEmitter } from 'events';

export interface StepUpdateEvent {
  requestId: string;
  step: {
    id: string;
    name: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR';
    duration?: number;
    cypherQuery?: string;
    resultCount?: number;
    error?: string;
  };
}

class PubSub extends EventEmitter {
  publish(topic: string, payload: StepUpdateEvent): void {
    this.emit(topic, payload);
  }

  subscribe(topic: string, callback: (payload: StepUpdateEvent) => void): () => void {
    this.on(topic, callback);
    return () => {
      this.removeListener(topic, callback);
    };
  }

  asyncIterator<T>(topic: string): AsyncIterableIterator<T> {
    const eventQueue: T[] = [];
    let resolve: ((value: IteratorResult<T>) => void) | null = null;
    const emitter = this;

    const handler = (payload: T) => {
      if (resolve) {
        resolve({ value: payload, done: false });
        resolve = null;
      } else {
        eventQueue.push(payload);
      }
    };

    this.on(topic, handler);

    return {
      [Symbol.asyncIterator]() {
        return this;
      },
      async next(): Promise<IteratorResult<T>> {
        if (eventQueue.length > 0) {
          return { value: eventQueue.shift() as T, done: false };
        }
        return new Promise((res) => {
          resolve = res;
        });
      },
      async return(): Promise<IteratorResult<T>> {
        emitter.removeListener(topic, handler);
        return { value: undefined as T, done: true };
      },
    };
  }
}

export const pubsub = new PubSub();

