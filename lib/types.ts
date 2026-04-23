export type ExerciseLog = {
  type: string;
  minutes: number;
  time_of_day?: string;
  outdoor?: boolean;
};

export type Meals = {
  breakfast?: string;
  lunch?: string;
  dinner?: string;
};

export type SupplementLog = {
  name: string;
  amount?: number;
  timing: 'morning' | 'afternoon' | 'night';
};

export type NapLog = {
  start_time: string;
  minutes: number;
};

export type ExtraSleep = {
  start_time: string;
  end_time: string;
};

export type ConditionLog = {
  id?: string;
  user_id?: string;
  created_at?: string;
  date: string;
  bed_time: string;
  wake_time: string;
  sleep_hours: number;
  sleep_quality: number;
  fatigue: number;
  focus: number;
  cold_shower: boolean;
  exercise_logs: ExerciseLog[];
  meals: Meals;
  supplement_logs: SupplementLog[];
  nap?: NapLog | null;
  straight_sleep?: boolean;
  extra_sleep?: ExtraSleep[] | ExtraSleep | null;
  sunlight?: boolean;
  sunlight_minutes?: number;
  study_hours?: number;
  memo: string;
};

export const DEFAULT_LOG = (): ConditionLog => ({
  date: new Date().toISOString().split('T')[0],
  bed_time: '23:00',
  wake_time: '07:00',
  sleep_hours: 8,
  sleep_quality: 3,
  fatigue: 3,
  focus: 3,
  cold_shower: false,
  exercise_logs: [],
  meals: {},
  supplement_logs: [],
  nap: null,
  straight_sleep: true,
  extra_sleep: null,
  memo: '',
});
