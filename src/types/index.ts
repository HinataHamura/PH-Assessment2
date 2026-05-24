export type Role = 'contributor' | 'maintainer';
export type IssueType = 'bug' | 'feature_request';
export type IssueStatus = 'open' | 'in_progress' | 'resolved';

export interface AuthUser {
  id: number;
  name: string;
  role: Role;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  created_at: Date;
  updated_at: Date;
}

export interface Issue {
  id: number;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  reporter_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface Reporter {
  id: number;
  name: string;
  role: Role;
}

export interface IssueWithReporter extends Omit<Issue, 'reporter_id'> {
  reporter: Reporter | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
