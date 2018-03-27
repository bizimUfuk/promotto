const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

var cool = require('cool-ascii-faces');
const { Pool, Client } = require('pg');
const pool = new Pool()
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
})

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/cool', (req, res) => res.send(cool()))
  .get('/db', function (request, response){
	console.log("1- hereeee:", process.env.DATABASE_URL);

	client.connect();
	console.log("2- here after client.connect");

	client.query('SELECT * FROM test_table', function(err, result) {
		console.log("3- here after client.query");
		if(err){
			console.error(err);
			response.send("3- Error " + err);
		}else{
			response.render('pages/db', {results: result.rows});
		}
		client.end();
	});
	console.log("4- here after all");

/*
	pool.connect(process.env.DATABASE_URL, function(err, client, done){

		client.query('SELECT * FROM test_table', function(err, result) {
			done();
			if(err){
				console.error(err);
				response.send("Error " + err);
			}else{
				response.render('pages/db', {results: result.rows});
			};			
		});
	});
*/
})
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
