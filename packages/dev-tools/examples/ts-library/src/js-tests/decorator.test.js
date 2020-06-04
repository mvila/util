describe('Decorator', () => {
  function decorate(_target, _name, descriptor) {
    expect(typeof descriptor).toBe('object');
  }

  test('@decorate', () => {
    class Test {
      @decorate static attribute;
    }
  });
});
