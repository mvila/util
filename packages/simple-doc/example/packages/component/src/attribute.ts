import {hasOwnProperty} from 'core-helpers';
import {
  Observable,
  createObservable,
  isObservable,
  canBeObserved,
  isEmbeddable,
  ObserverPayload
} from '@liaison/observable';

import type {
  Component,
  TraverseAttributesIteratee,
  TraverseAttributesOptions,
  ResolveAttributeSelectorOptions
} from '../component';
import {Property, PropertyOptions, IntrospectedProperty, UnintrospectedProperty} from './property';
import {
  ValueType,
  IntrospectedValueType,
  UnintrospectedValueType,
  createValueType,
  unintrospectValueType
} from './value-types';
import {fork} from '../forking';
import {AttributeSelector} from './attribute-selector';
import type {Validator, ValidatorFunction} from '../validation';
import {SerializeOptions} from '../serialization';
import {isComponentClass, isComponentInstance, ensureComponentClass} from '../utilities';

export type AttributeOptions = PropertyOptions & {
  valueType?: string;
  value?: unknown;
  default?: unknown;
  validators?: (Validator | ValidatorFunction)[];
  items?: AttributeItemsOptions;
  getter?: (this: any) => unknown;
  setter?: (this: any, value: any) => void;
};

type AttributeItemsOptions = {
  validators?: (Validator | ValidatorFunction)[];
  items?: AttributeItemsOptions;
};

export type IntrospectedAttribute = IntrospectedProperty & {
  value?: unknown;
  default?: unknown;
} & IntrospectedValueType;

export type UnintrospectedAttribute = UnintrospectedProperty & {
  options: {
    value?: unknown;
    default?: unknown;
  } & UnintrospectedValueType;
};

/**
 * *Inherits from [`Property`](https://liaison.dev/docs/v1/reference/property) and [`Observable`](https://liaison.dev/docs/v1/reference/observable).*
 *
 * An `Attribute` represents an attribute of a [Component](https://liaison.dev/docs/v1/reference/component) class, prototype, or instance. It plays the role of a regular JavaScript object attribute, but brings some extra features such as type checking at runtime, validation, or serialization.
 *
 * Typically, you create an attribute and associate it to a component using the [`@attribute()`](https://liaison.dev/docs/v1/reference/component#attribute-decorator) decorator.
 *
 * For example, here is how you would define a `Movie` class with some attributes:
 *
 * ```
 * // JS
 *
 * import {Component, attribute, validators} from '﹫liaison/component';
 *
 * const {minLength} = validators;
 *
 * class Movie extends Component {
 *   // Class optional 'string' attribute
 *   ﹫attribute('string?') static customName;
 *
 *   // Instance required 'string' attribute
 *   ﹫attribute('string') title;
 *
 *   // Instance optional 'string' attribute with a validator
 *   ﹫attribute('string?', {validators: [minLength(16)]}) summary;
 * }
 * ```
 *
 * ```
 * // TS
 *
 * import {Component, attribute, validators} from '﹫liaison/component';
 *
 * const {minLength} = validators;
 *
 * class Movie extends Component {
 *   // Class optional 'string' attribute
 *   ﹫attribute('string?') static customName?: string;
 *
 *   // Instance required 'string' attribute
 *   ﹫attribute('string') title!: string;
 *
 *   // Instance optional 'string' attribute with a validator
 *   ﹫attribute('string?', {validators: [minLength(16)]}) summary?: string;
 * }
 * ```
 *
 * Then you can access the attributes like you would normally do with regular JavaScript objects:
 *
 * ```
 * Movie.customName = 'Film';
 * Movie.customName; // => 'Film'
 *
 * const movie = new Movie({title: 'Inception'});
 * movie.title; // => 'Inception'
 * movie.title = 'Inception 2';
 * movie.title; // => 'Inception 2'
 * ```
 *
 * And you can take profit of some extra features:
 *
 * ```
 * // Type checking at runtime
 * movie.title = 123; // Error
 * movie.title = undefined; // Error
 *
 * // Validation
 * movie.summary; // undefined
 * movie.isValid(); // => true (movie.summary is optional)
 * movie.summary = 'A nice movie.';
 * movie.isValid(); // => false (movie.summary is too short)
 * movie.summary = 'An awesome movie.'
 * movie.isValid(); // => true
 *
 * // Serialization
 * movie.serialize();
 * // => {__component: 'Movie', title: 'Inception 2', summary: 'An awesome movie.'}
 * ```
 */
