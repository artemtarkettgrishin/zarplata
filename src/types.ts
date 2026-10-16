export interface Store {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  name: string;
  storeId: string;
}

export interface Salary {
  id: string;
  employeeId: string;
  /** Формат YYYY-MM */
  month: string;
  amount: number;
}

export interface AppData {
  stores: Store[];
  employees: Employee[];
  salaries: Salary[];
}

export interface Settings {
  gasUrl: string;
  autoSync: boolean;
}

export type SyncStatus = "idle" | "loading" | "saving" | "ok" | "error";

export interface SyncState {
  status: SyncStatus;
  message: string;
  lastPull: string | null;
  lastPush: string | null;
}

export type PageKey =
  | "dashboard"
  | "stores"
  | "employees"
  | "salaries"
  | "compare"
  | "reports"
  | "settings"
  | "guide";
