'use strict';

const Client = require('node-rest-client').Client;
const parseString = require('xml2js').parseString;
const http = require('http');
const httpProxy = require('http-proxy');

function get_img_list(callback, timeout=1000, host='172.16.0.254', port=80) 
{
	let client = new Client();
	let root_path = 'http://'+ host + ':' + port;

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
