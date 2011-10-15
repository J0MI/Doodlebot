exports.forEach = function(obj, callback){
	if ( Object.prototype.toString.call(obj) == '[object Array]' ){
		for ( var i=0; i<obj.length; ++i ){
			if ( callback(obj[i], i) == false )
				return false;
		}
		return true;
	}
	
	for ( var key in obj ){
		if ( obj.hasOwnProperty(key) ){
			if ( callback(obj[key], key) == false )
				return false;
		}
	}
	return true;
};


exports.every = function(obj, callback){
	return exports.forEach(obj, function(val, key){
		return callback(val, key);
	});
};
exports.none = function(obj, callback){
	return exports.forEach(obj, function(val, key){
		return !callback(val, key);
	});
};
exports.some = function(obj, callback){
	return !exports.forEach(obj, function(val, key){
		return !callback(val, key);
	});
};

exports.map = function(obj, callback){
	var output;
	
	if ( Object.prototype.toString.call(obj) == '[object Array]' ){
		output = [];
		for ( var i=0; i<obj.length; ++i )
			output[i] = callback(obj[i], i);
		return output;
	}
	
	output = {};
	for ( var key in obj ){
		if ( obj.hasOwnProperty(key) )
			output[key] = callback(obj[key], key);
	}
	return output;
};

exports.fillMissing = function(obj){
	for ( var i=1; i<arguments.length; ++i ){
		exports.forEach(arguments[i], function(val, key){
			if ( obj[key] === undefined )
				obj[key] = val;
		});
	}
	return obj;
};

exports.takeArray = function(fn, context){
	return function(arg){
		if ( arg instanceof Array ){
			var rest = Array.prototype.concat.apply([], arguments);
			rest.shift();
			
			var lastResult;
			for ( var i=0; i<arg.length; ++i )
				lastResult = fn.apply(context || null, Array.prototype.concat.apply([arg[i]], rest));
			return lastResult;
		}
		
		return fn.apply(context || null, arguments);
	};
};

exports.once = function(fn){
	var called = false;
	return function(){
		if ( !called ){
			called = true;
			return fn.apply(this, arguments);
		}
		return undefined;
	};
};
