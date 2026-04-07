export type TaskStatus = 'not_started' | 'in_progress' | 'completed';
export type TaskDisplayStatus = TaskStatus | 'inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  created_by: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string;
  start_date: string; // ISO date string
  end_date: string;
  status: TaskStatus;
  assigned_user_id: string;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'รอดำเนินการ',
  in_progress: 'กำลังดำเนินการ',
  completed: 'เสร็จสิ้น',
};

export const DISPLAY_STATUS_LABELS: Record<TaskDisplayStatus, string> = {
  ...STATUS_LABELS,
  inactive: 'ไม่ใช้งาน',
};
