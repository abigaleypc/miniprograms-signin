var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bodyParser = require('body-parser');


const http = require('http');
const https = require('https');
const fs = require('fs');

var index = require('./routes/index');
var users = require('./routes/users');
var api = require('./routes/api');

const privateKey = fs.readFileSync('./ssl/private.pem', 'utf8');
const certificate = fs.readFileSync('./ssl/file.crt', 'utf8');
const credentials = { key: privateKey, cert: certificate };

const PORT = 8082;
const SSLPORT = 8444;

var app = express();

const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

var secret = require('./config/secret')


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(session({
//   secret: secret.SECRET,
//   temp: 'temp',
//   cookie: { maxAge: 60000 },
//   resave: false,
//   saveUninitialized: true,
// }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);
app.use('/api', api);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

httpServer.listen(PORT, function listening() {
  console.log('Listening on %d', httpServer.address().port);
});

httpsServer.listen(SSLPORT, () => {
  console.log('SSL listening on %d', httpsServer.address().port);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
