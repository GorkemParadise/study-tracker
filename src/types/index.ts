export interface Subject {
    id: string;
    name: string;
    color: string;
    createdAt: string;
  }
  
  export interface StudySession {
    id: string;
    subjectId: string;
    startTime: string;
    endTime: string;
    duration: number; // seconds
    note: string;
  }
  
  export interface DailyPlan {
    id: string;
    date: string; // YYYY-MM-DD
    subjectId: string;
    targetMinutes: number;
  }
  
  export interface Note {
    id: string;
    sessionId: string | null;
    date: string; // YYYY-MM-DD
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface DailyPlanWithProgress extends DailyPlan {
    subjectName: string;
    subjectColor: string;
    actualMinutes: number;
  }
  
  export interface SubjectStats {
    subjectId: string;
    subjectName: string;
    subjectColor: string;
    totalMinutes: number;
    sessionCount: number;
  }
  
  export interface DailyStats {
    date: string;
    totalMinutes: number;
  }