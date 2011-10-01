var net = require('net');
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var utils = require('../utils.js');
var replycodes = require('./replycodes.js');

module.exports = function(config, name){
	var self = this;
	
	// Local variables
	this.name = name;
	this.config = config;
	this.sock = new net.Socket({
		'type': 'tcp4',
		'allowHalfOpen': true
	});
	
	// Event handlers
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
		self.sendLine('NICK '+(self.config.nick[0] || self.config.nick));
	};
	this.onDisconnect = function(wasError){
		console.log('DISCONNECT ('+(wasError?'error':'normal')+')');
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
			'RPL_ENDOFMOTD': function(){ // End of MOTD, safe to join channels
				self.join(self.config.channels);
			},
			'PRIVMSG': function(args, msg){
				var msgTarget = args.shift();
				
				if ( msg[0] != self.config.commandChar )
					return;
				
				var parts = msg.substr(1).split(/\s+/);
				var module = parts.shift();
				var modulePath = path.resolve('modules/'+module.replace(/\.\.|[\r\n]/g, '')+'.js');
				
				if ( !path.existsSync(modulePath) ){
					self.sendLine('PRIVMSG '+msgTarget+' :Command not found: '+module);
					return;
				}
				
				try{
					vm.runInNewContext(fs.readFileSync(modulePath, 'utf8'), {
						'network': {
							'name': self.name
						},
						'origin': origin,
						'reply': utils.takeArray(function(msg){
							var target = msgTarget==self.nick ? origin.nick : msgTarget;
							self.sendLine('PRIVMSG '+target+' :'+msg);
						})
					}, modulePath);
				}
				catch(ex){
					console.error(ex);
				}
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
	
	this.join = utils.takeArray(function(channel){
		self.sendLine('JOIN '+channel);
	});
	
	// Local initialization
	this.sock.setEncoding('utf8');
	this.sock.on('connect', this.onConnect);
	this.sock.on('close', this.onDisconnect);
	this.sock.on('data', this.onData);
};
