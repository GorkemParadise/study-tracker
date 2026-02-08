import { create } from 'zustand';
import { StudySession } from '../types';
import * as DB from '../database/db';
import { generateId } from '../utils';

type TimerStatus = 'idle' | 'running' | 'paused';

interface TimerStore {
  status: TimerStatus;
  subjectId: string | null;
  startTime: Date | null;
  elapsed: number; // seconds
  intervalId: ReturnType<typeof setInterval> | null;
  note: string;

  start: (subjectId: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<StudySession | null>;
  tick: () => void;
  setNote: (note: string) => void;
  reset: () => void;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  status: 'idle',
  subjectId: null,
  startTime: null,
  elapsed: 0,
  intervalId: null,
  note: '',

  start: (subjectId: string) => {
    const existing = get().intervalId;
    if (existing) clearInterval(existing);
    const id = setInterval(() => get().tick(), 1000);
    set({
      status: 'running',
      subjectId,
      startTime: new Date(),
      elapsed: 0,
      intervalId: id,
      note: '',
    });
  },

  pause: () => {
    const { intervalId } = get();
    if (intervalId) clearInterval(intervalId);
    set({ status: 'paused', intervalId: null });
  },

  resume: () => {
    const id = setInterval(() => get().tick(), 1000);
    set({ status: 'running', intervalId: id });
  },

  stop: async () => {
    const { subjectId, startTime, elapsed, intervalId, note } = get();
    if (intervalId) clearInterval(intervalId);

    if (!subjectId || !startTime || elapsed < 5) {
      set({ status: 'idle', subjectId: null, startTime: null, elapsed: 0, intervalId: null, note: '' });
      return null;
    }

    const session: StudySession = {
      id: generateId(),
      subjectId,
      startTime: startTime.toISOString(),
      endTime: new Date().toISOString(),
      duration: elapsed,
      note,
    };

    await DB.insertSession(session);
    set({ status: 'idle', subjectId: null, startTime: null, elapsed: 0, intervalId: null, note: '' });
    return session;
  },

  tick: () => {
    set((state) => ({ elapsed: state.elapsed + 1 }));
  },

  setNote: (note: string) => {
    set({ note });
  },

  reset: () => {
    const { intervalId } = get();
    if (intervalId) clearInterval(intervalId);
    set({ status: 'idle', subjectId: null, startTime: null, elapsed: 0, intervalId: null, note: '' });
  },
}));