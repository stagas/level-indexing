
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
  db.indexdb = db.sublevel('index', { valueEncoding: 'utf8' });
  db.indexes = db.indexes || [];
  db.index = index;
  db.unique = unique;
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
  var sub = this.indexdb.sublevel(name);
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
    var args = normalize(options, fn);

    if (!(name in value)) return done();

    var prop = value[name];
    sub.put(prop, key, done);

    function done(err){
      if (err) return args.fn(err);
      put.call(self, key, value, args.options, args.fn);
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
 * Creates a unique index property `name`.
 *
 * @param {String} name
 * @return {Sub}
 * @api public
 */

function unique(name){
  this.index(name);

  var self = this;
  var put = this.put;

  this.put = function(key, value, options, fn){
    var args = normalize(options, fn);
    self.by(name, value, args.options, function(err, data, _key){
      if (err && err.type == 'NotIndexedError'
      || _key == key) {
        put.call(self, key, value, args.options, args.fn);
      }
      else {
        args.fn(error({
          message: 'Key already indexed and is unique.',
          type: 'AlreadyExistsError'
        }));
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
  var sub = this.indexdb.sublevel(index, { valueEncoding: 'utf8' });
  var args = normalize(options, fn);

  if ('object' == typeof key) {
    if (!(index in key)) return fn(error({
      message: 'Key not found in the index.',
      type: 'NotIndexedError'
    }));
    key = key[index];
  }

  sub.get(key, function(err, value){
    if (err) {
      if ('NotFoundError' == err.type) return args.fn(error({
        message: 'Key not found in the index.',
        type: 'NotIndexedError'
      }));
      return args.fn(err);
    }
    self.get(value, args.options, function(err, data){
      args.fn(err, data, value);
    });
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
  var args = normalize(options, fn);

  // search for actual key first
  if (!('object' == typeof key)) {
    this.get(key, args.options, function(err, value){
      if (err && err.type == 'NotFoundError') return next(0);
      args.fn(err, value);
    });
  }
  else next(0);

  function next(i, err){
    var index = self.indexes[i];

    if (err && err.type != 'NotIndexedError') return args.fn(err);

    if (!index) return args.fn(error({
      message: 'Key not found in any of the indexes.',
      type: 'NotIndexedError'
    }));

    self.by(index, key, args.options, function(err, value, key){
      if (err) return next(i + 1, err);
      args.fn(null, value, key);
    });
  }
}

/**
 * Normalize `options` and `fn` arguments.
 *
 * @param {Object} [options]
 * @param {Function} fn
 * @return {Object}
 * @api private
 */

function normalize(options, fn){
  var args = {};
  if ('function' == typeof options){
    args.options = this.options;
    args.fn = options;
  }
  else {
    args.options = options;
    args.fn = fn;
  }
  return args;
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
