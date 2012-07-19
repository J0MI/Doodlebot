require('http').get({
	'host': 'query.yahooapis.com',
	'path': '/v1/public/yql?format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=&q='+encodeURIComponent(args.join(' '))
}, function(res){
	var body = '';
	res.on('data', function(chunk){
		body += chunk;
	});
	res.on('end', function(){
		try{
			var data = JSON.parse(body);
			if ( data && data.query && data.query.results )
				data = data.query.results;
			else
				reply('Invalid response');
			
			while (
				typeof(data) == 'object' && (
					( Object.keys(data).length == 1 && (data = data[Object.keys(data)[0]]) ) ||
					( Object.prototype.toString.call(data) == '[object Array]' && utils.every(data, function(val){
						return typeof(val)=='object' && Object.keys(val).length == 1;
					}) && (data = utils.map(data, function(val){ return val[Object.keys(val)[0]]; })) )
				)
			);
			
			reply(typeof(data)=='object' ? JSON.stringify(data) : data);
		}
		catch(e){
			reply(e.message);
		}
	});
}).on('error', function(e){
	reply(e.message);
});
