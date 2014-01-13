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

//TODO: cleaner Unit Tests :-/

var expect = require('chai').expect
  , _ = require('lodash')
  , config = require('./config')
  , nodeDBI = require('../index.js');


// ------------------------------------------ begin test dependencies stuff

var getTableCreationSql = function (adapterName, tableName) {

  switch (adapterName) {

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
      '.replace('{tableName}', tableName);

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
       '.replace('{tableName}', tableName);

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
      '.replace('{tableName}', tableName);

    default:
      throw new Error('Unknown Adapter "' + adapterName + '" !');

  }

};

var firstInsertedUser = {
  first_name: 'FirstName 1',
  last_name: 'LastName 1',
  birth_date: new Date(),
  enabled: 1
};

// We don't wanna deal with GMT shiftings, so let's force all the Date components in UTC... :-/
firstInsertedUser.birth_date.setYear(1951);
firstInsertedUser.birth_date.setUTCMonth(3);
firstInsertedUser.birth_date.setUTCDate(12);
firstInsertedUser.birth_date.setUTCHours(0);
firstInsertedUser.birth_date.setUTCMinutes(0);
firstInsertedUser.birth_date.setUTCSeconds(0);

var firstUserUpdate = {
  first_name: 'With \'quotes"',
  last_name: '\'"`` []{} ø£µùéèàç@&$*%§ø',//let's try with a range of weird chars
  num_children: 3
};


var secondInsertedUser = {
  first_name: 'FirstName 2',
  last_name: 'LastName 2',
  nickname: 'NickName 2',
  birth_date: firstInsertedUser.birth_date,
  enabled: 0
};


var DBWrapper = nodeDBI.DBWrapper;
var DBExpr = nodeDBI.DBExpr;

