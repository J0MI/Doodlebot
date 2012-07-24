function ertsu() {
	//reply("http://bit.ly/4kb77v");
    usage('[uni] [[ROLLS]d[SIDES] = 1d6]');
    done();
}

var unicodeDice = "\u2680\u2681\u2682\u2683\u2684\u2685";

var unicode = false;
var input = args.shift();
if (/^u(?:ni(?:code)?)?$/i.test(input)) {
	unicode = true;
	input = args.shift();
}

if (args.length > 0) {
    return ertsu();
}

if (!input) {
    input = '1d6';
}

var rolls = 1;
var sides = 6;

var parts;
if (parts = input.match(/^(\d+)[dD](\d+)$/)) {
    rolls = parseInt(parts[1], 10);
    sides = parseInt(parts[2], 10);
}
else if (parts = input.match(/^[dD](\d+)$/)) {
    sides = parseInt(parts[1], 10);
}
else if (parts = input.match(/^(\d+)[dD]?$/)) {
    rolls = parseInt(parts[1], 10);
}
else {
    return ertsu();
}

if (rolls < 1 || sides < 1) {
	return ertsu();
}

var results = [];
for (var i = 0; i < rolls; ++i) {
	results.push(Math.floor(Math.random() * sides));
}

reply(results.map(function(n) {
	if (unicode && sides <= unicodeDice.length) {
		return unicodeDice.charAt(n);
 	}
	else {
		return String(n + 1);
	}
}).join(unicode ? '' : ' '));
done();