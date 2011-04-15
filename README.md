# Node-DBI

Node-DBI is a SQL database abstraction layer library, strongly inspired by the PHP Zend Framework [Zend_Db API](http://framework.zend.com/manual/en/zend.db.html).
It provides unified functions to work with multiple database engines, through Adapters classes.
At this time, supported engines are [mysql](https://github.com/felixge/node-mysql), [mysql-libmysqlclient](https://github.com/Sannis/node-mysql-libmysqlclient) and [sqlite3](adapter--sqlite3.js), but other engines adapters should be easy to add - well, this is the goal of this library , after all :-)

It provides __DBWrapper__ and __DBSelect__ Javascript classes, described later on this document.

## Some Examples

Node-DBI is not only an abstraction layer which allows you to change your DB engine during a project  if you have to, wihout having to rewrite anything.
Its __fetch*__, __insert__, __update__, __remove__ methods, and its __DBSelect__ component can really help you to write your database related code more quickly.

See how :

    var DBWrapper = require('node-dbi').DBWrapper; 
    var dbConnectionConfig = { host: 'localhost', user: 'test', password: 'test', database: 'test' };
    
    // Replace [engine adapter name] with "mysql", "mysql-libmysqlclient" or "sqlite3" on the following line :
    dbWrapper = new DBWrapper( '[engine adapter name]', dbConnectionConfig );
    
    
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
    
    // ** fetchCol
    dbWrapper.fetchCol('SELECT first_name FROM user ORDER BY fist_name', [], function(err, result) {
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
    
    // ** insert
    dbWrapper.insert('user', { first_name: 'John', last_name: 'Foo', rank: '3' } , function(err) {
      if( ! err )
        console.log( 'John ID : ' + dbWrapper.getLastInsertId() );
      // John has been inserted in our table, with its properties safely escaped
    } );
    
    // ** update  ( here the fist name is used as a raw String, but the last name is safely escaped ) 
    dbWrapper.update('user', { rank: '1' } , [ 'first_name=\'John\'', ['last_name=?', 'Foo] ], function(err) {
      // John is now our best user. Congratulations, John !
    } );
    
    // ** remove  ( this time, both values are safely escaped ) 
    dbWrapper.remove('user', [ ['first_name LIKE ?', '%John%'], ['last_name=?', 'Foo] ] , function(err) {
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
    console.log( select.assemble() );
      
    // You can use you DBSelect with a "fetch" method...
    dbWrapper.fetchAll( select, function(err) {} );
    
    // ..or you can trigger a "fetch" method directly  on it ! 
    select.fetchAll( function(err) {} );
    
    
You can look the unit tests in the "test/" folder to see more examples.
           

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

All these methods returns the sames results, whatever the chosen database engine is.  


## DBSelect Class

Furthermore, Node-DBI provides a DBSelect class which allows easy and readable SQL "SELECT" Strings building. It provides the following methods :

 * __from( tableName, fieldsArray )__ : adds a table in the FROM clause, and adds its fields to the SELECT
 * __where( whereStr, value )__ : adds a WHERE clause ; if "value" is not null, all the "?" occurences of the "whereStr" will be replaced with the safely escaped value
 * __limit( nbResults, startIndex )__ : set the LIMIT clause ; "startIndex" param is optionnal
 * __order( fieldName, direction )__ : adds a ORDER BY clause ; if "direction" is not set, it will be set to "ASC"
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
 * [sqlite3](adapter--sqlite3.js)
 
Any SQL database engine should be added, with only a quick Adapter writing. See the existing Adapters or contact me for help, if you want to add one !
  