var fs = require('fs');
var http = require('http');
var IRC = require('./IRC');
var utils = require('./utils.js');

var networks = {};

// Load configuration data and initialize objects
var cmdNetwork = null;
var config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
utils.forEach(config.networks, function(network, networkName){
	if ( !cmdNetwork )
		cmdNetwork = networkName;
	utils.fillMissing(network, config.identity);
	networks[networkName] = new IRC.Network(network, networkName);
});

// Connect to networks
utils.forEach(networks, function(network){
	network.connect();
});
