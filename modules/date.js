require('child_process').exec('date', function(error, stdout, stderr){
	reply(stdout);
});