import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/** The shape `JwtStrategy.validate` puts on the request. */
export interface RequestUser {
  id?: string;
  email?: string;
  /** A plain string — `user.role.toString()`, not a `Role` value object. */
  role?: string;
  /** Taken straight off the JWT claim, not re-read from the database. */
  permissions?: string[];
}

export interface GuardHarness {
  context: ExecutionContext;
  reflector: Reflector;
  request: { user?: RequestUser | null };
}

/**
 * An `ExecutionContext` carrying real route metadata and a real `Reflector`.
 *
 * The metadata is attached with `Reflect.defineMetadata` on a throwaway handler rather
 * than being stubbed, so `getAllAndOverride` runs for real — which matters here, because
 * every guard in this module treats *absent* metadata as permission granted. A test that
 * faked the reflector would not be able to tell a missing key from an empty one.
 */
export function buildContext(
  options: {
    user?: RequestUser | null;
    /** Handler-level metadata, keyed exactly as the guard reads it. */
    metadata?: Record<string, unknown>;
    /** Class-level metadata, for asserting the handler override. */
    classMetadata?: Record<string, unknown>;
  } = {},
): GuardHarness {
  const handler = function routeHandler() {};
  class RouteController {}

  for (const [key, value] of Object.entries(options.metadata ?? {})) {
    Reflect.defineMetadata(key, value, handler);
  }
  for (const [key, value] of Object.entries(options.classMetadata ?? {})) {
    Reflect.defineMetadata(key, value, RouteController);
  }

  const request = {
    user: options.user === undefined ? ({} as RequestUser) : options.user,
  };

  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => RouteController,
  } as unknown as ExecutionContext;

  return { context, reflector: new Reflector(), request };
}
