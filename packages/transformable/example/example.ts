import {
  Transformable,
  TransformDate,
  TransformSet,
  TransformInstance,
  TransformInstances,
  ExcludeOutput
} from '../src';

/**
 * npx ts-node example/example.ts
 */

class Base extends Transformable {
  @TransformDate()
  createdOn!: Date;
}

class User extends Base {
  email!: string;

  @ExcludeOutput()
  password!: string;

  @TransformInstance(() => Organization)
  organization!: Organization;

  @TransformSet()
  roles!: Set<string>;

  @TransformInstances(() => AccessToken)
  accessTokens!: AccessToken[];
}

class Organization extends Base {
  name!: string;
}

class AccessToken extends Base {
  value!: string;
}

console.log('--- plainPayload ---\n');

const plainPayload = {
  email: 'mvila@1place.io',
  password: 'sEcReT',
  organization: {name: '1Place Inc', createdOn: '2022-05-02T17:15:12.087Z'},
  roles: ['viewer', 'editor'],
  accessTokens: [
    {value: 'abc123', createdOn: '2022-05-03T23:02:50.540Z'},
    {value: 'def456', createdOn: '2022-05-05T09:05:11.241Z'}
  ],
  createdOn: '2022-05-03T22:33:09.015Z'
};

console.log(plainPayload);

console.log('\n--- plainPayload => userInstance ---\n');

const userInstance = User.fromPlain(plainPayload);

console.log(userInstance);

console.log('\n--- userInstance => plainUser ---\n');

const plainUser = userInstance.toPlain();

console.log(plainUser);

console.log('\n--- plainUser => stringifiedUser ---\n');

const stringifiedUser = JSON.stringify(plainUser, undefined, 2);

console.log(stringifiedUser);