export class Attribute extends Observable(Property) {
  /**
   * Creates an instance of [`Attribute`](https://liaison.dev/docs/v1/reference/attribute). Typically, instead of using this constructor, you would rather use the [`@attribute()`](https://liaison.dev/docs/v1/reference/component#attribute-decorator) decorator.
   *
   * @param name The name of the attribute.
   * @param parent The component class, prototype, or instance that owns the attribute.
   * @param [options.valueType] A string specifying the [type of values](https://liaison.dev/docs/v1/reference/attribute#value-type) the attribute can store.
   * @param [options.value] The initial value of a class attribute.
   * @param [options.defaultValue] The default value (or a function returning the default value) of an instance attribute.
   * @param [options.validators] An array of [validators](https://liaison.dev/docs/v1/reference/validation) for the value of the attribute.
   * @param [options.items.validators] An array of [validators](https://liaison.dev/docs/v1/reference/validation) for the items of an array attribute.
   * @param [options.getter] A getter function for getting the value of the attribute. Plays the same role as a regular [JavaScript getter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get).
   * @param [options.setter] A setter function for setting the value of the attribute. Plays the same role as a regular [JavaScript setter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set).
   * @param [options.exposure] A [`PropertyExposure`](https://liaison.dev/docs/v1/reference/property#property-exposure-type) object specifying how the attribute should be exposed to remote access.
   *
   * @returns The [`Attribute`](https://liaison.dev/docs/v1/reference/attribute) instance that was created.
   *
   * @example
   * ```
   * import {Component, Attribute} from '﹫liaison/component';
   *
   * class Movie extends Component {}
   *
   * const titleAttribute = new Attribute('title', Movie.prototype, {valueType: 'string'});
   *
   * titleAttribute.getName(); // => 'title'
   * titleAttribute.getParent(); // => Movie.prototype
   * titleAttribute.getValueType().toString(); // => 'string'
   * ```
   *
   * @category Creation
   */
  constructor(name: string, parent: typeof Component | Component, options: AttributeOptions = {}) {
    super(name, parent, options);
  }

  _initialize() {
    this.addObserver(this._onChange.bind(this));
  }

  // === Options ===

  _getter?: () => unknown;
  _setter?: (value: any) => void;

  setOptions(options: AttributeOptions = {}) {
    const {
      valueType,
      value: initialValue,
      default: defaultValue,
      validators,
      items,
      getter,
      setter,
      ...otherOptions
    } = options;

    const hasInitialValue = 'value' in options;
    const hasDefaultValue = 'default' in options;

    super.setOptions(otherOptions);

    this._valueType = createValueType(valueType, this, {validators, items});

    if (getter !== undefined || setter !== undefined) {
      if (initialValue !== undefined) {
        throw new Error(
          `An attribute cannot have both a getter or setter and an initial value (${this.describe()})`
        );
      }

      if (defaultValue !== undefined) {
        throw new Error(
          `An attribute cannot have both a getter or setter and a default value (${this.describe()})`
        );
      }

      if (getter !== undefined) {
        this._getter = getter;
      }

      if (setter !== undefined) {
        if (getter === undefined) {
          throw new Error(
            `An attribute cannot have a setter without a getter (${this.describe()})`
          );
        }
        this._setter = setter;
      }

      this._isSet = true;

      return;
    }

    if (hasInitialValue) {
      this.setValue(initialValue);
    }

    if (hasDefaultValue) {
      this._default = defaultValue;
    }
  }

  // === Value type ===

  _valueType!: ValueType;

  getValueType() {
    return this._valueType;
  }

  // === Value ===

  _value?: unknown;
  _isSet?: boolean;

