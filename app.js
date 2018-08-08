var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);
var os = require('os');
var util = require('util');
var pty = require('node-pty');

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.get('/index', function(req, res) {
  var exec = require('child_process').exec;

  var pods_name = []
  exec('kubectl get pods -n test02 -o=json', {
      encoding: 'utf8',
      timeout: 0,
      maxBuffer: 5000 * 1024, // 默认 200 * 1024
      killSignal: 'SIGTERM'
  }, function (error, stdout, stderr) {
      if (error) {
          console.error('error: ' + error);
          return;
      }
      var pods = JSON.parse(stdout);
      for(var i in pods.items){
          pods_name.push(pods.items[i].metadata.name);
      }
      //console.log('stderr: ' + typeof stderr);
      //console.log(pods_name.length);
      for(var i in pods_name){
          //console.log(pods_name[i]);
      }
      res.render('index', { helloWorld: 'hello,world', pods_name: pods_name });
  });
});
app.get('/pods', function(req, res) {
  var exec = require('child_process').exec;

  var pods_name = []
  exec('kubectl get pods -n test02 -o=json', {
      encoding: 'utf8',
      timeout: 0,
      maxBuffer: 5000 * 1024, // 默认 200 * 1024
      killSignal: 'SIGTERM'
  }, function (error, stdout, stderr) {
      if (error) {
          console.error('error: ' + error);
          return;
      }
      var pods = JSON.parse(stdout);
      for(var i in pods.items){
          pods_name.push(pods.items[i].metadata.name);
      }
      //console.log('stderr: ' + typeof stderr);
      //console.log(pods_name.length);
      for(var i in pods_name){
          //console.log(pods_name[i]);
      }
      res.send(pods_name );
  });
});


// hello webservice
app.ws('/ws', function(ws, req) {
  util.inspect(ws);
  ws.on('message', function(msg) {
    console.log('_message');
    console.log(msg);
    ws.send('echo:' + msg);
  });
})

var terminals = {},
    logs = {},
    result = {};

app.use('/build', express.static(__dirname + '/build'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/main.js', function(req, res){
  res.sendFile(__dirname + '/main.js');
});

app.get('/style.css', function(req, res){
  res.sendFile(__dirname + '/style.css');
});

app.get('/dist/bundle.js', function(req, res){
  res.sendFile(__dirname + '/dist/bundle.js');
});

app.get('/dist/bundle.js.map', function(req, res){
  res.sendFile(__dirname + '/dist/bundle.js.map');
});

app.post('/kubectl', function (req, res) {
  var spawn = require('child_process').spawn;
  var pname = req.query.select_pod;
  var cmd = "logs -n test02 -f --tail=100 "+pname;
  // var cmd = "exec -it -n test02 "+pname+" bash";
  console.log(cmd);
  var term = spawn('kubectl', cmd.split(" "));
  //监听标准输出流
  result[pname] = '';
  term.stdout.on('data', function (data) {
      result[pname] += data;
      //console.log(result["jego-micro-business-user-0httf"]);
  });
  terminals[pname] = term;
  res.send(pname);
  res.end();
});
app.ws('/kubectl/:pname', function (ws, req) {
  //console.log(terminals);
  //console.log(req.params.pname);
  var term = terminals[req.params.pname];
  // console.log(term);
  console.log('Connected to pod terminal ' + req.params.pname);
  // console.log("result: "+result[req.params.pname]);
  ws.send(result[req.params.pname]);
  

  term.stdout.on('data', function(data) {
    try {
      result[req.params.pname] += data;
      //console.log(result[req.params.pname]);
      ws.send(result[req.params.pname]);
    } catch (ex) {
      // The WebSocket is not open, ignore
    }
  });
  ws.on('message', function(msg) {
    term.write(msg);
  });
  ws.on('close', function () {
    term.kill();
    console.log('Closed terminal ' + req.params.pname);
    // Clean things up
    delete terminals[req.params.pname];
    delete result[req.params.pname];
  });
});

app.post('/terminals', function (req, res) {
  var cols = parseInt(req.query.cols),
      rows = parseInt(req.query.rows),
      pod = req.query.pod,
      cmd = "exec -n test02 -it jego-managerportal-socialcontact-svls9 bash";
  var shell = os.platform() === 'win32' ? 'cmd.exe' : 'bash';
  //cmd = "logs -n test02 -f --tail=100 jego-micro-business-user-x2093";
  //term = pty.spawn(process.platform === 'win32' ? 'cmd.exe' : 'bash', [], {
  term = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: cols || 80,
    rows: rows || 24,
    cwd: process.env.PWD,
    env: process.env
  });
  term.write('kubectl exec -it -n test02 '+pod+' bash\r');

  console.log('Created terminal with PID: ' + term.pid);
  terminals[term.pid] = term;
  logs[term.pid] = '';
  term.on('data', function(data) {
    logs[term.pid] += data;
  });
  res.send(term.pid.toString());
  res.end();
});

app.post('/terminals/:pid/size', function (req, res) {
  var pid = parseInt(req.params.pid),
      cols = parseInt(req.query.cols),
      rows = parseInt(req.query.rows),
      term = terminals[pid];

  term.resize(cols, rows);
  console.log('Resized terminal ' + pid + ' to ' + cols + ' cols and ' + rows + ' rows.');
  res.end();
});

app.ws('/terminals/:pid', function (ws, req) {
  var term = terminals[parseInt(req.params.pid)];
  console.log('Connected to terminal ' + term.pid);
  ws.send(logs[term.pid]);

  term.on('data', function(data) {
    try {
      ws.send(data);
    } catch (ex) {
      // The WebSocket is not open, ignore
    }
  });
  ws.on('message', function(msg) {
    term.write(msg);
  });
  ws.on('close', function () {
    term.kill();
    console.log('Closed terminal ' + term.pid);
    // Clean things up
    delete terminals[term.pid];
    delete logs[term.pid];
  });
});

var port = process.env.PORT || 8000,
    host = os.platform() === 'win32' ? '127.0.0.1' : '0.0.0.0';

console.log('App listening to http://' + host + ':' + port);
app.listen(port, host);
