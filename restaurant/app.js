// импорт библиотек node
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var favicon = require('serve-favicon');

// require запрашивает модули из каталога путей route
var indexRouter = require('./routes/index');
var hallRouter = require('./routes/hall');

var app = express();

// точка подключения монго дб
var mongoose = require('mongoose');
var mongoDB = 'mongodb+srv://AndreevaKate:AndreevaKate@cluster0.bz3pbkr.mongodb.net/?retryWrites=true&w=majority'
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));


// устанавливка движков-шаблонов представления(view engine setup)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/hall', hallRouter);

app.use(favicon(path.join(__dirname,'public','images','icon1.png')));

// перехватите 404 и перенаправьте в обработчик ошибок
app.use(function(req, res, next) {
  next(createError(404));
});

// обработчик ошибок
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // отобразить страницу с ошибкой
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
