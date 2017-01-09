'use strict';

const EventEmitter = require('events');
const async = require("async");
const TCPBase = require('tcp-base');
const func = require('./global.js');
const resp = require('./resp.js');
const request = require('request');
const assert = require('assert');


class KodakWeb  {
	constructor(options) {
		this.options = Object.assign({}, {
			host:  CAM_HOST,
			port: CAM_WEB_PORT,
		}, options);

		assert(this.options.localAddress, 'options.localAddress is required');
	}

	image_download(options) {
		function on_error(err, options) {
			if (options.done) {
				return options.done(err);
			}

			throw err;
		}

		if (!options.url) {
			throw new Error('The option url is required');
		}

		if (!options.dest) {
			throw new Error('The option dest is required');
		}

		let req_opts = {
			url: options.url, 
			encoding: null
		};

		if (options.localAddress) {
			req_opts.localAddress = options.localAddress;
		} else {
			req_opts.localAddress = this.options.localAddress;
		}

		request(req_opts, function (err, res, body) {
			if (err) { 
				on_error(err, options);
			}

			if (body && res.statusCode === 200) {
				if (!path.extname(options.dest)) {
					options.dest = path.join(options.dest, path.basename(options.url));
				}

				fs.writeFile(options.dest, body, 'binary', function(err){
					if (err) {
						on_error(err, options);
					}
					options.done && options.done(false, options.dest, body)
				});
			} else {
				if (!body) { 
					on_error(new Error('Image loading error - empty body. URL: ' + options.url), options); 
				} else { 
					on_error(new Error('Image loading error - ' + res.statusCode + '. URL: ' + options.url), options); 
				}
			}
		});
	}

	get_image(url, tofile, callback) {
		var options = {
			url: url,
			dest: tofile, // Save to /path/to/dest/image.jpg 
			done: function(err, filename, image) {
				if (err) {
					throw err;
				}
				console.log('File saved to', filename);
				callback && callback(filename);
			},
		};
		image_download(options);
	}

