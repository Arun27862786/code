const mysql = require('mysql');
const mongoose = require('mongoose');
let connectionLimit = '';
let host = '';
let user = '';
let password = '';
let database = '';
let baseUrl  = '';
let imageUrl = ';'
let userName = ''
let mongoPassword = '';
let databaseName =  '';
let mongoAddress =  '';
let mongoPort    =  '';
let poolSize    = 0;
var scoreurl="";
cricktoken ='iOSnsZbuhgMXyy5gSL4N4kzDGGC3';

console.log("process.env.VALUE_ENEV=",process.env.VALUE_ENEV);

if(process.env.VALUE_ENEV == 'dev'){
  // my sql db connection details
  connectionLimit = 10;
  host = '192.168.1.74';
  user = 'dbuser';
  password = '123456';
  database ='fancydb', //'brfantasy';
//mongo db connection details
mongoUser     = "brfantasy";
mongoPassword = "123456";
mongoDatabase = "brfantasy";
mongoAddress  = "192.168.1.17";//"192.168.1.74";
mongoPort     =  27017;
poolSize      =  4;

}else
if(process.env.VALUE_ENEV == 'fancytest'){
  // my sql db connection details
  connectionLimit = 10;
  host = '172.105.49.94';
  user = 'fancyusr';
  password = 'FancyTestdf9d97BC963B()#Jjt';
  database = 'fancydb';

  //mongo conection
  mongoUser     = "fancyusr";
  mongoPassword = "fancytest1f$dfD$h!7";
  mongoDatabase = "fancydb";
  mongoAddress  = "172.105.49.94";
  mongoPort     =  27017;
  poolSize      =  4;


}else {
  // my sql connection details

  connectionLimit: 10;
  // host = '192.168.130.59';
  // user = 'fancyusr1';
  // password = 'F15512Nadbe8ebc';
  // database = 'fancydb';

  host = '172.105.49.94';
  user = 'fancyusr';
  password = 'FancyTestdf9d97BC963B()#Jjt';
  database = 'fancydb';

  //mongo conection
  mongoUser     = "fancyusr";
  mongoPassword = "fancytest1f$dfD$h!7";
  mongoDatabase = "fancydb";
  mongoAddress  = "172.105.49.94";
  mongoPort     =  27017;
  poolSize      =  4;


    // //Daily - mongo conection
    // mongoUser     = "muser";
    // mongoPassword = "2KL$mD$h!3";
    // mongoDatabase = "mdb";
    // mongoAddress  = "45.118.134.146";
    // mongoPort     =  27017;
    // poolSize      =  4;
}
// my sql connection pool
var mysql_pool = mysql.createPool({
  connectionLimit : 1000,
    connectTimeout  : 60 * 60 * 1000,
    acquireTimeout  : 60 * 60 * 1000,
    timeout         : 60 * 60 * 1000,
  //connectionLimit : connectionLimit,
  host: host,
  user: user,
  password: password,
  database: database
});


// mongo db connection pool

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://'+mongoUser+':'+mongoPassword+'@'+mongoAddress+':'+mongoPort+'/'+mongoDatabase+'?poolSize=4',  { useNewUrlParser: true } )
    .then(() => {
        console.log("database is connected");
    }).catch(err => console.error(err));





if(process.env.VALUE_ENEV == 'dev'){
    baseUrl   =  'http://192.168.1.17/brfantasy/public';
    imageUrl  =  'http://192.168.1.17/brfantasy/public/uploads/teamlogo/';
    teamlogourl="http://192.168.1.17/brfantasy/public/uploads/teamlogo/";
    locationRedirect='http://192.168.1.74:3888/#/PaytmResponse/';
    scoreurl="https://score.fancy11.com";
    global.NEWCRICKETAPI="http://128.199.30.140:3100";
    global.PRODUCTNAME="Fancy11";
}else
if(process.env.VALUE_ENEV == 'fancytest'){
    baseUrl   =  'http://172.105.49.94/fancy11/public';
    imageUrl  =  'http://172.105.49.94/fancy11/public/uploads/teamlogo/';
    teamlogourl="http://172.105.49.94/fancy11/public/uploads/teamlogo/";
    locationRedirect='http://172.105.49.94:3888/#/PaytmResponse/';
    scoreurl="https://score.fancy11.com";
    global.NEWCRICKETAPI="http://128.199.30.140:3200";
    global.PRODUCTNAME="Fancy11";
}
else {
    baseUrl  =   'https://fancy11.com/fancy11/public'
    imageUrl  =  'https://fancy11.com/fancy11/public/uploads/teamlogo/'
    teamlogourl="https://fancy11.com/fancy11/public/uploads/teamlogo/";
    global.locationRedirect="https://play.fancy11.com/#/PaytmResponse/";
    scoreurl="https://score.fancy11.com";
    global.NEWCRICKETAPI="http://128.199.30.140:3200";
    global.PRODUCTNAME="Fancy11";
}
var ApibaseUrl  = {
  baseUrl : baseUrl,
  scoreurl:scoreurl
}
var matchType = new Object();
  matchType["WomensODI"]   =  'ODI';
  matchType["YouthODI"]    =  'ODI';
  matchType["T20I"]        =  'Twenty20';
  matchType["Twenty20"]    =  'Twenty20';
  matchType["ListA"]       =  'ODI';
  matchType["WomensT20I"]  =  'Twenty20';
  matchType["ODI"]         =  'ODI';
  matchType["First-class"] =  'Test';
  matchType["Test"]        =  'Test';
  
  matchType["t10"]        =  'Twenty20';
  matchType["t20"]        =  'Twenty20';
  matchType["one-day"]    =  'ODI';
  matchType["test"]       =  'Test';
  matchType["kabaddi"]    =  'kabaddi';
module.exports = {
  mysql_pool,
  ApibaseUrl,
  imageUrl,
  matchType
}
