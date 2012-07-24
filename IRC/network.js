var net = require('net');
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var child_process = require('child_process');
var util = require('util');

var replycodes = require('./replycodes.js');

var loggers = {
		'irssi': require('./loggers/irssi.js')
};

var sanitize = function(str){
	return str.replace(/[\r\n]/g, '');
};

module.exports = function(config, name){
	var self = this;

	// Local variables
	this.name = name;
	this.config = config;
	this.sock = new net.Socket({
		'type': 'tcp4',
		'allowHalfOpen': true
	});

	this.nick = null;
	this.users = {};
	this.channels = {};

	// Event handlers
	this.onConfig = function(config){
		self.config = config;
	};

	this.onConnect = function(){
		var pass = 'anonymous';
		if ( self.config.pass ){
			if ( typeof(self.config.pass) == 'string' )
				pass = self.config.pass;
			else if ( self.config.pass.source == 'file' )
				pass = fs.readFileSync(self.config.pass.filename, 'utf8');
			pass = pass.trim();
		}

		self.sendLine('PASS '+pass);
		self.sendLine('USER '+self.config.user);

		self.nick(self.config.nick[0] || self.config.nick);
	};
	this.onDisconnect = function(wasError){
		console.log('DISCONNECT ('+(wasError?'error':'normal')+')');
	};

	this.onExit = function(doneCallback){
		var stillWorking = 0;
		Object.keys(self.channels).forEach(function(chanName){
                        var chan = self.channels[chanName];
			if ( chan && chan.logger && chan.logger.close ){
				++stillWorking;
				
				var hasClosed = false;
				chan.logger.close(function(){
					if ( hasClosed )
						return;
					hasClose = true;
					
					if ( --stillWorking == 0 )
						doneCallback();
				});
			}
		});
	};

	this.dataBuffer = '';
	this.onData = function(str){
		self.dataBuffer += str;

		var lines = self.dataBuffer.split("\r\n");
		self.dataBuffer = lines.pop();
		lines.forEach(function(line){
			self.onLine(line);
		});
	};

	this.onLine = function(line){
		console.log('>> '+line);

		var payload = (function(){
			var ind = line.indexOf(' :', 1);
			if ( ind == -1 )
				return '';

			var pl = line.substr(ind+2);
			line = line.substr(0, ind);
			return pl;
		})();

		var parts = line.split(' ');
		if ( parts[0] == 'PING' ){
			self.sendLine('PONG :'+payload);
			return;
		}

		var origin = (function(){
			var str = parts[0][0]==':' ? parts.shift().substr(1) : self.config.servers[0]; // TODO replace with actual current server hostname
			var m = str.match(/^([^@!]+)(?:!([^@]+))?(?:@(.+))?$/);
			return {
				'nick': m[1],
				'user': m[2],
				'host': m[3]
			};
		})();

		var command = parts.shift();
		var callbacks = {
				'RPL_ENDOFMOTD': function(args){ // End of MOTD, safe to join channels
					self.nick = args[0];
					self.config.channels.forEach(function(name){
						self.join(name);
					});
				},
				'RPL_NOTOPIC': function(args, topic){
					args.shift();

					var channel = args.shift();
					self.channels[channel].topic = '';
				},
				'RPL_TOPIC': function(args, topic){
					args.shift();

					var channel = args.shift();
					self.channels[channel].topic = topic;
				},
				'RPL_NAMREPLY': function(args, nicks){
					args.shift();
					args.shift();

					var channel = args.shift();
					nicks = nicks.split(' ').map(function(str){
						return str.replace(/^[@+]/, '');
					});

					self.channels[channel].nicks.concat(nicks);
				},
				'RPL_ENDOFNAMES': function(args){
					args.shift();

					var channel = args.shift();

					if ( self.channels[channel].logger )
						self.channels[channel].logger.names(self.channels[channel].nicks);
				},
				'JOIN': function(args, payload){
					var channel = args.shift() || payload;
					if ( !channel )
						return;

					if ( !self.channels[channel] ){
						var logFile = self.config.logFile;
						if ( logFile )
							logFile = logFile.replace('~', process.env['HOME']).replace('$NETWORK', self.name).replace('$CHANNEL', channel);

						var chan = self.channels[channel] = {
								'name': channel,
								'topic': null,
								'nicks': [],
								'logger': null,
								'logStream': logFile && fs.createWriteStream(logFile, {'flags': 'a','encoding':'utf8'})
						};
						if ( self.config.logFormat ){
							chan.logger = new loggers[self.config.logFormat](function(line, doneCallback){
								var drained = chan.logStream.write(line+"\n");
								if ( doneCallback ){
									if ( drained )
										doneCallback();
									else
										chan.logStream.once('drain', doneCallback);
								}
							}, channel);
							chan.logger.open();
						}
					}

					if ( origin.nick == self.nick )
						self.channels[channel].nicks = [];

					if ( self.channels[channel].logger )
						self.channels[channel].logger.join(origin);
				},
				'PART': function(args, message){
					var channel = args.shift();

					if ( self.channels[channel].logger )
						self.channels[channel].logger.part(origin, message);
				},
				'PRIVMSG': function(args, msg){
					var msgTarget = args.shift();
					var parts = msg.split(/\s+/);

					if ( self.channels[msgTarget] && self.channels[msgTarget].logger )
						self.channels[msgTarget].logger.privmsg(origin, msg);

					var runModule = function(module, modulePath, parts){
						var replyTarget = msgTarget==self.nick ? origin.nick : msgTarget;
						var replyFunc = function(msg){
							if ( typeof(msg) == 'object' ){
								if ( msg.message )
									msg = msg.message;
								else
									msg = JSON.stringify(msg);
							}

							self.sendLine('PRIVMSG '+replyTarget+' :'+(''+msg).replace(/[\r\n]/, ' '));
						};
                                                
                                                var basePath = path.resolve('modules/');
                                                if ( modulePath.substr(0, basePath.length) != basePath ){
                                                    replyFunc('No hacking!');
                                                    return;
                                                }

						try{
							var child = child_process.fork('module_runner.js', [module, modulePath, parts]);
                                                        var timeoutTimeout = null;
                                                        if ( self.config.moduleTimeout ){
                                                            timeoutTimeout = setTimeout(function(){
                                                                child.kill('SIGKILL');
                                                                replyFunc(module + ' timed out!');
                                                            }, self.config.moduleTimeout);
                                                        }

                                                        child.on('exit', function(){
                                                            if ( timeoutTimeout ){
                                                                clearTimeout(timeoutTimeout);
                                                                timeoutTimeout = null;
                                                            }
                                                        });
							
                                                        child.on('message', function(msg){
								if ( !msg )
									return;

								switch ( msg.type ){
								case 'exception':
									replyFunc('\002Exception:\002 ' + msg.ex);
									break;
								case 'reply':
									replyFunc(msg.msg);
									break;
								case 'runModule':
									runCommandModule(msg.module, msg.args);
									break;
								}
							});

							child.send({
								'type': 'rundata',
								'rundata': {
									'network': {
										'name': self.name,
										'nick': self.nick,
										'commandChar': self.config.commandChar,
										'logFile': self.config.logFile,
										'logFormat': self.config.logFormat,
										'allowedRequires': self.config.allowedRequires,
										'moduleTimeout': self.config.moduleTimeout
									},
									'origin': origin,
									'channel': msgTarget,

									'args': parts,
									'moduleName': module,
									'isQuery': msgTarget==self.nick
								}
							});
						}
						catch(ex){
							replyFunc('\002Outer exception:\002 ' + ex);
                                                        console.error('Outer exception', ex);
						}
					};

					var runCommandModule = function(module, args){
						var modulePath = path.resolve('modules/'+module+'.js');
						if ( fs.existsSync(modulePath) )
							runModule(module, modulePath, args);
					};

					if ( msg[0] == self.config.commandChar ){
						var module = parts[0].substr(1);
						runCommandModule(module, parts.slice(1));
					}

					fs.readdirSync('modules/any/').forEach(function(module){
						if ( !module || !/\.js$/.test(module) )
							return;

						module = module.substr(0, module.length-3);
						var modulePath = path.resolve('modules/any/'+module+'.js');
						runModule(module, modulePath, parts);
					});
				}
		};

		if ( callbacks[command] )
			callbacks[command](parts, payload);
		else if ( replycodes[command] && callbacks[replycodes[command]] )
			callbacks[replycodes[command]](parts, payload);

	};

	// Functions
	this.connect = function(){
		var serverparts = self.config.servers[0].split(':');
		self.sock.connect(+(serverparts[1] || 6667), serverparts[0]);
	};

	this.sendLine = function(line){
		console.log('<< '+line);
		self.sock.write(line+"\r\n");
	};

	this.nick = function(nick){
		nick = sanitize(nick);
		self.nick = nick;
		self.sendLine('NICK '+nick);
	};

	this.join = function(channel){
		self.sendLine('JOIN '+sanitize(channel));
	};

	this.part = function(channel){
		self.sendLine('PART '+sanitize(channel));
	};

	// Local initialization
	this.sock.setEncoding('utf8');
	this.sock.on('connect', this.onConnect);
	this.sock.on('close', this.onDisconnect);
	this.sock.on('data', this.onData);
};
