/**
 * @class DBSelect
 * @author Dr. Benton - www.dr-benton.com
 * @see https://github.com/DrBenton/Node-DBI
 */

// ------------------------------------- modules

var _ = require('underscore')
  , DBWrapper = require('./dbWrapper');


// ------------------------------------- constructor

/**
 * @param {DBAdapterAbstract} adapter
 */
function DBSelect( adapter )
{
  
  /**
   * DBAdapterAbstract
   */
  this._adapter = adapter;
  
  this._what = [];
  this._from = [];
  this._where = [];
  //this._group = null;
  this._order = [];
  this._limit = [];
  
}

module.exports.DBSelect = DBSelect;


//------------------------------------- public methods


/**
 * Adds a FROM clause and associated fields to fetch.
 * 
 * @param {String|Array}    The table name
 * @param {String|Array}    The fields to select (if null, '*' will be used)
 * @returns {DBSelect}
 */
DBSelect.prototype.from = function( tableName, fieldsArray )
{
  
  if( ! tableName )
    throw new Error('Table name is mandatory !');

  fieldsArray = fieldsArray || '*' ;
  
  if( typeof(fieldsArray)=='string' )
    fieldsArray = [ fieldsArray ];
  
  this._from.push( '`'+tableName+'`' );
  
  for( var i=0, j=fieldsArray.length; i<j; i++ )
  {
    var currentField = fieldsArray[i];
    
    if( currentField.match(/\(.*\)/) )
      this._what.push( currentField );//this is a SQL function, like COUNT(), CONCAT(), etc : no table prefix and no escaping
    else if( '*' == currentField )
      this._what.push( '`'+tableName+'`.'+ currentField );//this is a the wildcard : table prefix, but no escaping
    else
      this._what.push( '`'+tableName+'`.`'+ currentField + '`' );//others : table prefix + escaping
    
  }
  
  return this;
  
};


/**
 * Adds a WHERE clause.
 * 
 * @param {String}  whereStr
 * @param {String|Number|null}  value
 * @returns {DBSelect}
 */
DBSelect.prototype.where = function( whereStr, value )
{
  
  if( ! whereStr )
    throw new Error('WHERE String is mandatory !');
  
  if( value )
    whereStr = whereStr.replace( /\?/g, this._adapter.escape(value) );
  
  this._where.push( whereStr );
  
  return this;
  
};


/**
 * Adds a LIMIT clause.
 * 
 * @param {Integer}  nbResults
 * @param {Integer}  startIndex
 * @returns {DBSelect}
 */
DBSelect.prototype.limit = function( nbResults, startIndex )
{
  
  if( isNaN(nbResults) )
    throw new Error('Incorrect LIMIT "'+nbResults+'" !');
  
  if( startIndex )
    this._limit = [ startIndex, nbResults ];
  else
    this._limit = [ nbResults ];
  
  return this;
  
};


/**
 * Adds a ORDER BY clause.
 * 
 * @param {String}  fieldName
 * @param {ASC|DESC}  direction
 * @returns {DBSelect}
 */
DBSelect.prototype.order = function( fieldName, direction )
{
  
  if( ! direction )
    direction = 'ASC' ;
  else if( direction.toUpperCase()!='ASC' && direction.toUpperCase()!='DESC' )
    throw new Error('Incorrect direction "'+direction+'" !  (should be ASC or DESC)');
  
  this._order.push( '`' + fieldName + '` ' + direction );
  
  return this;
  
};


/**
 * Converts this object to an SQL SELECT string.
 * 
 * @returns String
 */
DBSelect.prototype.assemble = DBSelect.prototype.toString = function()
{
  
  var completeQuery = (this._what.length > 0) ? true : false ;
  
  var sql = ( completeQuery ) ? 'SELECT ' : '';
  
  // Requested fields : this._what
  if( completeQuery )
    sql += this._what.join(', ');

  // "FROM" clause : this._from
  if( this._from.length > 0 )
  {
    this._from = _.unique( this._from );
    sql += ' FROM ' + this._from.join(', ');
  }
    
  // "WHERE" clause : this._where
  if( this._where.length > 0 )
  {
    this._where = _.unique( this._where );
    sql += ( (completeQuery) ? ' WHERE ' : '' ) + this._where.join(' AND ');
  }
 
  //"ORDER BY" clause : this._order
  if( this._order.length > 0 )
    sql += ' ORDER BY ' + this._order.join(', ');
  
  // "GROUP BY" clause : this._group
  //if( this._group && this._group.length>0 )
  //  sql += ' GROUP BY ' + this._group;
 
  // "LIMIT" clause : this._limit
  if( this._limit.length > 0 )
    sql += ' LIMIT ' + this._limit.join(', ');
 
  return sql;

};


/**
 * Executes a "DBWrapper.fetchAll()" over this DBSelect.
 * @see DBWrapper 
 * @param {Function} callback 
 */
DBSelect.prototype.fetchAll = function( callback )
{
  this._adapter.getDBWrapper().fetchAll( this, [], callback );
};


/**
 * Executes a "DBWrapper.fetchRow()" over this DBSelect.
 * @see DBWrapper 
 * @param {Function} callback 
 */
DBSelect.prototype.fetchRow = function( callback )
{
  this._adapter.getDBWrapper().fetchRow( this, null, callback );
};


/**
 * Executes a "DBWrapper.fetchCol()" over this DBSelect.
 * @see DBWrapper 
 * @param {Function} callback 
 */
DBSelect.prototype.fetchCol = function( callback )
{
  this._adapter.getDBWrapper().fetchCol( this, null, callback );
};


/**
 * Executes a "DBWrapper.fetchOne()" over this DBSelect.
 * @see DBWrapper 
 * @param {Function} callback 
 */
DBSelect.prototype.fetchOne = function( callback )
{
  this._adapter.getDBWrapper().fetchOne( this, null, callback );
};

//------------------------------------- private methods

