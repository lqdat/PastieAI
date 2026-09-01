process.env.DATABASE_URL='postgresql://x:x@127.0.0.1:1/none';
process.env.PORT='54998';
require('./server.js');
setTimeout(function(){console.log('BOOT OK');process.exit(0);},5000);
