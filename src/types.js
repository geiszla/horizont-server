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
 * @typedef {[ResolveType<T>, RejectType, string]} GraphQLResolverCommonArgs<T>
 * @template T
 */

/**
 * @typedef {GraphQLResolverCommonArgs<import('mongoose').Document[]>} GraphQlQueryCommonArgs
 */
