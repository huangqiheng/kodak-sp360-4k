'use strict';

const hex = require('hex');
const prettyjson = require('prettyjson');

global.print_hex = function(buffer, title=null) {
	if (buffer) {
		title && console.log("\r\n"+title);
		hex(buffer);
	}
}

global.hexval = function(value) {
	return '0x'+value.toString(16);
}

global.between = function (x, min, max) {
	return x >= min && x <= max;
}

global.print_json = function(json_obj, title=null) {
	if (json_obj) {
		let out_print = '';
		title && (out_print = title + "\r\n");
		out_print += prettyjson.render(json_obj);
		console.log(out_print);
	}
}

