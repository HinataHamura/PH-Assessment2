import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { StatusCodes } from 'http-status-codes';
import authRouter from './modules/auth/auth.routes';
import issuesRouter from './modules/issues/issues.routes';
import { errorHandler } from './middleware/error.middleware';
import { sendError } from './utils/response.util';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/issues', issuesRouter);

app.use((req, res) => {
  return sendError(res, StatusCodes.NOT_FOUND, 'Route not found', `Cannot ${req.method} ${req.originalUrl}`);
});

app.use(errorHandler);

export default app;
