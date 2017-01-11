'use strict';

//............... global defind ..............
//////////////////////////////////////////////

global.HOST_LOCALIP_A = '172.16.0.101';
global.HOST_LOCALIP_B = '172.16.0.102';
global.CAM_HOST = '172.16.0.254';
global.CAM_CMD_PORT = 9175;
global.CAM_WEB_PORT = 80;
global.CAM_WEB_TIMEOUT = 1500;

//////////////////////////////////////////////

const dgram = require("dgram");
const hex = require('hex');
const prettyjson = require('prettyjson');

global.print_hex = function(buffer, title=null) {
	if (buffer) {
		title && console.log("\r\n"+title);
		hex(buffer);
	}
};

global.hexval = function(value) {
	return '0x'+value.toString(16);
};

global.between = function (x, min, max) {
	return x >= min && x <= max;
};

global.print_json = function(json_obj, title=null) {
	if (json_obj) {
		let out_print = '';
		title && (out_print = title + "\r\n");
		out_print += prettyjson.render(json_obj);
		console.log(out_print);
	}
};

global.get_config = function (callback) {
	let server = dgram.createSocket('udp4');
	server.on('message', (msg, rinfo) => {
		let reply = msg.toString().split(':');
		let confs = reply[1].split(',');
		let config = {
			model : confs[0], //DV138
			unknow: parseInt(confs[1]), //1
			product_name: confs[2], //PIXPRO SP360 4K
			camera_address : confs[3], //172.16.0.254
			camera_netmask : confs[4], //255.255.255.0
			camera_mac: confs[5], //A408EA47B5D5
			stream_port: parseInt(confs[6]), //9176
			command_port: parseInt(confs[7]), //9175
			unknow1: parseInt(confs[8]), //0
			wifi_ssid: confs[9], //PIXPRO-SP360-4K_7B8B
		};

		callback(config);
		server.close();
	});
	server.bind(5176);

	let socket = dgram.createSocket("udp4");

	let message = new Buffer('AOFQUERY:WIFILIB,1');
	socket.send(message, 0, message.length, 5175, '172.16.0.255', (err) => {
		if (err) {
			console.log('AOFQUERY UDP message sent error.', err);
			process.exit(1);
		}
		socket.close();
	});
};


global.call_base = function(object, method, args) {
	var base = object.hasOwnProperty('_call_base_reference') ? object._call_base_reference : object,
	object_current_method = base[method],
	descriptor = null,
	is_super = false,
	output = null;

	while (base !== undefined) {
		descriptor = Object.getOwnPropertyDescriptor(base, method);
		if (descriptor !== undefined) {
				if (descriptor.value === object_current_method) {
						is_super = true;
				}
				else if (is_super === true) {
						object._call_base_reference = base;
						output = descriptor.value.apply(object, args);
						delete object._call_base_reference;
						return output;
				}
		}
		base = Object.getPrototypeOf(base);
	}
}

