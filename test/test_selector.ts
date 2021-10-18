// TODO: Add test for React Redux connect function

import {
  createSelector,
  createSelectorCreator,
  defaultMemoize,
  createStructuredSelector
} from '../src/index'
import lodashMemoize from 'lodash/memoize'
import microMemoize from 'micro-memoize'
import memoizeOne from 'memoize-one'

// Construct 1E6 states for perf test outside of the perf test so as to not change the execute time of the test function
const numOfStates = 1000000
interface StateA {
  a: number
}

interface StateAB {
  a: number
  b: number
}

interface StateSub {
  sub: {
    a: number
  }
}

const states: StateAB[] = []

for (let i = 0; i < numOfStates; i++) {
  states.push({ a: 1, b: 2 })
}

describe('selector', () => {
  test('basic selector', () => {
    const selector = createSelector(
      (state: StateA) => state.a,
      a => a
    )
    const firstState = { a: 1 }
    const firstStateNewPointer = { a: 1 }
    const secondState = { a: 2 }

    expect(selector(firstState)).toBe(1)
    expect(selector(firstState)).toBe(1)
    expect(selector.recomputations()).toBe(1)
    expect(selector(firstStateNewPointer)).toBe(1)
    expect(selector.recomputations()).toBe(1)
    expect(selector(secondState)).toBe(2)
    expect(selector.recomputations()).toBe(2)
  })
  test("don't pass extra parameters to inputSelector when only called with the state", () => {
    const selector = createSelector(
      (...params: any) => params.length,
      a => a
    )
    expect(selector({})).toBe(1)
  })
  test('basic selector multiple keys', () => {
    const selector = createSelector(
      (state: StateAB) => state.a,
      (state: StateAB) => state.b,
      (a, b) => a + b
    )
    const state1 = { a: 1, b: 2 }
    expect(selector(state1)).toBe(3)
    expect(selector(state1)).toBe(3)
    expect(selector.recomputations()).toBe(1)
    const state2 = { a: 3, b: 2 }
    expect(selector(state2)).toBe(5)
    expect(selector(state2)).toBe(5)
    expect(selector.recomputations()).toBe(2)
  })
  test('basic selector invalid input selector', () => {
    expect(() =>
      // @ts-ignore
      createSelector(
        (state: StateAB) => state.a,
        'not a function',
        (a, b) => a + b
      )
    ).toThrow(/input-selectors to be functions.*function, string/)
  })
  test('basic selector cache hit performance', () => {
    if (process.env.COVERAGE) {
      return // don't run performance tests for coverage
    }

    const selector = createSelector(
      (state: StateAB) => state.a,
      (state: StateAB) => state.b,
      (a, b) => a + b
    )
    const state1 = { a: 1, b: 2 }

    const start = new Date()
    for (let i = 0; i < 1000000; i++) {
      selector(state1)
    }
    const totalTime = new Date().getTime() - start.getTime()

    expect(selector(state1)).toBe(3)
    expect(selector.recomputations()).toBe(1)
    // Expected a million calls to a selector with the same arguments to take less than 1 second
    expect(totalTime).toBeLessThan(1000)
  })
  test('basic selector cache hit performance for state changes but shallowly equal selector args', () => {
    if (process.env.COVERAGE) {
      return // don't run performance tests for coverage
    }

    const selector = createSelector(
      (state: StateAB) => state.a,
      (state: StateAB) => state.b,
      (a, b) => a + b
    )

    const start = new Date()
    for (let i = 0; i < numOfStates; i++) {
      selector(states[i])
    }
    const totalTime = new Date().getTime() - start.getTime()

    expect(selector(states[0])).toBe(3)
    expect(selector.recomputations()).toBe(1)

    // Expected a million calls to a selector with the same arguments to take less than 1 second
    expect(totalTime).toBeLessThan(1000)
  })
  test('memoized composite arguments', () => {
    const selector = createSelector(
      (state: StateSub) => state.sub,
      sub => sub
    )
    const state1 = { sub: { a: 1 } }
    expect(selector(state1)).toEqual({ a: 1 })
    expect(selector(state1)).toEqual({ a: 1 })
    expect(selector.recomputations()).toBe(1)
    const state2 = { sub: { a: 2 } }
    expect(selector(state2)).toEqual({ a: 2 })
    expect(selector.recomputations()).toBe(2)
  })
  test('first argument can be an array', () => {
    const selector = createSelector(
      [state => state.a, state => state.b],
      (a, b) => {
        return a + b
      }
    )
    expect(selector({ a: 1, b: 2 })).toBe(3)
    expect(selector({ a: 1, b: 2 })).toBe(3)
    expect(selector.recomputations()).toBe(1)
    expect(selector({ a: 3, b: 2 })).toBe(5)
    expect(selector.recomputations()).toBe(2)
  })
  test('can accept props', () => {
    let called = 0
    const selector = createSelector(
      (state: StateAB) => state.a,
      (state: StateAB) => state.b,
      (state: StateAB, props: { c: number }) => props.c,
      (a, b, c) => {
        called++
        return a + b + c
      }
    )
    expect(selector({ a: 1, b: 2 }, { c: 100 })).toBe(103)
  })
  test('recomputes result after exception', () => {
    let called = 0
    const selector = createSelector(
      (state: StateA) => state.a,
      () => {
        called++
        throw Error('test error')
      }
    )
    expect(() => selector({ a: 1 })).toThrow('test error')
    expect(() => selector({ a: 1 })).toThrow('test error')
    expect(called).toBe(2)
  })
  test('memoizes previous result before exception', () => {
    let called = 0
    const selector = createSelector(
      (state: StateA) => state.a,
      a => {
        called++
        if (a > 1) throw Error('test error')
        return a
      }
    )
    const state1 = { a: 1 }
    const state2 = { a: 2 }
    expect(selector(state1)).toBe(1)
    expect(() => selector(state2)).toThrow('test error')
    expect(selector(state1)).toBe(1)
    expect(called).toBe(2)
  })
  test('chained selector', () => {
    const selector1 = createSelector(
      (state: StateSub) => state.sub,
      sub => sub
    )
    const selector2 = createSelector(selector1, sub => sub.a)
    const state1 = { sub: { a: 1 } }
    expect(selector2(state1)).toBe(1)
    expect(selector2(state1)).toBe(1)
    expect(selector2.recomputations()).toBe(1)
    const state2 = { sub: { a: 2 } }
    expect(selector2(state2)).toBe(2)
    expect(selector2.recomputations()).toBe(2)
  })
  test('chained selector with props', () => {
    const selector1 = createSelector(
      (state: StateSub) => state.sub,
      (state: StateSub, props: { x: number; y: number }) => props.x,
      (sub, x) => ({ sub, x })
    )
    const selector2 = createSelector(
      selector1,
      (state: StateSub, props: { x: number; y: number }) => props.y,
      (param, y) => param.sub.a + param.x + y
    )
    const state1 = { sub: { a: 1 } }
    expect(selector2(state1, { x: 100, y: 200 })).toBe(301)
    expect(selector2(state1, { x: 100, y: 200 })).toBe(301)
    expect(selector2.recomputations()).toBe(1)
    const state2 = { sub: { a: 2 } }
    expect(selector2(state2, { x: 100, y: 201 })).toBe(303)
    expect(selector2.recomputations()).toBe(2)
  })
  test('chained selector with variadic args', () => {
    const selector1 = createSelector(
      (state: StateSub) => state.sub,
      (state: StateSub, props: { x: number; y: number }, another: number) =>
        props.x + another,
      (sub, x) => ({ sub, x })
    )
    const selector2 = createSelector(
      selector1,
      (state: StateSub, props: { x: number; y: number }) => props.y,
      (param, y) => param.sub.a + param.x + y
    )
    const state1 = { sub: { a: 1 } }
    expect(selector2(state1, { x: 100, y: 200 }, 100)).toBe(401)
    expect(selector2(state1, { x: 100, y: 200 }, 100)).toBe(401)
    expect(selector2.recomputations()).toBe(1)
    const state2 = { sub: { a: 2 } }
    expect(selector2(state2, { x: 100, y: 201 }, 200)).toBe(503)
    expect(selector2.recomputations()).toBe(2)
  })
  test('override valueEquals', () => {
    // a rather absurd equals operation we can verify in tests
    const createOverridenSelector = createSelectorCreator(
      defaultMemoize,
      (a, b) => typeof a === typeof b
    )
    const selector = createOverridenSelector(
      (state: StateA) => state.a,
      a => a
    )
    expect(selector({ a: 1 })).toBe(1)
    expect(selector({ a: 2 })).toBe(1) // yes, really true
    expect(selector.recomputations()).toBe(1)
    // @ts-expect-error
    expect(selector({ a: 'A' })).toBe('A')
    expect(selector.recomputations()).toBe(2)
  })
  test('custom memoize', () => {
    const hashFn = (...args: any[]) =>
      args.reduce((acc, val) => acc + '-' + JSON.stringify(val))
    const customSelectorCreator = createSelectorCreator(lodashMemoize, hashFn)
    const selector = customSelectorCreator(
      (state: StateAB) => state.a,
      (state: StateAB) => state.b,
      (a, b) => a + b
    )
    expect(selector({ a: 1, b: 2 })).toBe(3)
    expect(selector({ a: 1, b: 2 })).toBe(3)
    expect(selector.recomputations()).toBe(1)
    expect(selector({ a: 1, b: 3 })).toBe(4)
    expect(selector.recomputations()).toBe(2)
    expect(selector({ a: 1, b: 3 })).toBe(4)
    expect(selector.recomputations()).toBe(2)
    expect(selector({ a: 2, b: 3 })).toBe(5)
    expect(selector.recomputations()).toBe(3)
    // TODO: Check correct memoize function was called

    const customMemoize = (
      f: (...args: any[]) => any,
      a: string,
      b: number,
      c: boolean
    ) => {
      return f
    }

    const customSelectorCreator2 = createSelectorCreator(
      customMemoize,
      'a',
      42,
      true
    )

    // @ts-expect-error
    const customSelectorCreator3 = createSelectorCreator(
      customMemoize,
      'a',
      true
    )

    const customSelectorCreator4 = createSelectorCreator(microMemoize, {})

    const customSelectorCreator5 = createSelectorCreator(memoizeOne)
  })
  test('exported memoize', () => {
    let called = 0
    const memoized = defaultMemoize(state => {
      called++
      return state.a
    })

    const o1 = { a: 1 }
    const o2 = { a: 2 }
    expect(memoized(o1)).toBe(1)
    expect(memoized(o1)).toBe(1)
    expect(called).toBe(1)
    expect(memoized(o2)).toBe(2)
    expect(called).toBe(2)
  })
  test('exported memoize with multiple arguments', () => {
    const memoized = defaultMemoize((...args) =>
      args.reduce((sum, value) => sum + value, 0)
    )
    expect(memoized(1, 2)).toBe(3)
    expect(memoized(1)).toBe(1)
  })
  test('exported memoize with valueEquals override', () => {
    // a rather absurd equals operation we can verify in tests
    let called = 0
    const valueEquals = (a: any, b: any) => typeof a === typeof b
    const memoized = defaultMemoize(a => {
      called++
      return a
    }, valueEquals)
    expect(memoized(1)).toBe(1)
    expect(memoized(2)).toBe(1) // yes, really true
    expect(called).toBe(1)
    expect(memoized('A')).toBe('A')
    expect(called).toBe(2)
  })
  test('exported memoize passes correct objects to equalityCheck', () => {
    let fallthroughs = 0
    function shallowEqual(newVal: any, oldVal: any) {
      if (newVal === oldVal) return true

      fallthroughs += 1 // code below is expensive and should be bypassed when possible

      let countA = 0
      let countB = 0
      for (let key in newVal) {
        if (
          Object.hasOwnProperty.call(newVal, key) &&
          newVal[key] !== oldVal[key]
        )
          return false
        countA++
      }
      for (let key in oldVal) {
        if (Object.hasOwnProperty.call(oldVal, key)) countB++
      }
      return countA === countB
    }

    const someObject = { foo: 'bar' }
    const anotherObject = { foo: 'bar' }
    const memoized = defaultMemoize(a => a, shallowEqual)

    // the first call to `memoized` doesn't hit because `defaultMemoize.lastArgs` is uninitialized
    // and so `equalityCheck` is never called
    memoized(someObject)
    // first call does not shallow compare
    expect(fallthroughs).toBe(0)

    // the next call, with a different object reference, does fall through
    memoized(anotherObject)

    // call with different object does shallow compare
    expect(fallthroughs).toBe(1)

    // the third call does not fall through because `defaultMemoize` passes `anotherObject` as
    // both the `newVal` and `oldVal` params. This allows `shallowEqual` to be much more performant
    // than if it had passed `someObject` as `oldVal`, even though `someObject` and `anotherObject`
    // are shallowly equal
    memoized(anotherObject)
    // call with same object as previous call does not shallow compare
    expect(fallthroughs).toBe(1)
  })
  test('structured selector', () => {
    const selector = createStructuredSelector({
      x: (state: StateAB) => state.a,
      y: (state: StateAB) => state.b
    })
    const firstResult = selector({ a: 1, b: 2 })
    expect(firstResult).toEqual({ x: 1, y: 2 })
    expect(selector({ a: 1, b: 2 })).toBe(firstResult)
    const secondResult = selector({ a: 2, b: 2 })
    expect(secondResult).toEqual({ x: 2, y: 2 })
    expect(selector({ a: 2, b: 2 })).toBe(secondResult)
  })
  test('structured selector with invalid arguments', () => {
    expect(() =>
      // @ts-expect-error
      createStructuredSelector(
        (state: StateAB) => state.a,
        (state: StateAB) => state.b
      )
    ).toThrow(/expects first argument to be an object.*function/)
    expect(() =>
      createStructuredSelector({
        a: state => state.b,
        // @ts-expect-error
        c: 'd'
      })
    ).toThrow(/input-selectors to be functions.*function, string/)
  })
  test('structured selector with custom selector creator', () => {
    const customSelectorCreator = createSelectorCreator(
      defaultMemoize,
      (a, b) => a === b
    )
    const selector = createStructuredSelector(
      {
        x: (state: StateAB) => state.a,
        y: (state: StateAB) => state.b
      },
      customSelectorCreator
    )
    const firstResult = selector({ a: 1, b: 2 })
    expect(firstResult).toEqual({ x: 1, y: 2 })
    expect(selector({ a: 1, b: 2 })).toBe(firstResult)
    expect(selector({ a: 2, b: 2 })).toEqual({ x: 2, y: 2 })
  })
  test('resetRecomputations', () => {
    const selector = createSelector(
      (state: StateA) => state.a,
      a => a
    )
    expect(selector({ a: 1 })).toBe(1)
    expect(selector({ a: 1 })).toBe(1)
    expect(selector.recomputations()).toBe(1)
    expect(selector({ a: 2 })).toBe(2)
    expect(selector.recomputations()).toBe(2)

    selector.resetRecomputations()
    expect(selector.recomputations()).toBe(0)

    expect(selector({ a: 1 })).toBe(1)
    expect(selector({ a: 1 })).toBe(1)
    expect(selector.recomputations()).toBe(1)
    expect(selector({ a: 2 })).toBe(2)
    expect(selector.recomputations()).toBe(2)
  })
  test('export last function as resultFunc', () => {
    const lastFunction = () => {}
    const selector = createSelector((state: StateA) => state.a, lastFunction)
    expect(selector.resultFunc).toBe(lastFunction)
  })
  test('export dependencies as dependencies', () => {
    const dependency1 = (state: StateA) => {
      state.a
    }
    const dependency2 = (state: StateA) => {
      state.a
    }

    const selector = createSelector(dependency1, dependency2, () => {})
    expect(selector.dependencies).toEqual([dependency1, dependency2])
  })
})
