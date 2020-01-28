export class Microbatcher {
  constructor(runner) {
    this._runner = runner;
    this._invocations = [];
  }

  batch(operation, ...params) {
    return new Promise((resolve, reject) => {
      if (this._invocations.length === 0) {
        setTimeout(() => {
          const invocations = this._invocations;
          this._invocations = [];
          this._runner(invocations);
        }, 0);
      }

      this._invocations.push({operation, params, resolve, reject});
    });
  }
}
