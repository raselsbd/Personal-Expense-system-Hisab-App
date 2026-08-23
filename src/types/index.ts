export type TransactionType = 'income' | 'expense';
export type TransactionSource = 'manual' | 'project_settlement' | 'recurring' | 'loan';

export interface PersonalTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string; // ISO date (yyyy-MM-dd)
  source: TransactionSource;
  projectId: string | null;
  loanId: string | null;
  photoUri: string | null;
  createdAt: string;
}

export type ProjectStatus = 'active' | 'completed';

export interface Project {
  id: string;
  name: string;
  client: string;
  budget: number;
  description: string;
  status: ProjectStatus;
  startDate: string;
  settledAt: string | null;
  createdAt: string;
  discountAmount: number;
  paymentDueDate: string | null;
  paymentReminderNotificationId: string | null;
}

export interface ProjectExpense {
  id: string;
  projectId: string;
  amount: number;
  note: string;
  date: string;
  photoUri: string | null;
  createdAt: string;
}

export interface ProjectPayment {
  id: string;
  projectId: string;
  amount: number;
  note: string;
  date: string;
  createdAt: string;
}

export interface ProjectWithStats extends Project {
  totalSpent: number;
  remaining: number;
  totalReceived: number;
  due: number;
  effectiveDue: number; // due after subtracting the settlement discount, floored at 0
  netBenefit: number;
}

export interface MonthlyThresholdOverride {
  month: string; // yyyy-MM
  threshold: number;
}

export type CustomCategoryType = 'income' | 'expense';

export interface CustomCategory {
  id: string;
  name: string;
  type: CustomCategoryType;
  createdAt: string;
}

export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  dayOfMonth: number;
  active: boolean;
  lastGeneratedMonth: string | null; // yyyy-MM
  createdAt: string;
}

export type LoanDirection = 'lent' | 'borrowed';

export interface PersonalLoan {
  id: string;
  direction: LoanDirection;
  personName: string;
  amount: number;
  note: string;
  date: string;
  dueDate: string | null;
  reminderNotificationId: string | null;
  settled: boolean;
  settledAt: string | null;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  deadline: string; // ISO datetime
  completed: boolean;
  reminderMinutesBefore: number;
  notificationId: string | null;
  createdAt: string;
}

export type CostStatus = 'good' | 'major' | 'critical';

export type Language = 'en' | 'bn';

export interface AppSettings {
  profileName: string;
  currencySymbol: string;
  monthlyThreshold: number;
  majorThresholdPct: number; // e.g. 70
  criticalThresholdPct: number; // e.g. 100
  appLockEnabled: boolean;
  appLockPinHash: string | null;
  biometricEnabled: boolean;
  themeMode: 'light' | 'dark' | 'system';
  language: Language;
}
