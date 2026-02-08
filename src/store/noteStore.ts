import { create } from 'zustand';
import { Note } from '../types';
import * as DB from '../database/db';
import { generateId, todayDate } from '../utils';

interface NoteStore {
  notes: Note[];
  loading: boolean;
  load: () => Promise<void>;
  add: (title: string, content: string, sessionId?: string | null) => Promise<void>;
  update: (note: Note) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    const notes = await DB.getAllNotes();
    set({ notes, loading: false });
  },

  add: async (title: string, content: string, sessionId?: string | null) => {
    const now = new Date().toISOString();
    const note: Note = {
      id: generateId(),
      sessionId: sessionId ?? null,
      date: todayDate(),
      title,
      content,
      createdAt: now,
      updatedAt: now,
    };
    await DB.insertNote(note);
    await get().load();
  },

  update: async (note: Note) => {
    const updated = { ...note, updatedAt: new Date().toISOString() };
    await DB.updateNote(updated);
    await get().load();
  },

  remove: async (id: string) => {
    await DB.deleteNote(id);
    await get().load();
  },
}));