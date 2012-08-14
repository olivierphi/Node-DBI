# Node-DBI

Node-DBI is a SQL database abstraction layer library, strongly inspired by the PHP Zend Framework [Zend_Db API](http://framework.zend.com/manual/en/zend.db.html).
It provides unified functions to work with multiple database engines, through Adapters classes.
At this time, supported engines are [mysql](https://github.com/felixge/node-mysql), [mysql-libmysqlclient](https://github.com/Sannis/node-mysql-libmysqlclient), [sqlite3](https://github.com/developmentseed/node-sqlite3) and [pg](http://github.com/brianc/node-postgres).

It provides __DBWrapper__ and __DBSelect__ Javascript classes, described later on this document.

## Usage

Node-DBI is primarily an abstraction layer library ; it allows you to have a "database-agnostic" application, with a single API for multiple databases engines.

It provides high-level functions to fecth, insert, update and remove data from the database.
It is also bundled with a __DBSelect__ component, used to build SQL queries in a more readable, more flexible and more secure (thanks to is params escaping policy) way than long SQL strings.

Node-DBI imitates the API of the great Open Source PHP database abstraction layer of the [Zend Framework](http://framework.zend.com/), [Zend_Db](http://framework.zend.com/manual/en/zend.db.html), used by thousands of Web developers for several years.

The example below demonstates the Node-DBI usage:
(you can also look this [Gist](https://gist.github.com/923149) for the same code with syntax highlighting)

```javascript
var DBWrapper = require('node-dbi').DBWrapper; 
var DBExpr = require('node-dbi').DBExpr; 
var dbConnectionConfig = { host: 'localhost', user: 'test', password: 'test', database: 'test' };

// Replace the adapter name with "mysql", "mysql-libmysqlclient", "sqlite3" or "pg" on the following line :
dbWrapper = new DBWrapper( '[DB engine adapter name]', dbConnectionConfig );


// ** fetchAll
dbWrapper.fetchAll('SELECT * FROM user', null, function(err, result) {
	if( ! result )
		console.dir(result);
	// "result" is an Array with a hash for every returned row
} );

// ** fetchRow ( +  a safely escaped value ) 
dbWrapper.fetchRow('SELECT * FROM user WHERE first_name=?', ['John'], function(err, result) {
	if( ! result )
		console.dir(result);
	// this time, "result" is a single hash (the first returned row)
} );

// ** fetchCol  (if you dont' have values to escape, the 2nd param can be an empty Array or "null")
dbWrapper.fetchCol('SELECT first_name FROM user ORDER BY fist_name', null, function(err, result) {
	if( ! err )
		console.dir(result);
	// "result" is an Array with all the names of our users, sorted alphabetically
} );

// ** fetchOne
dbWrapper.fetchOne('SELECT fist_name FROM user ORDER BY rank DESC LIMIT 1', [], function(err, result) {
	if( ! err )
		console.dir(result);
	// "result" is the first_name of our best user
} );

// ** insert   (DBExpr force somes values to be used "as is", without safe escape : it is useful for SQL functions like "NOW()", "COUNT(*)", "SUM(rank)"... )
var JohnData = { first_name: 'John', last_name: 'Foo', rank: '3', date_created: new DBExpr('NOW()') };
dbWrapper.insert('user', JohnData , function(err) {
	if( ! err )
		console.log( 'John ID : ' + dbWrapper.getLastInsertId() );
	// John has been inserted in our table, with its properties safely escaped
} );

// ** update  ( here the fist name is used as a raw String, but the last name is safely escaped ) 
var JohnDataUpdate = { rank: '1' };
	dbWrapper.update('user', JohnDataUpdate , [ 'first_name=\'John\'', ['last_name=?', 'Foo'] ], function(err) {
	// John is now our best user. Congratulations, John !
} );

// ** remove  ( this time, both values are safely escaped ) 
dbWrapper.remove('user', [ ['first_name LIKE ?', '%John%'], ['last_name=?', 'Foo'] ] , function(err) {
	// John left at the height of its glory.
} );


// Easy SQL String building
var select = dbWrapper.getSelect()
	.from('user', ['first_name', 'last_name'] )
	.where( 'enabled=1' )
	.where( 'id=?', 10 )
	.where( 'last_name LIKE ?', '%Foo%' )
	.order( 'last_name' )
	.limit( 10 );

if( req.params.onlyVerifiedAccounts )
	select.where('verified=1');

console.log( select.assemble() );//outputs the SQL query for debug purpose 

// You can retrieve the data of this DBSelect with a "fetch" method...
dbWrapper.fetchAll( select, function(err) {} );

// ..or you can trigger a "fetch" method directly on it ! 
select.fetchAll( function(err) {} );


// When you have finished working with the database, you can close the connection
dbWrapper.close( function(err) {console.log('Connection closed !');} );
```    
    
See the unit tests in the "test/" folder for more examples.
           

## DBWrapper Class

The __DBWrapper__ Javascript class, which is the only visible part on top on the different database engines adapters, provides the following methods :

 * __fetchAll( sql, bind, callback )__ : fetches all SQL result rows as a Array.
 * __fetchRow( sql, bind, callback )__ : fetches the first row of the SQL result.
 * __fetchCol( sql, bind, callback )__ : fetches the first column of all SQL result rows as an Array.
 * __fetchOne( sql, bind, callback )__ : fetches the first column of the first row of the SQL result.
 * __insert( tableName, data, callback )__ : inserts a table row with specified data, as a hash.
 * __update( tableName, data, where, callback )__ : updates table rows with specified data (as a hash) based on a WHERE clause.
 * __remove( tableName, where, callback )__ : deletes table rows based on a WHERE clause.
 * __getLastInsertId()__ : returns the last inserted Id
 * __isConnected()__ : tells us if the DbWrapper is connected to its database. 
 * __getSelect()__ : returns a DBSelect

All these methods returns exactly the sames results, whatever the chosen database engine is.  


## DBSelect Class

Furthermore, Node-DBI provides a DBSelect class which allows easy and readable SQL "SELECT" Strings building. At the moment, it provides the following methods :

 * __from( tableName, fieldsArray )__ : adds a table in the FROM clause, and adds its fields to the SELECT
 * __where( whereStr, value )__:  
     * adds a WHERE clause using AND 
     * if __value__ is not null, all the "?" occurences in __whereStr__ will be replaced with the safely escaped value
     * __value__ may be an array, it will be mapped to a parenthesized SQL list
     * the clause will be surrounded with parenthesis in the generated SQL, this way ```.where('id=? OR name=?')``` will work like it does in ZendDb.
 * __orWhere( whereStr, value )__ : just like __where__ but adds a WHERE clause using OR
 * __whereGroup( num )__ : 
   * opens __num__ parenthetical groupings to WHERE clause (ie adds __num__ open parentheses) 
   * __num__ defaults to 1
 * __whereGroupClose( num )__ :  
   * closes __num__ parenthetical groupings of WHERE clause (ie adds __num__ closed parentheses)
   * __num__ defaults to 1
   * will not close groups that do not exist
   * open groups will be closed automatically
 * __limit( nbResults, startIndex )__ : 
   * set the LIMIT clause 
   * __startIndex__ param is optional
 * __order( fieldName, direction )__ : 
   * adds a ORDER BY clause 
   * if __direction__ is not set, it will be set to "ASC"
 * __join( tableName, joinStr, fieldsArray, joinType )__ : 
   * adds a JOIN clause 
   * if __joinType__ is not set, it will be set to "INNER"
 * __distinct()__ : adds a DISTINCT() to the query
 * __groupyBy( fieldName )__ : adds a GROUPY BY clause
 * __assemble()__ : converts ou DBSelect object to an SQL SELECT string.


## Install

You can clone the project from [GitHub](https://github.com/DrBenton/Node-DBI).
Alternatively, you can install using Node Package Manager (npm):

    npm install node-dbi
    
This is a first version ; all my unit tests run successfully, but it may have bugs. Tell me if you find one ! :-)


## Dependencies

Thanks to these great modules, which Node-DBI relies on :

 * [async](https://github.com/caolan/async)
 * [underscore](https://github.com/grayrest/underscore)
 * [vows](https://github.com/cloudhead/vows) for the unit tests

And of course, these database engines, which makes the really hard work in Node-DBI :

 * [mysql](https://github.com/felixge/node-mysql)
 * [mysql-libmysqlclient](https://github.com/Sannis/node-mysql-libmysqlclient)
 * [sqlite3](https://github.com/developmentseed/node-sqlite3)
 * [pg](http://github.com/brianc/node-postgres)
 
Any SQL database engine can theorically be added, with only a quick Adapter writing. See the existing Adapters or contact me for help, if you want to add one !

## Testing

To run tests manual DB configuration is required first.

MySQL is expected to be available on localhost with user, pass and DB all set to "test".

E.g. this should work:

	$ mysql -hlocalhost -utest -ptest test

This can usually be achieved by installing mysql and at the mysql interactive prompt issuing the following commands:

	mysql> create database test;
	Query OK, 1 row affected (0.00 sec)
	mysql> grant all on test.* to 'test'@'localhost' identified by 'test';
	Query OK, 0 rows affected (0.08 sec)

PostgreSQL is similar to MySQL, e.g. this should work:

	$ $ psql -U test -W test
	Password for user test: (manually typing "test" here)

Once PostgreSQL is installed this can usually be achieved with by issuing the following commands at the psql interactive prompt:

	postgres=# create user test password 'test';
	CREATE ROLE
	postgres=# create database test owner test;
	CREATE DATABASE

## Driver Differences

Currently the PostgreSQL driver does not support getLastInsertId().

MySQL drivers return JavaScript Date objects when the table data is a date, other drivers do not.

## License

Node-DBI is licensed under the MIT license.
