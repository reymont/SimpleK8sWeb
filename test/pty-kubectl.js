var os = require('os');
var pty = require('node-pty');
 
var shell = os.platform() === 'win32' ? 'cmd.exe' : 'bash';
 
var ptyProcess = pty.spawn(shell, [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.env.HOME,
  env: process.env
});
 
ptyProcess.on('data', function(data) {
  console.log(data);
});
 
//ptyProcess.write('ls\r');
//ptyProcess.write('kubectl get pods -n test02 -o=json\r');
ptyProcess.write('kubectl exec -it -n test02 activemq-dhtj5 bash\r');
//ptyProcess.resize(100, 40);
//ptyProcess.write('ls\r');