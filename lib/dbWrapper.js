/**
 * @class DBWrapper
 * @author Dr. Benton - github.com/DrBenton
 * @see https://github.com/DrBenton/Node-DBI
 */

// ------------------------------------- modules

var async = require('async')
  , _ = require('underscore')
  , DBAdapterAbstract = require('./dbAdapterAbstract').DBAdapterAbstract
  , DBExpr = require('./dbExpr').DBExpr
  , DBSelect = require('./dbSelect').DBSelect;

// ------------------------------------- constructor

/**
 * @param {String} dbAdapterName
 * @param {Array} connectionParams
 */
function DBWrapper( dbAdapterName, connectionParams ) {
  
  if( 2 > arguments.length )
    throw new Error('too few arguments given');

  if( -1 == DBWrapper._availableAdapters.indexOf( dbAdapterName ) )
    throw new Error('Unknown adapter "'+dbAdapterName+'" ! (should be one of '+DBWrapper._availableAdapters.join('|')+')');
  
  /**
   * These Arrays will hold "query()" and "fetchAll()" function calls that have been 
   * triggered before the connection has been opened.
   * Since others methods ("fetchRow()", "fetchOne()", "insert()"...) use these 2 methods
   * to query the Adapter, they are automatically linked this this pending calls Arrays.
   */
  /**
   * @type Array
   */
  this._pendingQueries = [];
  /**
   * @type Array
   */
  this._pendingFetchAlls = [];
  
  /**
   * @type Boolean
   */
  this._connected = false;
  
  /**
   * @type DBAdapterAbstract
   */
  this._adapter = require('./adapters/adapter--' + dbAdapterName ).createInstance( this, connectionParams );
  
  if( ! (this._adapter instanceof DBAdapterAbstract) )
    throw new Error('Adapters must be instances of "'+DBAdapterAbstract+'" !');
  
}

module.exports.DBWrapper = DBWrapper;


// ------------------------------------- static stuff

/**
 * @api private
 * @static
 */
DBWrapper._availableAdapters = [
  'mysql-libmysqlclient', //@see https://github.com/Sannis/node-mysql-libmysqlclient
  'mysql',                //@see https://github.com/felixge/node-mysql
  'sqlite3',              //@see https://github.com/developmentseed/node-sqlite3
  'pg'                    //@see https://github.com/brianc/node-postgres
];

// ------------------------------------- public methods

/**
 * 
 * @param {Function} callback
 */
DBWrapper.prototype.connect = function( callback )
{
  
  /**
   * @type Function
   */
  this._connectionInitializationCallback = callback;
  
  this._adapter.addListener('connection', _.bind( this._onAdapterConnection, this ) );
  this._adapter.connect();
  
};

/**
 * 
 * @param {Function} callback
 */
DBWrapper.prototype.close = function( callback )
{
  
  if( ! this._connected )
    return;//connection is not opened... so we don't close it :-)
  
  // The "_connected" prop is set to "false" without async stuff,
  // because we want new queries to be stopped right now, since we are
  // closing the connection...
  this._connected = false;
  
  this._adapter.close( callback );
  
};

/**
 * Prepares and executes an SQL statement with bound data.
 * 
 * @param {String|DBSelect}  sql               The SQL statement with placeholders.
 *                                              May be a string or DBSelect.
 * @param {Array|null}  bind                   An array of data to bind to the placeholders.
 * @param {Function|null}  callback            The callback function receives the error, if any, and the number of affected rows
 * @api public
 */
DBWrapper.prototype.query = function( sql, bind, callback )
{
  callback = arguments[arguments.length - 1];
  if (typeof bind == 'function') bind = null;
  if( sql instanceof DBSelect )
    sql = sql.assemble();
  
  bind = bind || [] ;

  if( ! this._connected )
    this._pendingQueries.push( {'sql': sql, 'bind': bind, 'callback': callback } );//this query will be processed after the connection
  else  
    this._adapter.query( sql, bind, callback );
  
};


