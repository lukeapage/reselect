import type { defaultMemoize } from './defaultMemoize'
import type { MergeParameters } from './versionedTypes'

export type { MergeParameters } from './versionedTypes'

/*
 *
 * Reselect Data Types
 *
 */

/**
 * A standard selector function, which takes three generic type arguments:
 * @template State - The first value, often a Redux root state object
 * @template Result - The final result returned by the selector
 * @template Params - All additional arguments passed into the selector
 */
export type Selector<
  // The state can be anything
  State = any,
  // The result will be inferred
  Result = unknown,
  // There are either 0 params, or N params
  Params extends readonly any[] = any[]
  // If there are 0 params, type the function as just State in, Result out.
  // Otherwise, type it as State + Params in, Result out.
> =
  /**
   * A function that takes a state and returns data that is based on that state.
   *
   * @param state - The first argument, often a Redux root state object.
   * @param params - All additional arguments passed into the selector.
   * @returns A derived value from the state.
   */
  (state: State, ...params: FallbackIfNever<Params, []>) => Result

/**
 * A function that takes input selectors' return values as arguments and returns a result. Otherwise known as `resultFunc`.
 *
 * @template InputSelectors - An array of input selectors.
 * @template Result - Result returned by `resultFunc`.
 */
export type Combiner<InputSelectors extends SelectorArray, Result> =
  /**
   * A function that takes input selectors' return values as arguments and returns a result. Otherwise known as `resultFunc`.
   *
   * @param resultFuncArgs - Return values of input selectors.
   * @returns The return value of {@linkcode OutputSelectorFields.resultFunc resultFunc}.
   */
  (...resultFuncArgs: SelectorResultArray<InputSelectors>) => Result

/**
 * The additional fields attached to the output selector generated by `createSelector`.
 *
 * **Note**: Although {@linkcode CreateSelectorOptions.memoize memoize}
 * and {@linkcode CreateSelectorOptions.argsMemoize argsMemoize} are included in the attached fields,
 * the fields themselves are independent of the type of
 * {@linkcode CreateSelectorOptions.memoize memoize} and {@linkcode CreateSelectorOptions.argsMemoize argsMemoize} functions.
 * Meaning this type is not going to generate additional fields based on what functions we use to memoize our selectors.
 *
 * _This type is not to be confused with {@linkcode ExtractMemoizerFields ExtractMemoizerFields}._
 *
 * @template InputSelectors - The type of the input selectors.
 * @template Result - The type of the result returned by the `resultFunc`.
 * @template MemoizeFunction - The type of the memoize function that is used to memoize the `resultFunc` inside `createSelector` (e.g., `defaultMemoize` or `weakMapMemoize`).
 * @template ArgsMemoizeFunction - The type of the optional memoize function that is used to memoize the arguments passed into the output selector generated by `createSelector` (e.g., `defaultMemoize` or `weakMapMemoize`). If none is explicitly provided, `defaultMemoize` will be used.
 */
export interface OutputSelectorFields<
  InputSelectors extends SelectorArray = SelectorArray,
  Result = unknown,
  MemoizeFunction extends UnknownMemoizer = typeof defaultMemoize,
  ArgsMemoizeFunction extends UnknownMemoizer = typeof defaultMemoize
> extends Required<
    Pick<
      CreateSelectorOptions<MemoizeFunction, ArgsMemoizeFunction>,
      'argsMemoize' | 'memoize'
    >
  > {
  /** The final function passed to `createSelector`. Otherwise known as the `combiner`. */
  resultFunc: Combiner<InputSelectors, Result>
  /** The memoized version of {@linkcode resultFunc resultFunc}. */
  memoizedResultFunc: Combiner<InputSelectors, Result> &
    ExtractMemoizerFields<MemoizeFunction>
  /** Returns the last result calculated by the output selector. */
  lastResult: () => Result
  /** An array of the input selectors. */
  dependencies: InputSelectors
  /** Counts the number of times the output has been recalculated. */
  recomputations: () => number
  /** Resets the count of `recomputations` count to 0. */
  resetRecomputations: () => 0
}