  getValue(options: {throwIfUnset?: boolean; autoFork?: boolean} = {}) {
    const {throwIfUnset = true, autoFork = true} = options;

    if (!this.isSet()) {
      if (throwIfUnset) {
        throw new Error(`Cannot get the value of an unset attribute (${this.describe()})`);
      }
      return undefined;
    }

    if (this._getter !== undefined) {
      return this._getter.call(this.getParent());
    }

    if (autoFork && !hasOwnProperty(this, '_value')) {
      const parent = this.getParent();
      const value = this._value;
      const componentClass = isComponentInstance(value)
        ? ensureComponentClass(parent).getComponent(value.constructor.getComponentName())
        : undefined;

      let forkedValue = fork(value, {componentClass});

      if (canBeObserved(forkedValue)) {
        if (!isObservable(forkedValue)) {
          forkedValue = createObservable(forkedValue);
        }

        if (isEmbeddable(forkedValue)) {
          forkedValue.addObserver(this);
        }
      }

      this._value = forkedValue;
    }

    return this._value;
  }

  _ignoreNextSetValueCall?: boolean;

  setValue(value: unknown, {source = 0} = {}) {
    if (hasOwnProperty(this, '_ignoreNextSetValueCall')) {
      delete this._ignoreNextSetValueCall;
      return {previousValue: undefined, newValue: undefined};
    }

    if (this.isControlled() && source !== 1) {
      throw new Error(
        `Cannot set the value of a controlled attribute when the source is not 1 (${this.describe()}, source: ${source})`
      );
    }

    this.checkValue(value);

    if (this._setter !== undefined) {
      this._setter.call(this.getParent(), value);
      return {previousValue: undefined, newValue: undefined};
    }

    if (this._getter !== undefined) {
      throw new Error(
        `Cannot set the value of an attribute that has a getter but no setter (${this.describe()})`
      );
    }

    if (canBeObserved(value) && !isObservable(value)) {
      value = createObservable(value);
    }

    const previousValue = this.getValue({throwIfUnset: false});
    this._value = value;
    this._isSet = true;

    const valueHasChanged = (value as any)?.valueOf() !== (previousValue as any)?.valueOf();

    if (valueHasChanged) {
      if (isObservable(previousValue) && isEmbeddable(previousValue)) {
        previousValue.removeObserver(this);
      }

      if (isObservable(value) && isEmbeddable(value)) {
        value.addObserver(this);
      }
    }

    if (valueHasChanged || source !== this._source) {
      this.callObservers({source});
    }

    return {previousValue, newValue: value};
  }

  unsetValue() {
    if (this._getter !== undefined) {
      throw new Error(
        `Cannot unset the value of an attribute that has a getter (${this.describe()})`
      );
    }

    if (this._isSet !== true) {
      return {previousValue: undefined};
    }

    const previousValue = this.getValue({throwIfUnset: false});
    this._value = undefined;
    this._isSet = false;

    if (isObservable(previousValue) && isEmbeddable(previousValue)) {
      previousValue.removeObserver(this);
    }

    this.callObservers({source: 0});

    return {previousValue};
  }

  isSet() {
    return this._isSet === true;
  }

  checkValue(value: unknown) {
    return this.getValueType().checkValue(value, this);
  }

  // === Value source ===

  _source = 0;

  getValueSource() {
    return this._source;
  }

  setValueSource(source: number) {
    if (source !== this._source) {
      this._source = source;
      this.callObservers({source});
    }
  }

  // === Default value ===

  _default?: unknown;

  getDefault() {
    return this._default;
  }

  evaluateDefault() {
    let value = this._default;

    if (typeof value === 'function' && !isComponentClass(value)) {
      value = value.call(this.getParent());
    }

    return value;
  }

  _isDefaultSetInConstructor?: boolean;

  _fixDecoration() {
    if (this._isDefaultSetInConstructor) {
      this._ignoreNextSetValueCall = true;
    }
  }

  // === 'isControlled' mark

  _isControlled?: boolean;

  isControlled() {
    return this._isControlled === true;
  }

  markAsControlled() {
    Object.defineProperty(this, '_isControlled', {value: true});
  }

  // === Observers ===

