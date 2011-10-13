var raw = arguments.shift();
if ( raw.substr(0,1) != 's' )
	reply('Only replacement is supported for now.');
else{
	// [
	//		0: full,
	//		1: endFlags,
	//		2: separator,
	//		3: replacement,
	//		4: search,
	//		5: startFlags
	// ]
	var parts = raw.split('').reverse().join('').match(/^([gim]*)(.)(.*?)\2(?!\\)(.*?)\2(?!\\)([s]{0,1})$/);
	
	if ( !parts )
		reply('Syntax error in regular expression!');
	else{
		parts = parts.map(function(x){return x.split('').reverse().join('');});
		
		var reg = new RegExp(parts[4], parts[1]);
		reply(arguments.join(' ').replace(reg, parts[3]));
	}
}
