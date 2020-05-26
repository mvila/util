export type PromiseLikeable<Value> = Value | PromiseLike<Value>;

export type PromiseLikeValue<Input> = Input extends PromiseLike<infer Value> ? Value : Input;

export type EnsurePromiseLike<Value> = Value extends PromiseLike<unknown>
  ? Value
  : PromiseLike<Value>;
