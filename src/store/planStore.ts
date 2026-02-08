import { create } from 'zustand';
import { DailyPlan, DailyPlanWithProgress } from '../types';
import * as DB from '../database/db';
import { generateId, todayDate } from '../utils';

interface PlanStore {
  plans: DailyPlanWithProgress[];
  loading: boolean;
  load: (date?: string) => Promise<void>;
  add: (subjectId: string, targetMinutes: number, date?: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const usePlanStore = create<PlanStore>((set, get) => ({
  plans: [],
  loading: false,

  load: async (date?: string) => {
    set({ loading: true });
    const plans = await DB.getPlansForDate(date ?? todayDate());
    set({ plans, loading: false });
  },

  add: async (subjectId: string, targetMinutes: number, date?: string) => {
    const plan: DailyPlan = {
      id: generateId(),
      date: date ?? todayDate(),
      subjectId,
      targetMinutes,
    };
    await DB.upsertPlan(plan);
    await get().load(date ?? todayDate());
  },

  remove: async (id: string) => {
    await DB.deletePlan(id);
    await get().load();
  },
}));