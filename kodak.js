'use strict';

const TCPBase = require('tcp-base');
const dgram = require("dgram");
const func = require('./func.js');
const resp = require('./resp.js');

class KodakBase extends TCPBase {
	constructor(options) {
		super(options);

		this.on('request', (entity) => {
			const packet = resp(entity.header, entity.data);

			print_hex(packet, 'auto echo response:');
			packet && this.send_rsp(packet, true);
		});
	}

	send_rsp(packet, oneway=false) {
		let id = this.getId(packet);

		this.send({
			id: id,
			data: packet,
			timeout: 5000,
			oneway: oneway,
		}, (err, res) => {
			if (err) {
				console.error(err);
			}
			print_hex(res, 'recv response:');
		});
	}

	getId(header) {
		return header.readInt32LE(0x8);
	}

	getBodyLength(header) {
		let data_length = header.readInt32LE(0x04);
		let head_size = 0x04;
		let tail_size = 0x18;
		return data_length? (head_size + data_length + tail_size) : head_size;
	}

	decode(body, header) {
		//print_hex(header, 'decode packet:');
		return {
			id: this.getId(header),
			data: body,
			header: header,
		};
	}
}

class Kodak extends KodakBase{
	initPacket() {
		let packet = new Buffer([ 
			0x2d, 0x00, 0x00, 0x00, 0x30, 0x00, 0x00, 0x00, 
			0xe9, 0x03, 0x00, 0x00, 0x01, 0x00, 0x00, 0x80, 
			0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x30, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
			0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00 
		]);
		print_hex(packet, 'send first packet:');
		this.send_rsp(packet);
	}


}

function main(config) {
	print_json(config, 'Configuration from UDP port 5176: ');

	const kodak = new Kodak({
		host: config['camera_address'],
		port: config['command_port'],
		needHeartbeat: false,
		headerLength: 0x44
	});

	kodak.initPacket();
};

get_pixpro_sp360_config((config) => {main(config);});

return;

function get_pixpro_sp360_config(callback) {
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
	/*
	socket.bind(() => {
		socket.setBroadcast(true);
	});
	*/

	let message = new Buffer('AOFQUERY:WIFILIB,1');
	socket.send(message, 0, message.length, 5175, '172.16.0.255', (err) => {
		if (err) {
		       	console.log('AOFQUERY UDP message sent error.');
			process.exit(1);
		}
		socket.close();
	});
}

/*
const body = new Buffer('hello');
const data = new Buffer(8 + body.length);
data.writeInt32BE(1, 0);
data.writeInt32BE(body.length, 4);
body.copy(data, 8, 0);
*/

