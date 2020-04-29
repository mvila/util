export class Microbatcher {
  _runner: Runner;
  _invocations: Invocation[];

  constructor(runner: Runner) {
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

type Runner = (invocations: Invocation[]) => void;

type Invocation = {
  operation: string;
  params: any[];
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
};
