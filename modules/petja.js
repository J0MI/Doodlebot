var search = args.join(' ').replace(/^\s+|\s+$/g, '');
var searchRegex = null;
if ( search )
	searchRegex = new RegExp(search, 'i');

var url = 'http://api.twitter.com/1/statuses/user_timeline.json?include_entities=1&screen_name=PetjaTouru&count=' + (search?200:1);

require('request')(url, function(error, response, body){
	if ( !error && response.statusCode == 200 ){
		var resp = JSON.parse(body);
		if ( !resp || resp.length == 0 )
			return;
		
		if ( search ){
            var sent = false;
            resp.forEach(function(data){
                if ( sent )
                    return;
                
                var text = data.text;
                (data.entities.urls || []).forEach(function(meta){
                    text = text.replace(meta.url, meta.expanded_url);
                });
                
                if ( searchRegex.test(text) ){
                    reply('\002@PetjaTouru:\002 '+text);
                    sent = true;
                }
            });
        }
		else
			reply('\002@PetjaTouru:\002 '+resp[0].text);
    }
    done();
});