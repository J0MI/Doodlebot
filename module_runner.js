var fs = require('fs');
var vm = require('vm');
var childProc = require('child_process');

process.on('uncaughtException', function(err){
        console.error('exception', err);
	process.send({
		'type': 'exception',
		'ex': ''+err
	});
	process.exit(1);
});

function runModule(rundata){
	var module = process.argv[2];
	var modulePath = process.argv[3];
	//var args = process.argv.slice(4);

	var allowedRequires = rundata.network.allowedRequires.slice();
	rundata.require = function(fileName){
            if ( allowedRequires.indexOf(fileName) != -1 )
        	return require(fileName);
            return null;
	};
	
        rundata.addAt = function(time, msg, cb){
            var url = 'http://localhost:1337/privmsg?network='+encodeURIComponent(rundata.network.name)+'&channel='+encodeURIComponent(rundata.channel)+'&message='+encodeURIComponent(msg).replace(/\'/g, '%27');

            var p = childProc.spawn('/usr/bin/at', time.split(/\s+/), {
                'stdio': 'pipe'
            });

            p.stdin.end("/usr/bin/wget -O /dev/null '" + url + "'");

            var retu = '';
            p.stdout.on('data', function(data){
                retu += data;
            });
            p.stderr.on('data', function(data){
                retu += data;
            });

            p.on('exit', function(code){
                cb(retu);
            });
        };

        var linesSent = 0;
	rundata.reply = function(msg){
                if ( ++linesSent > 2 )
                    return;

		process.send({
			'type': 'reply',
			'msg': msg
		});
	};
	rundata.usage = function(msg){
		rundata.reply('\002Usage:\002 ' + rundata.network.commandChar + module + ' ' + msg);
	};

        rundata.done = function(){
                process.disconnect();
        };

        rundata.disableTimeoutNotification = function(){
                process.send({
                    'type': 'setTimeoutNotification',
                    'val': false
                });
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
		fs.readdirSync('modules/').forEach(function(fname){
			if ( fname && (/\.js$/).test(fname) )
				names.push(fname.substr(0, fname.length-3));
		});
		return names;
	};
	
	var validTimeouts = [];
	rundata.setTimeout = function(fn, time){
		validTimeouts.push(setTimeout(fn, time));
	};
	rundata.clearTimeout = function(id){
                var ind = validTimeouts.indexOf(id);
                if ( ind == -1 )
                    return;

		clearTimeout(id);
                delete validTimeouts[ind];
	};

	fs.readFile(modulePath, 'utf8', function(err, data){
		if ( err ){
                        console.error('readFile exception', err);
			process.send({
				'type': 'exception',
				'ex': ''+err
			});
			return;
		}

		vm.runInNewContext('(function(){'+data+'})();', rundata, modulePath);
	});
}

process.on('message', function(obj){
	if ( obj && obj.rundata ){
            setTimeout(function(){
                runModule(obj.rundata);
            }, 1);
        }
});

