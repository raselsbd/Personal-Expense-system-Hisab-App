import type { NavigatorScreenParams } from '@react-navigation/native';

export type HomeStackParamList = {
  Dashboard: undefined;
  AddTransaction: { type?: 'income' | 'expense'; transactionId?: string } | undefined;
  TransactionsList: { type?: 'income' | 'expense'; rangeMode?: 'all' | 'thisMonth' } | undefined;
  LoansList: { direction?: 'lent' | 'borrowed' } | undefined;
  AddLoan: { direction?: 'lent' | 'borrowed'; loanId?: string } | undefined;
};

export type ProjectsStackParamList = {
  ProjectsList: undefined;
  ProjectDetail: { projectId: string };
  ProjectsDue: undefined;
  AddProject: { projectId?: string } | undefined;
  AddProjectExpense: { projectId: string; expenseId?: string };
  AddProjectPayment: { projectId: string; paymentId?: string };
};

export type TasksStackParamList = {
  TasksList: undefined;
  AddTask: { taskId?: string } | undefined;
};

export type ReportsStackParamList = {
  Reports: undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  SetPin: undefined;
  RecurringTransactions: undefined;
  BackupRestore: undefined;
};

export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  ProjectsTab: NavigatorScreenParams<ProjectsStackParamList>;
  TasksTab: NavigatorScreenParams<TasksStackParamList>;
  ReportsTab: NavigatorScreenParams<ReportsStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};
