var rectype = args.shift();
if ( rectype && args.length == 0 ){
    args.push(rectype);
    rectype = 'A';
}
else
    rectype = rectype && rectype.toUpperCase();

if ( ['A', 'AAAA', 'MX', 'TXT', 'SRV', 'PTR', 'NS', 'CNAME'].indexOf(rectype) == -1 )
	rectype = null;

if ( rectype ){
    var raw = args.shift();
	require('dns').resolve(raw, rectype, function(err, addr){
		if ( addr )
            reply('\002'+raw+':\002 '+(addr.length==1 ? addr[0] : JSON.stringify(addr)));
		else
			reply('\002'+raw+':\002 No results');
		done();
	});
}
else{
	usage('(A|AAAA|MX|TXT|SRV|NS|CNAME|PTR) (domain|IP)');
	done();
}