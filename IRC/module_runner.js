var utils = require('../utils.js');
var fs = require('fs');

process.on('uncaughtException', function(err){
	process.send({
		'type': 'exception',
		'ex': err
	});
	process.exit(1);
});

function runModule(rundata){
	var module = process.argv[2];
	var modulePath = process.argv[3];
	//var args = process.argv.slice(4);

	var allowedRequires = rundata.network.allowedRequires.slice();
	rundata.require = function(fileName){
        fileName = fileName.replace(/[^a-z_\-]/, '');
        if ( allowedRequires.indexOf(fileName) != -1 )
        	return require(fileName);
        return null;
	};
	
	rundata.reply = function(msg){
		process.send({
			'type': 'reply',
			'msg': msg
		});
	};
	rundata.usage = function(msg){
		rundata.reply('Usage: ' + rundata.network.commandChar + module + ' ' + msg);
	};
	
	rundata.runModule = function(module, args){
		process.send({
			'type': 'runModule',
			'module': module,
			'args': args
		});
	};
	rundata.getModuleNames = function(){
		var names = [];
		utils.forEach(fs.readdirSync('../modules/'), function(fname){
			if ( fname && /\.js$/.test(fname) )
				names.push(fname.substr(0, fname.length-3));
		});
		return names;
	};
	
	var validTimeouts = [];
	rundata.setTimeout = function(fn, time){
		validTimeouts.push(setTimeout(fn, time));
	};
	rundata.clearTimeout = function(id){
		if ( validTimeouts.indexOf(id) != -1 )
			clearTimeout(id);
	};

	fs.readFile(modulePath, 'utf8', function(err, data){
		if ( err ){
			process.send({
				'type': 'exception',
				'ex': err
			});
			return;
		}

		vm.runInNewContext('(function(){'+data+'}).apply(moduleName, args);', rundata, modulePath);
	});
	
	process.disconnect();
}

process.on('message', function(obj){
	if ( obj && obj.rundata )
		runModule(rundata);
});

