var fs = require('fs');
var http = require('http');
var urlParser = require('url');
var IRC = require('./IRC');
var utils = require('./utils.js');

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
	utils.forEach(networks, function(network){
		++stillWorking;
		network.onExit(utils.once(function(){
			if ( --stillWorking == 0 ){
				console.log('All logs closed!');
				process.exit(0);
			}
		}));
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
	
	utils.forEach(config.networks, function(network, networkName){
		if ( !cmdNetwork )
			cmdNetwork = networkName;
		utils.fillMissing(network, config.networkDefaults);
		if ( networks[networkName] )
			networks[networkName].onConfig(network);
		else
			networks[networkName] = new IRC.Network(network, networkName);
	});
};
loadConfig();

// Connect to networks
utils.forEach(networks, function(network){
	network.connect();
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
					network.nick(args.nick);
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
