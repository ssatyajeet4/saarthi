
export type SubjectName = 'Hindi' | 'SST' | 'Science' | 'Computer Science' | 'Kannada';

export interface Concept {
  id: string;
  name: string;
  mastery: number; // 0-100
  attempts: number;
}

export interface Chapter {
  name: string;
  summary?: string; // AI generated summary
  content?: string; // Full extracted text content from the source
  concepts: Record<string, Concept>;
  lastStudied?: string;
  difficulty?: string;
}

export interface SubjectData {
  chapters: Record<string, Chapter>;
  streak: number;
}

export interface StudentProfile {
  name: string;
  subjects: Record<SubjectName, SubjectData>;
  totalPoints: number;
  badges: string[];
  currentStreak: number;
  lastActive: string; // ISO date
  activityLog: string[]; // List of YYYY-MM-DD dates showing activity
}

export interface GeneratedImage {
  id: string;
  concept: string;
  base64: string;
  createdAt: string;
  sizeBytes: number;
}

export interface ToolResponse {
  result: string;
}

export enum GameBadge {
  CONCEPT_MASTER = 'Concept Master',
  SEVEN_DAY_STREAK = '7-Day Streak',
  QUICK_LEARNER = 'Quick Learner',
  TOP_PERFORMER = 'Top Performer',
  NEVER_GIVE_UP = 'Never Give Up'
}
