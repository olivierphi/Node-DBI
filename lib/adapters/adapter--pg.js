/**
 * Adapter for brianc's "pg" API.
 * @see https://github.com/brianc/node-postgres
 * 
 * @author Fabian Bornhofen
 * @see https://github.com/fbornhofen
 *
 * This adapter is obviously a copy of the SQLite3 adapter
 * and not does not work yet.
 */

// ------------------------------------- modules

var async = require('async')
  , util = require('util')
  , _ = require('underscore')
  , DBAdapterAbstract = require('../dbAdapterAbstract').DBAdapterAbstract
  , DBExpr = require('../dbExpr').DBExpr
  , pg = require('pg');

//------------------------------------- constructor

/**
 * @param {DBWrapper} dbWrapper
 * @param {Object} connectionParams
 */
function Adapter( dbWrapper, connectionParams )
{
  if (this._debug) 
    console.log("Creating pg adapter");  
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
  dbWrapper.isPostgres = true;
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
  
 // _.defaults( this._connectionParams, {
 //   path:     ':memory:'
 // } );
  
  var cfg = this._connectionParams;
  this._pgUrl = 'pg://' + cfg.user + ':' + cfg.password + '@' + cfg.host + '/' + cfg.database;
  console.log('connecting to ' + this._pgUrl);
  var that = this;
  pg.connect(this._pgUrl, function(err, client) {
    if (err) {
      console.log('ERROR: connect: ' + err);
    }
    (_.bind(that._onConnectionInitialization, that))(err);
    that._dbClient = client;
  });
};


/**
 * @api public
 */
Adapter.prototype.close = function(callback)
{
  
  if( this._debug )
    console.log('Adapter.prototype.close('+JSON.stringify(this._connectionParams)+')');
  
  if(this._dbClient) {
    this._dbClient.end();
    callback(null);
  }
  else
    callback(new Error('Cannot close connection, since it is not connected'));
  
};


/**
 * @param {String}  sql
 * @param {Array|null}  bind
 * @param {Function|null}  callback
 * @api public
 */
Adapter.prototype.query = function( sql, bind, callback )
{
  
  sql = this._format(sql, bind);
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
        _dbClient.query( sql, callback );
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
  
  this._dbClient.query(sql, function(err, res) {
    var rows = res["rows"];
    if (!rows)
      rows = [];
    callback(err, rows);
  });
  
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
  else if( isNaN(value) )
    return "'" + value.replace(/'/g, "''") + "'";
  else
    return value;
};

