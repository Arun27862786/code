const mysql2 = require('mysql2/promise');
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
var teamlogourl='';


if(process.env.VALUE_ENEV == 'dev'){
  // my sql db connection details
  connectionLimit = 10;
  host = '192.168.1.74';
  user = 'dbuser';
  password = '123456';
  database = 'fancydb',//'brfantasy';

  //mongo conection
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
  host = 'localhost';
  user = 'fancyusr';
  password = 'FancyTestdf9d97BC963B()#Jjt';
  database = 'fancydb';

  //mongo conection
  mongoUser     = "fancyusr";
  mongoPassword = "fancytest1f$dfD$h!7";
  mongoDatabase = "fancydb";
  mongoAddress  = "localhost";
  mongoPort     =  27017;
  poolSize      =  4;

}
else {
   // my sql connection details
  connectionLimit: 10;
  // host = '192.168.130.59';
  // user = 'fancyusr1';
  // password = 'F15512Nadbe8ebc';
  // database = 'fancydb';

  host = '101.53.130.31';
  user = 'fancyusr';
  password = 'uRTskkfdPP79d97BC963B()#JPt';
  database = 'fancydb';

  //mongo conection
  mongoUser     = "fancyusr";
  mongoPassword = "2KL$mD$h!3";
  mongoDatabase = "fancydb";
  mongoAddress  = "101.53.130.31";
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

const connConfig = mysql2.createPool({
	connectionLimit: 1000,
	host: host,
	user: user,
	password: password,
	database: database,
	multipleStatements:true
});
module.exports = connConfig;
