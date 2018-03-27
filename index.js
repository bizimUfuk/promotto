const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

var cool = require('cool-ascii-faces');
const { Pool } = require('pg');
var pool = new Pool();

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/cool', (req, res) => res.send(cool()))
  .get('/db', function (request, response){
	console.log("hereeee:", process.env.DATABASE_URL);
	pool.connect(process.env.DATABASE_URL, function(err, client, done){

		client.query('SELECT * FROM test_table', function(err, result) {
			if(err){
				console.error(err);
				response.send("Error " + err);
			}else{
				response.render('pages/db', {results: result.rows});
			};
			done();
		});
	});
})
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
