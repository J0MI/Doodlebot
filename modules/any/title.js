var urlRegex = /https?:\/\/([-\w\.]+)+(:\d+)?(\/([\w\/_\.\-\~]*(\?\S+)?)?)?/;
var titleRegex = /<title>([\s\S]+?)<\/title>/i;
var charsetRegex = /;.*charset=([^ ;]+)/i;

var Iconv = require('iconv').Iconv;

var trim = function(str){
    return str ? str.replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' ') : '';
};

var request = require('request').defaults({
    'maxRedirects': 5,
    'encoding': null,
    'headers': {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11'
    }
});

var running = 0;
args.forEach(function(arg){
    var m = arg && arg.match(urlRegex);
    if ( !m || !m[0] )
        return;
    
    ++running;
    request(m[0], function(err, resp, body){
        if ( !err && resp && resp.statusCode == 200 && body ){
            var m = (resp.headers['content-type'] || '').match(charsetRegex);
            var charset = m && m[1] || 'utf8';
            
            if ( charset ){
                var converter = new Iconv(charset, 'UTF-8//TRANSLIT//IGNORE');
            	body = converter.convert(body);
            }
            
            var m = (body.toString() || '').match(titleRegex);
            if ( m && m[1] )
                reply('\002Title:\002 '+trim(require('ent').decode(m[1])));
        }
        
        if ( --running <= 0 )
            done();
    });
});

if ( running <= 0 )
    done();

