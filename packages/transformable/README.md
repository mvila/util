# Transformable

Transforms plain objects to class instances and vice versa.

## Why?

I wanted something similar to [class-transformer](https://github.com/typestack/class-transformer), but which can work in the frontend in addition to the backend. [class-transformer](https://github.com/typestack/class-transformer) is a great library, but it uses TypeScript decorator metadata, which is not supported by some modern bundler tools such as [esbuild](https://esbuild.github.io/), which is used by [Vite](https://vitejs.dev/).

So, I built this package as a lightweight alternative to [class-transformer](https://github.com/typestack/class-transformer), and I didn't use TypeScript decorator metadata so that it can be used anywhere.

Note that I only implemented what I needed, so the feature set is much more limited than [class-transformer](https://github.com/typestack/class-transformer). If you need additional features, feel free to open an issue or submit a pull request.

## Installation

```
npm install transformable
```

## Example

### Transforming a plain object into an instance of a class

```ts
import {
  Transformable,
  TransformDate,
  TransformSet,
  TransformInstance,
  TransformInstances,
  ExcludeOutput
} from 'transformable';

class User extends Transformable {
  email!: string;

  @ExcludeOutput()
  password!: string;

  @TransformInstance(() => Organization)
  organization!: Organization;

  @TransformSet()
  roles!: Set<string>;

  @TransformInstances(() => AccessToken)
  accessTokens!: AccessToken[];

  @TransformDate()
  createdOn!: Date;
}

class Organization extends Transformable {
  name!: string;

  @TransformDate()
  createdOn!: Date;
}

class AccessToken extends Transformable {
  value!: string;

  @TransformDate()
  createdOn!: Date;
}

const user = User.fromPlain({
  email: 'john@acme.inc',
  password: 'sEcReT',
  organization: {name: 'Acme Inc.', createdOn: '2022-05-02T17:15:12.087Z'},
  roles: ['viewer', 'editor'],
  accessTokens: [
    {value: 'abc123', createdOn: '2022-05-03T23:02:50.540Z'},
    {value: 'def456', createdOn: '2022-05-05T09:05:11.241Z'}
  ],
  createdOn: '2022-05-03T22:33:09.015Z'
});

console.log(user);
```

It should output the following:

```
User {
  email: 'john@acme.inc',
  password: 'sEcReT',
  organization: Organization {
    name: 'Acme Inc.',
    createdOn: 2022-05-02T17:15:12.087Z
  },
  roles: Set(2) { 'viewer', 'editor' },
  accessTokens: [
    AccessToken {
      value: 'abc123',
      createdOn: 2022-05-03T23:02:50.540Z
    },
    AccessToken {
      value: 'def456',
      createdOn: 2022-05-05T09:05:11.241Z
    }
  ],
  createdOn: 2022-05-03T22:33:09.015Z
}
```

Note that:

- `user` is a `User` instance.
- `user.organization` is an `Organization` instance.
- `user.roles` is a set of strings.
- `user.accessTokens` is an array of `AccessToken` instances.
- `createdOn` attributes are some `Date` instances.

### Transforming a class instance into a plain object

```ts
const plainUser = user.toPlain();

console.log(plainUser);
```

It should output the following:

```
{
  email: 'john@acme.inc',
  organization: { name: 'Acme Inc.', createdOn: 2022-05-02T17:15:12.087Z },
  roles: [ 'viewer', 'editor' ],
  accessTokens: [
    { value: 'abc123', createdOn: 2022-05-03T23:02:50.540Z },
    { value: 'def456', createdOn: 2022-05-05T09:05:11.241Z }
  ],
  createdOn: 2022-05-03T22:33:09.015Z
}
```

Note that:

- `plainUser` is a plain object.
- `plainUser.password` is missing because it has been excluded thanks to the `@ExcludeOutput()` decorator in the `User` class.
- `plainUser.organization` is a plain object.
- `plainUser.roles` is an array of string.
- `plainUser.accessTokens` is an array of plain objects.
- `createdOn` attributes are still `Date` instances, and this is not an issue because they can be automatically transformed into strings when `JSON.stringify()` is called implicitly or explicitly (see below).

### Transforming a plain object into a string

```ts
const stringifiedUser = JSON.stringify(plainUser, undefined, 2);

console.log(stringifiedUser);
```

It should output the following:

```json
{
  "email": "john@acme.inc",
  "organization": {
    "name": "Acme Inc.",
    "createdOn": "2022-05-02T17:15:12.087Z"
  },
  "roles": ["viewer", "editor"],
  "accessTokens": [
    {
      "value": "abc123",
      "createdOn": "2022-05-03T23:02:50.540Z"
    },
    {
      "value": "def456",
      "createdOn": "2022-05-05T09:05:11.241Z"
    }
  ],
  "createdOn": "2022-05-03T22:33:09.015Z"
}
```

Note that the `createdOn` attributes have been transformed into strings.

## API

### `Transformable` class

A convenience class that you can extend to implement the classes that you need in your app.

Note that you don't need to use the `Transformable` class if you don't want to base your classes on it. Instead, you can use the [`plainToInstance()`](#plaintoinstancesourceplain-targetclass-sourcecontext) and [`instanceToPlain()`](#instancetoplainsourceinstance-targetcontext) functions that work with any class.

The `Transformable` class brings the following methods to your classes.

#### `fromPlain(sourceObject, sourceContext?)` class method

Transforms a plain object into a class instance.

Optionally, you can pass a `sourceContext` string to specify the source of the plain object (see the [`Transform()`](#transformtransformation-decorator) decorator to learn more about contexts).

#### `toPlain(targetContext?)` instance method

Transforms a class instance into a plain object.

Optionally, you can pass a `targetContext` string to specify the target of the plain object (see the [`Transform()`](#transformtransformation-decorator) decorator to learn more about contexts).

#### `toJSON(targetContext?)` instance method

An alias of the `toPlain()` instance method.

Having a `toJSON()` instance method is helpful because it is automatically called by `JSON.stringify()`. So, in most cases, you will not have to call the `toPlain()` instance method explicitly when your instances are serialized to be transported between the frontend and the backend of your app.

### Decorators

You can use the following decorators in any class to automatically transform the attributes when `fromPlain()` or `toPlain()` is called.

Note that you can only use one decorator per attribute. Also, when you decorate an attribute of a subclass, if the base class attribute is decorated, the subclass attribute decorator overrides the base class attribute decorator.

#### `@TransformDate()` decorator

When `fromPlain()` is called, transforms a string into a `Date`. Note that if a value is already a `Date`, a copy of the `Date` is returned.

When `toPlain()` is called, no transformation is performed (i.e., the `Date` object remains as it is).

#### `@TransformSet()` decorator

When `fromPlain()` is called, transforms an `Array` into a `Set`. Note that if a value is already a `Set`, a copy of the `Set` is returned.

When `toPlain()` is called, transforms a `Set` into an `Array`.

#### `@TransformInstance(classProvider, {excludeOutput?})` decorator

When `fromPlain()` is called, transforms a plain object into an instance of the class returned by the `classProvider` function.

When `toPlain()` is called, transforms a class instance into a plain object. If the `excludeOutput` option is set to `true`, no transformation is performed, and `undefined` is returned.

#### `@TransformInstances(classProvider, {excludeOutput?})` decorator

When `fromPlain()` is called, transforms an array of plain objects into an array of instances of the class returned by the `classProvider` function.

When `toPlain()` is called, transforms an array of class instances into an array of plain objects. If the `excludeOutput` option is set to `true`, no transformation is performed, and `undefined` is returned.

#### `@ExcludeOutput()` decorator

When `toPlain()` is called, transforms any value to `undefined`.

This decorator is helpful when you want to protect sensitive data (e.g., a password in the backend).

#### `@Transform(transformation)` decorator

A generic decorator that allows you to implement any transformation.

The `transformation` parameter should be an object of type `{input?: Transformer; output?: Transformer}` where `Transformer` should be a function of type `(value: any, context: {source?: string; target?: string}) => any`.

The `input` function will be called when `fromPlain()` is called, and the `output` function will be called when `toPlain()` is called. Both functions receive a value and should return a transformed value.

Optionally, you can use the `context` object to apply different transformations depending on the `source` or `target` context.

For example, in your backend, you may want to transform a value differently when the `source` or `target` context is `'database'`.

Let's say that you have a `User` class with an `isAdmin` boolean attribute, but for some legacy reasons, you need to transform it into a `0` or `1` number when it is stored in the database.

You could implement the `User` class as follows:

```ts
class User extends Transformable {
  email!: string;

  @Transform({
    input(value, {source}) {
      if (source === 'database') {
        return value === 1;
      } else {
        return value;
      }
    },
    output(value, {target}) {
      if (target === 'database') {
        return value ? 1 : 0;
      } else {
        return value;
      }
    }
  })
  isAdmin!: boolean;
}
```

Then, when you read from the database, you can transform the database object to a `User` instance as follows:

```ts
const userFromDatabase = {email: 'john@acme.inc', isAdmin: 1};

const user = User.fromPlain(userFromDatabase, 'database');

console.log(user.isAdmin); // => `true`
```

And, when you write to the database, you can transform the `User` instance to a database object as follows:

```ts
const userForDatabase = user.toPlain('database');

console.log(userForDatabase.isAdmin); // => `1`
```

Finally, when you serve the frontend, you can transform the `User` instance to a plain object as follows:

```ts
const userForFrontend = user.toPlain();

console.log(userForFrontend.isAdmin); // => true
```

### Functions

You can transform from or to any class instance (whether the class is based on `Transformable` or not) with the following functions.

#### `plainToInstance(sourcePlain, targetClass, sourceContext?)`

Transforms the `sourcePlain` plain object into an instance of `targetClass`.

Optionally, you can pass a `sourceContext` string to specify the source of the plain object (see the [`Transform()`](#transformtransformation-decorator) decorator to learn more about contexts).

#### `instanceToPlain(sourceInstance, targetContext?)`

Transforms the `sourceInstance` class instance into a plain object.

Optionally, you can pass a `targetContext` string to specify the target of the plain object (see the [`Transform()`](#transformtransformation-decorator) decorator to learn more about contexts).

## License

MIT
