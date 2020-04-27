import {Microbatcher} from './microbatcher';

describe('Microbatcher', () => {
  test('Batching', async () => {
    const run = jest.fn(async (invocations) => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      for (const invocation of invocations) {
        if (invocation.operation === 'increment') {
          invocation.resolve(invocation.params[0] + 1);
        } else {
          throw new Error('Invalid operation');
        }
      }
    });

    const batcher = new Microbatcher(run);

    const increment = jest.fn(async (number) => {
      return await batcher.batch('increment', number);
    });

    const promise1 = increment(1);
    await Promise.resolve(); // Simulate an intermediate microtask
    const promise2 = increment(5);

    const results = await Promise.all([promise1, promise2]);

    expect(results).toEqual([2, 6]);
    expect(increment).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
