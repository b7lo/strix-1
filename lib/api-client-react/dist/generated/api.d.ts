import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { CreateAccidentRequest, CreateAccidentResponse, ErrorResponse, HealthStatus, MatchAccidentRequest, MatchAccidentResult } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * Returns server health status
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * Stores a locally generated accident report for later matching.
 * @summary Create accident sync record
 */
export declare const getCreateAccidentUrl: () => string;
export declare const createAccident: (createAccidentRequest: CreateAccidentRequest, options?: RequestInit) => Promise<CreateAccidentResponse>;
export declare const getCreateAccidentMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAccident>>, TError, {
        data: BodyType<CreateAccidentRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createAccident>>, TError, {
    data: BodyType<CreateAccidentRequest>;
}, TContext>;
export type CreateAccidentMutationResult = NonNullable<Awaited<ReturnType<typeof createAccident>>>;
export type CreateAccidentMutationBody = BodyType<CreateAccidentRequest>;
export type CreateAccidentMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Create accident sync record
 */
export declare const useCreateAccident: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAccident>>, TError, {
        data: BodyType<CreateAccidentRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createAccident>>, TError, {
    data: BodyType<CreateAccidentRequest>;
}, TContext>;
/**
 * Searches nearby reports from other devices and links likely matching accidents.
 * @summary Match accident with another device report
 */
export declare const getMatchAccidentUrl: (id: string) => string;
export declare const matchAccident: (id: string, matchAccidentRequest: MatchAccidentRequest, options?: RequestInit) => Promise<MatchAccidentResult | null>;
export declare const getMatchAccidentMutationOptions: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof matchAccident>>, TError, {
        id: string;
        data: BodyType<MatchAccidentRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof matchAccident>>, TError, {
    id: string;
    data: BodyType<MatchAccidentRequest>;
}, TContext>;
export type MatchAccidentMutationResult = NonNullable<Awaited<ReturnType<typeof matchAccident>>>;
export type MatchAccidentMutationBody = BodyType<MatchAccidentRequest>;
export type MatchAccidentMutationError = ErrorType<ErrorResponse>;
/**
 * @summary Match accident with another device report
 */
export declare const useMatchAccident: <TError = ErrorType<ErrorResponse>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof matchAccident>>, TError, {
        id: string;
        data: BodyType<MatchAccidentRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof matchAccident>>, TError, {
    id: string;
    data: BodyType<MatchAccidentRequest>;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map