import {
  Component,
  isComponentClass,
  isComponentInstance,
  isComponentClassOrInstance,
  isComponentValueTypeInstance,
  Attribute,
  ValueType,
  isArrayValueTypeInstance,
  AttributeSelector,
  createAttributeSelectorFromNames,
  createAttributeSelectorFromAttributes,
  attributeSelectorsAreEqual,
  mergeAttributeSelectors,
  removeFromAttributeSelector,
  traverseAttributeSelector,
  trimAttributeSelector,
  normalizeAttributeSelector,
  IdentifierDescriptor,
  IdentifierValue,
  method,
  serialize
} from '@liaison/component';
import type {AbstractStore, Query, SortDescriptor} from '@liaison/abstract-store';
import {hasOwnProperty, isPrototypeOf, isPlainObject, getTypeOf, Constructor} from 'core-helpers';
import mapKeys from 'lodash/mapKeys';

import {
  StorableProperty,
  StorablePropertyOptions,
  isStorablePropertyInstance,
  StorableAttribute,
  StorableAttributeOptions,
  isStorableAttributeInstance,
  StorablePrimaryIdentifierAttribute,
  StorableSecondaryIdentifierAttribute,
  StorableAttributeHookName,
  StorableMethod,
  StorableMethodOptions,
  isStorableMethodInstance
} from './properties';
import {isStorableInstance, isStorableClassOrInstance, isStorable} from './utilities';

/**
 * The `Storable()` mixin allows to extend a [`Component`](https://liaison.dev/docs/v1/reference/component) class so it can be stored in a database.
 *
 * @mixin
 */
