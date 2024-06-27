const createError = require('http-errors');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fileupload = require('express-fileupload');
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');
const hbs = require('express-handlebars');
var db=require('./config/connection');
var session=require('express-session')
const app = express();

// View engine setup
app.engine('hbs', hbs.engine({
    extname: 'hbs',
    defaultLayout: 'layout',
    layoutsDir: path.join(__dirname, 'views', 'layout'),
    partialsDir: path.join(__dirname, 'views', 'partials')
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileupload());
app.use(session({
    secret: 'your_secret_here',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Adjust options as needed
}));

db.connect((err)=>{
    if(err) console.log('Connection err'+ err);
    else console.log('Database Connected to port 27017');
})

app.use('/', userRouter);
app.use('/admin', adminRouter);

// Catch 404 and forward to error handler
app.use((req, res, next) => {
    next(createError(404));
});

// Error handler
app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
