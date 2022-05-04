import {plainToInstance, instanceToPlain} from './functions';

export class Transformable {
  static fromPlain<TargetClass extends typeof Transformable>(
    this: TargetClass,
    sourceObject: Object
  ) {
    return plainToInstance(sourceObject, this);
  }

  toPlain() {
    return instanceToPlain(this);
  }

  toJSON() {
    return instanceToPlain(this);
  }
}