var adapterTestSuite = function (adapterName) {

  var dbWrapper = new DBWrapper(adapterName, config.getDbConfig(adapterName));
  dbWrapper.connect();

  var tableName = 'test_' + ( 100 + Math.round(Math.random() * 5000)  );
  var escapedTableName = dbWrapper._adapter.escapeTable(tableName);

  //console.log('\n"' + adapterName + '" adapter API test suite starts ! \n');

  describe('basic SQL operations', function () {

    after(function (done) {
      // Let's clean the created tables after the test...
      var escapedTableName = dbWrapper._adapter.escapeTable(tableName);
      dbWrapper.query('DROP TABLE ' + escapedTableName, [], function () {
        // ...and close the DB connection
        dbWrapper.close(done);
      });
    });

    describe('table creation', function () {

      it('should be able to create a SQL table', function (done) {
        dbWrapper.query(getTableCreationSql(adapterName, tableName), [], function (err, res) {
          expect(err).to.be.null;
          expect(res).to.equal(0, 'no affected rows');
          done();
        });
      });

    });//end table creation

    describe('data creation/update/removal', function () {

      it('should insert data', function (done) {
        dbWrapper.insert(tableName, firstInsertedUser, function (err, res) {
          expect(err).to.be.null;
          expect(res).to.equal(1, '1 affected row');
          done();
        });
      });

      it('should retrieve data  with "fetchAll()"', function (done) {
        var sql = 'SELECT * FROM ' + escapedTableName + ' WHERE id=?';
        dbWrapper.fetchAll(sql, [ 1 ], function (err, res) {
          expect(err).to.be.null;
          expect(res).to.be.an.instanceof(Array);
          expect(res).to.have.length(1);

          var user = res[0];
          expect(user).to.have.property('id', 1);
          expect(user).to.have.property('first_name', firstInsertedUser.first_name);
          expect(user).to.have.property('last_name', firstInsertedUser.last_name);
          expect(user).to.have.property('enabled', firstInsertedUser.enabled);
          expect(user).to.have.property('nickname', firstInsertedUser.nickname);
          expect(user).to.have.property('num_children', firstInsertedUser.num_children);
          expect(user).to.have.property('birth_date');
          var expectedDate;
          if (-1 != adapterName.indexOf('lite')) {
            expectedDate = '1951-04-12 00:00:00';//SQLite doesn't handle Dates fields
            expect(user.birth_date).to.equal(expectedDate);
          } else {
            expectedDate = firstInsertedUser.birth_date.toUTCString();
            expect(user.birth_date.toUTCString()).to.equal(expectedDate);
          }

          done();
        });
      });

      it('should affect 1 row when we update the first user', function (done) {
        dbWrapper.update(tableName, firstUserUpdate, [ 'id=1', ['first_name=?', firstInsertedUser.first_name] ], function (err, res) {
          expect(err).to.be.null;
          expect(res).to.equal(1, '1 affected row');
          done();
        });
      });

      it('should update data properly', function (done) {
        dbWrapper.fetchRow('SELECT * FROM ' + escapedTableName + ' WHERE id=? AND first_name=?', [ 1, firstUserUpdate.first_name ], function (err, res) {
          expect(err).to.be.null;
          expect(res).to.be.an('object');

          var expectedData = {};
          _.extend(expectedData, firstInsertedUser, firstUserUpdate);

          var user = res;
          expect(user).to.have.property('id', 1);
          expect(user).to.have.property('first_name', expectedData.first_name);
          expect(user).to.have.property('last_name', expectedData.last_name);
          expect(user).to.have.property('enabled', expectedData.enabled);
          expect(user).to.have.property('nickname', expectedData.nick_name);
          expect(user).to.have.property('num_children', expectedData.num_children);

          done();
        });
      });

      it('should properly insert a second row', function (done) {
        dbWrapper.insert(tableName, secondInsertedUser, function (err, res) {
          expect(err).to.be.null;
          expect(res).to.equal(1, '1 affected row');
          done();
        });
      });

      it('should be able to retrieve the last inserted id', function () {
        // pg doesn't support getLastInsertId()
        if (-1 < adapterName.indexOf('pg')) {
          return;
        }
        expect(dbWrapper.getLastInsertId()).to.equal(2);
      });

      it('should retrieve data  with "fetchCol()"', function (done) {
        var sql = 'SELECT first_name FROM '
          + escapedTableName
          + ' ORDER BY id ASC';
        dbWrapper.fetchCol(sql, [], function (err, res) {
          expect(err).to.be.null;
          expect(res).to.be.instanceof(Array);
          expect(res).to.be.have.length(2);
          expect(res[0]).to.equal(firstUserUpdate.first_name);
          expect(res[1]).to.equal(secondInsertedUser.first_name);
          done();
        });
      });

      it('should affect 1 row when we delete a record', function (done) {
        dbWrapper.remove(tableName, [ 'id=1', ['first_name=?', firstUserUpdate.first_name] ], function (err, res) {
          expect(err).to.be.null;
          expect(res).to.equal(1, '1 affected row');
          done();
        });
      });

      it('should properly delete data (retrieved with "fetchOne()")', function (done) {
        dbWrapper.fetchOne('SELECT COUNT(*) FROM ' + escapedTableName, [], function (err, res) {
          expect(err).to.be.null;
          //we have to use parseInt because the "pg" adapter sends us "1" as a String instead of a Number :-/
          expect(parseInt(res)).to.equal(1, 'only 1 user left in the DB table');
          done();
        });
      });

    });

    describe('data retrieval with DBSelect', function () {

      it('should handle DBSelects when used with a "fetch*()" method', function (done) {
        dbWrapper.fetchOne('SELECT COUNT(*) FROM ' + escapedTableName, null, function (err, res) {
          expect(err).to.be.null;
          //we have to use parseInt because the "pg" adapter sends us "1" as a String instead of a Number :-/
          expect(parseInt(res)).to.equal(1);
          done();
        });
      });

      it('should handle "DBExpr" for raw SQL statements', function (done) {
        var select = dbWrapper.getSelect().from(tableName, new DBExpr('COUNT(*)')).where('id=?', 2);
        dbWrapper.fetchOne(select, null, function (err, res) {
          expect(err).to.be.null;
          //we have to use parseInt because the "pg" adapter sends us "1" as a String instead of a Number :-/
          expect(parseInt(res)).to.equal(1);
          done();
        });
      });

      it('should handle "fetch*()" methods directly on DBSelects', function (done) {
        var select = dbWrapper.getSelect().from(tableName, ['first_name', 'last_name']).where('id=?', 2);
        select.fetchRow(function (err, res) {
          expect(err).to.be.null;
          expect(res).to.have.property('first_name', secondInsertedUser.first_name);
          expect(res).to.have.property('last_name', secondInsertedUser.last_name);
          done();
        });
      });

    });

    describe('DB table removal', function () {

      it('should handle raw "DROP TABLE" statements', function (done) {
        dbWrapper.query('DROP TABLE ' + escapedTableName, [], function (err, res) {
          expect(err).to.be.null;
          done();
        });
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

// vim: ts=2 sw=2 et