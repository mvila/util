export class Microbatcher {
  _runner: runner;
  _invocations: invocation[];

  constructor(runner: runner) {
    this._runner = runner;
    this._invocations = [];
  }

  batch(operation: string, ...params: any[]) {
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

type runner = (invocations: invocation[]) => void;

type invocation = {
  operation: string;
  params: any[];
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
};