/**
 * Represents the actual selectors generated by `createSelector`.
 *
 * @template InputSelectors - The type of the input selectors.
 * @template Result - The type of the result returned by the `resultFunc`.
 * @template MemoizeFunction - The type of the memoize function that is used to memoize the `resultFunc` inside `createSelector` (e.g., `defaultMemoize` or `weakMapMemoize`).
 * @template ArgsMemoizeFunction - The type of the optional memoize function that is used to memoize the arguments passed into the output selector generated by `createSelector` (e.g., `defaultMemoize` or `weakMapMemoize`). If none is explicitly provided, `defaultMemoize` will be used.
 */
export type OutputSelector<
  InputSelectors extends SelectorArray = SelectorArray,
  Result = unknown,
  MemoizeFunction extends UnknownMemoizer = typeof defaultMemoize,
  ArgsMemoizeFunction extends UnknownMemoizer = typeof defaultMemoize
> = PrepareOutputSelector<
  InputSelectors,
  Result,
  MemoizeFunction,
  ArgsMemoizeFunction
> &
  ExtractMemoizerFields<ArgsMemoizeFunction>

/**
 * A helper type designed to optimize TypeScript performance by composing parts of {@linkcode OutputSelector OutputSelector} in a more statically structured manner.
 *
 * This is achieved by utilizing the `extends` keyword with `interfaces`, as opposed to creating intersections with type aliases.
 * This approach offers some performance benefits:
 * - `Interfaces` create a flat object type, while intersections with type aliases recursively merge properties.
 * - Type relationships between `interfaces` are also cached, as opposed to intersection types as a whole.
 * - When checking against an intersection type, every constituent is verified before checking against the "effective" flattened type.
 *
 * This optimization focuses on resolving much of the type composition for
 * {@linkcode OutputSelector OutputSelector} using `extends` with `interfaces`,
 * rather than relying on intersections for the entire {@linkcode OutputSelector OutputSelector}.
 *
 * @template InputSelectors - The type of the input selectors.
 * @template Result - The type of the result returned by the `resultFunc`.
 * @template MemoizeFunction - The type of the memoize function that is used to memoize the `resultFunc` inside `createSelector` (e.g., `defaultMemoize` or `weakMapMemoize`).
 * @template ArgsMemoizeFunction - The type of the optional memoize function that is used to memoize the arguments passed into the output selector generated by `createSelector` (e.g., `defaultMemoize` or `weakMapMemoize`). If none is explicitly provided, `defaultMemoize` will be used.
 *
 * @see {@link https://github.com/microsoft/TypeScript/wiki/Performance#preferring-interfaces-over-intersections Reference}
 */
export interface PrepareOutputSelector<
  InputSelectors extends SelectorArray = SelectorArray,
  Result = unknown,
  MemoizeFunction extends UnknownMemoizer = typeof defaultMemoize,
  ArgsMemoizeFunction extends UnknownMemoizer = typeof defaultMemoize
> extends OutputSelectorFields<
      InputSelectors,
      Result,
      MemoizeFunction,
      ArgsMemoizeFunction
    >,
    Selector<
      GetStateFromSelectors<InputSelectors>,
      Result,
      GetParamsFromSelectors<InputSelectors>
    > {}

/**
 * A selector that is assumed to have one additional argument, such as
 * the props from a React component
 */
export type ParametricSelector<State, Props, Result> = Selector<
  State,
  Result,
  [Props, ...any]
>

/** A generated selector that is assumed to have one additional argument */
export type OutputParametricSelector<State, Props, Result> = ParametricSelector<
  State,
  Props,
  Result
> &
  OutputSelectorFields<SelectorArray, Result>

/** An array of input selectors */
export type SelectorArray = ReadonlyArray<Selector>

/** A standard function returning true if two values are considered equal */
export type EqualityFn = (a: any, b: any) => boolean

export type StabilityCheckFrequency = 'always' | 'once' | 'never'

/**
 * The options object used inside `createSelector` and `createSelectorCreator`.
 *
 * @template MemoizeFunction - The type of the memoize function that is used to memoize the `resultFunc` inside `createSelector` (e.g., `defaultMemoize` or `weakMapMemoize`).
 * @template ArgsMemoizeFunction - The type of the optional memoize function that is used to memoize the arguments passed into the output selector generated by `createSelector` (e.g., `defaultMemoize` or `weakMapMemoize`). If none is explicitly provided, `defaultMemoize` will be used.
 * @template OverrideMemoizeFunction - The type of the optional `memoize` function that could be passed into the options object inside `createSelector` to override the original `memoize` function that was initially passed into `createSelectorCreator`.
 * @template OverrideArgsMemoizeFunction - The type of the optional `argsMemoize` function that could be passed into the options object inside `createSelector` to override the original `argsMemoize` function that was initially passed into `createSelectorCreator`. If none was initially provided, `defaultMemoize` will be used.
 */
