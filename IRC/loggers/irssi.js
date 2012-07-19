module.exports = function(writeLine, channel){
	var self = this;
	
	this.writeLine = writeLine;
	this.channel = channel;
	
	var pad = function(num, width){
		width = width || 2;
		return ('000000000'+num).slice(-width);
	};
	
	var dateTime = function(date){
		var t = date || new Date();
		
		var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		
		return [
			dayNames[t.getDay()],
			monthNames[t.getMonth()],
			pad(t.getDate()),
			pad(t.getHours()) + ':' + pad(t.getMinutes()) + ':' + pad(t.getSeconds()),
			t.getFullYear()
		].join(' ');
	};
	var time = function(date){
		var t = date || new Date();
		return pad(t.getHours()) + ':' + pad(t.getMinutes());
	};
	
	var timedLine = function(line){
		self.writeLine(time()+' '+line);
	};
	
	this.open = function(){
		self.writeLine('--- Log opened '+dateTime());
	};
	this.close = function(doneCallback){
		self.writeLine('--- Log closed '+dateTime(), doneCallback);
	};
	
	this.privmsg = function(origin, message){
		timedLine('<'+origin.nick+'> '+message);
	};
	
	this.join = function(origin){
		timedLine('-!- '+origin.nick+' ['+origin.user+'@'+origin.host+'] has joined '+self.channel);
	};
	this.part = function(origin, message){
		timedLine('-!- '+origin.nick+' ['+origin.user+'@'+origin.host+'] has left '+self.channel+' ['+message+']');
	};
	
	this.names = function(nickList){
		timedLine('-!- Irssi: '+self.channel+': Total of '+nickList.length+' nicks');
		timedLine('-!- Irssi: Join to '+self.channel+' was synced in 0 secs');
	};
};
