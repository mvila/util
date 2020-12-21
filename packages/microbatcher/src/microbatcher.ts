export class Microbatcher<OperationType extends Operation = Operation> {
  _runner: Runner<OperationType>;
  _operations: OperationType[];

  constructor(runner: Runner<OperationType>) {
    this._runner = runner;
    this._operations = [];
  }

  batch(...params: OperationType['params']) {
    return new Promise<Parameters<OperationType['resolve']>[0]>(
      (resolve: OperationType['resolve'], reject: OperationType['reject']) => {
        if (this._operations.length === 0) {
          setTimeout(() => {
            const operations = this._operations;
            this._operations = [];
            this._runner(operations);
          }, 0);
        }

        this._operations.push({params, resolve, reject} as OperationType);
      }
    );
  }
}

export type Runner<OperationType extends Operation = Operation> = (
  operations: OperationType[]
) => void;

export interface Operation {
  params: any;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}
