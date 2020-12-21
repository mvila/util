import {Microbatcher, Operation} from './microbatcher';

interface TestOperation extends Operation {
  params: [number];
  resolve: (value: number) => void;
}

describe('Microbatcher', () => {
  test('Batching', async () => {
    const run = jest.fn(async (operations: TestOperation[]) => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      for (const operation of operations) {
        operation.resolve(operation.params[0] + 1);
      }
    });

    const batcher = new Microbatcher<TestOperation>(run);

    const increment = jest.fn(async (number) => {
      return await batcher.batch(number);
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
