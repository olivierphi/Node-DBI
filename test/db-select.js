/**
 * DBSelect test suite.
 * 
 * @author Dr. Benton - www.dr-benton.com
 * @see https://github.com/DrBenton/Node-DBI
 */

var vows = require('vows')
  , assert = require('assert')
  , async = require('async')
  , _ = require('underscore')
  , config = require('./config')
  , nodeDBI = require('../lib/dbWrapper');


var testedAdapterNames = [
  'mysql-libmysqlclient',              
  'mysql',
  'sqlite3'
];




/**
 * @see http://vowsjs.org/
 */
var adapterTestSuite = function( adapterName, callback )
{
  
  var dbWrapper = new nodeDBI.DBWrapper( adapterName, config );

  var tableName = 'test_' + ( 100 + Math.round( Math.random() * 5000 )  );
  
  //console.log('\n"' + adapterName + '" adapter test suite starts ! \n');
  
  vows.describe('Basic SQL operations with the "'+adapterName+'" adapter').addBatch( {
    
    'DB connection': {
      topic: function()
      {
        dbWrapper.connect( this.callback );
      },
      
      'connected': function( err )
      {
        assert.ifError( err );
        assert.ok( dbWrapper.isConnected() );
      }
    }
    
  } ).addBatch( {
    
    'most basic SELECT': {
      topic: function()
      {
        return dbWrapper.getSelect().from('user');
      },
      
      'assembled Select is OK': function( select )
      {
        assert.equal( select.assemble(), 'SELECT `user`.* FROM `user`' );
      }
      
    },
  
    'a single custom field in a basic SELECT': {
      topic: function()
      {
        return dbWrapper.getSelect().from('user', 'first_name' );
      },
      
      'assembled Select is OK': function( select )
      {
        assert.equal( select.assemble(), 'SELECT `user`.`first_name` FROM `user`' );
      }
      
    },
    
    'several custom fields in a basic SELECT': {
      topic: function()
      {
        return dbWrapper.getSelect().from('user', ['first_name', 'last_name', 'birth_date'] );
      },
      
      'assembled Select is OK': function( select )
      {
        assert.equal( select.assemble(), 'SELECT `user`.`first_name`, `user`.`last_name`, `user`.`birth_date` FROM `user`' );
      }
      
    },

    'most basic SELECT with 2 tables': {
      topic: function()
      {
        return dbWrapper.getSelect().from('user').from('details');
      },
      
      'assembled Select is OK': function( select )
      {
        assert.equal( select.assemble(), 'SELECT `user`.*, `details`.* FROM `user`, `details`' );
      }
      
    }, 
    
    'custom fields in a basic SELECT with 3 tables': {
      topic: function()
      {
        return dbWrapper.getSelect()
          .from('user', 'COUNT(`user`.*)')
          .from('details', ['creation_date', 'last_update_date'] )
          .from('facebook_info', ['facebook_id', 'nb_friends']);
      },
      
      'assembled Select is OK': function( select )
      {
        assert.equal( select.assemble(), 'SELECT COUNT(`user`.*), `details`.`creation_date`, `details`.`last_update_date`, `facebook_info`.`facebook_id`, `facebook_info`.`nb_friends` FROM `user`, `details`, `facebook_info`' );
      }
      
    },
    
    'the most simple WHERE clause': {
      topic: function()
      {
        return dbWrapper.getSelect().from('user').where('enabled=1');
      },
      
      'assembled Select is OK': function( select )
      {
        assert.equal( select.assemble(), 'SELECT `user`.* FROM `user` WHERE enabled=1' );
      }
      
    },
    
    'a simple WHERE clause': {
      topic: function()
      {
        return dbWrapper.getSelect()
          .from('user')
          .where('enabled=1')
          .where( 'id=?', 10 );
      },
      
      'assembled Select is OK': function( select )
      {
        assert.equal( select.assemble(), 'SELECT `user`.* FROM `user` WHERE enabled=1 AND id=10' );
      }
      
    },
    
    'an advanced WHERE clause, with disordered from() and where() calls': {
      topic: function()
      {
        return dbWrapper.getSelect()
          .where('enabled=1')
          .where( 'id=?', 10 )
          .from('user')
          .where( 'first_name=?', 'Dr.')
          .where( 'last_name LIKE ?', '%Benton%' )
          .where( 'nickname=?', '"`\'éàèç' );
      },
      
      'assembled Select is OK': function( select )
      {
        assert.equal( select.assemble(), 'SELECT `user`.* FROM `user` WHERE enabled=1 AND id=10 AND first_name=\'Dr.\' AND last_name LIKE \'%Benton%\' AND nickname='+dbWrapper.escape('"`\'éàèç') );
      }
      
    },
    
    'a "WHERE clause" only SELECT ': {
      topic: function()
      {
        return dbWrapper.getSelect()
          .where('enabled=1')
          .where( 'id=?', 10 )
          .where( 'first_name=?', 'Dr.');
      },
      
      'assembled Select is OK': function( select )
      {
        assert.equal( select.assemble(), 'enabled=1 AND id=10 AND first_name=\'Dr.\'' );
      }
      
    },
    
    'a LIMIT simple clause, with 1 param': {
      topic: function()
      {
        return dbWrapper.getSelect()
          .limit(10)
          .where('enabled=1')
          .from('user')
          .where( 'id=?', 10 );
      },
      
      'assembled Select is OK': function( select )
      {
        assert.equal( select.assemble(), 'SELECT `user`.* FROM `user` WHERE enabled=1 AND id=10 LIMIT 10' );
      }
      
    },
    
    'a LIMIT simple clause, with 2 params': {
      topic: function()
      {
        return dbWrapper.getSelect()
        .limit(10, 30)
        .where('enabled=1')
        .from('user')
        .where( 'id=?', 10 );
      },
      
      'assembled Select is OK': function( select )
      {
        assert.equal( select.assemble(), 'SELECT `user`.* FROM `user` WHERE enabled=1 AND id=10 LIMIT 30, 10' );
      }
      
    },

    'a ORDER BY simple clause, with 1 param': {
      topic: function()
      {
        return dbWrapper.getSelect()
          .order('first_name')
          .limit(10)
          .where('enabled=1')
          .from('user')
          .where( 'id=?', 10 );
      },
      
      'assembled Select is OK': function( select )
      {
        assert.equal( select.assemble(), 'SELECT `user`.* FROM `user` WHERE enabled=1 AND id=10 ORDER BY `first_name` ASC LIMIT 10' );
      }
      
    },
    
    'a ORDER BY simple clause, with 2 params': {
      topic: function()
      {
        return dbWrapper.getSelect()
          .order('first_name', 'DESC')
          .limit(10)
          .where('enabled=1')
          .from('user')
          .where( 'id=?', 10 );
      },
      
      'assembled Select is OK': function( select )
      {
        assert.equal( select.assemble(), 'SELECT `user`.* FROM `user` WHERE enabled=1 AND id=10 ORDER BY `first_name` DESC LIMIT 10' );
      }
      
    }
    
  } ).addBatch( {
    
    'test suite finished': {
      topic: [],
      
      'callback': function()
      {
        //console.log('\n"' + adapterName + '" adapter test suite finished.\n');
        callback();
      }
    }
    
  }).run();
  
};


//--------------------------------------------------- Run test definition

var runTest = function( callback )
{

  async.forEachSeries( testedAdapterNames, adapterTestSuite, function(err){
   if (err )
     callback && callback( err );
   else
     callback && callback( null );
  });

};

//--------------------------------------------------- Exports

module.exports.runTest = runTest;


//--------------------------------------------------- Standalone run

if( process.argv[1]==__filename )
{

  runTest( function( err ) {
   setTimeout( function() { process.exit(0); }, 500 );
  } );
 
}  

