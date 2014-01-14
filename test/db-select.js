/**
 * DBSelect test suite.
 * 
 * @author Dr. Benton - github.com/DrBenton
 * @see https://github.com/DrBenton/Node-DBI
 */

var expect = require('chai').expect
  , _ = require('lodash')
  , config = require('./config')
  , nodeDBI = require('../index.js');


var DBWrapper = nodeDBI.DBWrapper;
var DBExpr = nodeDBI.DBExpr;

// ------------------------------------------ begin test dependencies stuff

var adapterTestSuite = function( adapterName )
{
  
  var dbWrapper = new DBWrapper( adapterName, config.getDbConfig(adapterName) );

  //console.log('\n"' + adapterName + '" adapter DBSelect test suite starts ! \n');
  
  describe('SQL builder', function() {

    var user;
    var select, expectedSql;
    
    before(function(done) {
        dbWrapper.connect( function(err) {
          if (err) { throw err; }
          user = dbWrapper._adapter.escapeTable('user');
          done();
        } );
      }
    );
    after(function(done) {
        dbWrapper.close( done );
      }
    );
    beforeEach(function() {
        select = null;
        expectedSql = null;
      }
    );
    
    it('should handle the most basic SELECT', function() {
      select = dbWrapper.getSelect().from('user');
      
      expectedSql = 'SELECT '+user+'.* FROM '+user;
      
      expect(select.assemble()).to.equal(expectedSql);
    });
    
    it('should handle a single custom field in a basic SELECT', function() {
      select = dbWrapper.getSelect().from('user', 'first_name');
      
      var first_name = dbWrapper._adapter.escapeField('first_name');
      expectedSql = 'SELECT '+user+'.'+first_name+' FROM '+user;
      
      expect(select.assemble()).to.equal(expectedSql);
    });
    
    it('should handle several custom fields in a basic SELECT', function() {
      select = dbWrapper.getSelect().from('user', ['first_name', 'last_name', 'birth_date'] );
      
      var first_name = dbWrapper._adapter.escapeField('first_name')
        , last_name = dbWrapper._adapter.escapeField('last_name')
        , birth_date = dbWrapper._adapter.escapeField('birth_date');
      expectedSql = 'SELECT '+user+'.'+first_name+', '+user+'.'+last_name+', '+user+'.'+birth_date+' FROM '+user;
      
      expect(select.assemble()).to.equal(expectedSql);
    });
    
    it('should handle the most basic SELECT with 2 tables', function() {
      select = dbWrapper.getSelect().from('user').from('details');

      var details = dbWrapper._adapter.escapeTable('details');
      expectedSql = 'SELECT '+user+'.*, '+details+'.* FROM '+user+', '+details;
      
      expect(select.assemble()).to.equal(expectedSql);
    });
    
    it('custom fields in a basic SELECT with 3 tables - with the use of DBExpr for non-escaped values', function() {
      select = dbWrapper.getSelect()
        .from('user', new DBExpr('COUNT('+user+'.*)') )
        .from('details', ['creation_date', 'last_update_date'] )
        .from('facebook_info', ['facebook_id', 'nb_friends']);

      var details = dbWrapper._adapter.escapeTable('details')
        , facebook_info = dbWrapper._adapter.escapeTable('facebook_info')
        , creation_date = dbWrapper._adapter.escapeField('creation_date')
        , last_update_date = dbWrapper._adapter.escapeField('last_update_date')
        , facebook_id = dbWrapper._adapter.escapeField('facebook_id')
        , nb_friends = dbWrapper._adapter.escapeField('nb_friends');
      expectedSql = 'SELECT COUNT('+user+'.*), '+details+'.'+creation_date+', '
        +details+'.'+last_update_date+', '+facebook_info+'.'+facebook_id+', '
        +facebook_info+'.'+nb_friends+' FROM '+user+', '+details+', '+facebook_info;
      
      expect(select.assemble()).to.equal(expectedSql);
    });

    it('should handle the most simple WHERE clause', function() {
      select = dbWrapper.getSelect().from('user').where('enabled=1');

      expectedSql = 'SELECT '+user+'.* FROM '+user+' WHERE (enabled=1)';

      expect(select.assemble()).to.equal(expectedSql);
    });

    it('should handle a simple WHERE clause', function() {
      select = dbWrapper.getSelect()
        .from('user')
        .where('enabled=1')
        .where( 'id=?', 10 );

      expectedSql = 'SELECT '+user+'.* FROM '+user+' WHERE (enabled=1) AND (id=10)';

      expect(select.assemble()).to.equal(expectedSql);
    });

    it('should properly escape Strings params, even if they only contain numbers', function() {
      //@see https://github.com/DrBenton/Node-DBI/issues/20
      select = dbWrapper.getSelect()
        .from('user')
        .where('escaped=?', '1234')
        .where('unescaped=?', 1234);

      expectedSql = 'SELECT '+user+'.* FROM '+user+' WHERE (escaped=\'1234\') AND (unescaped=1234)';

      expect(select.assemble()).to.equal(expectedSql);
    });

    it('should prevent SQL injection', function() {
      //@see https://github.com/DrBenton/Node-DBI/issues/20
      select = dbWrapper.getSelect()
        .from('user')
        .where('id=?', '\' OR (SELECT * FROM user WHERE admin=1)');

      var escapedQuote;
      switch (adapterName) {
        case 'mysql-libmysqlclient':
        case 'mysql':
          escapedQuote = '\\\'';
          break;
        case 'sqlite3':
        case 'pg':
          escapedQuote = '\'\'';
          break;
      }
      expectedSql = 'SELECT '+user+'.* FROM '+user+' WHERE (id=\''+escapedQuote+' OR (SELECT * FROM user WHERE admin=1)\')';

      expect(select.assemble()).to.equal(expectedSql);
    });

    it('should properly handle "falsy" params', function() {
      //@see https://github.com/DrBenton/Node-DBI/issues/19
      select = dbWrapper.getSelect()
        .from('user')
        .where('blank=?', '')
        .where('zero=?', 0)
        .where('undefined=?', undefined)
        .where('null=?', null)
        .where('NaN=?', NaN);

      expectedSql = 'SELECT '+user+'.* FROM '+user+' WHERE (blank=\'\') AND (zero=0) AND (undefined=\'\') AND (null=NULL) AND (NaN=\'\')';

      expect(select.assemble()).to.equal(expectedSql);
    });

    it('should handle an advanced WHERE clause, with special chars and disordered from() and where() calls', function() {
      select = dbWrapper.getSelect()
        .where('enabled=1')
        .where( 'id=?', 10 )
        .from('user')
        .where( 'first_name=?', 'Dr.')
        .where( 'last_name LIKE ?', '%Benton%' )
        .where( 'nickname=?', '"`\'éàèç' );

      expectedSql = 'SELECT '+user+'.* FROM '+user+' WHERE '+
        '(enabled=1) AND (id=10) AND (first_name=\'Dr.\') AND '+
        '(last_name LIKE \'%Benton%\') AND '+
        '(nickname='+dbWrapper.escape('"`\'éàèç')+')';

      expect(select.assemble()).to.equal(expectedSql);
    });

    it('should handle a "WHERE clause only" SELECT', function() {
      select = dbWrapper.getSelect()
        .where('enabled=1')
        .where( 'id=?', 10 )
        .where( 'first_name=?', 'Olivier');

      expectedSql = '(enabled=1) AND (id=10) AND (first_name=\'Olivier\')';

      expect(select.assemble()).to.equal(expectedSql);
    });

    it('should handle DBExpr usage : non-escaped clauses', function() {
      select = dbWrapper.getSelect()
        .from('user')
        .where('DAY(date_created)=?', new DBExpr('DAY( NOW() )') );

      expectedSql = 'SELECT '+user+'.* FROM '+user+' WHERE (DAY(date_created)=DAY( NOW() ))';

      expect(select.assemble()).to.equal(expectedSql);
    });

    it('should handle a LIMIT simple clause, with 1 param', function() {
      select = dbWrapper.getSelect()
        .limit(10)
        .where('enabled=1')
        .from('user')
        .where( 'id=?', 10 );

      expectedSql = 'SELECT '+user+'.* FROM '+user+' WHERE (enabled=1) AND (id=10) LIMIT 10';

      expect(select.assemble()).to.equal(expectedSql);
    });

    it('should handle a LIMIT simple clause, with 2 params', function() {
      select = dbWrapper.getSelect()
        .limit(10, 30)
        .where('enabled=1')
        .from('user')
        .where( 'id=?', 10 );

      expectedSql = 'SELECT '+user+'.* FROM '+user+' WHERE (enabled=1) AND (id=10) LIMIT 30, 10';

      expect(select.assemble()).to.equal(expectedSql);
    });

    it('should handle a ORDER BY simple clause, with 1 param', function() {
      select = dbWrapper.getSelect()
        .order('first_name')
        .limit(10)
        .where('enabled=1')
        .from('user')
        .where( 'id=?', 10 );

      var first_name = dbWrapper._adapter.escapeField('first_name');
      expectedSql = 'SELECT '+user+'.* FROM '+user+' WHERE (enabled=1) AND (id=10) ORDER BY '+first_name+' ASC LIMIT 10';

      expect(select.assemble()).to.equal(expectedSql);
    });

    it('should handle a ORDER BY simple clause, with 2 params', function() {
      select = dbWrapper.getSelect()
        .order('first_name', 'DESC')
        .limit(10)
        .where('enabled=1')
        .from('user')
        .where( 'id=?', 10 );

      var first_name = dbWrapper._adapter.escapeField('first_name');
      expectedSql = 'SELECT '+user+'.* FROM '+user+' WHERE (enabled=1) AND (id=10) ORDER BY '+first_name+' DESC LIMIT 10';

      expect(select.assemble()).to.equal(expectedSql);
    });
    
    describe('with parenthetical grouping', function() {
  
      it('should handle an advanced WHERE clause', function() {
        select = dbWrapper.getSelect()
          .where('enabled=1')
          .where( 'id=?', 10 )
          .from('user')
          .where( 'first_name=?', 'Dr.')
          .whereGroup()
          .where( 'last_name LIKE ?', '%Benton%' )
          .orWhere( 'nickname=?', '"`\'éàèç' );
  
        expectedSql = 'SELECT '+user+'.* FROM '+user+' WHERE (enabled=1) AND '+
          '(id=10) AND (first_name=\'Dr.\') AND '+
          '((last_name LIKE \'%Benton%\') OR (nickname='+dbWrapper.escape('"`\'éàèç')+'))';
  
        expect(select.assemble()).to.equal(expectedSql);
      });
  
      it('should handle a more advanced WHERE clause', function() {
        select = dbWrapper.getSelect()
          .from('user')
          .whereGroupClose()      // Erroneous whereGroupClose to be handled
          .whereGroup(3)   // Multiple group start
          .where('enabled=1')
          .where( 'id=?', 10 )
          .whereGroupClose()
          .where( 'first_name=?', 'Michael')
          .whereGroup()
          .where( 'last_name LIKE ?', '%Dwyer%' )
          .orWhere( 'nickname=?', '"`\'éàèç' )
          .whereGroupClose(2);
        // Automatic closing of leftover groups, yeah!
  
        expectedSql = 'SELECT '+user+'.* FROM '+user+' WHERE ((((enabled=1) AND '+
          '(id=10)) AND (first_name=\'Michael\') AND '+
          '((last_name LIKE \'%Dwyer%\') OR '+
          '(nickname='+dbWrapper.escape('"`\'éàèç')+'))))';
  
        expect(select.assemble()).to.equal(expectedSql);
      });
  
      it('should handle an advanced WHERE clause, with compound statements and an array value', function() {
        select = dbWrapper.getSelect()
          .from('user')
          .whereGroupClose()      // Erroneous whereGroupClose to be handled
          .whereGroup(3)   // Multiple group start
          .where('enabled=1')
          .where( 'id=?', 10 )
          .whereGroupClose()
          .where( 'first_name=\'Dr.\' OR first_name IN ?', ['Olivier', 'Mike'])
          .whereGroup()
          .where( 'last_name LIKE ?', '%Dwyer%' )
          .orWhere( 'nickname=?', '"`\'éàèç' )
          .whereGroupClose(2);
        // Automatic closing of leftover groups, yeah!
  
        expectedSql = 'SELECT '+user+'.* FROM '+user+' WHERE ((((enabled=1) AND '+
          '(id=10)) AND (first_name=\'Dr.\' OR first_name IN (\'Olivier\', \'Mike\')) AND '+
          '((last_name LIKE \'%Dwyer%\') OR (nickname='+dbWrapper.escape('"`\'éàèç')+'))))';
  
        expect(select.assemble()).to.equal(expectedSql);
      });
      
    });
    
  });
  
};


var runAdapterTestSuiteIfEnabled = function (adapterName) {
  if (config.testedAdapterNames.indexOf(adapterName) > -1) {
    adapterTestSuite(adapterName);
  }
};

// ------------------------------------------ end test dependencies stuff


// ------------------------------------------ begin tests

describe('SQLite3 adapter', function () {
  runAdapterTestSuiteIfEnabled('sqlite3');
});

describe('"pure JS" MySQL adapter', function () {
  runAdapterTestSuiteIfEnabled('mysql');
});

describe('"libmysqlclient" MySQL adapter', function () {
  // couldn't compile "node-mysql-libmysqlclient" Module at this time... :-/
  // @see https://github.com/Sannis/node-mysql-libmysqlclient/issues/172

  //runAdapterTestSuiteIfEnabled('mysql-libmysqlclient');

  //TODO: restore this test when the bug is fixed
});

describe('PgSQL adapter', function () {
  runAdapterTestSuiteIfEnabled('pg');
});

// ------------------------------------------ end tests