const express = require('express')

var bodyParser = require('body-parser');

const path = require('path')
const PORT = process.env.PORT || 5000

var cool = require('cool-ascii-faces');
const { Pool, Client } = require('pg');

const connection = {
  connectionString: process.env.DATABASE_URL,
  ssl: true,
}

var hash = "";

express()
  .use(express.static(path.join(__dirname, 'public')))
  .use(bodyParser.json()) //for parsing application/json
  .use(bodyParser.urlencoded({ extended: true })) //for parsing application/x-www-form-urlencoded
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/cool', (req, res) => res.render('pages/cool', {coolface: cool()} ))
  .get('/db', function (request, response){
    var client = new Client(connection);
    client.connect();
    client.query('SELECT * FROM hashes', function(err, result) {
      if(err){
	console.error(err);
	response.send("3- Error " + err);
      }else{
	response.render('pages/db', {results: result.rows});
	response.send("yyy");
      }
      client.end();
    });
//ipfs test from here
// Start a disposable node, and get access to the api
// print the node id, and stop the temporary daemon
console.log("starting \n")
const IPFSFactory = require('ipfsd-ctl')
console.log("IPFSFactory defined \n")
const f = IPFSFactory.create({ type: 'proc', exec: require('ipfs') })
console.log("here ", f.version)
console.log("here agan")
f.spawn(function (err, ipfsd) {
console.log("in f.spawn")
  if (err) { throw err }
  console.log("no error here")
  ipfsd.api.id(function (err, id) {
    if (err) { throw err }
    console.log("soon id \n")
    console.log(id)
    ipfsd.stop()
  })
})
//ipfs test end
  })
  .get('/ipfs/:hash', function (req, res){
    var hash = req.params['hash'];

    console.log("Got a hash: " + hash + " with GET method");

    var client = new Client(connection);
    client.connect();
    const text = "INSERT INTO hashes (hash) \
		VALUES ('" + hash + "') RETURNING hash";

    client.query(text, (err,fetch) => {
      if(err){
        console.error(err);
	res.send("4- Error " + err);
      }else{
	res.render('pages/db', {results: fetch.rows});
      }
      client.end();
    });
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

