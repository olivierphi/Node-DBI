/**
 * Adapter for Development Seed's "sqlite3" API.
 * @see https://github.com/developmentseed/node-sqlite3
 * @see http://developmentseed.org/
 * 
 * @author Dr. Benton - github.com/DrBenton
 * @see https://github.com/DrBenton/Node-DBI
 */

// ------------------------------------- modules

var async = require('async')
  , util = require('util')
  , _ = require('underscore')
  , DBAdapterAbstract = require('../dbAdapterAbstract').DBAdapterAbstract
  , DBExpr = require('../dbExpr').DBExpr
  , sqlite3 = require('sqlite3');

//------------------------------------- constructor

/**
 * @param {DBWrapper} dbWrapper
 * @param {Object} connectionParams
 */
function Adapter( dbWrapper, connectionParams )
{
  
  this._dbClient = null;
  /**
   * @type boolean
   */
  this._debug = false; 
  /**
   * @type Integer
   */
  this._lastInsertId = null;
  
  // "Super" constructor is called
  DBAdapterAbstract.call( this, dbWrapper, connectionParams );
  
}

util.inherits(Adapter, DBAdapterAbstract);


//------------------------------------- static stuff

/**
 * @param {DBWrapper} dbWrapper
 * @param {Object} connectionParams
 * @api public
 * @static
 */
Adapter.createInstance = function( dbWrapper, connectionParams )
{
  return new Adapter( dbWrapper, connectionParams );
};

module.exports.createInstance = Adapter.createInstance;


//------------------------------------- public methods


/**
* @api public
*/
Adapter.prototype.connect = function()
{
  
  if( this._debug )
    console.log('Adapter.prototype.connect('+JSON.stringify(this._connectionParams)+')');
  
  _.defaults( this._connectionParams, {
    path:     ':memory:'
  } );
  
  this._dbClient = new sqlite3.Database( this._connectionParams.path, _.bind( this._onConnectionInitialization, this ) );
  
};


/**
 * @api public
 */
Adapter.prototype.close = function( callback )
{
  
  if( this._debug )
    console.log('Adapter.prototype.close('+JSON.stringify(this._connectionParams)+')');
  
  if(this._dbClient)
    this._dbClient.close( callback );
  else
    callback( new Error('Cannot close connection, since it is not connected') );
  
};


/**
 * @param {String}  sql
 * @param {Array|null}  bind
 * @param {Function|null}  callback
 * @api public
 */
Adapter.prototype.query = function( sql, bind, callback )
{
  
  if( this._debug )
    console.log('sql='+sql);
  
  // Some aliases for the async scope...
  var me = this;
  var _dbClient = this._dbClient;
  var _stringifyDate = this._stringifyDate;
  
  // Go! Go! Go!
  async.waterfall(
      
    [
      function( callback )
      {
        // Since SQLite doesn't handle Date, we have to do it manually
        _.each( bind, function(value, key) {
          if( value instanceof Date )
            bind[key] = _stringifyDate( value );
        });
        _dbClient.run( sql, bind, callback );
      }
    ],
    
    function( err )
    {
      
      // this = statement object
      
      if( ! callback )
        return;

      if( err )
        callback( err );
      else
      {
        
        if( this.lastID && ! isNaN(this.lastID) && this.lastID>0 )
          me._lastInsertId = this.lastID;
        
        callback( null, this.changes );   
        
      }
    }
  );
  
};


/**
 * @param {String}  sql
 * @param {Array|null}  bind
 * @param {Function|null}  callback
 * @api public
 */
Adapter.prototype.fetchAll = function( sql, bind, callback )
{
  
  if( this._debug )
    console.log('sql='+sql);
  
  // Go! Go! Go!  
  this._dbClient.all( sql, bind, callback );
  
};

/**
 * @rturn {Integer|null}  the last inserted Id
 * @api public
 */
Adapter.prototype.getLastInsertId = function()
{
  return this._lastInsertId; 
};


/**
 * @param {String}  value
 * @rturn {String}  the escaped value
 * @api public
 */
Adapter.prototype.escape = function( value )
{
  if( typeof(value)=='object' && (value instanceof Date) )
    return "'" + this._stringifyDate(value) + "'";
  else if( typeof(value)=='object' && (value instanceof DBExpr) )
    return value.getStr();
  else if( isNaN(value) || value === '' )
    return "'" + value.replace(/'/g, "''") + "'";
  else
    return value;
};

