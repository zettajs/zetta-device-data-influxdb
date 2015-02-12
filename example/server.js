var zetta = require('zetta');
var InfluxDbCollector = require('../');

var influx = new InfluxDbCollector({
  host: process.env.INFLUX_HOST,
  port: process.env.INFLUX_PORT || 8086,
  username: process.env.INFLUX_USER,
  password: process.env.INFLUX_PASSWORD,
  database: process.env.INFLUX_DATABASE
});

var hub = zetta()
  .name('cloud')
  .use(influx.collect())
  .listen(5000);
