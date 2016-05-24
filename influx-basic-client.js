var querystring = require('querystring');
var http = require('http');

exports.writeSeries = function(influxUrlHost, influxUrlPort, db, points, cb) {
  var dataStrings = [];

  function buildLineItem(seriesName, dataPoint) {
    var seriesAndTags = [seriesName];

    Object.keys(dataPoint).forEach(function(key) {
      if(key != 'value' && key != 'time') {
        seriesAndTags.push(key+'='+dataPoint[key]);
      } 
    });

    var dataString = [seriesAndTags.join(','), 'value='+dataPoint.value, dataPoint.time];
    return dataString.join(' ');
  }


  Object.keys(points).forEach(function(seriesKey) {
    var entries = points[seriesKey];
    entries.forEach(function(entry) {
      dataStrings.push(buildLineItem(seriesKey, entry));
    });
  }); 

  var payload = dataStrings.join('\n');


  var path = '/write?' + querystring.stringify({db: db, precision:'ms'});
  var opts = {
    method: 'POST',
    hostname: influxUrlHost,
    port: influxUrlPort,
    path: path
  }

  var req = http.request(opts, function(res) {
    console.log(res.statusCode);
    if(res.statusCode != 204) {
      return cb(new Error('Could not insert analytics'));
    } 

    return cb();
  });

  req.on('error', function(e) {
    cb(e);
  });

  req.end(payload);
}

exports.query = function(influxUrlHost, influxUrlPort, db, query, cb) {
  var qstring = query;
  if(Array.isArray(query)){
    qstring = query.join(';');
  } 
  
  var qsOpts = {
    db: db,
    q: qstring
  };


  var queryString = querystring.stringify(qsOpts);
  var path = '/query?'+queryString;
  var opts = {
    method: 'GET',
    hostname: influxUrlHost,
    port: influxUrlPort,
    path: path
  }

  function buildResponseJSON(buf) {
    try{
      buf = JSON.parse(buf.toString());
    } catch(e) {
      cb(e);
    }

    
    if(buf.error || (buf[0] && buf[0].error)) {
      var e = buf.error;
      
      if(buf[0] && buf[0].error) {
        e = buf[0].error;
      }
      console.log(e);

      return cb(new Error(e));
    }

    if(buf.results) {
      var queryResults = buf.results;
      var totalResults = [];
      queryResults.forEach(function(item, idx) {
        Object.keys(item).forEach(function(key) {
          
          var singleQueryResultsSet = item[key][0];
          var columns = singleQueryResultsSet.columns;
          var values = singleQueryResultsSet.values;

          var mappedResults = values.map(function(item) {
            var obj = {};
            columns.forEach(function(curr, idx) {
              obj[curr] = item[idx]; 
            });
            return obj;
          }); 

          var resultsObj = {
            series: singleQueryResultsSet.name,
            query: query[idx],
            results: mappedResults
          };

          totalResults.push(resultsObj);
        });
      });

      cb(null, totalResults);
    }
    
  }

  var req = http.request(opts, function(res) {
    var buf = [];

    res.on('data', function(chunk) {
      buf += chunk;
    });

    res.on('end', function() {
      buildResponseJSON(buf);      
    });
  });

  req.on('error', function(e) {
    cb(e);
  });

  req.end();
}
