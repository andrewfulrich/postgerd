require('dotenv').config()
const Pool=require('pg').Pool

// you can optionally supply other values
const config=process.env.DATABASE_URL ? {
  connectionString:process.env.DATABASE_URL
} : {
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  database:process.env.PGDATABASE
}
var pool=new Pool(config)

pool.on('error', function (err, client) {
  // if an error is encountered by a client while it sits idle in the pool
  // the pool itself will emit an error event with both the error and
  // the client which emitted the original error
  // this is a rare occurrence but can happen if there is a network partition
  // between your application and the database, the database restarts, etc.
  // and so you might want to handle it and at least log it out
  console.log('idle client error', err.message, err.stack)
})

/**
 *
 * @param queryOrObject could be the query string or an object of the form {name:preparedStatmentName,value:theParams}
 * @returns {Request|Promise.<TResult>|*}
 */
function query(queryOrObject) {
  return pool.query(queryOrObject)
}

module.exports=query