/**
 * Fetches all SQL result rows as a Array.
 * 
 * @param {String|DBSelect}  sql              An SQL SELECT statement.
 * @param {Array|null}  bind                  Data to bind into SELECT placeholders.
 * @param {Function|null}  callback           The callback function receives the error, if any, and all the result rows
 * @api public
 */
DBWrapper.prototype.fetchAll = function( sql, bind, callback )
{
  callback = arguments[arguments.length - 1];
  if (typeof bind == 'function') bind = null;
  if( sql instanceof DBSelect )
    sql = sql.assemble();
  
  bind = bind || [] ;
  
  if( ! this._connected )
    this._pendingFetchAlls.push( {'sql': sql, 'bind': bind, 'callback': callback } );//this fetchAll will be processed after the connection
  else
    this._adapter.fetchAll( sql, bind, callback );
  
};


/**
 * Fetches the first row of the SQL result.
 * 
 * @param {String|DBSelect}  sql              An SQL SELECT statement.
 * @param {Array|null}  bind                  Data to bind into SELECT placeholders.
 * @param {Function|null}  callback           The callback function receives the error, if any, and the first result row
 * @api public
 */
DBWrapper.prototype.fetchRow = function( sql, bind, callback )
{
  callback = arguments[arguments.length - 1];
  if (typeof bind == 'function') bind = null;
  bind = bind || [] ;
  
  var fetchAll = _.bind( this.fetchAll, this );
  
  async.waterfall( 
    [
      function( callback )
      {
        fetchAll( sql, bind, callback );
      }
    ],
    function (err, res)
    {
      
      if( ! callback )
        return;
      
      if( err )
        callback( err );
      else if( res && res.length>0 )
        callback( null, res[0] );//only the first row is returned to the callback
      else
        callback( null, null );//no result
    }
  );
  
};


/**
 * Fetches the first column of all SQL result rows as an Array.
 * 
 * @param {String|DBSelect}  sql              An SQL SELECT statement.
 * @param {Array|null}  bind                  Data to bind into SELECT placeholders.
 * @param {Function|null}  callback           The callback function receives the error, if any, and an array populated with the first column value of every result rows
 * @api public
 */
DBWrapper.prototype.fetchCol = function( sql, bind, callback )
{
  callback = arguments[arguments.length - 1];
  if (typeof bind == 'function') bind = null;
  bind = bind || [] ;
    
  var fetchAll = _.bind( this.fetchAll, this );
  
  async.waterfall( 
      [
        function( callback )
        {
          fetchAll( sql, bind, callback );
        }
      ],
      function (err, res)
      {
        
        if( ! callback )
          return;
        
        var returnedArray = [];
        if( ! err && !! res )
        {
          var firstFieldName = _.keys( res[0] )[0];
          for( var i=0, j=res.length; i<j; i++ )
            returnedArray.push( res[i][firstFieldName] );//only the first col of each row is returned to the callback
        }
        callback( err, returnedArray );
      }
    );  
  
};


/**
 * Fetches the first column of the first row of the SQL result.
 * 
 * @param {String|DBSelect}  sql              An SQL SELECT statement.
 * @param {Array|null}  bind                  Data to bind into SELECT placeholders.
 * @param {Function|null}  callback           The callback function receives the error, if any, and the value of the first column of the first result row
 * @api public
 */
DBWrapper.prototype.fetchOne = function( sql, bind, callback )
{
  callback = arguments[arguments.length - 1];
  if (typeof bind == 'function') bind = null;
  bind = bind || [] ;
  
  var fetchRow = _.bind( this.fetchRow, this );
  
  async.waterfall( 
      [
        function( callback )
        {
          fetchRow( sql, bind, callback );
        }
      ],
      function (err, res)
      {
        
        if( ! callback )
          return;
        
        if( err )
          callback( err );
        else if( ! res )
          callback( null, null );//no result
        else
        {
          var firstFieldName = _.keys( res )[0];
          callback( err, res[firstFieldName] );//only the first col of the first row is returned to the callback
        }
      }
    );  
  
};


