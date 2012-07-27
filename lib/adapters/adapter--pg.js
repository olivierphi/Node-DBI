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

  // By default run in ansiCompliant mode
  if (connectionParams["ansiCompliant"] === undefined) 
    connectionParams["ansiCompliant"] = true;
  
  // "Super" constructor is called
  DBAdapterAbstract.call( this, dbWrapper, connectionParams );
  var cfg = this._connectionParams;
  this._pgUrl = 'pg://' + cfg.user + ':' + cfg.password + '@' + cfg.host + '/' + cfg.database;
  this._dbClient = new pg.Client(this._pgUrl);
  
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
  
  var that = this;
  this._dbClient.connect(function(err, client) {
    if (err) {
      console.log('ERROR: connect: ' + err);
    }
    //that._dbClient = client;
    (_.bind(that._onConnectionInitialization, that))(err);
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
  
  var origSql = sql;
  sql = this.ensureStandardSql(sql);
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
    
    function( err, res )
    {
      //if (err) {
      if (this._debug) {
        console.log('O: ' + origSql);
        console.log('S: ' + sql);
        console.log('E: ' + JSON.stringify(err));
        console.log('R: ' + JSON.stringify(res));
      }

      // this = statement object
      
      if( ! callback )
        return;

      if( err )
        callback( err );
      else
      {
        
        //if( this.lastID && ! isNaN(this.lastID) && this.lastID>0 )
        //  me._lastInsertId = this.lastID;
        
        // TODO could save OID here        

        var changes = (res["rowCount"] ? res["rowCount"] : 0);
        callback( null, changes );   
        
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
  
  sql = this.ensureStandardSql(sql);
  sql = this._format(sql, bind);

  if( this._debug )
    console.log('sql='+sql);
  
  this._dbClient.query(sql, function(err, res) {
    var rows;
    // TODO decent exception handling
    if (!res || !res["rows"])
      rows = [];
    else 
      rows = res["rows"];
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


/**
 * @param {String}  sql
 * @rturn {String}  stan
 * @api private
 */
Adapter.prototype.removeBackticksFromTableNames = function( sql ) 
{
  // TODO this is neither clean nor sufficient nor fast
  sql = sql
    .replace(/from\s*`([^`]*)`/i, 'FROM $1')
    .replace(/^\s*insert\s*into\s*`([^`]*)`/i, 'INSERT INTO $1')
    .replace(/^\s*update\s*`([^`]*)`/i, 'UPDATE $1')
    .replace(/^\s*drop\s*table\s*`([^`]*)`/i, 'DROP TABLE $1');
  return sql;
};


/** 
 * @param {String} sql
 * @rturn standard-compliant SQL
 * @api private
 */
Adapter.prototype.ensureStandardSql = function( sql )
{
  // removeBackticksFromTableNames is expensive.
  // Users can opt to only write standard compliant queries and skip it.
  if (this._connectionParams["ansiCompliant"]) {
    return sql;
  }
  return this.removeBackticksFromTableNames(sql);
};

/**
 * escape a tableName appropriately - PostgreSQL requires value passed straight through
 * @param {String}  value
 * @rturn {String}  the escaped value
 * @api public
 */
DBAdapterAbstract.prototype.escapeTable = function( value )
{
  return value;
};

/**
 * escape a fieldName appropriately - MySQL uses backticks some others don't escape at all.
 * @param {String}  value
 * @rturn {String}  the escaped value
 * @api public
 */
DBAdapterAbstract.prototype.escapeField = function( value )
{
  return value;
};

/**
 * @rturn {DBSelect} 
 */
// TODO implement this
//Adapter.prototype.getSelect = function() {
//  throw ('getSelect to be implemented. Or remove backticks from table name in DBSelect.');
//};

// vim: ts=2 sw=2 et
