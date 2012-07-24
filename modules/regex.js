var raw = args.shift();
if ( raw.substr(0,1) != 's' ){
	reply('Only replacement is supported for now.');
	return done();
}

function flip(str) {
    return str.split('').reverse().join('');
}

// [
//		0: full,
//		1: endFlags,
//		2: separator,
//		3: replacement,
//		4: search,
//		5: startFlags
// ]
var parts = flip(raw).match(/^([gim]*)(.)(.*?)\2(?!\\)(.*?)\2(?!\\)(s?)$/);

if ( !parts ){
	reply('Syntax error in regular expression!');
	return done();
}

parts = parts.map(flip);

var reg = new RegExp(parts[4], parts[1]);
reply(args.join(' ').replace(reg, parts[3]));
done();