/**
 * Inserts a table row with specified data.
 * 
 * @param {tableName}  tableName          The table to insert data into.
 * @param {Object}  data                  Column-value pairs.
 * @param {Function|null}  callback       The callback function receives the error, if any, and the number of affected rows
 * @api public
 */
DBWrapper.prototype.insert = function( tableName, data, callback )
{
  
  // Some params check
  if( ! data || _.isEmpty(data) )
  {
    callback( new Error('DBWrapper.insert() called without data !') );
    return;
  }
  
  // SQL initialization  
  var sql = 'INSERT INTO ' + this._adapter.escapeTable(tableName);

  // Fields values management
  var sqlFieldsStrArray = [];
  var sqlValuesArray = [];
  var valuesPlaceholders = [];
  for( var fieldName in data )
  {
    sqlFieldsStrArray.push( fieldName );
    sqlValuesArray.push( data[fieldName] );
    valuesPlaceholders.push( '?' );
  }
  
  sql += '(' + sqlFieldsStrArray.join(', ') + ') VALUES(' + valuesPlaceholders.join(', ') + ')';
  // Go! Go! Go!
  this.query(sql, sqlValuesArray, callback);
  
};


/**
 * Updates table rows with specified data based on a WHERE clause.
 * 
 * @param {tableName}  tableName          The table to update.
 * @param {Object}  data                  Column-value pairs.
 * @param {String|Array}  where           UPDATE WHERE clause(s).
 * @param {Function|null}  callback       The callback function receives the error, if any, and the number of affected rows
 * @api public
 */
DBWrapper.prototype.update = function( tableName, data, where, callback )
{
  
  // Some params check
  if( ! data || _.isEmpty(data) )
  {
    callback( new Error('DBWrapper.update() called without data !') );
    return;
  }
  if( ! where || (typeof(where)=='string' && where.length==0) || (typeof(where)=='object' && _.isEmpty(where)) )
  {
    callback( new Error('DBWrapper.update() called without where !') );
    return;
  }
  
  // SQL initialization
  var sql = 'UPDATE ' + this._adapter.escapeTable(tableName) + ' SET ';
  
  // Fields values management
  var sqlFieldsStrArray = [];
  var sqlValuesArray = [];
  for( var fieldName in data )
  {
    sqlFieldsStrArray.push( fieldName + '=?' );
    sqlValuesArray.push( data[fieldName] );
  }
  
  sql += sqlFieldsStrArray.join(', ');
  
  
  // WHERE clause construction 
  sql += ' WHERE ' + this._whereExpr( where );
      
  // Go! Go! Go!
  this.query(sql, sqlValuesArray, callback);  
  
};


/**
 * Deletes table rows based on a WHERE clause.<br/>
 * This function name should have been named "delete", but this is a reserved word of Javascript... :-(
 * 
 * @param {tableName}  tableName          The table to update.
 * @param {String|Array}  where           DELETE WHERE clause(s).
 * @param {Function|null}  callback       The callback function receives the error, if any, and the number of affected rows
 * @api public
 */
DBWrapper.prototype.remove = function( tableName, where, callback )
{

  if( 3 > arguments.length )
    throw new Error('too few arguments given');
  
  // Some params check
  if( ! where || (typeof(where)=='string' && where.length==0) || (typeof(where)=='object' && _.isEmpty(where)) )
  {
    callback( new Error('DBWrapper.update() called without where !') );
    return;
  }
  
  // SQL initialization
  var sql = 'DELETE FROM ' + this._adapter.escapeTable(tableName);
    
  // WHERE clause construction 
  sql += ' WHERE ' + this._whereExpr( where );
      
  // Go! Go! Go!
  this.query(sql, [], callback);   
  
};


/**
 * Safely quotes a value for an SQL statement.
 *
 * If an Array is passed as the value, the Array values are quoted
 * and then returned as a comma-separated string.
 * 
 * If "value" is a DBExpr, its method "toString()" is triggered and no escaping is done.
 * 
 * @param {String|Array|DBExpr}  value  The value to quote.
 * @returns {String}                    The escaped value
 * @api public
 */