export interface CreateSelectorOptions<
  MemoizeFunction extends UnknownMemoizer,
  ArgsMemoizeFunction extends UnknownMemoizer,
  OverrideMemoizeFunction extends UnknownMemoizer = never,
  OverrideArgsMemoizeFunction extends UnknownMemoizer = never
> {
  /**
   * Overrides the global input stability check for the selector.
   * - `once` - Run only the first time the selector is called.
   * - `always` - Run every time the selector is called.
   * - `never` - Never run the input stability check.
   *
   * @default 'once'
   *
   * @see {@link https://github.com/reduxjs/reselect#development-only-checks development-only-checks}
   * @see {@link https://github.com/reduxjs/reselect#inputstabilitycheck inputStabilityCheck}
   * @see {@link https://github.com/reduxjs/reselect#per-selector-configuration per-selector-configuration}
   */
  inputStabilityCheck?: StabilityCheckFrequency

  /**
   * The memoize function that is used to memoize the {@linkcode OutputSelectorFields.resultFunc resultFunc}
   * inside `createSelector` (e.g., `defaultMemoize` or `weakMapMemoize`).
   *
   * When passed directly into `createSelector`, it overrides the `memoize` function initially passed into `createSelectorCreator`.
   */
  // If `memoize` is not provided inside the options object, fallback to `MemoizeFunction` which is the original memoize function passed into `createSelectorCreator`.
  memoize: FallbackIfNever<OverrideMemoizeFunction, MemoizeFunction>

  /**
   * The optional memoize function that is used to memoize the arguments passed into the output selector generated by `createSelector` (e.g., `defaultMemoize` or `weakMapMemoize`).
   *
   * When passed directly into `createSelector`, it overrides the `argsMemoize` function initially passed into `createSelectorCreator`. If none was initially provided, `defaultMemoize` will be used.
   *
   * @default defaultMemoize
   */
  // If `argsMemoize` is not provided inside the options object,
  // fallback to `ArgsMemoizeFunction` which is the original `argsMemoize` function passed into `createSelectorCreator`.
  // If none was passed originally to `createSelectorCreator`, it should fallback to `defaultMemoize`.
  argsMemoize?: FallbackIfNever<
    OverrideArgsMemoizeFunction,
    ArgsMemoizeFunction
  >

  /**
   * Optional configuration options for the {@linkcode memoize memoize} function.
   * These options are passed to the {@linkcode memoize memoize} function as the second argument.
   */
  // Should dynamically change to the options argument of `memoize`.
  memoizeOptions?: OverrideMemoizeOptions<
    MemoizeFunction,
    OverrideMemoizeFunction
  >

  /**
   * Optional configuration options for the {@linkcode argsMemoize argsMemoize} function.
   * These options are passed to the {@linkcode argsMemoize argsMemoize} function as the second argument.
   */
  argsMemoizeOptions?: OverrideMemoizeOptions<
    ArgsMemoizeFunction,
    OverrideArgsMemoizeFunction
  >
}

/*
 *
 * Reselect Internal Types
 *
 */

/** Extracts an array of all return types from all input selectors */
export type SelectorResultArray<Selectors extends SelectorArray> =
  ExtractReturnType<Selectors>

/** Determines the combined single "State" type (first arg) from all input selectors */
export type GetStateFromSelectors<Selectors extends SelectorArray> =
  MergeParameters<Selectors>[0]

/** Determines the combined  "Params" type (all remaining args) from all input selectors */
export type GetParamsFromSelectors<
  Selectors extends SelectorArray,
  RemainingItems extends readonly unknown[] = Tail<MergeParameters<Selectors>>
> = RemainingItems

/*
 *
 * Reselect Internal Utility Types
 *
 */

/** Any function with any arguments */
export type AnyFunction = (...args: any[]) => any
/** Any function with unknown arguments */
export type UnknownFunction = (...args: unknown[]) => unknown
/** Any Memoizer function. A memoizer is a function that accepts another function and returns it. */
export type UnknownMemoizer<Func extends UnknownFunction = UnknownFunction> = (
  func: Func,
  ...options: any[]
) => Func

