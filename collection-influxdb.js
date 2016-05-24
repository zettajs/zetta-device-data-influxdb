var util = require('util');
var Rx = require('rx');
var influx = require('./influx-basic-client');
var StatsCollector = require('zetta-device-data-collection');

var InfluxDbCollector = module.exports = function(options) {
  StatsCollector.call(this);
  this.options = options || {};
  var windowMs = options.windowMs || 2000;
  var self = this;
  /*
  var opts = {
    host : process.env.INFLUX_HOST,
    port : Number(process.env.INFLUX_PORT),
    username : process.env.INFLUX_USER,
    password : process.env.INFLUX_PASS,
    database : process.env.INFLUX_DB
  };
  */
  Rx.Observable.fromEvent(this.emitter, 'event')
    .window(function() { return Rx.Observable.timer(windowMs); })
    .flatMap(function(e) { return e.toArray(); })
    .filter(function(arr) { return arr.length > 0 })
    .map(function(arr) {
      var ret = {};
      arr.forEach(function(e) {
        if (!ret[e.name]) {
          ret[e.name] = [];
        }
        var event = {
          time: e.timestamp,
          value: e.value
        };
        Object.keys(e.tags).forEach(function(k) {
          event[k] = e.tags[k];
        })
        ret[e.name].push(event);
      });
      return ret;
    })
    .subscribe(function (data) {
      influx.writeSeries(self.options.host, self.options.port, self.options.database, data,  function(err) {
        if (err) {
          self.server.error('Failed to send stats to influxdb, ' + err);
        }
      });
    });
};
util.inherits(InfluxDbCollector, StatsCollector);

InfluxDbCollector.prototype.configure = function(options) {
  this.options = options;
};






