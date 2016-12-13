'use strict';

const http = require("http");
const ws = require("nodejs-websocket");
const fs = require("fs");
const ptr = require('json-ptr');
const merge = require('merge');

http.createServer(function (req, res) {
	fs.createReadStream("index.html").pipe(res)
}).listen(8080)

let server = ws.createServer(function (conn) {
	conn.client_name = null;
	conn.on("text", function (str) {
		let req = parse(str);
		if (!req) return;
		if (!ptr.has(req, '/cmd')) return;
		if (!ptr.has(req, '/id')) return;
		if (!ptr.has(req, '/time')) return;

		switch (ptr.get(req, '/cmd')) of {
		case 'set_info':
			conn.client_name = ptr.get(req, '/client_name');
			res_ok(conn, req);
			break;
		case 'get_names':
			let names = get_names();
			res_ok(conn, req, {'names': names});
			break;
		case 'state_photo_snapshot':
			break;
		case 'take_photos':
			break;
		case 'state_photo_website':
			break;
		case 'get_photos':
			break;
		case 'stitch_photos':
			break;
		default:

		}
	});
})
server.listen(8081)

function res_ok(conn, req, data=null) {
	let res = {};
	data && (res = merge(res, data));
	res.status = 'ok';
	res.id = req.id;
	res.time = Date.now();
	res.req = req;
	conn.sendText(JSON.stringify(res));
	return res;
}

function get_names() {
	let res = [];
	server.conns.forEach(function (conn) {
		conn.client_name && res.push(conn.client_name);
	});
	return res;
}

function parse(str) {
	let res = null;
	if(str) {
		try {
			res = JSON.parse(str);
		} catch(e) {
		}
	}
	return res;
}
