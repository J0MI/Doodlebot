var rectype = args.shift();
rectype = rectype && rectype.toUpperCase();
if ( !utils.some(['A', 'AAAA', 'MX', 'TXT', 'SRV', 'PTR', 'NS', 'CNAME'], function(x){ return rectype==x; }) )
	rectype = null;

if ( rectype ){
	require('dns').resolve(args.shift(), rectype, function(err, addr){
		if ( addr && (addr.length===undefined || addr.length==0) )
			reply(addr.length==1 ? addr[0] : JSON.stringify(addr));
		else
			reply('No results');
	});
}
else
	usage('(A|AAAA|MX|TXT|SRV|NS|CNAME|PTR) (domain|IP)');
