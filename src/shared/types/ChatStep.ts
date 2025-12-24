export type StepId = 'step_1' | 'step_2' | 'step_3';

export interface ChatStep {
  id: StepId;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR';
  duration?: number;
  cypherQuery?: string;
  resultCount?: number;
  error?: string;
}

