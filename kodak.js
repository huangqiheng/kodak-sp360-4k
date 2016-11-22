'use strict';

const TCPBase = require('tcp-base');
const Dgram = require("dgram");

/**
 * A Simple Protocol:
 *   (4B): request id
 *   (4B): body length
 *   ------------------------------
 *   body data
 */
class Client extends TCPBase {
	getHeader() {
		return this.read(8);
	}

	getBodyLength(header) {
		return header.readInt32BE(4);
	}

	decode(body, header) {
		return {
			id: header.readInt32BE(0),
			data: body,
		};
	}

	/*
	  get heartBeatPacket() {
	    return new Buffer([ 255, 255, 255, 255, 0, 0, 0, 0 ]);
	  }
	  */
}

/*
class Kodak extends Client {
	initPacket() {
		let id = ;
		2d00000030000000e903000001000080000000000100000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000
		ffffffff00000000

	}


}
*/

function main(config) {
	console.log('Got server configuration from UDP port 5176: ');
	console.log(JSON.stringify(config));

};

get_pixpro_sp360_config((config) => {main(config);});

return;

const client = new Client({
	host: '172.16.0.254',
	port: 9176,
	needHeartbeat: false,
});

return;


function get_pixpro_sp360_config(callback) {
	let server = Dgram.createSocket('udp4');
	server.on('message', (msg, rinfo) => {
		let reply = msg.toString().split(':');
		let confs = reply[1].split(',');
		let config = {
			model : confs[0], //DV138
			unknow: confs[1], //1
			product_name: confs[2], //PIXPRO SP360 4K
			camera_address : confs[3], //172.16.0.254
			camera_netmask : confs[4], //255.255.255.0
			camera_mac: confs[5], //A408EA47B5D5
			stream_port: confs[6], //9176
			command_port: confs[7], //9175
			unknow1: confs[8], //0
			wifi_ssid: confs[9], //PIXPRO-SP360-4K_7B8B
		};
		callback(config);
		server.close();
	});
	server.bind(5176);

	let socket = Dgram.createSocket("udp4");
	socket.bind(() => {
		socket.setBroadcast(true);
	});

	let message = new Buffer('AOFQUERY:WIFILIB,1');
	socket.send(message, 0, message.length, 5175, '172.16.0.255', (err) => {
		if (err) {
		       	console.log('AOFQUERY UDP message sent error.');
			process.exit(1);
		}
		socket.close();
	});
}



const body = new Buffer('hello');
const data = new Buffer(8 + body.length);
data.writeInt32BE(1, 0);
data.writeInt32BE(body.length, 4);
body.copy(data, 8, 0);

client.send({
	id: 1,
	data,
	timeout: 5000,
}, (err, res) => {
	if (err) {
		console.error(err);
	}
	console.log(res.toString()); // should echo 'hello'
});



