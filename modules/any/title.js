var urlRegex = /https?:\/\/([-\w\.]+)+(:\d+)?(\/([\w\/_\.\-\~]*(\?\S+)?)?)?/;
var titleRegex = /<title>([\s\S]+?)<\/title>/i;

var trim = function(str){
    return str.replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' ');
};

var request = require('request').defaults({
	'maxRedirects': 5,
	'encoding': 'utf8',
	'timeout': 1000 * 5,
	'headers': {
		'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11'
	}
});

args.forEach(function(arg){
	var m = arg.match(urlRegex);
	if ( !m || !m[0] )
		return;
	
	request(m[0], function(err, resp, body){
		if ( !err && resp.statusCode == 200 ){
			var m = body.match(titleRegex);
			if ( m && m[1] )
				reply(trim(require('ent').decode(m[1])));
		}
	});
});