	get_list(callback) {
		let root_path = 'http://'+ this.default_host + ':' + this.default_port;

		let args = {
			requestConfig:  { timeout: this.req_timeout},
			responseConfig: { timeout: this.rsp_timeout}
		};

		var req = client.get(root_path + '/?custom=1', args, function (data, response) {
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

	}
}	

class AND_TCPBase extends TCPBase {
	constructor(options) {
		this.localAddress = options.localAddress;
		super(options);
	}

	_connect(done) {
		if (!done) {
			done = () => this.ready(true);
		}

		const socket = this._socket = net.connect({
			port: this.options.port, 
			host: this.options.host,
			localAddress: this.localAddress
		});

		socket.setNoDelay(this.options.noDelay);
		socket.on('readable', () => {
			this._lastReceiveDataTime = Date.now();
			try {
				let remaining = false;
				do {
					remaining = this._readPacket();
				} while (remaining);
			} catch (err) {
				this.close(err);
			}
		});

		// receive `end` event that means the other end of the socket sends a FIN packet
		socket.once('end', () => {
			this.logger.info('[tcp-base] the connection: %s is closed by other side', this[addressKey]);
		});
		socket.once('close', () => this._handleClose());
		socket.once('error', err => {
			err.message += ' (address: ' + this[addressKey] + ')';
			this.close(err);
		});
localAddress
		socket.once('connect', done);

		if (this.options.needHeartbeat) {
			this._heartbeatTimer = setInterval(() => {
				const duration = this._lastHeartbeatTime - this._lastReceiveDataTime;
				if (this._lastReceiveDataTime && duration > this.options.heartbeatInterval) {
					const err = new Error(`server no response in ${duration}ms, maybe the socket is end on the other side.`);
					err.name = 'ServerNoResponseError';
					this.close(err);
					return;
				}
				// flow control
				if (this._invokes.size > 0 || !this.isOK) {
					return;
				}
				this._lastHeartbeatTime = Date.now();
				this.sendHeartBeat();
			}, this.options.heartbeatInterval);
		}
	}

}

class KodakBase extends AND_TCPBase
{
	constructor(options) {
		assert(options.localAddress, 'options.localAddress is required');

		options.host = options.host || CAM_HOST;
		options.port = options.port || CAM_CMD_PORT;

		super(options);
		let kodak = this;

		this.SentEvent = new EventEmitter();

		this.on('request', (entity) => {
			if ((entity.header[0] !== 0x2b) && (entity.header[0] !== 0x2d)) {return;};
			let id = this.getId(entity.header);
			
			//auto handle heartbeat
			if (id === 0x07d2) {
				process.nextTick(()=>{kodak.send(resp(id))});
				return;
			}

			//auto handle event of service started
			if (id === 0x0bba) {
				process.nextTick(()=>{
					kodak.send(resp(id),()=>{
						console.log('seens that Service is new running');
					});
				});
				return;
			}

			entity.packet = Buffer.concat([entity.header, entity.data]); 
			
			if ([0x07d1].indexOf(id) === -1) {
				print_hex(entity.packet, 'receive unknow message:');
			}

			this.SentEvent.emit(kodak.getName(id), entity);
		});
	}

	gen_FF03_370_packet() {
		let packet = new Buffer([ 
			0x2d, 0x00, 0x00, 0x00, 0xe4, 0x00, 0x00, 0x00, 
			0xff, 0x03, 0x00, 0x00, 0x01, 0x00, 0x00, 0x80, 
			0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0xe4, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00,
			0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00,
		]);
		return {id: this.getId(packet), data: packet, timeout: 5000, oneway: false};
	}

	gen_EB03_150_packet() {
		let packet = new Buffer([ 
			0x2d, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 
			0xeb, 0x03, 0x00, 0x00, 0x01, 0x00, 0x00, 0x80, 
			0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x51, 0x59, 0xd7, 0x1f, 0x00, 0x00, 0x00, 0x00,
			0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00,
		]);
		return {id: this.getId(packet), data: packet, timeout: 5000, oneway: false};
	}

	gen_XX03_118_packet(param1) {
		let packet = new Buffer([ 
			0x2d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0xfc, 0x03, 0x00, 0x00, 0x01, 0x00, 0x00, 0x80, 
			0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00,
		]);
		packet.writeInt32LE(param1, 0x08);
		return {id: this.getId(packet), data: packet, timeout: 5000, oneway: false};
	}

	gen_ED03_174_packet() {
		let packet = new Buffer([ 
			0x2d, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 
			0xed, 0x03, 0x00, 0x00, 0x01, 0x00, 0x00, 0x80, 
			0x0a, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00
		]);
		return {id: this.getId(packet), data: packet, timeout: 5000, oneway: false};
	}		

	gen_ED03_146_packet(param1) {
		let packet = new Buffer([ 
			0x2d, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 
			0xed, 0x03, 0x00, 0x00, 0x01, 0x00, 0x00, 0x80, 
			0x1c, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x06, 0x00, 0x00, 0x00,
			0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00
		]);
		packet.writeInt32LE(param1, 0x58);
		return {id: this.getId(packet), data: packet, timeout: 5000, oneway: false};
	}

	gen_ED03_190_packet() {
		let packet = new Buffer([ 
			0x2d, 0x00, 0x00, 0x00, 0x30, 0x00, 0x00, 0x00, 
			0xed, 0x03, 0x00, 0x00, 0x01, 0x00, 0x00, 0x80, 
			0x0b, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x30, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00
		]);
		return {id: this.getId(packet), data: packet, timeout: 5000, oneway: false};
	}

	gen_E903_190_packet(param1, param2) {
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
			0x00, 0x44, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x03, 0x00, 0x00, 0x00,
			0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00
		]);

		packet.writeInt32LE(param1, 0x58);
		packet.writeInt32LE(param2, 0x84);
		return {id: this.getId(packet), data: packet, timeout: 5000, oneway: false};
	}

	gen_EF03_150_packet() {
		let packet = new Buffer([ 
			0x2d, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 
			0xef, 0x03, 0x00, 0x00, 0x01, 0x00, 0x00, 0x80, 
			0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
			0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00
		]);
		return {id: this.getId(packet), data: packet, timeout: 5000, oneway: false};
	}

	getId(header) {
		return header.readInt32LE(0x8);
	}

	getName(headerOrId) {
		let id;
		if (typeof headerOrId ===  'number') {
			id = headerOrId;  
		} else {
			id = this.getId(headerOrId);
		}
		return 'packet_'+id.toString(16);
	}

