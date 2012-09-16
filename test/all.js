/**
 * The full test suite ! :-)
 *   
 * @author Dr. Benton - github.com/DrBenton
 * @see https://github.com/DrBenton/Node-DBI
 */

//TODO: cleaner Unit Tests :-/

var async = require('async');

// Our tests definition
var adapterSimpleOperationsRunTest = require('./adapters-simple-operations.js').runTest
  , dbSelectRunTest = require('./db-select.js').runTest;

// "All tests" Array
var allTests = [
  adapterSimpleOperationsRunTest,
  dbSelectRunTest
]; 

// Go! Go! Go!
async.series( allTests, function(err) {
  if( err )
    throw err;
  else
    setTimeout( function() { process.exit(0); }, 500 );
});
