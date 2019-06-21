/**
 * @typedef {import('bluebird')} Bluebird
 */

/**
 * @typedef {(returnValue: T) => void} ResolveType<T>
 * @template T
 */

/**
 * @typedef {(error: Error) => void} RejectType
 */

/**
 * @typedef {(
 *  queryArgs: T,
 *  resolve: ResolveType<U>,
 *  reject: RejectType,
 *  projection: string,
 * ) => void} GraphQLResolver<T,U>
 * @template T
 * @template U
 */

/**
 * @typedef {GraphQLResolver<T,import('mongoose').Document[]>} GraphQLQueryResolver
 * @template T
 */
