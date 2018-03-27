const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

var cool = require('cool-ascii-faces');
const { Pool } = require('pg');
const pool = new Pool()





express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/cool', (req, res) => res.send(cool()))
  .get('/db', function (request, response){
	console.log("4- hereeee:", process.env.DATABASE_URL);
	
	pool.on('error', (err, clent) => {
		console.error('1- Unexpected error on idle client', err);
		process.exit(-1);
	});

	pool.connect((err, client, done) => {
		console.log('2- here in external')
		if(err) throw err
		client.query('SELECT NOW() as now', (err, res) => {
			done()
			if(err){
				console.log(err.stack)
			}else{
				console.log(res.rows[0])
			}
			console.log('3- in external too')
		})
	})
/*
	pool.connect((err, client, release) => {
		if(err) {
			return console.error('Error acquiring client', err.stack)
		}
		client.query('SELECT * FROM test_table', (err, result)=> {
			release()
			if (err){
				return console.error('Error executing query', err.stack)
			}
			response.render('pages/db', {results: result.rows});
			console.log(result.rows)
		})
	})


//#--------
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
