/**
 * Adapters simple operations test suite.
 * 
 * Tested features :
 *  - dbAdapter.query()
 *  - dbAdapter.insert()
 *  - dbAdapter.update()
 *  - dbAdapter.remove()
 *  - dbAdapter.getLastInsertId()
 *  - dbAdapter.fetchAll()
 *  - dbAdapter.fetchRow()
 *  - dbAdapter.fetchCol()
 *  - dbAdapter.fetchOne()
 *  
 * @author Dr. Benton - github.com/DrBenton
 * @see https://github.com/DrBenton/Node-DBI
 */


var vows = require('vows')
  , assert = require('assert')
  , async = require('async')
  , _ = require('underscore')
  , config = require('./config')
  , nodeDBI = require('../index.js')
  , util = require('util');


var testedAdapterNames = [
  'mysql-libmysqlclient',              
  'mysql',             
  'sqlite3',
  'pg'         
];


var getTableCreationSql = function( adapterName, tableName )
{

  switch ( adapterName )
  {
  
    case 'mysql-libmysqlclient':
    case 'mysql':
      return '\
        CREATE TABLE  \
        `{tableName}` \
        ( \
          `id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,  \
          `first_name` VARCHAR(100) NOT NULL, \
          `last_name` VARCHAR(100) NOT NULL,  \
          `nickname` VARCHAR(20) ,  \
          `birth_date` DATE NOT NULL, \
          `num_children` TINYINT UNSIGNED NOT NULL DEFAULT "0", \
          `enabled` TINYINT(1) UNSIGNED NOT NULL, \
          PRIMARY KEY (`id`)  \
        );  \
      '.replace('{tableName}', tableName ); 
  
    case 'sqlite3':
       return '\
         CREATE TABLE {tableName} ( \
           "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, \
           "first_name" TEXT NOT NULL, \
           "last_name" TEXT NOT NULL, \
           "nickname" TEXT, \
           "birth_date" TEXT NOT NULL, \
           "num_children" INTEGER NOT NULL DEFAULT (0), \
           "enabled" INTEGER NOT NULL \
         );  \
       '.replace('{tableName}', tableName ); 

    case 'pg':
      return '\
        CREATE TABLE   \
        {tableName} \
        (  \
          id SERIAL PRIMARY KEY ,  \
          first_name VARCHAR(100) NOT NULL,  \
          last_name VARCHAR(100) NOT NULL,   \
          nickname VARCHAR(20) ,   \
          birth_date DATE NOT NULL,  \
          num_children INT NOT NULL DEFAULT 0,  \
          enabled INT NOT NULL \
        );  \
      '.replace('{tableName}', tableName ); 

    default:
      throw new Error('Unknown Adapter "'+adapterName+'" !');
       
  }

};

var firstInsertedUser = {
  first_name:     'FirstName 1',
  last_name:      'LastName 1',
  birth_date:     new Date(),
  enabled:        1
};
// We don't wanna deal with GMT shiftings, so let's force all the Date components in UTC... :-/
firstInsertedUser.birth_date.setYear(1951);
firstInsertedUser.birth_date.setUTCMonth(3);
firstInsertedUser.birth_date.setUTCDate(12);
firstInsertedUser.birth_date.setUTCHours(0);
firstInsertedUser.birth_date.setUTCMinutes(0);
firstInsertedUser.birth_date.setUTCSeconds(0);

var firstUserUpdate = {
  first_name:     'With \'quotes"',  
  last_name:      '\'"`` []{} ø£µùéèàç@&$*%§ø',//let's try with a range of weird chars
  num_children:   3
};


var secondInsertedUser = {
  first_name:     'FirstName 2',
  last_name:      'LastName 2',
  nickname:       'NickName 2',
  birth_date:     firstInsertedUser.birth_date,
  enabled:        0
};


var DBWrapper = nodeDBI.DBWrapper;
var DBExpr = nodeDBI.DBExpr;
//console.log('DBWrapper=');console.dir(DBWrapper);
//console.log('DBExpr=');console.dir(DBExpr);


/**
 * @see http://vowsjs.org/
 */
