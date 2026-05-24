import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as service from './issues.service';
import type { IssueStatus, IssueType, Reporter } from '../../types';
import { AppError } from '../../utils/app-error.util';
import { sendSuccess } from '../../utils/response.util';

const VALID_TYPES: IssueType[] = ['bug', 'feature_request'];
const VALID_STATUS: IssueStatus[] = ['open', 'in_progress', 'resolved'];
const VALID_SORT = ['newest', 'oldest'] as const;

interface CreateIssueBody {
  title?: string;
  description?: string;
  type?: IssueType;
}

interface UpdateIssueBody {
  title?: string;
  description?: string;
  type?: IssueType;
  status?: IssueStatus;
}

export async function listIssues(req: Request, res: Response, next: NextFunction) {
  try {
    const sort = getQueryValue(req.query.sort) || 'newest';
    const type = getQueryValue(req.query.type);
    const status = getQueryValue(req.query.status);

    if (!isSort(sort)) throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid sort');
    const filters: service.IssueFilters = { sort };
    if (type) {
      if (!isIssueType(type)) throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid type');
      filters.type = type;
    }
    if (status) {
      if (!isIssueStatus(status)) throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid status');
      filters.status = status;
    }

    const issues = await service.listIssues(filters);
    const reporterIds = Array.from(new Set(issues.map((issue) => issue.reporter_id)));
    const reporters = await service.getUsersByIds(reporterIds);
    const reporterMap = new Map<number, Reporter>(reporters.map((reporter) => [reporter.id, reporter]));
    const data = issues.map((issue) => ({
      id: issue.id,
      title: issue.title,
      description: issue.description,
      type: issue.type,
      status: issue.status,
      reporter: reporterMap.get(issue.reporter_id) || null,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
    }));

    return sendSuccess(res, StatusCodes.OK, 'Issues retrived successfully', data);
  } catch (err) {
    return next(err);
  }
}

export async function getIssueById(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const id = getId(req.params.id);
    const issue = await service.getIssueById(id);
    if (!issue) throw new AppError(StatusCodes.NOT_FOUND, 'Issue not found');

    const reporters = await service.getUsersByIds([issue.reporter_id]);
    const data = {
      id: issue.id,
      title: issue.title,
      description: issue.description,
      type: issue.type,
      status: issue.status,
      reporter: reporters[0] || null,
      created_at: issue.created_at,
      updated_at: issue.updated_at,
    };

    return sendSuccess(res, StatusCodes.OK, 'Issue retrived successfully', data);
  } catch (err) {
    return next(err);
  }
}

export async function createIssue(req: Request<{}, {}, CreateIssueBody>, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) throw new AppError(StatusCodes.UNAUTHORIZED, 'Missing Authorization header');

    const { title, description, type } = req.body;
    validateIssueFields(req.body, true);

    const created = await service.createIssue(title || '', description || '', type as IssueType, user.id);
    return sendSuccess(res, StatusCodes.CREATED, 'Issue created successfully', created);
  } catch (err) {
    return next(err);
  }
}

export async function updateIssue(req: Request<{ id: string }, {}, UpdateIssueBody>, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) throw new AppError(StatusCodes.UNAUTHORIZED, 'Missing Authorization header');

    const id = getId(req.params.id);
    const fields = req.body;
    const issue = await service.getIssueById(id);
    if (!issue) throw new AppError(StatusCodes.NOT_FOUND, 'Issue not found');

    const isMaintainer = user.role === 'maintainer';
    const isOwner = issue.reporter_id === user.id;

    if (!isMaintainer) {
      if (!isOwner) throw new AppError(StatusCodes.FORBIDDEN, 'Forbidden');
      if (issue.status !== 'open') throw new AppError(StatusCodes.CONFLICT, 'Cannot edit non-open issue');
      if (fields.status && fields.status !== issue.status) {
        throw new AppError(StatusCodes.FORBIDDEN, 'Contributors cannot change status');
      }
    }

    validateIssueFields(fields, false);
    const updated = await service.updateIssue(id, fields);
    return sendSuccess(res, StatusCodes.OK, 'Issue updated successfully', updated);
  } catch (err) {
    return next(err);
  }
}

export async function deleteIssue(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) throw new AppError(StatusCodes.UNAUTHORIZED, 'Missing Authorization header');
    if (user.role !== 'maintainer') throw new AppError(StatusCodes.FORBIDDEN, 'Forbidden');

    const id = getId(req.params.id);
    const issue = await service.getIssueById(id);
    if (!issue) throw new AppError(StatusCodes.NOT_FOUND, 'Issue not found');

    await service.deleteIssue(id);
    return sendSuccess(res, StatusCodes.OK, 'Issue deleted successfully');
  } catch (err) {
    return next(err);
  }
}

function validateIssueFields(fields: UpdateIssueBody, requireAll: boolean) {
  if (requireAll && !fields.title) throw new AppError(StatusCodes.BAD_REQUEST, 'Title is required');
  if (fields.title !== undefined && (!fields.title.trim() || fields.title.length > 150)) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Title is required and max 150 chars');
  }

  if (requireAll && !fields.description) throw new AppError(StatusCodes.BAD_REQUEST, 'Description is required');
  if (fields.description !== undefined && fields.description.length < 20) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Description must be at least 20 characters');
  }

  if (requireAll && !fields.type) throw new AppError(StatusCodes.BAD_REQUEST, 'Type is required');
  if (fields.type !== undefined && !isIssueType(fields.type)) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid type');
  }

  if (fields.status !== undefined && !isIssueStatus(fields.status)) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid status');
  }

  if (!requireAll && !Object.keys(fields).some((key) => ['title', 'description', 'type', 'status'].includes(key))) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'No valid fields provided');
  }
}

function getId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid id');
  return id;
}

function getQueryValue(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function isIssueType(value: unknown): value is IssueType {
  return VALID_TYPES.includes(value as IssueType);
}

function isIssueStatus(value: unknown): value is IssueStatus {
  return VALID_STATUS.includes(value as IssueStatus);
}

function isSort(value: unknown): value is 'newest' | 'oldest' {
  return VALID_SORT.includes(value as 'newest' | 'oldest');
}
