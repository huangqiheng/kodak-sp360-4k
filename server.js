'use strict';

const httpServer = require("http-server");
const ws = require("nodejs-websocket");
const fs = require("fs");
const ptr = require('json-ptr');
const merge = require('merge');
const path = require('path');
const qrcode = require('qrcode-terminal');
const ip = require('ip');


var server = ws.createServer(function (conn) {
	conn.client_name = null;
	conn.on("text", function (str) {
		let req = parse(str);
		if (!req) return;
		if (!ptr.has(req, '/cmd')) return;
		if (!ptr.has(req, '/id')) return;

		switch (ptr.get(req, '/cmd')) {
		case 'set_name':
			conn.client_name = ptr.get(req, '/client_name');
			res_ok(conn, req);
			break;
		case 'get_names':
			let names = get_names();
			res_ok(conn, req, {'names': names});
			break;
		default:
			if (!ptr.has(req, '/target_name')) { 
				res_err(conn, req, 'unknow command.');
				return;
			}

			let target_conn = get_conn(ptr.get(req, '/target_name'));

			if (!target_conn) {
				res_err(conn, req, 'unknow target.');
				return;
			}

			target_conn.sendText(str);
			res_ok(conn, req);
		}
	});
}).listen(8081);

var website = httpServer.createServer({
	root: './public',
	ext: 'html',
	cache: 1, //development
	cors: true
}).listen(80);


if (process.argv[1] === __filename) {
	let public_addr = process.argv[2] || ip.address();
	let url = 'http://'+ public_addr;

	qrcode.generate(url, { small: true }, function (qr) {
	    console.log(qr);
	});
}

function res_err(conn, req, err_str) {
	let res = {};
	res.status = 'error';
	res.info = err_str;
	res.id = req.id;
	res.time = Date.now();
	res.req = req;
	conn.sendText(JSON.stringify(res));
	return res;
}

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

	if (!server.connections) {
		return res;
	}

	server.connections.forEach(function (conn) {
		conn.client_name && res.push(conn.client_name);
	});

	return res;
}

function get_conn(client_name) {
	if (!client_name) return null;

	let res_conn = null;
	server.connections.forEach(function (conn) {
		if (client_name == conn.client_name) {
			res_conn = conn;
			return;
		}
	});
	return res_conn;
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
