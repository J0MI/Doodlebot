var url = 'http://api.wolframalpha.com/v2/query?appid=46H45V-4KKTWTWYT5&format=plaintext&podindex=1,2&input=' + encodeURIComponent(args.join(' '));

require('request')(url, function(error, response, body){
    try{
        if ( !error && response.statusCode == 200 ){
            var resp = require('xml2json').toJson(body, {'object':true});
            resp = resp && resp.queryresult;
            
            if ( !resp )
                return reply('Unknown error');
            
            if ( resp.success != 'true' )
                return reply('Error');
			
            resp = resp.pod;
            if ( !resp || resp.length == 0 )
                return reply('Empty result');
            
            var input = resp[0].subpod.plaintext;
            var output = resp[1].subpod.plaintext;
            
            reply(input+' \002=\002 '+output);
        }
    }
    finally{
    	done();
    }
});
