import {plainToInstance, instanceToPlain} from './functions';

export class Transformable {
  static fromPlain<TargetClass extends typeof Transformable>(
    this: TargetClass,
    sourceObject: Object,
    sourceContext?: string
  ) {
    return plainToInstance(sourceObject, this, sourceContext);
  }

  toPlain(targetContext?: string) {
    return instanceToPlain(this, targetContext);
  }

  toJSON(targetContext?: string) {
    return instanceToPlain(this, targetContext);
  }
}
