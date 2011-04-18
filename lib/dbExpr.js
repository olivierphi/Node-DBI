

//------------------------------------- constructor

/**
 * @param {String}
 */
function DBExpr( sqlExpr )
{
  /**
   * @type String
   */
  this.sqlExpr = sqlExpr;
}

module.exports.DBExpr = DBExpr;


//------------------------------------- public methods

/**
 * @returns {String}
 */
DBExpr.prototype.getStr = function()
{
  return this.sqlExpr;
};

