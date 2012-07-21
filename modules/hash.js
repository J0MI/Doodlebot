var algo = args.shift();
var encoding = 'hex';

var algoParts = algo && algo.split('.');
if ( algoParts && algoParts[1] ){
	algo = algoParts[0];
	encoding = algoParts[1];
}

if ( !(encoding == 'hex' || encoding == 'base64') )
	encoding = 'hex';

switch ( algo && algo.toUpperCase() ){
	case 'MD5':
	case 'SHA1':
	case 'SHA256':
	case 'SHA512':
		var hash = require('crypto').createHash(algo.toLowerCase());
		hash.update(args.join(' '));
		reply(hash.digest(encoding));
	break;
	default:
		usage('algorithm[.(hex|base64)] data, available algorithms are: MD5, SHA1, SHA256, SHA512');
}

done();