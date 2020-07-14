export class Microbatcher<InvocationType extends Invocation = Invocation> {
  _runner: Runner;
  _invocations: Invocation[];

  constructor(runner: Runner) {
    this._runner = runner;
    this._invocations = [];
  }

  batch(operation: InvocationType['operation'], ...params: InvocationType['params']) {
    return new Promise<Parameters<InvocationType['resolve']>[0]>(
      (resolve: InvocationType['resolve'], reject: InvocationType['reject']) => {
        if (this._invocations.length === 0) {
          setTimeout(() => {
            const invocations = this._invocations;
            this._invocations = [];
            this._runner(invocations);
          }, 0);
        }

        this._invocations.push({operation, params, resolve, reject});
      }
    );
  }
}

export type Runner = (invocations: Invocation[]) => void;

export interface Invocation {
  operation: any;
  params: any;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}
