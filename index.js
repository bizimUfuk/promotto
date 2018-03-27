const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

var cool = require('cool-ascii-faces');
var pg = require('pg');

express()
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/cool', (req, res) => res.send(cool()))
  .get('/db', function (request, response){
	pg.connect(process.env.DATABASE_URL, function(err, client, done){
		client.query('SELECT * FROM test_table', function(err, result) {
			done();
			if(err){
				console.error(err);
				response.send("Error " + err);
			}else{
				response.render('pages/db', {results: result.rows});
			}
		});
	});
})
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
