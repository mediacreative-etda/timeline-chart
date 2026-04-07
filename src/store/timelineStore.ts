import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { TaskStatus } from '@/types/timeline';

export interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface DbTask {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: TaskStatus;
  completed_at: string | null;
  assigned_user_id: string | null;
  created_by: string | null;
}

type NewTask = Omit<DbTask, 'id' | 'completed_at'> & {
  completed_at?: string | null;
};

interface TimelineStore {
  profiles: Profile[];
  tasks: DbTask[];
  loading: boolean;
  maxOverlap: number;
  setMaxOverlap: (n: number) => void;
  getOverlapCount: (userId: string, startDate: string, endDate: string, excludeTaskId?: string) => number;
  fetchProfiles: () => Promise<void>;
  fetchTasks: () => Promise<void>;
  addTask: (task: NewTask) => Promise<void>;
  updateTask: (id: string, updates: Partial<DbTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addProfile: (profile: { user_id: string; display_name: string }) => Promise<void>;
  updateProfile: (userId: string, updates: Partial<Profile>) => Promise<void>;
  deleteProfile: (userId: string) => Promise<void>;
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  profiles: [],
  tasks: [],
  loading: true,
  maxOverlap: 3,

  setMaxOverlap: (n) => set({ maxOverlap: n }),

  getOverlapCount: (userId, startDate, endDate, excludeTaskId) => {
    const { tasks } = get();
    return tasks.filter(
      (t) =>
        t.assigned_user_id === userId &&
        t.id !== excludeTaskId &&
        t.start_date <= endDate &&
        t.end_date >= startDate
    ).length;
  },

  fetchProfiles: async () => {
    const { data } = await supabase.from('profiles').select('user_id, display_name, avatar_url');
    if (data) set({ profiles: data });
  },

  fetchTasks: async () => {
    const { data } = await supabase.from('tasks').select();
    if (data) set({ tasks: data, loading: false });
    else set({ loading: false });
  },

  addTask: async (task) => {
    const { data, error } = await supabase.from('tasks').insert(task).select().single();
    if (data && !error) {
      set((state) => ({ tasks: [...state.tasks, data] }));
    }
  },

  updateTask: async (id, updates) => {
    const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single();
    if (data && !error) {
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? data : t)),
      }));
    }
  },

  deleteTask: async (id) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
    }
  },

  addProfile: async (profile) => {
    const { data, error } = await supabase.from('profiles').insert(profile).select().single();
    if (data && !error) {
      set((state) => ({ profiles: [...state.profiles, data] }));
    }
  },

  updateProfile: async (userId, updates) => {
    const { error } = await supabase.from('profiles').update(updates).eq('user_id', userId);
    if (!error) {
      set((state) => ({
        profiles: state.profiles.map((p) =>
          p.user_id === userId ? { ...p, ...updates } : p
        ),
      }));
    }
  },

  deleteProfile: async (userId) => {
    const { error } = await supabase.from('profiles').delete().eq('user_id', userId);
    if (!error) {
      set((state) => ({
        profiles: state.profiles.filter((p) => p.user_id !== userId),
        tasks: state.tasks.map((t) =>
          t.assigned_user_id === userId ? { ...t, assigned_user_id: null } : t
        ),
      }));
    }
  },
}));
