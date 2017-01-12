'use strict';

const fs= require('fs');
const async = require('async');
const url = require('url');
const path = require('path');
const [Kodak,KodakWeb] = require('./kodak.js');


//let kodak_front = connect_camera(HOST_LOCALIP_A);
let kodak_back  = connect_camera(HOST_LOCALIP_B);

snapshot(kodak_back, (err, result) => {
	console.log('snapshot', result);
});

function snapshot(kodak, done)
{
	done = done || function(){};

	async.waterfall([(callback) => {
		console.log('(1) make sure service ready.');
		kodak.service_on_ready((err, res)=> {
			err && callback('service not ready, error!');
			err || callback(null, res);
		});

	}, (res, callback) => {
		console.log('(2) now take a snapshot.');
		kodak.take_snapshot((err, res)=> {
			err && callback('take_snapshot, error!');
			err || callback(null, res);
		});

	}], (err, result) => {
		err && console.log(err);
		done(err, result);
	});
}

function get_lastest_photo(kodak, done)
{
	done = done || function(){};

	async.waterfall ([(callback) => {
		console.log('(1) make sure service ready.');
		kodak.service_on_ready((err, res)=> {
			err && callback('service not ready, error!');
			err || callback(null, res);
		});

	}, (res, callback) => {
		console.log('(2) try open photo website.');
		kodak.http_photos_ready((err, res)=> {
			err && callback('open photo website error!');
			err || callback(null, res);
		});

	}, (res, callback) => {
		console.log('(3) try got image list.');
		kodak.web.get_list((imgs)=> { 
			imgs && callback(null, imgs);
			imgs || callback('get image list error');
		});

	}, (res, callback) => {
		let news = res.pop();
		console.log('(4) download ', news.path);
		let img_file = __dirname + '/cache/' + path.basename(news.path) + '.jpg';

		kodak.web.download(news.path, img_file, (filename)=>{
			callback(null, filename);
		});

	}],(err, result) => {
		err && console.log(err);
		done(err, result);
	});
}

function connect_camera(host_local_ipaddr) 
{
	// camera command port
	let kodak_9715 = new Kodak({localAddress: host_local_ipaddr});

	//camera web
	kodak_9715.web = new KodakWeb({localAddress: host_local_ipaddr});

	//return objects
	return kodak_9715;
}

	
//------------------------------------------
//  cleanup

process.on('SIGINT', () => {
	console.log('Received SIGINT.');
	process.exit();
});



