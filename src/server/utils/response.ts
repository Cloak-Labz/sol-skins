import { Response } from 'express';

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

export class ResponseUtil {
  static success<T>(
    res: Response,
    data: T,
    statusCode: number = 200,
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
  ): Response<SuccessResponse<T>> {
    const response: SuccessResponse<T> = {
      success: true,
      data,
    };

    if (pagination) {
      response.pagination = pagination;
    }

    return res.status(statusCode).json(response);
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
  ): Response<ErrorResponse> {
    const response: ErrorResponse = {
      success: false,
      error: {
        message,
        code,
        details,
      },
    };

    return res.status(statusCode).json(response);
  }

  static created<T>(res: Response, data: T): Response<SuccessResponse<T>> {
    return this.success(res, data, 201);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  static badRequest(res: Response, message: string, code?: string): Response<ErrorResponse> {
    return this.error(res, message, 400, code);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized', code?: string): Response<ErrorResponse> {
    return this.error(res, message, 401, code);
  }

  static forbidden(res: Response, message: string = 'Forbidden', code?: string): Response<ErrorResponse> {
    return this.error(res, message, 403, code);
  }

  static notFound(res: Response, message: string = 'Resource not found', code?: string): Response<ErrorResponse> {
    return this.error(res, message, 404, code);
  }

  static conflict(res: Response, message: string, code?: string): Response<ErrorResponse> {
    return this.error(res, message, 409, code);
  }

  static internalError(res: Response, message: string = 'Internal server error', code?: string): Response<ErrorResponse> {
    return this.error(res, message, 500, code);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number
  ): Response<SuccessResponse<T[]>> {
    const totalPages = Math.ceil(total / limit);
    
    return this.success(res, data, 200, {
      page,
      limit,
      total,
      totalPages,
    });
  }
}

export default ResponseUtil; 