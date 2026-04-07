import { differenceInDays, parseISO } from 'date-fns';
import { TaskDisplayStatus, TaskStatus } from '@/types/timeline';

interface TaskStatusMetadata {
  status: TaskStatus;
  completed_at: string | null;
}

export const getTaskDisplayStatus = (
  task: TaskStatusMetadata,
  now: Date = new Date()
): TaskDisplayStatus => {
  if (task.status !== 'completed' || !task.completed_at) {
    return task.status;
  }

  return differenceInDays(now, parseISO(task.completed_at)) >= 7 ? 'inactive' : 'completed';
};
