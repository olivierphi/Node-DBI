/**
 * @class DBSelect
 * @author Dr. Benton - www.dr-benton.com
 * @see https://github.com/DrBenton/Node-DBI
 */

// ------------------------------------- modules

var _ = require('underscore')
  , DBExpr = require('./dbExpr').DBExpr;


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
  this._join = [];
  this._where = [];
  this._group = null;
  this._order = [];
  this._limit = [];
  
  this._distinct = false;
  
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
  
  if( ! _.isArray(fieldsArray) )
    fieldsArray = [ fieldsArray ];

  var escapedTableName = this._adapter.escapeTable( tableName );

  this._from.push( escapedTableName );
  
  for( var i=0, j=fieldsArray.length; i<j; i++ )
  {
    var currentField = fieldsArray[i];
    
    if( typeof(currentField)=='object' && (currentField instanceof DBExpr) )
      this._what.push( currentField.getStr() );//this is a SQL function, like COUNT(), CONCAT(), etc : no table prefix and no escaping
    else if( '*' == currentField )
      this._what.push( escapedTableName+'.'+ currentField );//this is a the wildcard : table prefix, but no escaping
    else {
      //others : table prefix + escaping
      this._what.push( escapedTableName+'.'+ this._adapter.escapeField(currentField) );	}
  }
  
  return this;
  
};


/**
 * Adds a WHERE clause.
 * 
 * @param {String}  whereStr
 * @param {String|Number|Array|null}  value
 * @returns {DBSelect}
 */
DBSelect.prototype.where = function( whereStr, value )
{
  
  if( ! whereStr )
    throw new Error('WHERE String is mandatory !');
  
  if( value ) {
	if(_.isArray(value))
		value = value.map((function (v) { return this._adapter.escape(v); }).bind(this)).join(', ');
	else
		value = this._adapter.escape(value);

	whereStr = whereStr.replace( /\?/g, value );
  }

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
  
  this._order.push( this._adapter.escapeField(fieldName) + ' ' + direction );
  
  return this;
  
};


/**
 * Adds a JOIN clause and associated fields to fetch.
 * 
 * @param {String|Array}    The joined table name
 * @param {String}          The join clause
 * @param {String|Array}    The fields to select on the joined table (if null, '*' will be used)
 * @param {String}          The join type (INNER, LEFT or RIGHT) - INNER if omitted
 * @returns {DBSelect}
 */
DBSelect.prototype.join = function( tableName, joinStr, fieldsArray, joinType )
{
  
  if( ! tableName )
    throw new Error('Table name is mandatory !');
  else if( ! joinStr )
    throw new Error('Join clause is mandatory !');

  fieldsArray = fieldsArray || '*' ;
  joinType = joinType || 'INNER' ;
  
  if( ! _.isArray(fieldsArray) )
    fieldsArray = [ fieldsArray ];
  
  this._join.push( joinType + ' JOIN '+this._adapter.escapeTable(tableName)+' ON ' + joinStr );
  
  for( var i=0, j=fieldsArray.length; i<j; i++ )
  {
    var currentField = fieldsArray[i];
    
    if( typeof(currentField)=='object' && (currentField instanceof DBExpr) )
      this._what.push( currentField.getStr() );//this is a SQL function, like COUNT(), CONCAT(), etc : no table prefix and no escaping
    else if( '*' == currentField )
      this._what.push( this._adapter.escapeTable(tableName)+'.'+ currentField );//this is a the wildcard : table prefix, but no escaping
    else
      this._what.push( this._adapter.escapeTable(tableName)+'.'+ this._adapter.escapeField(currentField) );//others : table prefix + escaping
    
  }
  
  return this;
  
};


/**
 * Adds a DISTINCT() on the SQL fields query.
 * 
 * @returns {DBSelect} 
 */
DBSelect.prototype.distinct = function()
{
  
  this._distinct = true;
  
  return this;
  
};


/**
 * Adds a "GROUP BY" clause.
 * 
 * @returns {DBSelect} 
 */
DBSelect.prototype.groupBy = function( fieldName )
{
  
  this._group = fieldName;
  
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
  {
    if( this._distinct )
      sql += 'DISTINCT(' + this._what.join(', ') +') ';
    else
      sql += this._what.join(', ');
  }

  // "FROM" clause : this._from
  if( this._from.length > 0 )
  {
    this._from = _.unique( this._from );
    sql += ' FROM ' + this._from.join(', ');
  }
  
  // "JOIN" clause : this._join
  if( this._join.length > 0 )
  {
    this._join = _.unique( this._join );
    sql += '  ' + this._join.join(' ');
  }
    
  // "WHERE" clause : this._where
  if( this._where.length > 0 )
  {
    this._where = _.unique( this._where );
    sql += ( (completeQuery) ? ' WHERE ' : '' ) + this._where.join(' AND ');
  }
  
  // "GROUP BY" clause : this._group
  if( this._group && this._group.length>0 )
    sql += ' GROUP BY ' + this._group;
  
 
  //"ORDER BY" clause : this._order
  if( this._order.length > 0 )
    sql += ' ORDER BY ' + this._order.join(', ');
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
// vim: ts=2 sw=2 et
