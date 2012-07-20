var rectype = args.shift();
if ( rectype && args.length == 0 ){
    args.push(rectype);
    rectype = 'A';
}
else{
rectype = rectype && rectype.toUpperCase();
if ( ['A', 'AAAA', 'MX', 'TXT', 'SRV', 'PTR', 'NS', 'CNAME'].indexOf(rectype) == -1 )
	rectype = null;
}

if ( rectype ){
	require('dns').resolve(args.shift(), rectype, function(err, addr){
		if ( addr )
			reply(addr.length==1 ? addr[0] : JSON.stringify(addr));
		else
			reply('No results');
	});
}
else
	usage('(A|AAAA|MX|TXT|SRV|NS|CNAME|PTR) (domain|IP)');
