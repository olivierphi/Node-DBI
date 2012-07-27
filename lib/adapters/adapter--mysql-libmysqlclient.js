/**
 * Adapter for Sannis's "mysql-libmysqlclient" API.
 * @see https://github.com/Sannis
 * @see https://github.com/Sannis/node-mysql-libmysqlclient
 * 
 * @author Dr. Benton - github.com/DrBenton
 * @see https://github.com/DrBenton/Node-DBI
 */

// ------------------------------------- modules

var async = require('async')
  , util = require('util')
  , _ = require('underscore')
  , DBAdapterAbstract = require('../dbAdapterAbstract').DBAdapterAbstract
  , DBExpr = require('../dbExpr').DBExpr;

//------------------------------------- constructor

/**
 * @param {DBWrapper} dbWrapper
 * @param {Object} connectionParams
 */
function Adapter( dbWrapper, connectionParams )
{
  
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
Adapter.prototype.connect = function( callback )
{
  
  if( this._debug )
    console.log('Adapter.prototype.connect('+JSON.stringify(this._connectionParams)+')');
  
  _.defaults( this._connectionParams, {
    host:     'localhost',
    port:     3306,
    user:     null,
    password: null,
    database: null
  } );
  
  this._connectionCallback = callback;
  
  this._dbClient = require('mysql-libmysqlclient').createConnectionSync();
  this._dbClient.connect(
      this._connectionParams.host,
      this._connectionParams.user,
      this._connectionParams.password,
      this._connectionParams.database,
      this._connectionParams.port,
      _.bind( this._onConnectionInitialization, this )
   );
  
};


/**
 * @api public
 */
Adapter.prototype.close = function( callback )
{
  
  if( this._debug )
    console.log('Adapter.prototype.close('+JSON.stringify(this._connectionParams)+')');
  
  if(this._dbClient)
  {
    this._dbClient.closeSync();
    callback( null );
  }
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
  
  // SQL values are safely escaped  
  sql = this._format(sql, bind);
  
  if( this._debug )
    console.log('sql='+sql);
  
  // Some aliases for the async scope...
  var me = this;
  var _dbClient = this._dbClient;
  
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
      
      if( ! callback )
        return;

      if( err )
        callback( err );
      else
      {
        
        if( res.insertId && ! isNaN(res.insertId) && res.insertId>0 )
          me._lastInsertId = res.insertId;
        
        callback( null, res.affectedRows );   
        
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
  
  // SQL values are safely escaped
  sql = this._format(sql, bind);
  
  // Some aliases for the async scope...
  var query = _.bind( this.query, this );
  var _dbClient = this._dbClient;
  var _debug = this._debug;
  
  
  if( _debug )
    console.log('sql='+sql);
  
  // Go! Go! Go!  
  async.waterfall(
      
    [
     function( callback )
     {
       _dbClient.query( sql, callback );
     },
     function( res, callback )
     {
       res.fetchAll(callback);
     }
    ],
    
    function( err, rows, fields )
    {
      
      if( _debug )
      {
        console.log('rows='+JSON.stringify(rows));
        console.log('fields='+JSON.stringify(fields));
      }
      
      callback && callback( err, rows );
      
    }
    
  );
  
};

/**
 * @returns {Integer|null}  the last inserted Id
 * @api public
 */
Adapter.prototype.getLastInsertId = function()
{
  return this._lastInsertId;
};


/**
 * @param {String}  value
 * @rturns {String}  the escaped value
 * @api public
 */
Adapter.prototype.escape = function( value )
{
  if( typeof(value)=='object' && (value instanceof Date) )
    return "'" + this._stringifyDate(value) + "'";
  else if( typeof(value)=='object' && (value instanceof DBExpr) )
    return value.getStr();
  else if( isNaN(value) || value === '' )
    return "'" + this._dbClient.escapeSync( value ) + "'";
  else
    return value;
};


