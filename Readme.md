
# level-indexing

level indexing and finding

## Installing

`npm install level-indexing`

## Example

```js
var assert = require('assert');

var level = require('level');
var sublevel = require('sublevel');
var indexing = require('level-indexing');

// sublevel instance
var db = sublevel(level('./level-test'));

// users sublevel (needs json value encoding)
var users = db.sublevel('users', { valueEncoding: 'json' });

// use indexing
indexing(users);

// index some properties
users
.index('username')
.index('email');

// a user object
var user = {
  id: 1,
  username: 'foobar',
  email: 'foo@bar'
};

users.put(user.id, user, function(err){
  // properties are now indexed
  users.by('username', 'foobar', function(err, value){
    assert.deepEqual(user, value);
  });

  users.byEmail('foo@bar', function(err, value){
    assert.deepEqual(user, value);
  });

  users.find(1, function(err, value){
    assert.deepEqual(user, value);
  });

  users.find('foobar', function(err, value){
    assert.deepEqual(user, value);
  });

  users.find('foo@bar', function(err, value){
    assert.deepEqual(user, value);
  });
});
```

## API

### indexing(sublevel)

Enable indexing on a sublevel db instance.

### index(name)

Indexes a property `name`.

### by(index, key, fn)

Gets a value from `index` by `key`. Key can be
an object with a property of `index`.

### find(key, fn)

Finds `key` in all indexes. Key can be an object.

## License

MIT
