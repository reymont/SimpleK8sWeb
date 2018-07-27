var exec = require('child_process').exec;

// 成功的例子
// exec('kubectl get pods -n test02 -o=jsonpath="{@}"', {
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
    //console.log(stdout);
    //console.log(pods.items[0]);
    for(var i in pods.items){
        //console.log(pods.items[i].metadata.name);
        pods_name.push(pods.items[i].metadata.name);
    }
    //console.log('stderr: ' + typeof stderr);
    console.log(pods_name.length);
    for(var i in pods_name){
        console.log(pods_name[i]);
    }
});