DBWrapper.prototype.escape = function( value )
{
  if( value instanceof DBExpr )
    return value.toString();
  else if( value instanceof Array )
  {
    var returnedValues = [];
    for( var i=0, j=value.length; i<j; i++ )
      returnedValues.push( this._adapter.escape( value[i] ) );
    return returnedValues.join(', ');
  }
  else
    return this._adapter.escape( value );
};


/**
 * @returns {Integer|null}  the last inserted Id
 * @api public
 */
DBWrapper.prototype.getLastInsertId = function()
{
  return this._adapter.getLastInsertId(); 
};


/**
 * @returns {Boolean}  
 * @api public
 */
DBWrapper.prototype.isConnected = function()
{
  return this._connected; 
};


/**
 * @returns {DBSelect}  Returns a new DBSelect instance
 * @api public
 */
DBWrapper.prototype.getSelect = function()
{
  return this._adapter.getSelect(); 
};

// ------------------------------------- private methods

/**
 * Convert an Array, String, or DBSelect object
 * into a string to put in a WHERE clause.<br/>
 * This code is a straight conversion of the PHP Zend Framework's
 * Zend_Db_Adapter_Abstract "_whereExpr()" method.
 *  
 * @see http://framework.zend.com/manual/fr/zend.db.adapter.html
 * 
 * @param {String|Array|DBSelect} $where
 * @return {String}
 * @api protected
 */
DBWrapper.prototype._whereExpr = function(where)
{
  
  if ( ! where)
    return where;

  if ( ! _.isArray(where) )
    where = [ where ];
  
  var result = [];
  for ( var i=0, j=where.length; i<j; i++ )
  {
    var term = where[i];
    if( typeof(term)=='string' )
    {
      // ...nothing to do
    }
    else if ( term instanceof DBSelect )
    {
      term = term.assemble();
    }
    else if( _.isArray( term ) )
    {
      // cond is the condition with placeholder,
      // and term is quoted into the condition
      term = term[0].replace( /\?/g, this.escape(term[1]) );
    }
    result.push( '(' + term + ')' );
  }
  
  result = result.join(' AND ');
  return result;
  
};


/**
 * 
 * @param err {Error|null}
 */
DBWrapper.prototype._onAdapterConnection = function( err )
{
  
  //console.log('_onAdapterConnection('+err+') ; this._adapter='+this._adapter+' ; this._connectionInitializationCallback='+typeof(this._connectionInitializationCallback));
  
  this._adapter.removeListener( 'connection', this._onAdapterConnection );
  
  if( ! err )
    this._connected = true;
  
  if( this._connectionInitializationCallback )
  {
    this._connectionInitializationCallback.call( null, err );
    this._connectionInitializationCallback = null;
  }
  
  if( ! err )
    this._processPendingCalls();
  
};


/**
 * 
 */
DBWrapper.prototype._processPendingCalls = function()
{
  
  var i, j;
  
  //console.log( this._pendingQueries.length + ' pending queries, ' + this._pendingFetchAlls.length + ' pending fecthAlls');
  
  if( this._pendingQueries.length > 0 )
  {
    for( i=0, j=this._pendingQueries.length; i<j; i++ )
    {
      var currentPendingQuery = this._pendingQueries[i];
      //console.log('> '+currentPendingQuery.sql);
      this.query( currentPendingQuery.sql, currentPendingQuery.bind, currentPendingQuery.callback );
    }
    this._pendingQueries = [];// references cleaning
  }
  
  if( this._pendingFetchAlls.length > 0 )
  {
    for( i=0, j=this._pendingFetchAlls.length; i<j; i++ )
    {
      var currentPendingFetchAll = this._pendingFetchAlls[i];
      //console.log('> '+currentPendingFetchAll.sql);
      this.fetchAll( currentPendingFetchAll.sql, currentPendingFetchAll.bind, currentPendingFetchAll.callback );
    }
    this._pendingFetchAlls = [];// references cleaning
  }
  
};


