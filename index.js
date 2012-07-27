
/**
 * The Node-DBI module entry point.
 *   
 * @author Dr. Benton - github.com/DrBenton
 * @see https://github.com/DrBenton/Node-DBI
 */

module.exports = {
  DBWrapper:	      require('./lib/dbWrapper').DBWrapper ,
  DBExpr:	      require('./lib/dbExpr').DBExpr ,
  DBSelect:	      require('./lib/dbSelect').DBSelect
}

//console.log('module.exports=');console.dir(module.exports);

