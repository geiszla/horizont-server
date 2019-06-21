/**
 * @typedef {import('bluebird')} Bluebird
 */

/**
 * @typedef {(returnValue: T) => void} ResolveType<T>
 * @template T
 */

/**
 * @typedef {(error: Error, message: string) => void} ResolverRejectType
 */

/**
 * @typedef {(
 *  queryArgs: T,
 *  resolve: ResolveType<U>,
 *  reject: ResolverRejectType,
 *  projection: string,
 * ) => void} GraphQLResolver<T,U>
 * @template T
 * @template U
 */

/**
 * @typedef {import('mongoose').Document} MongooseDocument
 */

/**
 * @typedef {GraphQLResolver<T,MongooseDocument[]>} GraphQLQueryResolver
 * @template T
 */
