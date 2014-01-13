/**
 * @class DBAdapterAbstract
 * @author Dr. Benton - github.com/DrBenton
 * @see https://github.com/DrBenton/Node-DBI
 */

// ------------------------------------- modules

var _ = require('lodash')
  , util = require('util')
  , EventEmitter = require('events').EventEmitter
  , DBSelect = require('./dbSelect').DBSelect
  , DBWrapper = require('./dbWrapper').DBWrapper;

// ------------------------------------- constructor

/**
 * @param {DBWrapper} dbWrapper
 * @param {Object} connectionParams
 */
function DBAdapterAbstract( dbWrapper, connectionParams )
{
  
  //if( ! (dbWrapper instanceof DBWrapper) )
  //  throw new Error('dbWrapper param must be a DBWrapper instance !');
  //console.dir(dbWrapper);
  
  /**
   * @type DBWrapper
   */
  this._dbWrapper = dbWrapper;
  
  /**
   * @type Object
   */
  this._dbClient = null;
  
  /**
   * @type Object
   */
  this._connectionParams = connectionParams;
  
}

util.inherits(DBAdapterAbstract, EventEmitter);

module.exports.DBAdapterAbstract = DBAdapterAbstract; 

// ------------------------------------- public methods


/**
 * Abstract method : DB Adapter implementations must override it. 
 * @api public
 */
DBAdapterAbstract.prototype.connect = function()
{
  throw new Error('DB Adapter implementations must override DBAdapterAbstract.prototype.connect() !');
};


/**
 * Abstract method : DB Adapter implementations must override it. 
 * @api public
 */
DBAdapterAbstract.prototype.close = function()
{
  throw new Error('DB Adapter implementations must override DBAdapterAbstract.prototype.close() !');
};


/**
 * Abstract method : DB Adapter implementations must override it. 
 * The callback function will receive the casual "err" as first param,
 * and the number of affected fields as the second one.
 * @param {String}  sql
 * @param {Array|null}  bind
 * @param {Function|null}  callback
 * @api public
 */
DBAdapterAbstract.prototype.query = function( sql, bind, callback )
{
  throw new Error('DB Adapter implementations must override DBAdapterAbstract.prototype.query() !');
};


/**
 * Abstract method : DB Adapter implementations must override it. 
 * @param {String}  sql
 * @param {Array|null}  bind
 * @param {Function|null}  callback
 * @api public
 */
DBAdapterAbstract.prototype.fetchAll = function( sql, bind, callback )
{
  throw new Error('DB Adapter implementations must override DBAdapterAbstract.prototype.fetchAll() !');
};


/**
 * Abstract method : DB Adapter implementations must override it. 
 * @rturn {Integer|null}  the last inserted Id
 * @api public
 */
DBAdapterAbstract.prototype.getLastInsertId = function()
{
  throw new Error('DB Adapter implementations must override DBAdapterAbstract.prototype.getLastInsertId() !');
};


/**
 * Abstract method : DB Adapter implementations must override it. 
 * @param {String}  value
 * @rturn {String}  the escaped value
 * @api public
 */
DBAdapterAbstract.prototype.escape = function( value )
{
  throw new Error('DB Adapter implementations must override DBAdapterAbstract.prototype.escape() !');
};

/**
 * escape a tableName appropriately - MySQL uses backticks some others don't escape at all.
 * @param {String}  value
 * @rturn {String}  the escaped value
 * @api public
 */
DBAdapterAbstract.prototype.escapeTable = function( value )
{
  return '`' + value + '`';
};

/**
 * escape a fieldName appropriately - MySQL uses backticks some others don't escape at all.
 * @param {String}  value
 * @rturn {String}  the escaped value
 * @api public
 */
DBAdapterAbstract.prototype.escapeField = function( value )
{
  return '`' + value + '`';
};


/**
 * You can override this implementation if your Adapter needs a custom DBSelect subclass.
 * 
 * @returns {DBSelect}  Returns a new DBSelect instance
 * @api public
 */
DBAdapterAbstract.prototype.getSelect = function()
{
  return new DBSelect( this );
};


/**
 * @returns {DBWrapper}  Returns the associated DBWrapper
 * @api public
 */
DBAdapterAbstract.prototype.getDBWrapper = function()
{
  return this._dbWrapper;
};

// ------------------------------------- protected methods

/**
 * Retuns a single String with "?" replaced by escaped values of the "bind" Array. 
 * @param {String}  sql
 * @param {Array|null}  bind
 * @returns {String}  
 * @api protected
 */
DBAdapterAbstract.prototype._format = function( sql, bind )
{
  
  // Code copied from "mysql" Node module's Client class.
  // @see https://github.com/felixge/node-mysql/blob/master/lib/mysql/client.js
  
  if( this._debug )
    console.log('DBAdapterAbstract._format('+sql+', '+JSON.stringify(bind)+')');
  
  var escape = _.bind( this.escape, this );
  
  sql = sql.replace(/\?/g, function() {
    
    if (bind.length == 0)
      throw new Error('too few parameters given');
    
    return escape( bind.shift() );
    
  });
  
  if (bind.length > 0 )
    throw new Error('too many parameters given');
  
  return sql;
  
};

/**
 * Converts a Date in a "YYYY-MM-DD H:i:s" String.
 * 
 * @param err {Error|null}
 */
DBAdapterAbstract.prototype._stringifyDate = function( javascriptDate )
{
  
  var year = javascriptDate.getFullYear()
    , month = ( javascriptDate.getUTCMonth() + 1 )
    , day = javascriptDate.getUTCDate()
    , hours = javascriptDate.getUTCHours()
    , minutes = javascriptDate.getUTCMinutes()
    , seconds = javascriptDate.getUTCSeconds();
  
  if( month.toString().length==1 ) month = '0' + month ;
  if( day.toString().length==1 ) day = '0' + day ;
  if( hours.toString().length==1 ) hours = '0' + hours ;
  if( minutes.toString().length==1 ) minutes = '0' + minutes ;
  if( seconds.toString().length==1 ) seconds = '0' + seconds ;
  
  return year + '-' + month + '-' + day +' ' + hours + ':' + minutes + ':' + seconds;
  
};


/**
 * Triggers the initialization callback function and emits a "connection" Event.
 * 
 * @param err {Error|null}
 */
DBAdapterAbstract.prototype._onConnectionInitialization = function( err )
{
  
  if( this._debug )
    console.log('_onConnectionInitialization('+err+')');
  
  this.emit( 'connection', err );
  
};

// vim: sw=2 ts=2 et
