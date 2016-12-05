'use strict';

const Client = require('node-rest-client').Client;
const parseString = require('xml2js').parseString;
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

		config.cmd = (process.argv.length>2)? process.argv[2] : 'startweb';

		callback(config);
		server.close();
	});
	server.bind(5176);

	let socket = dgram.createSocket("udp4");

	let message = new Buffer('AOFQUERY:WIFILIB,1');
	socket.send(message, 0, message.length, 5175, '172.16.0.255', (err) => {
		if (err) {
		       	console.log('AOFQUERY UDP message sent error.');
			process.exit(1);
		}
		socket.close();
	});
};

global.get_img_list = function(callback, timeout=1000) {
	let client = new Client();
	let root_path = 'http://172.16.0.254';

	let args = {
		requestConfig: { timeout: timeout},
		responseConfig: { timeout: 2000 }
	};

	let req = client.get(root_path + '/?custom=1', args, function (data, response) {
		parseString(data.toString(), function (err, result) {
			let imgs = [];
			for (var i=0; i<result.LIST.FILECOUNT; i++) {
				let file = result.LIST.ALLFile[0].File[i];
				imgs.push({
					path: root_path + file.FPATH,
					timestamp: file.TIMECODE,
				});
			}
			callback(imgs);
		});
	});

	req.on('requestTimeout', function (req) {
		console.log("request has expired");
		req.abort();
		this.callbacked || callback(null);
		this.callbacked = true;
	});

	req.on('responseTimeout', function (res) {
		console.log("response has expired");
		this.callbacked || callback(null);
		this.callbacked = true;
	});

	req.on('error', function (err) {
		console.log('something went wrong on the request');
		this.callbacked || callback(null);
		this.callbacked = true;
	});
};