var adapterTestSuite = function( adapterName, callback )
{
  
  var dbWrapper = new DBWrapper( adapterName, config );
  dbWrapper.connect();
  
  var tableName = 'test_' + ( 100 + Math.round( Math.random() * 5000 )  );
  
  console.log('\n"' + adapterName + '" adapter test suite starts ! \n');
  
  vows.describe('Basic SQL operations with the "'+adapterName+'" adapter').addBatch( {
    
    'table creation': {
      topic: function()
      {
        dbWrapper.query( getTableCreationSql(adapterName, tableName), [], this.callback );
      },
      
      'no error': function(err, res )
      {
        assert.isNull( err, (err) ? err.message : null  );
      },
      'no affected rows': function(err, res )
      {
        assert.equal( res, 0 );
      }
    }//end table creation
    
  } ).addBatch( {
    
    'data insertion': {
      topic: function()
      {
        dbWrapper.insert( tableName, firstInsertedUser, this.callback );
      },
      
      'no error': function(err, res )
      {
        assert.isNull( err, (err) ? err.message : null  );
      },
      '1 affected row': function(err, res )
      {
        assert.equal( res, 1 );
      }
    }//end data insertion
   
  } ).addBatch( {
    
    'data retrieval (data is retrieved with "fetchAll()")': {
      topic: function()
      {
        dbWrapper.fetchAll( 'SELECT * FROM '+dbWrapper._adapter.escapeTable(tableName)+' WHERE id=?', [ 1 ], this.callback );
      },
      
      'no error': function(err, res )
      {
        assert.isNull( err, (err) ? err.message : null  );
      },
      '1 returned row': function(err, res )
      {
        assert.ok( _.isArray(res)  );
        assert.equal( res.length, 1 );
      },
      'returned data is OK': function(err, res )
      {
        assert.equal( res[0].id, 1 );
        assert.equal( res[0].first_name, firstInsertedUser.first_name );
        assert.equal( res[0].last_name, firstInsertedUser.last_name );
        assert.equal( res[0].nickname, null );
        if( -1 != adapterName.indexOf('lite') )
          assert.equal( res[0].birth_date, '1951-04-12 00:00:00' );//SQLite doesn't handle Dates
        else if ( -1 != adapterName.indexOf('pg') )
          assert.equal( res[0].birth_date, '1951-04-12' );//pg doesn't handle Dates
        else
          assert.equal( res[0].birth_date.toUTCString().substr(0, 25), 'Thu, 12 Apr 1951 00:00:00' );
        assert.equal( res[0].num_children, 0 );
        assert.equal( res[0].enabled, firstInsertedUser.enabled );
        //console.log('data retrieval test finished');
      }
    }//end data retrieval
  
  } ).addBatch( {
    
    'data update': {
      topic: function()
      {
        dbWrapper.update( tableName, firstUserUpdate, [ 'id=1', ['first_name=?', firstInsertedUser.first_name] ], this.callback );
      },
      
      'no error': function(err, res )
      {
        assert.isNull( err, (err) ? err.message : null  );
      },
      '1 affected row': function(err, res )
      {
        assert.equal( res, 1 );
        //console.log('data update test finished');
      }
    }//end data update
  
  } ).addBatch( {
    
    'updated data check (this time, data is retrieved with "fetchRow()")': {
      topic: function()
      {
        dbWrapper.fetchRow( 'SELECT * FROM '+dbWrapper._adapter.escapeTable(tableName)+' WHERE id=? AND first_name=?', [ 1, firstUserUpdate.first_name ], this.callback );
      },
      
      'no error': function(err, res )
      {
        assert.isNull( err, (err) ? err.message : null  );
      },
      'returned data is OK': function(err, res )
      {
        var expectedUser = {};
        _.extend( expectedUser, firstInsertedUser, firstUserUpdate );
        
        assert.equal( res.id, 1 );
        assert.equal( res.first_name, expectedUser.first_name );
        assert.equal( res.last_name, expectedUser.last_name );
        assert.equal( res.nickname, expectedUser.nickname );
        if ( -1 != adapterName.indexOf('lite') )
          assert.equal( res.birth_date, '1951-04-12 00:00:00' );//SQLite doesn't handle Dates
        else if ( -1 != adapterName.indexOf('pg') )
          assert.equal( res.birth_date, '1951-04-12' );//pg doesn't handle Dates
        else
          assert.equal( res.birth_date.toUTCString(), expectedUser.birth_date.toUTCString() );
        assert.equal( res.num_children, expectedUser.num_children );
        assert.equal( res.enabled, expectedUser.enabled );
        //console.log('updated data check test finished');
      }
    }//end data update
  
  } ).addBatch( {
    
    'data insertion bis': {
      topic: function()
      {
        dbWrapper.insert( tableName, secondInsertedUser, this.callback );
      },
      
      'no error': function(err, res )
      {
        assert.isNull( err, (err) ? err.message : null  );
      },
      '1 affected row': function(err, res )
      {
        assert.equal( res, 1 );
        //console.log('data insertion bis test finished');
      }
    }//end data insertion  
  
  } ).addBatch( {
    
    'last insert id': {
      topic: [],
      
      'last insert id is OK': function()
      {
        // pg doesn't support getLastInsertId()
        if ( -1 == adapterName.indexOf('pg') )
          assert.equal( dbWrapper.getLastInsertId(), 2 );
        //console.log('last insert id test finished');
      }
    }//end last insert id
  
  } ).addBatch( {
    
    'data retrieval (data is retrieved with "fetchCol()")': {
      topic: function()
      {
        var sql = 'SELECT nickname FROM '
          +dbWrapper._adapter.escapeTable(tableName)
          +' ORDER BY id ASC'; 
        dbWrapper.fetchCol( sql, [], this.callback );
      },
      
      'no error': function(err, res )
      {
        assert.isNull( err, (err) ? err.message : null  );
      },
      '2 returned strings': function(err, res )
      {
        assert.ok( _.isArray(res)  );
        assert.equal( res.length, 2 );
      },
      'returned data is OK': function(err, res )
      {
        assert.isNull( res[0] );
        assert.equal( res[1], secondInsertedUser.nickname );
        //console.log('data retrieval bis test finished');
      }
    }//end data retrieval  
  
  } ).addBatch( {
    
    'data removal': {
      topic: function()
      {
        dbWrapper.remove( tableName, [ 'id=1', ['first_name=?', firstUserUpdate.first_name] ], this.callback );
      },
      
      'no error': function(err, res )
      {
        assert.isNull( err, (err) ? err.message : null  );
      },
      '1 affected row': function(err, res )
      {
        assert.equal( res, 1 );
      }
    }//end data removal  

  } ).addBatch( {
    
    'data removal check (data is retrieved with "fetchOne()")': {
      topic: function()
      {
        var escapedTableName = dbWrapper._adapter.escapeTable(tableName);
        dbWrapper.fetchOne( 'SELECT COUNT(*) FROM '+escapedTableName, [], this.callback );
      },
      
      'no error': function(err, res )
      {
        assert.isNull( err, (err) ? err.message : null  );
      },
      'returned data is OK': function(err, res )
      {
        assert.equal( res, 1 );
        //console.log('data removal check test finished');
      }
    }//end data removal check  
  
  } ).addBatch( {
    
    'DBSelect test, use with a DBWrapper fetch method': {
      topic: function()
      {
        var select = dbWrapper.getSelect().from(tableName, new DBExpr('COUNT(*)') ).where('id=?', 2);
        dbWrapper.fetchOne( select, null, this.callback ); 
      },
      
      'no error': function(err, res )
      {
        assert.isNull( err, (err) ? err.message : null  );
      },
      'returned data is OK': function(err, res )
      {
        assert.equal( res, 1 );
        //console.log('DBSelect test, use with a DBWrapper fetch method');
      }
    }//DBSelect test, use with a DBWrapper fetch method  
  
  } ).addBatch( {
    
    'DBSelect test, with a direct fetch method': {
      topic: function()
      {
        var select = dbWrapper.getSelect().from(tableName, ['first_name', 'last_name']).where('id=?', 2);
        select.fetchRow( this.callback ); 
      },
      
      'no error': function(err, res )
      {
        assert.isNull( 
          err, 
          (err) ? "DB Error: " + err.message : null  
        );
      },
      'returned data is OK': function(err, res )
      {
        assert.equal( res.first_name, secondInsertedUser.first_name );
        assert.equal( res.last_name, secondInsertedUser.last_name );
        //console.log('DBSelect test, with a direct fetch method');
      }
    }//DBSelect test, with a direct fetch method
  
  } ).addBatch( {
    
    'table drop': {
      topic: function()
      {
        var escapedTableName = dbWrapper._adapter.escapeTable(tableName);
        dbWrapper.query( 'DROP TABLE '+escapedTableName, [], this.callback );
      },
      
      'no error': function(err, res )
      {
        assert.isNull( err, (err) ? err.message : null  );
      }
    }//end table drop 
  
  } ).addBatch( {
    
    'test suite finished': {
      topic: [],
      
      'callback': function()
      {
        //console.log('\n"' + adapterName + '" adapter test suite finished ; let\'s close the connection !\n');
        dbWrapper.close( callback );
      }
    }
    
  }).run();
  
};


// --------------------------------------------------- Run test definition

var runTest = function( callback )
{
  
  async.forEachSeries( testedAdapterNames, adapterTestSuite, function(err){
    if (err )
      callback && callback( err );
    else
      callback && callback( null );
  });
  
};

// --------------------------------------------------- Exports

module.exports.runTest = runTest;


// --------------------------------------------------- Standalone run

if( process.argv[1]==__filename )
{
  
  runTest( function( err ) {
    setTimeout( function() { process.exit(0); }, 500 );
  } );
    
}  

// vim: ts=2 sw=2 et
