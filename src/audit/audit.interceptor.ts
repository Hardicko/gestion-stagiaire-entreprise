import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { catchError, from, map, mergeMap, Observable, throwError } from 'rxjs';

import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard';
import { AuditAction, AuditOutcome } from '../generated/prisma/enums';
import { AuditService } from './audit.service';

type AuditedRequest = Request & Partial<AuthenticatedRequest>;

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly auditedMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  private readonly uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditedRequest>();

    if (!this.auditedMethods.has(request.method.toUpperCase())) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      mergeMap((responseBody: unknown) =>
        from(
          this.auditService.recordSafely(
            this.buildEvent(
              request,
              response.statusCode,
              AuditOutcome.SUCCESS,
              responseBody,
              undefined,
              startedAt,
            ),
          ),
        ).pipe(map(() => responseBody)),
      ),
      catchError((error: unknown) => {
        const statusCode =
          error instanceof HttpException ? error.getStatus() : 500;

        return from(
          this.auditService.recordSafely(
            this.buildEvent(
              request,
              statusCode,
              AuditOutcome.FAILURE,
              undefined,
              error,
              startedAt,
            ),
          ),
        ).pipe(mergeMap(() => throwError(() => error)));
      }),
    );
  }

  private buildEvent(
    request: AuditedRequest,
    statusCode: number,
    outcome: AuditOutcome,
    responseBody: unknown,
    error: unknown,
    startedAt: number,
  ) {
    const path = request.originalUrl.split('?')[0];
    const action = this.resolveAction(request.method, path);
    const resource = this.resolveResource(path);
    const resourceId = this.resolveResourceId(request, responseBody);
    const responseUserId = this.readNestedString(responseBody, ['user', 'id']);

    return {
      userId: request.user?.sub ?? responseUserId ?? null,
      action,
      outcome,
      resource,
      resourceId,
      entityLabel: this.resolveEntityLabel(responseBody, request.body),
      method: request.method.toUpperCase(),
      path,
      statusCode,
      ipAddress: request.ip ?? request.socket.remoteAddress ?? null,
      userAgent: request.get('user-agent') ?? null,
      metadata: this.sanitize({
        requestBody: request.body as unknown,
        query: request.query,
        durationMs: Date.now() - startedAt,
        ...(error !== undefined && {
          error:
            error instanceof Error ? error.message : 'Erreur non détaillée',
        }),
      }),
    };
  }

  private resolveAction(method: string, path: string): AuditAction {
    if (path === '/auth/login') {
      return AuditAction.LOGIN;
    }

    if (path === '/auth/logout') {
      return AuditAction.LOGOUT;
    }

    if (path === '/auth/change-password') {
      return AuditAction.PASSWORD_CHANGE;
    }

    if (/^\/users\/[^/]+\/reset-password$/.test(path)) {
      return AuditAction.PASSWORD_RESET;
    }

    if (method.toUpperCase() === 'POST') {
      return AuditAction.CREATE;
    }

    if (method.toUpperCase() === 'DELETE') {
      return AuditAction.DELETE;
    }

    return AuditAction.UPDATE;
  }

  private resolveResource(path: string): string {
    return path.split('/').filter(Boolean)[0] ?? 'application';
  }

  private resolveResourceId(
    request: AuditedRequest,
    responseBody: unknown,
  ): string | null {
    const candidates = [
      request.params?.id,
      this.readNestedString(responseBody, ['id']),
      this.readNestedString(responseBody, ['user', 'id']),
    ];

    return (
      candidates.find(
        (candidate): candidate is string =>
          typeof candidate === 'string' && this.uuidPattern.test(candidate),
      ) ?? null
    );
  }

  private resolveEntityLabel(
    responseBody: unknown,
    requestBody: unknown,
  ): string | null {
    for (const source of [responseBody, requestBody]) {
      const firstName = this.readNestedString(source, ['firstName']);
      const lastName = this.readNestedString(source, ['lastName']);
      if (firstName || lastName) {
        return [firstName, lastName].filter(Boolean).join(' ');
      }

      const nestedFirstName = this.readNestedString(source, [
        'user',
        'firstName',
      ]);
      const nestedLastName = this.readNestedString(source, [
        'user',
        'lastName',
      ]);
      if (nestedFirstName || nestedLastName) {
        return [nestedFirstName, nestedLastName].filter(Boolean).join(' ');
      }

      for (const key of [
        'name',
        'title',
        'referenceCode',
        'registrationCode',
        'employeeNumber',
        'email',
      ]) {
        const value = this.readNestedString(source, [key]);
        if (value) {
          return value;
        }
      }
    }

    return null;
  }

  private readNestedString(value: unknown, path: string[]): string | undefined {
    let current: unknown = value;

    for (const segment of path) {
      if (
        current === null ||
        typeof current !== 'object' ||
        Array.isArray(current)
      ) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }

    return typeof current === 'string' ? current : undefined;
  }

  private sanitize(value: unknown, depth = 0): unknown {
    if (depth > 6) {
      return '[TRUNCATED]';
    }

    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    if (value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item, depth + 1));
    }

    if (typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          this.isSensitiveKey(key)
            ? '[REDACTED]'
            : this.sanitize(item, depth + 1),
        ]),
      );
    }

    return null;
  }

  private isSensitiveKey(key: string): boolean {
    const normalizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
    return (
      normalizedKey.includes('password') ||
      normalizedKey.includes('token') ||
      normalizedKey === 'authorization'
    );
  }
}
