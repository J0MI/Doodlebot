var showUsage = function(){
	reply('Usage: '+network.commandChar+moduleName+' [message @] time');
};

if ( arguments.length == 0 )
	showUsage();
else{
	var gotAt = false;
	var msg = [];
	var time = [];
	utils.forEach(arguments, function(arg){
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
	})
	proc.stdin.write("curl 'http://localhost:1337/privmsg?network="+encodeURIComponent(network.name)+"&channel="+encodeURIComponent(channel)+"&message="+encodeURIComponent(msg)+"'");
	proc.stdin.end();
}

// Old setTimeout based version
/*
var showUsage = function(){
	reply('Invalid time! Valid format is \\d+[smhd]');
};

var time = arguments.shift();
var msg = arguments.join(' ') || 'Alarm!';

var m = time.match(/^(\d+)([a-z])$/i);
if ( !m )
	showUsage();
else{
	time = (+m[1]) * 1000;
	
	var unit = null;
	var unitRegexes = {
		's': /^s|secs?|seconds?$/,
		'm': /^m|mins?|minutes?$/,
		'h': /^h|hours?$/,
		'd': /^d|days?$/
	};
	for ( var key in unitRegexes ){
		if ( !unitRegexes.hasOwnProperty(key) )
			continue;
		
		if ( m[2].match(unitRegexes[key]) ){
			unit = key;
			break;
		}
	}
	
	if ( !unit )
		showUsage();
	else{
		time *= ({
			's': 1,
			'm': 60,
			'h': 60*60,
			'd': 60*60*24
		})[unit];
		
		setTimeout(function(){
			reply(origin.nick+': '+msg);
		}, time);
		reply('Alarm set!');
	}
}
*/
