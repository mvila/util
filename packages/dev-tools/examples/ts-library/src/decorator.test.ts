describe('Decorator', () => {
  function decorate(_target: any, _name: string, descriptor?: any) {
    expect(typeof descriptor).toBe('undefined');
  }

  test('@decorate', () => {
    // @ts-ignore
    class Test {
      @decorate static attribute: string;
    }
  });
});
