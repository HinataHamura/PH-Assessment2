declare module 'cors' {
  import type { RequestHandler } from 'express';

  function cors(): RequestHandler;

  export default cors;
}

declare module 'pg' {
  export interface QueryResult<T> {
    rows: T[];
    rowCount: number | null;
  }

  export class Pool {
    constructor(config?: { connectionString?: string });
    query<T>(text: string, values?: readonly unknown[]): Promise<QueryResult<T>>;
  }
}
