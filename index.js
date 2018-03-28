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
      }
      client.end();
    });
  })
  .post('/ipfssay/:hash', function(req,res){
    res.send(req.params);
    var hash = req.params['hash'];
    console.log("Post rcv.", hash);
    res.end();
    hashInDb(hash);
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

function hashInDb(hPost){
  
  const text = "INSERT INTO hashes (hash) VALUES ('" + hPost + "') RETURNING did";
  console.log("Query is: ", text);

  var client2 = new Client(connection);
  client2.connect();
  client2.query(text, (err, res) => {
    if(err){
      console.log(err.stack);
    }else{
      console.log(res.rows[0]);
    }
  });
  return null;
}
