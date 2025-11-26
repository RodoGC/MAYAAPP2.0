export interface User {
  id: string;
  email: string;
  username: string;
  xp: number;
  lives: number;
  streak: number;
  level: number;
}

export interface Exercise {
  type: 'translate' | 'multiple_choice' | 'matching';
  question: string;
  options?: string[];
  correct_answer: string;
  pairs?: { maya: string; spanish: string }[];
  audio_file?: string;
}

export interface Lesson {
  id: string;
  unit: number;
  unit_title: string;
  order: number;
  title: string;
  description: string;
  xp_reward: number;
  exercises: Exercise[];
  completed?: boolean;
  score?: number;
  locked?: boolean;
}

export interface Unit {
  unit: number;
  title: string;
  lessons: Lesson[];
}

export interface DictionaryEntry {
  maya: string;
  spanish: string;
  category: string;
}

export interface Tips {
  title: string;
  grammar: string[];
  pronunciation: string[];
  vocabulary: string[];
}