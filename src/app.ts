import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './modules/auth/auth.routes';
import issuesRouter from './modules/issues/issues.routes';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/issues', issuesRouter);

app.use(errorHandler);

export default app;
