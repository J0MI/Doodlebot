var showUsage = function(){
	usage('[message @] time');
};

if ( args.length == 0 ){
	showUsage();
	return;
}

var gotAt = false;
var msg = [];
var time = [];
utils.forEach(args, function(arg){
	if ( arg == '@' )
		gotAt = true;
	else{
		if ( gotAt )
			time.push(arg);
		else
			msg.push(arg);
	}
});
if ( gotAt ){
	msg = msg.join(' ');
	time = time;
}
else{
	time = msg;
	msg = 'Alarm!';
}

msg = origin.nick+': '+msg;

var proc = require('child_process').spawn('at', time);
var atOutput = '';
proc.stdout.on('data', function(x){atOutput+=x;});
proc.stderr.on('data', function(x){atOutput+=x;});
proc.on('exit', function(code){
	if ( code == 0 )
		reply('Alarm set!');
	else{
		reply('Error!');
		console.error(atOutput);
	}
});

if ( proc.stdin.writable ){
	proc.stdin.write("curl 'http://localhost:1337/privmsg?network="+encodeURIComponent(network.name)+"&channel="+encodeURIComponent(channel)+"&message="+encodeURIComponent(msg)+"'");
	proc.stdin.end();
}