	getBodyLength(header) {
		const id = this.getId(header);
		const block_header_size = 0x10;
		const tail_size = 0x14;
		const contents_size = header.readInt32LE(0x04);
		let block_mode = header.readInt32LE(0x1c);

		between(contents_size,0,Number.MAX_VALUE) || console.log('read buffer error');
		between(block_mode,0,Number.MAX_VALUE) || console.log('read buffer error');


		let body_size = 0;
		switch(block_mode) {
		    case 0x00:
			body_size = tail_size + contents_size; 
			break;
		    case 0x01:
			body_size = tail_size + contents_size; 
			body_size +=  block_header_size + 0x08;
			break;
		    case 0x02:
			body_size = tail_size + contents_size; 
			body_size +=  block_header_size * 3;
			break;
		    case 0x22:
			if (id === 0x03ec) {
				body_size = 1514 + 1130 - 54*2 - 0x34;
			} else {
				print_hex(header, 'new block mode(22):');
			}
			break;
		    default:
			print_hex(header, 'new block mode: ' + block_mode);
		}

		body_size || print_json({
			header_size: hexval(this.options.headerLength),
			tail_size: hexval(tail_size),
			contents_size: hexval(contents_size),
			block_mode: hexval(block_mode),
			block_header_size: hexval(block_header_size),
			body_size: hexval(body_size)
		}, 'getBodyLength:');

		return  body_size;
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

	service_on_ready(done) {
		done = done || function(){};
		let kodak = this;

		async.waterfall([function(callback) {
			let packet = kodak.gen_E903_190_packet(0x0002, 0x0001);
			kodak.send(packet, (err, res) => {});

			kodak.SentEvent.once(kodak.getName(0x7d1), (entity)=>{
				kodak.send(resp(0x7d1), (err, res)=>{
					process.nextTick(()=>{callback(err, res)});
				});
			});
		},

		function(res, callback) {
			let packet = kodak.gen_XX03_118_packet(0x03ea);
			kodak.send(packet, (err,res)=> {process.nextTick(()=>{callback(err, res)})});
		},

		
		function(res, callback) {
			let packet = kodak.gen_XX03_118_packet(0x03ec);
			kodak.send(packet, (err,res)=> {process.nextTick(()=>{callback(err, res)})});
		},
		

		function(res, callback) {
			let packet = kodak.gen_XX03_118_packet(0x03fc);
			kodak.send(packet, (err,res)=> {process.nextTick(()=>{callback(err, res)})});
		},

		function(res, callback) {
			let packet = kodak.gen_EB03_150_packet();
			kodak.send(packet, (err,res)=> {process.nextTick(()=>{callback(err, res)})});
		},

		function(res, callback) {
			let packet = kodak.gen_FF03_370_packet();
			kodak.send(packet, (err,res)=> {process.nextTick(()=>{callback(err, res)})});
		},

		function(res, callback) {
			let packet = kodak.gen_XX03_118_packet(0x03ea);
			kodak.send(packet, (err,res)=> {process.nextTick(()=>{callback(err, res)})});
		},

		],function (err, result) {
			if (err) {
				console.error(err);
				let packet = kodak.gen_E903_190_packet(0x0800, 0x0002);
				print_hex(packet.data, 'service_on_ready failure and offline:');
				kodak.send(packet, (err, res) => {});
			}
			done(err, result);
		});
	}

	open_website(done, is_photo=true) {
		done = done || function(){};
		let kodak = this;

		async.waterfall([function(callback) {
			let cmd_id = is_photo? 0x2400 : 0x4400;
			let packet = kodak.gen_E903_190_packet(cmd_id, 0x0003);
			kodak.send(packet, (err,res)=> {callback(err, res)});
		},

		function(res, callback) {
			get_img_list((imgs)=> { callback(null,imgs)}, 1000);
		},
		function(res, callback) {
			get_img_list((imgs)=> { callback(null,imgs)}, 2000);
		},
		function(res, callback) {
			res && callback(null, res);
			res || get_img_list((imgs)=> { 
				callback(imgs? null : 'get_img_list error', imgs);
			}, 3000);
		},

		],function (err, result) {
			if (err) {
				console.error(err);

				let packet = kodak.gen_E903_190_packet(0x0800, 0x0002);
				print_hex(packet.data, 'open_website offline: (' + (is_photo? 'photo':'video') + ')');
				kodak.send(packet, (err, res) => {});
			}

			done(err, result);
		});
	}

	take_snapshot(done) {
		done = done || function(){};
		let kodak = this;

		async.waterfall([function(callback) {
			let packet = kodak.gen_E903_190_packet(0x0008, 0x0003);
			kodak.send(packet, (err, res) => {});

			kodak.SentEvent.once(kodak.getName(0x0bba), (entity)=>{
				kodak.send(resp(0x0bba), (err, res)=>{
					callback(err, res);
				});
			});
		},


		function(res, callback) {
			let packet = kodak.gen_ED03_146_packet(0x00000006);
			print_hex(packet.data, 'send capture picture mode:');
			kodak.send(packet, (err, res) => {
				print_hex(res, 'recv response3:');
				callback(err, res);
			});
		},

		function(res, callback) {
			let packet = kodak.gen_ED03_174_packet();
			print_hex(packet.data, 'send capture picture size:');
			kodak.send(packet, (err, res) => {
				print_hex(res, 'recv response4:');
				callback(err, res);
			});
		},

		function(res, callback) {
			let packet = kodak.gen_EF03_150_packet();
			print_hex(packet.data, 'send capture snapshot:');
			kodak.send(packet, (err, res) => {
				print_hex(res, 'recv response snapshot:');
				callback(err, res);
			});
		},

		],function (err, result) {
			if (err) {
				console.error(err);
			}

			let packet = kodak.gen_E903_190_packet(0x00000800, 0x00000002);
			print_hex(packet.data, 'send client offline:');
			kodak.send(packet, (err, res) => {
				print_hex(res, 'recv response offline:');
				done(result);
			});
		});
	}
}

module.exports = [Kodak, KodakWeb];
