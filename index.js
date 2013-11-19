
/*!
 *
 * level-indexing
 *
 * level indexing and finding
 *
 * MIT
 *
 */

/**
 * Enable indexing on a sublevel instance.
 *
 * @param {Sub} db
 * @return {Sub}
 * @api public
 */

module.exports = function(db){
  db.indexes = db.indexes || [];
  db.index = index;
  db.getBy = db.by = by;
  db.find = find;
  return db;
};

/**
 * Indexes a property `name`.
 *
 * @param {String} name
 * @return {Sub}
 * @api public
 */

function index(name){
  var self = this;
  var sub = this.sublevel(name, { valueEncoding: 'utf8' });
  var put = this.put;
  var del = this.del;

  this.indexes.push(name);

  // convenience methods
  var Name = name[0].toUpperCase() + name.substr(1);
  this['getBy' + Name] =
  this['by' + Name] = function(key, options, fn){
    return this.by(name, key, options, fn);
  };

  this.put = function(key, value, options, fn){
    if (!(name in value)) return done();

    var prop = value[name];
    sub.put(prop, key, done);

    function done(err){
      if (err) return (fn || options)(err);
      put.call(self, key, value, options, fn);
    }
  };

  this.del = function(key, fn){
    this.get(key, function(err, value){
      if (err) return fn(err);
      if (!(name in value)) return done();

      var prop = value[name];
      sub.del(prop, done);

      function done(err){
        if (err) return fn(err);
        del.call(self, key, fn);
      }
    });
  };

  return this;
}

/**
 * Gets a value from `index` by `key`.
 *
 * @param {String} index
 * @param {Object|String} key
 * @param {Object} [options]
 * @param {Function} fn
 * @api public
 */

function by(index, key, options, fn){
  var self = this;
  var sub = this.sublevel(index, { valueEncoding: 'utf8' });
  fn = fn || options;

  if ('object' == typeof key) {
    if (!(index in key)) return fn(error({
      message: 'Key not found in the index.',
      type: 'NotIndexedError'
    }));
    key = key[index];
  }

  sub.get(key, function(err, value){
    if (err) {
      if ('NotFoundError' == err.type) return fn(error({
        message: 'Key not found in the index.',
        type: 'NotIndexedError'
      }));
      return fn(err);
    }
    self.get(value, options, fn);
  });
}

/**
 * Finds `key` in all indexes.
 *
 * @param {Object|String} key
 * @param {Object} options
 * @param {Function} fn
 * @api public
 */

function find(key, options, fn){
  var self = this;
  if ('function' == typeof options) {
    fn = options;
    options = {};
  }

  // search for actual key first
  if (!('object' == typeof key)) {
    this.get(key, options, function(err, value){
      if (err && err.type == 'NotFoundError') return next(0);
      fn(err, value);
    });
  }
  else next(0);

  function next(i, err){
    var index = self.indexes[i];

    if (err && err.type != 'NotIndexedError') return fn(err);

    if (!index) return fn(error({
      message: 'Key not found in any of the indexes.',
      type: 'NotIndexedError'
    }));

    self.by(index, key, function(err, value){
      if (err) return next(i + 1, err);
      fn(null, value);
    });
  }
}

/**
 * Error instance helper.
 *
 * @param {Object} props
 * @return {Error}
 * @api private
 */

function error(props){
  var err = new Error();
  for (var key in props) err[key] = props[key];
  return err;
}
