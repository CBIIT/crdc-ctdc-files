const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const morgan = require('morgan');
const {createSession} = require("./services/session");
const fs = require('fs');
const cors = require('cors');
const auth = require('./utils/auth');
const config = require("./config");

const LOG_FOLDER = 'logs';
if (!fs.existsSync(LOG_FOLDER)) {
  fs.mkdirSync(LOG_FOLDER);
}

// HTTP access log – structured JSON in NIH CADR format
const accessLogStream = fs.createWriteStream(path.join(__dirname, LOG_FOLDER, 'access.log'), { flags: 'a'});

// Custom morgan tokens for NIH CADR fields
morgan.token('_time',             ()     => new Date().toISOString());
morgan.token('session_id',        (req)  => (req.session && req.session.id) || '-');
morgan.token('user_id',           (req)  => (req.session && req.session.userInfo && req.session.userInfo.userID) || '-');
morgan.token('user_email',        (req)  => (req.session && req.session.userInfo && req.session.userInfo.email) || '-');
morgan.token('user_name',         (req)  => {
  const u = req.session && req.session.userInfo;
  if (!u) return '-';
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || '-';
});
morgan.token('user_idp',          (req)  => (req.session && req.session.userInfo && req.session.userInfo.IDP) || '-');
morgan.token('transaction_number',(req)  => (req.session && req.session.userInfo && req.session.userInfo.txn) || '-');
morgan.token('src_ip',            (req)  => req.headers['x-forwarded-for'] || req.socket.remoteAddress || '-');
morgan.token('dest_port',         (req)  => String(req.socket.localPort || '-'));
morgan.token('app',               ()     => config.project || 'CTDC');
morgan.token('cadr_name',         ()     => config.cadr_name || '');
morgan.token('nih_ico',           ()     => config.nih_ico || 'NCI');

// JSON format emitting all available NIH CADR fields per HTTP request
const cadrJsonFormat = (tokens, req, res) => JSON.stringify({
  _time:              tokens['_time'](req, res),
  event_type:         'data_access',
  session_id:         tokens['session_id'](req, res),
  user_id:            tokens['user_id'](req, res),
  user_name:          tokens['user_name'](req, res),
  user_email:         tokens['user_email'](req, res),
  user_id_provider:   tokens['user_idp'](req, res),
  transaction_number: tokens['transaction_number'](req, res),
  src_ip:             tokens['src_ip'](req, res),
  dest_port:          tokens['dest_port'](req, res),
  url:                tokens.url(req, res),
  http_method:        tokens.method(req, res),
  app:                tokens['app'](req, res),
  cadr_name:          tokens['cadr_name'](req, res),
  nih_ico:            tokens['nih_ico'](req, res),
  http_user_agent:    tokens['user-agent'](req, res) || '-',
  status:             tokens.status(req, res),
  http_content_type:  res.getHeader('content-type') || '-',
  bytes:              tokens.res(req, res, 'content-length') || '-',
  duration:           tokens['response-time'](req, res),
  referrer:           tokens.referrer(req, res) || '-',
  http_version:       tokens['http-version'](req, res),
});

const filesRouter = require('./routes/files');

const app = express();
app.use(cookieParser());
if (config.mysqlSessionEnabled) app.use(createSession());
app.use(cors());

// Structured CADR-compliant JSON access log
app.use(morgan(cadrJsonFormat, { stream: accessLogStream }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.use(auth(["/api/files/ping", "/api/files/version"]));

app.use('/api/files', filesRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next({status: 404, message: `Path: '${req.path}' is not supported!`});
});

// error handler
app.use(function(err, req, res, next) {
  const message = req.app.get('env') === 'development' ? err.message : 'error';

  // render the error page
  res.status(err.status || 500);
  res.json(message);
});

module.exports = app;


app.use(auth(["/api/files/ping", "/api/files/version"]));

app.use('/api/files', filesRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next({status: 404, message: `Path: '${req.path}' is not supported!`});
});

// error handler
app.use(function(err, req, res, next) {
  const message = req.app.get('env') === 'development' ? err.message : 'error';

  // render the error page
  res.status(err.status || 500);
  res.json(message);
});

module.exports = app;