/**
 * When a generic type parameter is using its default value of `never`, fallback to a different type.
 *
 * @template T - Type to be checked.
 * @template FallbackTo - Type to fallback to if `T` resolves to `never`.
 */
export type FallbackIfNever<T, FallbackTo> = IfNever<T, FallbackTo, T>

/**
 * Derive the type of memoize options object based on whether the memoize function itself was overridden.
 *
 * _This type can be used for both `memoizeOptions` and `argsMemoizeOptions`._
 *
 * @template MemoizeFunction - The type of the `memoize` or `argsMemoize` function initially passed into `createSelectorCreator`.
 * @template OverrideMemoizeFunction - The type of the optional `memoize` or `argsMemoize` function passed directly into `createSelector` which then overrides the original `memoize` or `argsMemoize` function passed into `createSelectorCreator`.
 */
export type OverrideMemoizeOptions<
  MemoizeFunction extends UnknownMemoizer,
  OverrideMemoizeFunction extends UnknownMemoizer = never
> = IfNever<
  OverrideMemoizeFunction,
  MemoizeOptionsFromParameters<MemoizeFunction>,
  MemoizeOptionsFromParameters<OverrideMemoizeFunction>
>

/**
 * Extract the memoize options from the parameters of a memoize function.
 *
 * @template MemoizeFunction - The type of the memoize function to be checked.
 */
export type MemoizeOptionsFromParameters<
  MemoizeFunction extends UnknownMemoizer
> = DropFirstParameter<MemoizeFunction>[0] | DropFirstParameter<MemoizeFunction>

/**
 * Extracts the additional fields that a memoize function attaches to the function it memoizes (e.g., `clearCache`).
 *
 * @template MemoizeFunction - The type of the memoize function to be checked.
 */
export type ExtractMemoizerFields<MemoizeFunction extends UnknownMemoizer> =
  OmitIndexSignature<ReturnType<MemoizeFunction>>

/** Extract the return type from all functions as a tuple */
export type ExtractReturnType<T extends readonly AnyFunction[]> = {
  [index in keyof T]: T[index] extends T[number] ? ReturnType<T[index]> : never
}

/** First item in an array */
export type Head<T> = T extends [any, ...any[]] ? T[0] : never
/** All other items in an array */
export type Tail<A> = A extends [any, ...infer Rest] ? Rest : never

/** Extract only numeric keys from an array type */
export type AllArrayKeys<A extends readonly any[]> = A extends any
  ? {
      [K in keyof A]: K
    }[number]
  : never

export type List<A = any> = ReadonlyArray<A>

export type Has<U, U1> = [U1] extends [U] ? 1 : 0

/*
 *
 * External/Copied Utility Types
 *
 */

/**
 * An if-else-like type that resolves depending on whether the given type is `never`.
 * This is mainly used to conditionally resolve the type of a `memoizeOptions` object based on whether `memoize` is provided or not.
 * @see {@link https://github.com/sindresorhus/type-fest/blob/main/source/if-never.d.ts Source}
 */
export type IfNever<T, TypeIfNever, TypeIfNotNever> = [T] extends [never]
  ? TypeIfNever
  : TypeIfNotNever

/**
 * Omit any index signatures from the given object type, leaving only explicitly defined properties.
 * This is mainly used to remove explicit `any`s from the return type of some memoizers (e.g, `microMemoize`).
 * @see {@link https://github.com/sindresorhus/type-fest/blob/main/source/omit-index-signature.d.ts Source}
 */
export type OmitIndexSignature<ObjectType> = {
  [KeyType in keyof ObjectType as {} extends Record<KeyType, unknown>
    ? never
    : KeyType]: ObjectType[KeyType]
}

/**
 * The infamous "convert a union type to an intersection type" hack
 * Source: https://github.com/sindresorhus/type-fest/blob/main/source/union-to-intersection.d.ts
 * Reference: https://github.com/microsoft/TypeScript/issues/29594
 */
export type UnionToIntersection<Union> =
  // `extends unknown` is always going to be the case and is used to convert the
  // `Union` into a [distributive conditional
  // type](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#distributive-conditional-types).
  (
    Union extends unknown
      ? // The union type is used as the only argument to a function since the union
        // of function arguments is an intersection.
        (distributedUnion: Union) => void
      : // This won't happen.
        never
  ) extends // Infer the `Intersection` type since TypeScript represents the positional
  // arguments of unions of functions as an intersection of the union.
  (mergedIntersection: infer Intersection) => void
    ? Intersection
    : never

