import {Transformable, TransformDate, TransformSet, TransformInstance} from '../src';

/**
 * npx ts-node example/example.ts
 */

class User extends Transformable {
  email!: string;

  @TransformInstance(() => Organization)
  organization!: Organization;

  @TransformSet()
  roles!: Set<string>;

  @TransformDate()
  createdOn!: Date;
}

class Organization extends Transformable {
  name!: string;

  @TransformDate()
  createdOn!: Date;
}

const payloadPlain = {
  email: 'mvila@1place.io',
  organization: {name: '1Place Inc', createdOn: '2022-05-02T17:15:12.087Z'},
  roles: ['viewer', 'editor'],
  createdOn: '2022-05-03T22:33:09.015Z'
};

console.log('=== console.log(payloadPlain) ===\n');
console.log(payloadPlain);

const userInstance = User.fromPlain(payloadPlain);

console.log('\n=== console.log(userInstance) ===\n');
console.log(userInstance);

const userPlain = userInstance.toPlain();

console.log('\n=== console.log(userPlain) ===\n');
console.log(userPlain);

console.log('\n=== JSON.stringify(userPlain, undefined, 2) ===\n');
console.log(JSON.stringify(userPlain, undefined, 2));
