require('child_process').exec('uptime', function(error, stdout, stderr){
	reply(stdout);
});