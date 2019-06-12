/**
 * @typedef {(returnValue: T) => void} ResolveType<T>
 * @template T
 */

/**
 * @typedef {(error: Error) => void} RejectType
 */

/**
 * @typedef {(resolve: ResolveType<T>, reject: RejectType, ...parameters: any[]) => void
  * } ApiRequestHandler<T>
  * @template T
  */