/**
 * Assorted util types for type-level conditional logic
 * Source: https://github.com/KiaraGrouwstra/typical
 */
export type Bool = '0' | '1'
export interface Obj<T> {
  [k: string]: T
}
export type And<A extends Bool, B extends Bool> = ({
  1: { 1: '1' } & Obj<'0'>
} & Obj<Obj<'0'>>)[A][B]

export type Matches<V, T> = V extends T ? '1' : '0'
export type IsArrayType<T> = Matches<T, any[]>

export type Not<T extends Bool> = { '1': '0'; '0': '1' }[T]
export type InstanceOf<V, T> = And<Matches<V, T>, Not<Matches<T, V>>>
export type IsTuple<T extends { length: number }> = And<
  IsArrayType<T>,
  InstanceOf<T['length'], number>
>

/**
 * Code to convert a union of values into a tuple.
 * Source: https://stackoverflow.com/a/55128956/62937
 */
type Push<T extends any[], V> = [...T, V]

type LastOf<T> = UnionToIntersection<
  T extends any ? () => T : never
> extends () => infer R
  ? R
  : never

// TS4.1+
export type TuplifyUnion<
  T,
  L = LastOf<T>,
  N = [T] extends [never] ? true : false
> = true extends N ? [] : Push<TuplifyUnion<Exclude<T, L>>, L>

/**
 * Converts "the values of an object" into a tuple, like a type-level `Object.values()`
 * Source: https://stackoverflow.com/a/68695508/62937
 */
export type ObjValueTuple<
  T,
  KS extends any[] = TuplifyUnion<keyof T>,
  R extends any[] = []
> = KS extends [infer K, ...infer KT]
  ? ObjValueTuple<T, KT, [...R, T[K & keyof T]]>
  : R

/** Utility type to infer the type of "all params of a function except the first", so we can determine what arguments a memoize function accepts */
export type DropFirstParameter<Func extends AnyFunction> = Func extends (
  firstArg: any,
  ...restArgs: infer Rest
) => any
  ? Rest
  : never

/**
 * Expand an item a single level, or recursively.
 * Source: https://stackoverflow.com/a/69288824/62937
 */
export type Expand<T> = T extends (...args: infer A) => infer R
  ? (...args: Expand<A>) => Expand<R>
  : T extends infer O
  ? { [K in keyof O]: O[K] }
  : never

export type ExpandRecursively<T> = T extends (...args: infer A) => infer R
  ? (...args: ExpandRecursively<A>) => ExpandRecursively<R>
  : T extends object
  ? T extends infer O
    ? { [K in keyof O]: ExpandRecursively<O[K]> }
    : never
  : T

type Identity<T> = T
/**
 * Another form of type value expansion
 * Source: https://github.com/microsoft/TypeScript/issues/35247
 */
export type Mapped<T> = Identity<{ [k in keyof T]: T[k] }>

/**
 * Fully expand a type, deeply
 * Source: https://github.com/millsp/ts-toolbelt (`Any.Compute`)
 */

type ComputeDeep<A, Seen = never> = A extends BuiltIn
  ? A
  : If2<
      Has<Seen, A>,
      A,
      A extends Array<any>
        ? A extends Array<Record<Key, any>>
          ? Array<
              {
                [K in keyof A[number]]: ComputeDeep<A[number][K], A | Seen>
              } & unknown
            >
          : A
        : A extends ReadonlyArray<any>
        ? A extends ReadonlyArray<Record<Key, any>>
          ? ReadonlyArray<
              {
                [K in keyof A[number]]: ComputeDeep<A[number][K], A | Seen>
              } & unknown
            >
          : A
        : { [K in keyof A]: ComputeDeep<A[K], A | Seen> } & unknown
    >

export type If2<B extends Boolean2, Then, Else = never> = B extends 1
  ? Then
  : Else

export type Boolean2 = 0 | 1

export type Key = string | number | symbol

export type BuiltIn =
  | Function
  | Error
  | Date
  | { readonly [Symbol.toStringTag]: string }
  | RegExp
  | Generator
