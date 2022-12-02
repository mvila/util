import {
  Transformable,
  TransformDate,
  TransformSet,
  TransformInstance,
  TransformInstances,
  ExcludeOutput
} from '../src';

/**
 * Run with `ts-node`:
 * npx ts-node example/example.ts
 *
 * Try building with `esbuild`, and run with `node`:
 * npx esbuild example/example.ts --bundle --outfile=example/dist/example.js
 * node example/dist/example.js
 */

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

// =========================================

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

console.log('\n--- plainPayload => userInstance ---\n');

const userInstance = User.fromPlain(plainPayload);

console.log(userInstance);

console.log('\n--- userInstance => plainUser ---\n');

const plainUser = userInstance.toPlain();

console.log(plainUser);

console.log('\n--- plainUser => stringifiedUser ---\n');

const stringifiedUser = JSON.stringify(plainUser, undefined, 2);

console.log(stringifiedUser);

// =========================================

console.log('\n=========================================');

class ExtendedUser extends User {
  @TransformInstance(() => ExtendedOrganization)
  declare organization: ExtendedOrganization;

  @TransformInstances(() => ExtendedAccessToken)
  declare accessTokens: ExtendedAccessToken[];
}

class ExtendedOrganization extends Organization {
  outputName() {
    console.log(`\n\`ExtendedOrganization#outputName()\` => '${this.name}'`);
  }
}

class ExtendedAccessToken extends AccessToken {}

console.log('\n--- plainPayload => extendedUserInstance ---\n');

const extendedUserInstance = ExtendedUser.fromPlain(plainPayload);

console.log(extendedUserInstance);

extendedUserInstance.organization.outputName();

console.log('\n--- extendedUserInstance => plainExtendedUser ---\n');

const plainExtendedUser = extendedUserInstance.toPlain();

console.log(plainExtendedUser);

console.log('\n--- plainExtendedUser => stringifiedExtendedUser ---\n');

const stringifiedExtendedUser = JSON.stringify(plainExtendedUser, undefined, 2);

console.log(stringifiedExtendedUser);
