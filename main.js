var fs = require('fs');
var http = require('http');
var urlParser = require('url');
var IRC = require('./IRC');

var networks = {};
var apiServer = null;

process.on('uncaughtException', function(err){
	console.error('Caught exception: ' + err);
});

// Cleanup on exit
var cleanup = function(){
	console.log('Closing logs...');
	
	setTimeout(function(){
		console.log('Log close timed out!');
		process.exit(0);
	}, 1000);
	
	var stillWorking = 0;
	Object.keys(networks).forEach(function(networkName){
                var network = networks[networkName];

		++stillWorking;
		
		var hasExit = false;
		network.onExit(function(){
			if ( hasExit )
				return;
			hasExit = true;
			
			if ( --stillWorking == 0 ){
				console.log('All logs closed!');
				process.exit(0);
			}
		});
	});
	
	if ( apiServer )
		apiServer.close();
};
process.on('SIGINT', cleanup);

// Load configuration data and initialize objects
var cmdNetwork = null;
var config = {};
var loadConfig = function(){
	config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
	
	Object.keys(config.networks).forEach(function(networkName){
		var network = config.networks[networkName];
		
		if ( !cmdNetwork )
			cmdNetwork = networkName;
		
		Object.keys(config.networkDefaults).forEach(function(key){
			if ( network[key] === undefined )
				network[key] = config.networkDefaults[key];
		});
		
		if ( networks[networkName] )
			networks[networkName].onConfig(network);
		else
			networks[networkName] = new IRC.Network(network, networkName);
	});
};
loadConfig();

// Connect to networks
Object.keys(networks).forEach(function(networkName){
	networks[networkName].connect();
});

// Run API server
apiServer = http.createServer(function(req, res){
	res.setHeader('Content-Type', 'text/plain');
	
	res.statusCode = 200;
	var body = '';
	
	try{
		var url = urlParser.parse(req.url, true);
		var action = url.pathname.substr(1).toLowerCase();
		var args = url.query || {};
		
		var network = args.network && networks[args.network];
		var chan = network && args.channel && network.channels[args.channel];
		
		switch ( action ){
			case 'privmsg':
				if ( network ){
					if ( chan ){
						network.sendLine('PRIVMSG '+chan.name+' :'+args.message.replace(/[\r\n]/g, ''));
						body = 'OK';
					}
					else
						body = 'Invalid channel';
				}
				else
					body = 'Invalid network';
			break;
			case 'join':
				if ( network ){
					network.join(args.channel);
				}
				else
					body = 'Invalid network';
			break;
			case 'part':
				if ( network ){
					network.part(args.channel);
				}
				else
					body = 'Invalid network';
			break;
			case 'nick':
				if ( network ){
					network.setNick(args.nick);
				}
				else
					body = 'Invalid network';
			break;
			default:
				res.statusCode = 404;
				body = 'Unknown action';
			break;
		}
	}
	catch(ex){
		res.statusCode = 500;
		body = 'Exception';
		
		console.error(ex);
	}
	finally{
		res.end(body+"\n");
	}
}).listen(1337, '127.0.0.1');
