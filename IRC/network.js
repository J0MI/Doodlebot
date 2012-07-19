var net = require('net');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var utils = require('../utils.js');
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
		utils.forEach(self.channels, function(chan){
			if ( chan && chan.logger && chan.logger.close ){
				++stillWorking;
				chan.logger.close(utils.once(function(){
					if ( --stillWorking == 0 )
						doneCallback();
				}));
			}
		});
	};
	
	this.dataBuffer = '';
	this.onData = function(str){
		self.dataBuffer += str;
		
		var lines = self.dataBuffer.split("\r\n");
		self.dataBuffer = lines.pop();
		utils.forEach(lines, self.onLine);
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
				self.join(self.config.channels);
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
				nicks = utils.map(nicks.split(' '), function(str){
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
						'logStream': logFile ? fs.createWriteStream(logFile, {'flags':'a', 'encoding':'utf8'}) : null
					};
					if ( self.config.logFormat ){
						chan.logger = new loggers[self.config.logFormat](utils.takeArray(function(line, doneCallback){
							var drained = chan.logStream.write(line+"\n");
							if ( doneCallback ){
								if ( drained )
									doneCallback();
								else
									chan.logStream.once('drain', doneCallback);
							}
						}), channel);
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
					try{
						fs.readFile(modulePath, 'utf8', function(err, data){
							if ( err ){
								console.error(modulePath);
								console.error(err);
								return;
							}
							
							try{
								var replyTarget = msgTarget==self.nick ? origin.nick : msgTarget;
								var replyFunc = utils.takeArray(function(msg){
									if ( typeof(msg) == 'object' ){
										if ( msg.message )
											msg = msg.message;
										else
											msg = JSON.stringify(msg);
									}
	
									self.sendLine('PRIVMSG '+replyTarget+' :'+msg.replace(/[\r\n]/, ' '));
								});
								
								vm.runInNewContext('(function(){try{'+data+'}catch(ex){onError(ex);}})()', {
									'network': {
										'name': self.name,
										'nick': self.nick,
										'commandChar': self.config.commandChar,
										'logFile': self.config.logFile,
										'logFormat': self.config.logFormat
									},
									'origin': origin,
									'channel': msgTarget,
									
									'args': parts,
									'moduleName': module,
									'isQuery': msgTarget==self.nick,
									
									'reply': replyFunc,
									'usage': function(msg){
										replyFunc('Usage: '+self.config.commandChar+module+' '+msg);
									},
									
									'setTimeout': function(fn, time){
										setTimeout(function(){
											try{
												fn();
											}
											catch(ex){
												console.error(ex);
											}
										}, time);
									},
									'clearTimeout': clearTimeout,
									
									'utils': utils,
									'require': function(fileName){
	                                    fileName = fileName.replace(/[^a-z_\-]/, '');
	                                    if ( self.config.allowedRequires.indexOf(fileName) != -1 )
	                                    	return require(fileName);
	                                    return null;
									},
									
									'onError': function(ex){
										console.error(ex);
									}
								}, modulePath);
							}
							catch(ex){
								console.error(ex);
							}
						});
					}
					catch(ex){
						console.error(ex);
					}
				};

				if ( msg[0] == self.config.commandChar ){
					var module = parts[0].substr(1);
					var modulePath = path.resolve('modules/'+module.replace(/[\.\r\n]/g, '')+'.js');
					if ( fs.existsSync(modulePath) )
						runModule(module, modulePath, parts.slice(1));
					else
						self.sendLine('PRIVMSG '+msgTarget+' :Command not found: '+module);
				}
				
				utils.forEach(fs.readdirSync('modules/any/'), function(module){
					if ( module && !/\.js$/.test(module) )
						return;
					
					module = module.substr(0, module.length-3);
					var modulePath = path.resolve('modules/any/'+module.replace(/[\.\r\n]/g, '')+'.js');
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
	
	this.sendLine = utils.takeArray(function(line){
		console.log('<< '+line);
		self.sock.write(line+"\r\n");
	});
	
	this.nick = function(nick){
		nick = sanitize(nick);
		self.nick = nick;
		self.sendLine('NICK '+nick);
	};
	
	this.join = utils.takeArray(function(channel){
		self.sendLine('JOIN '+sanitize(channel));
	});
	
	this.part = utils.takeArray(function(channel){
		self.sendLine('PART '+sanitize(channel));
	});
	
	// Local initialization
	this.sock.setEncoding('utf8');
	this.sock.on('connect', this.onConnect);
	this.sock.on('close', this.onDisconnect);
	this.sock.on('data', this.onData);
};
