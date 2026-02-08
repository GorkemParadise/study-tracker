import { create } from 'zustand';
import { Subject } from '../types';
import * as DB from '../database/db';
import { generateId } from '../utils';

interface SubjectStore {
  subjects: Subject[];
  loading: boolean;
  load: () => Promise<void>;
  add: (name: string, color: string) => Promise<void>;
  update: (subject: Subject) => Promise<void>;
  remove: (id: string) => Promise<boolean>;
}

export const useSubjectStore = create<SubjectStore>((set, get) => ({
  subjects: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    const subjects = await DB.getAllSubjects();
    set({ subjects, loading: false });
  },

  add: async (name: string, color: string) => {
    const subject: Subject = {
      id: generateId(),
      name,
      color,
      createdAt: new Date().toISOString(),
    };
    await DB.insertSubject(subject);
    await get().load();
  },

  update: async (subject: Subject) => {
    await DB.updateSubject(subject);
    await get().load();
  },

  remove: async (id: string) => {
    const count = await DB.getSessionCountForSubject(id);
    if (count > 0) {
      return false;
    }
    await DB.deleteSubject(id);
    await get().load();
    return true;
  },
}));