export function Storable<T extends Constructor<typeof Component>>(Base: T) {
  if (!isComponentClass(Base)) {
    throw new Error(
      `The Storable mixin should be applied on a component class (received type: '${getTypeOf(
        Base
      )}')`
    );
  }

  if (typeof (Base as any).isStorable === 'function') {
    return Base as T & typeof Storable;
  }

  class Storable extends Base {
    ['constructor']: typeof StorableComponent;

    // === Store registration ===

    static __store: AbstractStore | undefined;

    /**
     * Returns the store in which the component is registered. If the component is not registered in a store, an error is thrown.
     *
     * @returns A [`Store`](https://liaison.dev/docs/v1/reference/store) instance.
     *
     * @example
     * ```
     * Movie.getStore(); // => store
     * ```
     *
     * @category Store Registration
     */
    static getStore() {
      const store = this.__store;

      if (store === undefined) {
        throw new Error(
          `Cannot get the store of a storable component that is not registered (${this.describeComponent()})`
        );
      }

      return store;
    }

    static hasStore() {
      return this.__store !== undefined;
    }

    static __setStore(store: AbstractStore) {
      Object.defineProperty(this, '__store', {value: store});
    }

    // === Storable properties ===

    static getPropertyClass(type: string) {
      if (type === 'StorableAttribute') {
        return StorableAttribute;
      }

      if (type === 'StorablePrimaryIdentifierAttribute') {
        return StorablePrimaryIdentifierAttribute;
      }

      if (type === 'StorableSecondaryIdentifierAttribute') {
        return StorableSecondaryIdentifierAttribute;
      }

      if (type === 'StorableMethod') {
        return StorableMethod;
      }

      return super.getPropertyClass(type);
    }

    static get getStorableProperty() {
      return this.prototype.getStorableProperty;
    }

    getStorableProperty(name: string, options: {autoFork?: boolean} = {}) {
      const {autoFork = true} = options;

      const property = this.__getStorableProperty(name, {autoFork});

      if (property === undefined) {
        throw new Error(`The storable property '${name}' is missing (${this.describeComponent()})`);
      }

      return property;
    }

    static get hasStorableProperty() {
      return this.prototype.hasStorableProperty;
    }

    hasStorableProperty(name: string) {
      return this.__getStorableProperty(name, {autoFork: false}) !== undefined;
    }

    static get __getStorableProperty() {
      return this.prototype.__getStorableProperty;
    }

    __getStorableProperty(name: string, options: {autoFork: boolean}) {
      const {autoFork} = options;

      const property = this.__getProperty(name, {autoFork});

      if (property === undefined) {
        return undefined;
      }

      if (!isStorablePropertyInstance(property)) {
        throw new Error(
          `A property with the specified name was found, but it is not a storable property (${property.describe()})`
        );
      }

      return property;
    }

    static get setStorableProperty() {
      return this.prototype.setStorableProperty;
    }

    setStorableProperty(name: string, propertyOptions: StorablePropertyOptions = {}) {
      return this.setProperty(name, StorableProperty, propertyOptions);
    }

    getStorablePropertiesWithFinder() {
      return this.getProperties<StorableProperty>({
        filter: (property) => isStorablePropertyInstance(property) && property.hasFinder()
      });
    }

    // === Storable attributes ===

    static get getStorableAttribute() {
      return this.prototype.getStorableAttribute;
    }

    getStorableAttribute(name: string, options: {autoFork?: boolean} = {}) {
      const {autoFork = true} = options;

      const attribute = this.__getStorableAttribute(name, {autoFork});

      if (attribute === undefined) {
        throw new Error(
          `The storable attribute '${name}' is missing (${this.describeComponent()})`
        );
      }

      return attribute;
    }

    static get hasStorableAttribute() {
      return this.prototype.hasStorableAttribute;
    }

    hasStorableAttribute(name: string) {
      return this.__getStorableAttribute(name, {autoFork: false}) !== undefined;
    }

    static get __getStorableAttribute() {
      return this.prototype.__getStorableAttribute;
    }

    __getStorableAttribute(name: string, options: {autoFork: boolean}) {
      const {autoFork} = options;

      const property = this.__getProperty(name, {autoFork});

      if (property === undefined) {
        return undefined;
      }

      if (!isStorableAttributeInstance(property)) {
        throw new Error(
          `A property with the specified name was found, but it is not a storable attribute (${property.describe()})`
        );
      }

      return property;
    }

    static get setStorableAttribute() {
      return this.prototype.setStorableAttribute;
    }

    setStorableAttribute(name: string, attributeOptions: StorableAttributeOptions = {}) {
      return this.setProperty(name, StorableAttribute, attributeOptions);
    }

    getStorableAttributesWithLoader(
      options: {attributeSelector?: AttributeSelector; setAttributesOnly?: boolean} = {}
    ) {
      const {attributeSelector = true, setAttributesOnly = false} = options;

      return this.getAttributes<StorableAttribute>({
        filter: (attribute) => isStorableAttributeInstance(attribute) && attribute.hasLoader(),
        attributeSelector,
        setAttributesOnly
      });
    }

    getStorableComputedAttributes(
      options: {attributeSelector?: AttributeSelector; setAttributesOnly?: boolean} = {}
    ) {
      const {attributeSelector = true, setAttributesOnly = false} = options;

      return this.getAttributes<StorableAttribute>({
        filter: (attribute) => isStorableAttributeInstance(attribute) && attribute.isComputed(),
        attributeSelector,
        setAttributesOnly
      });
    }

    getStorableAttributesWithHook(
      name: StorableAttributeHookName,
      options: {attributeSelector?: AttributeSelector; setAttributesOnly?: boolean} = {}
    ) {
      const {attributeSelector = true, setAttributesOnly = false} = options;

      return this.getAttributes<StorableAttribute>({
        filter: (attribute) => isStorableAttributeInstance(attribute) && attribute.hasHook(name),
        attributeSelector,
        setAttributesOnly
      });
    }

    async __callStorableAttributeHooks(
      name: StorableAttributeHookName,
      {
        attributeSelector,
        setAttributesOnly
      }: {attributeSelector: AttributeSelector; setAttributesOnly?: boolean}
    ) {
      for (const attribute of this.getStorableAttributesWithHook(name, {
        attributeSelector,
        setAttributesOnly
      })) {
        await attribute.callHook(name);
      }
    }

    // === Storable methods ===

    static get getStorableMethod() {
      return this.prototype.getStorableMethod;
    }

    getStorableMethod(name: string, options: {autoFork?: boolean} = {}) {
      const {autoFork = true} = options;

      const method = this.__getStorableMethod(name, {autoFork});

      if (method === undefined) {
        throw new Error(`The storable method '${name}' is missing (${this.describeComponent()})`);
      }

      return method;
    }

    static get hasStorableMethod() {
      return this.prototype.hasStorableMethod;
    }

    hasStorableMethod(name: string) {
      return this.__getStorableMethod(name, {autoFork: false}) !== undefined;
    }

    static get __getStorableMethod() {
      return this.prototype.__getStorableMethod;
    }

    __getStorableMethod(name: string, options: {autoFork: boolean}) {
      const {autoFork} = options;

      const property = this.__getProperty(name, {autoFork});

      if (property === undefined) {
        return undefined;
      }

      if (!isStorableMethodInstance(property)) {
        throw new Error(
          `A property with the specified name was found, but it is not a storable method (${property.describe()})`
        );
      }

      return property;
    }

    static get setStorableMethod() {
      return this.prototype.setStorableMethod;
    }

    setStorableMethod(name: string, methodOptions: StorableMethodOptions = {}) {
      return this.setProperty(name, StorableMethod, methodOptions);
    }

    // === Operations ===

    static async get<T extends typeof StorableComponent>(
      this: T,
      identifierDescriptor: IdentifierDescriptor,
      attributeSelector: AttributeSelector | undefined,
      options: {reload?: boolean; throwIfMissing: false; _callerMethodName?: string}
    ): Promise<InstanceType<T> | undefined>;
    static async get<T extends typeof StorableComponent>(
      this: T,
      identifierDescriptor: IdentifierDescriptor,
      attributeSelector?: AttributeSelector,
      options?: {reload?: boolean; throwIfMissing?: boolean; _callerMethodName?: string}
    ): Promise<InstanceType<T>>;
    @method() static async get<T extends typeof StorableComponent>(
      this: T,
      identifierDescriptor: IdentifierDescriptor,
      attributeSelector: AttributeSelector = true,
      options: {reload?: boolean; throwIfMissing?: boolean; _callerMethodName?: string} = {}
    ) {
      identifierDescriptor = this.normalizeIdentifierDescriptor(identifierDescriptor);
      attributeSelector = normalizeAttributeSelector(attributeSelector);

      const {reload = false, throwIfMissing = true, _callerMethodName} = options;

      let storable = this.getIdentityMap().getComponent(identifierDescriptor) as
        | InstanceType<T>
        | undefined;

      const hasPrimaryIdentifier =
        storable?.getPrimaryIdentifierAttribute().isSet() ||
        this.prototype.getPrimaryIdentifierAttribute().getName() in identifierDescriptor;

      if (!hasPrimaryIdentifier) {
        if (this.hasStore()) {
          // Nothing to do, the storable will be loaded by load()
        } else if (this.hasRemoteMethod('get')) {
          // Let's fetch the primary identifier
          storable = await this.callRemoteMethod(
            'get',
            identifierDescriptor,
            {},
            {
              reload,
              throwIfMissing
            }
          );

          if (storable === undefined) {
            return;
          }
        } else {
          throw new Error(
            `To be able to execute the get() method${describeCaller(
              _callerMethodName
            )} with a secondary identifier, a storable component should be registered in a store or have an exposed get() remote method (${this.describeComponent()})`
          );
        }
      }

      if (storable === undefined) {
        storable = (await this.create(identifierDescriptor, {
          isNew: false
        })) as InstanceType<T>;
      }

      return await storable.load(attributeSelector, {
        reload,
        throwIfMissing,
        _callerMethodName: _callerMethodName ?? 'get'
      });
    }

    static async has(identifierDescriptor: IdentifierDescriptor, options: {reload?: boolean} = {}) {
      const {reload = false} = options;

      const storable: StorableComponent | undefined = await this.get(
        identifierDescriptor,
        {},
        {reload, throwIfMissing: false, _callerMethodName: 'has'}
      );

      return storable !== undefined;
    }

    async load<T extends StorableComponent>(
      this: T,
      attributeSelector: AttributeSelector | undefined,
      options: {reload?: boolean; throwIfMissing: false; _callerMethodName?: string}
    ): Promise<T | undefined>;
    async load<T extends StorableComponent>(
      this: T,
      attributeSelector?: AttributeSelector,
      options?: {reload?: boolean; throwIfMissing?: boolean; _callerMethodName?: string}
    ): Promise<T>;
    @method() async load<T extends StorableComponent>(
      this: T,
      attributeSelector: AttributeSelector = true,
      options: {reload?: boolean; throwIfMissing?: boolean; _callerMethodName?: string} = {}
    ) {
      const {reload = false, throwIfMissing = true, _callerMethodName} = options;

      if (this.isNew()) {
        throw new Error(
          `Cannot load a storable component that is marked as new (${this.describeComponent()})`
        );
      }

      let resolvedAttributeSelector = this.resolveAttributeSelector(attributeSelector);

      if (!reload) {
        const alreadyLoadedAttributeSelector = this.resolveAttributeSelector(
          resolvedAttributeSelector,
          {
            filter: (attribute: Attribute) => attribute.getValueSource() === 1,
            setAttributesOnly: true,
            aggregationMode: 'intersection'
          }
        );

        resolvedAttributeSelector = removeFromAttributeSelector(
          resolvedAttributeSelector,
          alreadyLoadedAttributeSelector
        );
      }

      const computedAttributes = this.getStorableComputedAttributes({
        attributeSelector: resolvedAttributeSelector
      });

      let nonComputedAttributeSelector = removeFromAttributeSelector(
        resolvedAttributeSelector,
        createAttributeSelectorFromAttributes(computedAttributes)
      );

      nonComputedAttributeSelector = trimAttributeSelector(nonComputedAttributeSelector);

      let loadedStorable: T | undefined;

      if (nonComputedAttributeSelector !== false) {
        await this.beforeLoad(nonComputedAttributeSelector);

        if ((this.constructor as typeof StorableComponent).hasStore()) {
          loadedStorable = await this.__loadFromStore(nonComputedAttributeSelector, {
            throwIfMissing
          });
        } else if (this.hasRemoteMethod('load')) {
          loadedStorable = await this.callRemoteMethod('load', nonComputedAttributeSelector, {
            reload,
            throwIfMissing
          });
        } else {
          throw new Error(
            `To be able to execute the load() method${describeCaller(
              _callerMethodName
            )}, a storable component should be registered in a store or have an exposed load() remote method (${this.describeComponent()})`
          );
        }

        if (loadedStorable === undefined) {
          return undefined;
        }

        await loadedStorable.afterLoad(nonComputedAttributeSelector);
      } else {
        loadedStorable = this; // OPTIMIZATION: There was nothing to load
      }

      for (const attribute of loadedStorable.getStorableAttributesWithLoader({
        attributeSelector: resolvedAttributeSelector
      })) {
        const value = await attribute.callLoader();
        attribute.setValue(value, {source: 1});
      }

      await loadedStorable.__populate(attributeSelector, {
        reload,
        throwIfMissing,
        _callerMethodName
      });

      return loadedStorable;
    }

    async __loadFromStore<T extends StorableComponent>(
      this: T,
      attributeSelector: AttributeSelector,
      {throwIfMissing}: {throwIfMissing: boolean}
    ) {
      const store = (this.constructor as typeof StorableComponent).getStore();

      const storableType = this.getComponentType();
      const identifierDescriptor = this.getIdentifierDescriptor();

      // Always include the identifier attribute
      const identifierAttributeSelector = createAttributeSelectorFromNames(
        Object.keys(identifierDescriptor)
      );
      attributeSelector = mergeAttributeSelectors(attributeSelector, identifierAttributeSelector);

      const serializedStorable = await store.load(
        {storableType, identifierDescriptor},
        {attributeSelector, throwIfMissing}
      );

      if (serializedStorable === undefined) {
        return undefined;
      }

      const loadedStorable = this.deserialize(serializedStorable, {source: 1}) as T;

      return loadedStorable;
    }

    async __populate(
      attributeSelector: AttributeSelector,
      {
        reload,
        throwIfMissing,
        _callerMethodName
      }: {reload: boolean; throwIfMissing: boolean; _callerMethodName: string | undefined}
    ) {
      const resolvedAttributeSelector = this.resolveAttributeSelector(attributeSelector, {
        includeReferencedComponents: true
      });

      const storablesWithAttributeSelectors = new Map<
        typeof StorableComponent | StorableComponent,
        AttributeSelector
      >();

      traverseAttributeSelector(
        this,
        resolvedAttributeSelector,
        (componentOrObject, subattributeSelector) => {
          if (isStorableClassOrInstance(componentOrObject)) {
            const storable = componentOrObject;

            if (!storablesWithAttributeSelectors.has(storable)) {
              storablesWithAttributeSelectors.set(storable, subattributeSelector);
            } else {
              const mergedAttributeSelector = mergeAttributeSelectors(
                storablesWithAttributeSelectors.get(storable)!,
                subattributeSelector
              );
              storablesWithAttributeSelectors.set(storable, mergedAttributeSelector);
            }
          }
        },
        {includeSubtrees: true, includeLeafs: false}
      );

      if (storablesWithAttributeSelectors.size > 0) {
        await Promise.all(
          Array.from(storablesWithAttributeSelectors).map(
            ([storable, attributeSelector]) =>
              isStorableInstance(storable)
                ? storable.load(attributeSelector, {reload, throwIfMissing, _callerMethodName})
                : undefined // TODO: Implement class loading
          )
        );
      }
    }

    async reload<T extends StorableComponent>(
      this: T,
      attributeSelector: AttributeSelector | undefined,
      options: {throwIfMissing: false}
    ): Promise<T | undefined>;
    async reload<T extends StorableComponent>(
      this: T,
      attributeSelector?: AttributeSelector,
      options?: {throwIfMissing?: boolean}
    ): Promise<T>;
    async reload(
      attributeSelector: AttributeSelector = true,
      options: {throwIfMissing?: boolean} = {}
    ) {
      const {throwIfMissing = true} = options;

      return await this.load(attributeSelector, {
        reload: true,
        throwIfMissing,
        _callerMethodName: 'reload'
      });
    }

    @method() async save<T extends StorableComponent>(
      this: T,
      attributeSelector: AttributeSelector = true,
      options: {throwIfMissing?: boolean; throwIfExists?: boolean} = {}
    ) {
      const isNew = this.isNew();

      const {throwIfMissing = !isNew, throwIfExists = isNew} = options;

      if (throwIfMissing === true && throwIfExists === true) {
        throw new Error(
          "The 'throwIfMissing' and 'throwIfExists' options cannot be both set to true"
        );
      }

      const computedAttributes = this.getStorableComputedAttributes();
      const computedAttributeSelector = createAttributeSelectorFromAttributes(computedAttributes);

      let resolvedAttributeSelector = this.resolveAttributeSelector(attributeSelector, {
        setAttributesOnly: true,
        target: 1,
        aggregationMode: 'intersection'
      });

      resolvedAttributeSelector = removeFromAttributeSelector(
        resolvedAttributeSelector,
        computedAttributeSelector
      );

      if (!isNew && Object.keys(resolvedAttributeSelector).length < 2) {
        return this; // OPTIMIZATION: There is nothing to save
      }

      await this.beforeSave(resolvedAttributeSelector);

      resolvedAttributeSelector = this.resolveAttributeSelector(attributeSelector, {
        setAttributesOnly: true,
        target: 1,
        aggregationMode: 'intersection'
      });

      resolvedAttributeSelector = removeFromAttributeSelector(
        resolvedAttributeSelector,
        computedAttributeSelector
      );

      if (!isNew && Object.keys(resolvedAttributeSelector).length < 2) {
        return this; // OPTIMIZATION: There is nothing to save
      }

      let savedStorable: T | undefined;

      if ((this.constructor as typeof StorableComponent).hasStore()) {
        savedStorable = await this.__saveToStore(resolvedAttributeSelector, {
          throwIfMissing,
          throwIfExists
        });
      } else if (this.hasRemoteMethod('save')) {
        savedStorable = await this.callRemoteMethod('save', attributeSelector, {
          throwIfMissing,
          throwIfExists
        });
      } else {
        throw new Error(
          `To be able to execute the save() method, a storable component should be registered in a store or have an exposed save() remote method (${this.describeComponent()})`
        );
      }

      if (savedStorable === undefined) {
        return undefined;
      }

      await this.afterSave(resolvedAttributeSelector);

      return savedStorable;
    }

    async __saveToStore(
      attributeSelector: AttributeSelector,
      {throwIfMissing, throwIfExists}: {throwIfMissing: boolean; throwIfExists: boolean}
    ) {
      this._assertArrayItemsAreFullyLoaded(attributeSelector);

      this.validate(attributeSelector);

      const store = (this.constructor as typeof StorableComponent).getStore();

      const storableType = this.getComponentType();
      const identifierDescriptor = this.getIdentifierDescriptor();
      const isNew = this.isNew();

      const serializedStorable = this.serialize({attributeSelector, includeIsNewMarks: false})!;

      const wasSaved = await store.save(
        {storableType, identifierDescriptor, serializedStorable, isNew},
        {throwIfMissing, throwIfExists}
      );

      if (!wasSaved) {
        return undefined;
      }

      if (isNew) {
        this.markAsNotNew(); // TODO: Mark also embedded components as not new
      }

      this.traverseAttributes(
        (attribute) => {
          attribute.setValueSource(1);
        },
        {attributeSelector, setAttributesOnly: true}
      );

      return this;
    }

    _assertArrayItemsAreFullyLoaded(attributeSelector: AttributeSelector) {
      traverseAttributeSelector(
        this,
        attributeSelector,
        (value, attributeSelector, {isArray}) => {
          if (isArray && isComponentInstance(value)) {
            const component = value;

            if (component.constructor.isEmbedded()) {
              if (
                !attributeSelectorsAreEqual(
                  component.resolveAttributeSelector(true),
                  attributeSelector
                )
              ) {
                throw new Error(
                  `Cannot save an array item that has some unset attributes (${component.describeComponent()})`
                );
              }
            }
          }
        },
        {includeSubtrees: true, includeLeafs: false}
      );
    }

    @method() async delete<T extends StorableComponent>(
      this: T,
      options: {throwIfMissing?: boolean} = {}
    ) {
      if (this.isNew()) {
        throw new Error(
          `Cannot delete a storable component that is new (${this.describeComponent()})`
        );
      }

      const {throwIfMissing = true} = options;

      const attributeSelector = this.resolveAttributeSelector(true);
      const computedAttributes = this.getStorableComputedAttributes({attributeSelector});
      const nonComputedAttributeSelector = removeFromAttributeSelector(
        attributeSelector,
        createAttributeSelectorFromAttributes(computedAttributes)
      );

      await this.beforeDelete(nonComputedAttributeSelector);

      let deletedStorable: T | undefined;

      if ((this.constructor as typeof StorableComponent).hasStore()) {
        deletedStorable = await this.__deleteFromStore({throwIfMissing});
      } else if (this.hasRemoteMethod('delete')) {
        deletedStorable = await this.callRemoteMethod('delete', {throwIfMissing});
      } else {
        throw new Error(
          `To be able to execute the delete() method, a storable component should be registered in a store or have an exposed delete() remote method (${this.describeComponent()})`
        );
      }

      if (deletedStorable === undefined) {
        return undefined;
      }

      await this.afterDelete(nonComputedAttributeSelector);

      // TODO: deletedStorable.detach();

      return deletedStorable;
    }

    async __deleteFromStore({throwIfMissing}: {throwIfMissing: boolean}) {
      const store = (this.constructor as typeof StorableComponent).getStore();

      const storableType = this.getComponentType();
      const identifierDescriptor = this.getIdentifierDescriptor();

      const wasDeleted = await store.delete({storableType, identifierDescriptor}, {throwIfMissing});

      if (!wasDeleted) {
        return undefined;
      }

      return this;
    }

    /**
     * Finds some storable component instances matching the specified query in the store, and load all or some of their attributes (and possibly, load some of their related components as well).
     *
     * > This method uses the [`load()`](https://liaison.dev/docs/v1/reference/storable#load-instance-method) method under the hood to load the components' attributes. So if you want to expose the [`find()`](https://liaison.dev/docs/v1/reference/storable#find-class-method) method to the frontend, you will typically have to expose the [`load()`](https://liaison.dev/docs/v1/reference/storable#load-instance-method) method as well.
     *
     * @param [query] A [`Query`](https://liaison.dev/docs/v1/reference/storable#query-type) object specifying the criteria to be used when selecting the components from the store (default: `{}`, which means that any component can be selected).
     * @param [attributeSelector] An [`AttributeSelector`](https://liaison.dev/docs/v1/reference/attribute-selector) specifying the attributes to be loaded (default: `true`, which means that all the attributes will be loaded).
     * @param [options.sort] A plain object specifying how the found components should be sorted (default: `undefined`). The shape of the object should be `{[name]: direction}` where `name` is the name of an attribute, and `direction` is the string `'asc'` or `'desc'` representing the sort direction (ascending or descending).
     * @param [options.skip] A number specifying how many components should be skipped from the found components (default: `0`).
     * @param [options.limit] A number specifying the maximum number of components that should be returned (default: `undefined`).
     * @param [options.reload] A boolean specifying whether a component that has already been loaded should be loaded again from the store (default: `false`). Most of the time you will leave this option off to take advantage of the cache.
     *
     * @returns An array of [`StorableComponent`](https://liaison.dev/docs/v1/reference/storable#storable-component-class) instances.
     *
     * @example
     * ```
     * // Find all the movies
     * await Movie.find();
     *
     * // Find the Japanese movies
     * await Movie.find({country: 'Japan'});
     *
     * // Find the Japanese drama movies
     * await Movie.find({country: 'Japan', genre: 'drama'});
     *
     * // Find the Tarantino's movies
     * const tarantino = await Director.get({slug: 'quentin-tarantino'})
     * await Movie.find({director: tarantino});
     *
     * // Find the movies released after 2010
     * await Movie.find({year: {$greaterThan: 2010}});
     *
     * // Find the top 30 movies
     * await Movie.find({}, true, {sort: {rating: 'desc'}, limit: 30});
     *
     * // Find the next top 30 movies
     * await Movie.find({}, true, {sort: {rating: 'desc'}, skip: 30, limit: 30});
     * ```
     *
     * @category Storage Operations
     */
    @method() static async find<T extends typeof StorableComponent>(
      this: T,
      query: Query = {},
      attributeSelector: AttributeSelector = true,
      options: {sort?: SortDescriptor; skip?: number; limit?: number; reload?: boolean} = {}
    ) {
      const {sort, skip, limit, reload = false} = options;

      query = await this.__callStorablePropertyFindersForQuery(query);
      query = this.__normalizeQuery(query, {loose: !this.hasStore()});

      let foundStorables: InstanceType<T>[];

      if (this.hasStore()) {
        foundStorables = await this.__findInStore(query, {sort, skip, limit});
      } else if (this.hasRemoteMethod('find')) {
        foundStorables = await this.callRemoteMethod('find', query, {}, {sort, skip, limit});
      } else {
        throw new Error(
          `To be able to execute the find() method, a storable component should be registered in a store or have an exposed find() remote method (${this.describeComponent()})`
        );
      }

      const loadedStorables = await Promise.all(
        foundStorables.map((foundStorable) =>
          foundStorable.load(attributeSelector, {reload, _callerMethodName: 'find'})
        )
      );

      return loadedStorables;
    }

    static async __findInStore<T extends typeof StorableComponent>(
      this: T,
      query: Query,
      {
        sort,
        skip,
        limit
      }: {sort?: SortDescriptor | undefined; skip?: number | undefined; limit?: number | undefined}
    ) {
      const store = this.getStore();

      const storableType = this.prototype.getComponentType();

      const serializedQuery = serialize(query);

      const primaryIdentifierAttribute = this.prototype.getPrimaryIdentifierAttribute();
      const attributeSelector = {[primaryIdentifierAttribute.getName()]: true};

      const serializedStorables = await store.find(
        {storableType, query: serializedQuery, sort, skip, limit},
        {attributeSelector}
      );

      const foundStorables = serializedStorables.map(
        (serializedStorable) => this.recreate(serializedStorable, {source: 1}) as InstanceType<T>
      );

      return foundStorables;
    }

    @method() static async count(query: Query = {}) {
      query = await this.__callStorablePropertyFindersForQuery(query);
      query = this.__normalizeQuery(query, {loose: !this.hasStore()});

      let storablesCount: number;

      if (this.hasStore()) {
        storablesCount = await this.__countInStore(query);
      } else if (this.hasRemoteMethod('count')) {
        storablesCount = await this.callRemoteMethod('count', query);
      } else {
        throw new Error(
          `To be able to execute the count() method, a storable component should be registered in a store or have an exposed count() remote method (${this.describeComponent()})`
        );
      }

      return storablesCount;
    }

    static async __countInStore(query: Query) {
      const store = this.getStore();

      const storableType = this.prototype.getComponentType();

      const serializedQuery = serialize(query);

      const storablesCount = await store.count({storableType, query: serializedQuery});

      return storablesCount;
    }

    static async __callStorablePropertyFindersForQuery(query: Query) {
      for (const property of this.prototype.getStorablePropertiesWithFinder()) {
        const name = property.getName();

        if (!hasOwnProperty(query, name)) {
          continue; // The property finder is not used in the query
        }

        const {[name]: value, ...remainingQuery} = query;

        const finderQuery = await property.callFinder(value);

        query = {...remainingQuery, ...finderQuery};
      }

      return query;
    }

    static __normalizeQuery(query: Query, {loose = false}: {loose?: boolean} = {}) {
      const normalizeQueryForComponent = function (
        query: Query | typeof Component | Component,
        component: typeof Component | Component
      ) {
        if (isComponentClassOrInstance(query)) {
          if (component === query || isPrototypeOf(component, query)) {
            return query.toObject({minimize: true});
          }

          throw new Error(
            `An unexpected component was specified in a query (${component.describeComponent({
              componentPrefix: 'expected'
            })}, ${query.describeComponent({componentPrefix: 'specified'})})`
          );
        }

        if (!isPlainObject(query)) {
          throw new Error(
            `Expected a plain object in a query, but received a value of type '${getTypeOf(query)}'`
          );
        }

        const normalizedQuery: Query = {};

        for (const [name, subquery] of Object.entries<Query>(query)) {
          if (name === '$not') {
            normalizedQuery[name] = normalizeQueryForComponent(subquery, component);
            continue;
          }

          if (name === '$and' || name === '$or' || name === '$nor') {
            if (!Array.isArray(subquery)) {
              throw new Error(
                `Expected an array as value of the operator '${name}', but received a value of type '${getTypeOf(
                  subquery
                )}'`
              );
            }

            const subqueries: Query[] = subquery;
            normalizedQuery[name] = subqueries.map((subquery) =>
              normalizeQueryForComponent(subquery, component)
            );
            continue;
          }

          if (name === '$in') {
            if (!Array.isArray(subquery)) {
              throw new Error(
                `Expected an array as value of the operator '${name}', but received a value of type '${getTypeOf(
                  subquery
                )}'`
              );
            }

            if (!isComponentInstance(component)) {
              throw new Error(
                `The operator '${name}' cannot be used in the context of a component class`
              );
            }

            const nestedComponents: Component[] = subquery;

            const primaryIdentifiers: IdentifierValue[] = nestedComponents.map(
              (nestedComponent) => {
                if (!isComponentInstance(nestedComponent)) {
                  throw new Error(
                    `Expected an array of component instances as value of the operator '${name}', but received a value of type '${getTypeOf(
                      nestedComponent
                    )}'`
                  );
                }

                if (!isPrototypeOf(component, nestedComponent)) {
                  throw new Error(
                    `An unexpected item was specified for the operator '${name}' (${component.describeComponent(
                      {
                        componentPrefix: 'expected'
                      }
                    )}, ${nestedComponent.describeComponent({componentPrefix: 'specified'})})`
                  );
                }

                return nestedComponent.getPrimaryIdentifierAttribute().getValue()!;
              }
            );

            const primaryIdentifierAttributeName = component
              .getPrimaryIdentifierAttribute()
              .getName();

            normalizedQuery[primaryIdentifierAttributeName] = {[name]: primaryIdentifiers};
            continue;
          }

          if (component.hasAttribute(name)) {
            const attribute = component.getAttribute(name);

            normalizedQuery[name] = normalizeQueryForAttribute(subquery, attribute);
          } else {
            if (!loose) {
              throw new Error(
                `An unknown attribute was specified in a query (${component.describeComponent()}, attribute: '${name}')`
              );
            }

            normalizedQuery[name] = subquery;
          }
        }

        return normalizedQuery;
      };

      const normalizeQueryForAttribute = function (query: Query, attribute: Attribute) {
        const type = attribute.getValueType();

        return normalizeQueryForAttributeAndType(query, attribute, type);
      };

      const normalizeQueryForAttributeAndType = function (
        query: Query,
        attribute: Attribute,
        type: ValueType
      ): Query {
        if (isComponentValueTypeInstance(type)) {
          const component = type.getComponent(attribute);

          const normalizedQuery = normalizeQueryForComponent(query, component);

          return normalizedQuery;
        }

        if (isArrayValueTypeInstance(type)) {
          const itemType = type.getItemType();

          let normalizedQuery = normalizeQueryForAttributeAndType(query, attribute, itemType);

          if (isPlainObject(normalizedQuery) && '$includes' in normalizedQuery) {
            // Make '$includes' an alias of '$some'
            normalizedQuery = mapKeys(normalizedQuery, (_value, key) =>
              key === '$includes' ? '$some' : key
            );
          }

          if (
            !(
              isPlainObject(normalizedQuery) &&
              ('$some' in normalizedQuery ||
                '$every' in normalizedQuery ||
                '$length' in normalizedQuery)
            )
          ) {
            // Make '$some' implicit
            normalizedQuery = {$some: normalizedQuery};
          }

          return normalizedQuery;
        }

        return query;
      };

      return normalizeQueryForComponent(query, this.prototype);
    }

    // === Hooks ===

    async beforeLoad(attributeSelector: AttributeSelector) {
      await this.__callStorableAttributeHooks('beforeLoad', {attributeSelector});
    }

    async afterLoad(attributeSelector: AttributeSelector) {
      await this.__callStorableAttributeHooks('afterLoad', {
        attributeSelector,
        setAttributesOnly: true
      });
    }

    async beforeSave(attributeSelector: AttributeSelector) {
      await this.__callStorableAttributeHooks('beforeSave', {
        attributeSelector,
        setAttributesOnly: true
      });
    }

    async afterSave(attributeSelector: AttributeSelector) {
      await this.__callStorableAttributeHooks('afterSave', {
        attributeSelector,
        setAttributesOnly: true
      });
    }

    async beforeDelete(attributeSelector: AttributeSelector) {
      await this.__callStorableAttributeHooks('beforeDelete', {
        attributeSelector,
        setAttributesOnly: true
      });
    }

    async afterDelete(attributeSelector: AttributeSelector) {
      await this.__callStorableAttributeHooks('afterDelete', {
        attributeSelector,
        setAttributesOnly: true
      });
    }

    // === Utilities ===

    static get isStorable() {
      return this.prototype.isStorable;
    }

    isStorable(value: any): value is typeof StorableComponent | StorableComponent {
      return isStorable(value);
    }
  }

  Object.defineProperty(Storable, '__mixin', {value: 'Storable'});

  return Storable;
}

// Make sure the name of the Storable mixin persists over minification
Object.defineProperty(Storable, 'displayName', {value: 'Storable'});

export class StorableComponent extends Storable(Component) {}

function describeCaller(callerMethodName: string | undefined) {
  return callerMethodName !== undefined ? ` (called from ${callerMethodName}())` : '';
}
