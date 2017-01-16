'use strict';

const fs= require('fs');
const async = require('async');
const url = require('url');
const path = require('path');
const [Kodak,KodakWeb] = require('./kodak.js');

console.log(process.argv);
let cmd = process.argv[2];

let kodak_front = connect_camera(HOST_LOCALIP_A);

if (cmd === 'snap') {
	snapshot_action(kodak_front, (err, result) => {
		console.log('snapshot action: ', result);
		kodak_front.set_offline(()=>{
			process.exit(0);
		});
	});
} else {
	get_lastest_photo(kodak_front, (err, result) => {
		console.log('b photo: ', result);
		kodak_front.set_offline(()=>{
			process.exit(0);
		});
	});
}

return; //////////////////////////////////////

let kodak_back  = connect_camera(HOST_LOCALIP_B);
get_lastest_photo(kodak_back, (err, result) => {
	console.log('b photo: ', result);
});

return; //////////////////////////////////////

snapshot(kodak_back, (err, result) => {
	console.log('snapshot', result);
});

function snapshot_action(kodak, done)
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
		kodak.web.get_list((err, imgs)=> { 
			if (imgs.length===0) {
				callback('not found image');
			} else {
				callback(null, imgs);
			}
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



