import { StoredSession } from '../service/auth/AuthService';

export type AppLogger = {
  info: (obj: any, msg?: string) => void;
  warn: (obj: any, msg?: string) => void;
  error: (obj: any, msg?: string) => void;
  debug: (obj: any, msg?: string) => void;
  child?: (obj: any) => AppLogger;
};

export type WorkerCtx = {
  logId: number;
  logger: AppLogger;
  session: StoredSession;
};
