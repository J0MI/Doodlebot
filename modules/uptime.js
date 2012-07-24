var raw = require('os').uptime();

var secs = Math.floor(raw % 60);
var mins = Math.floor(raw / 60 % 60);
var hours = Math.floor(raw / 60 / 60 % 24);
var days = Math.floor(raw / 60 / 60 / 24);

reply('\002Uptime:\002 '+(days?days+'d ':'')+(hours?hours+'h ':'')+(mins?mins+'m ':'')+(secs?secs+'s':''));
done();