  _onChange(payload: ObserverPayload & {source?: number}) {
    const {source = 0} = payload;

    if (source !== this._source) {
      this._source = source;
    }

    this.getParent().callObservers(payload);
  }

  // === Attribute traversal ===

  _traverseAttributes(iteratee: TraverseAttributesIteratee, options: TraverseAttributesOptions) {
    const {setAttributesOnly} = options;

    const value = setAttributesOnly ? this.getValue() : undefined;

    this.getValueType()._traverseAttributes(iteratee, this, value, options);
  }

  // === Attribute selectors ===

  _resolveAttributeSelector(
    normalizedAttributeSelector: AttributeSelector,
    options: ResolveAttributeSelectorOptions
  ) {
    const {setAttributesOnly} = options;

    const value = setAttributesOnly ? this.getValue() : undefined;

    return this.getValueType()._resolveAttributeSelector(
      normalizedAttributeSelector,
      this,
      value,
      options
    );
  }

  // === Serialization ===

  serialize(options: SerializeOptions = {}): unknown {
    if (!this.isSet()) {
      throw new Error(`Cannot serialize an unset attribute (${this.describe()})`);
    }

    return this.getValueType().serializeValue(this.getValue(), this, options);
  }

  // === Validation ===

  validate(attributeSelector: AttributeSelector = true) {
    const failedValidators = this.runValidators(attributeSelector);

    if (failedValidators.length === 0) {
      return;
    }

    const details = failedValidators
      .map(({validator, path}) => `${validator.getMessage()} (path: '${path}')`)
      .join(', ');

    const error = Object.assign(
      new Error(
        `The following error(s) occurred while validating the attribute '${this.getName()}': ${details}`
      ),
      {failedValidators}
    );

    throw error;
  }

  isValid(attributeSelector: AttributeSelector = true) {
    const failedValidators = this.runValidators(attributeSelector);

    return failedValidators.length === 0;
  }

  runValidators(attributeSelector: AttributeSelector = true) {
    if (!this.isSet()) {
      throw new Error(`Cannot run the validators of an unset attribute (${this.describe()})`);
    }

    const failedValidators = this.getValueType().runValidators(this.getValue(), attributeSelector);

    return failedValidators;
  }

  // === Introspection ===

  introspect() {
    const introspectedAttribute = super.introspect() as IntrospectedAttribute;

    if (introspectedAttribute === undefined) {
      return undefined;
    }

    const exposure = this.getExposure();
    const getIsExposed = exposure !== undefined ? hasOwnProperty(exposure, 'get') : false;
    const setIsExposed = exposure !== undefined ? hasOwnProperty(exposure, 'set') : false;

    if (getIsExposed && this.isSet()) {
      introspectedAttribute.value = this.getValue();
    }

    if (setIsExposed) {
      const defaultValue = this.getDefault();

      if (defaultValue !== undefined) {
        introspectedAttribute.default = defaultValue;
      }
    }

    Object.assign(introspectedAttribute, this.getValueType().introspect());

    return introspectedAttribute;
  }

  static unintrospect(introspectedAttribute: IntrospectedAttribute) {
    const {
      value: initialValue,
      default: defaultValue,
      valueType,
      validators,
      items,
      ...introspectedProperty
    } = introspectedAttribute;

    const hasInitialValue = 'value' in introspectedAttribute;
    const hasDefaultValue = 'default' in introspectedAttribute;

    const {name, options} = super.unintrospect(introspectedProperty) as UnintrospectedAttribute;

    if (hasInitialValue) {
      options.value = initialValue;
    }

    if (hasDefaultValue) {
      options.default = defaultValue;
    }

    Object.assign(options, unintrospectValueType({valueType, validators, items}));

    return {name, options};
  }

  // === Utilities ===

  static isAttribute(value: any): value is Attribute {
    return isAttributeInstance(value);
  }

  describeType() {
    return 'attribute';
  }
}

export function isAttributeClass(value: any): value is typeof Attribute {
  return typeof value?.isAttribute === 'function';
}

export function isAttributeInstance(value: any): value is Attribute {
  return isAttributeClass(value?.constructor) === true;
}
