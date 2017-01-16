'use strict';

const fs= require('fs');
const async = require('async');
const url = require('url');
const path = require('path');
const [Kodak,KodakWeb] = require('./kodak.js');


switch (process.argv[2]) {
case 'a':
	console.log('use interface: ' + HOST_LOCALIP_A);
	snapshot(HOST_LOCALIP_A, (err, result) => {
		console.log('photo A: ', result);
		process.exit(0);
	});
	break;
case 'b':
	console.log('use interface: ' + HOST_LOCALIP_B);
	snapshot(HOST_LOCALIP_B, (err, result) => {
		console.log('photo B: ', result);
		process.exit(0);
	});
	break;
default:
	let snaper = [];

	function trigger(snap)
	{
		snaper.push(snap);
		console.log('got one snap');
		if (snaper.length === 2) {
			console.log('have two snaper');
			for (snap_item of snaper) {
				snap_item();
			}
		}
	}

	snapshot(HOST_LOCALIP_A, (err, result) => {
		console.log('photo A: ', result);
		process.exit(0);
	}, trigger);

	snapshot(HOST_LOCALIP_B, (err, result) => {
		console.log('photo B: ', result);
		process.exit(0);
	}, trigger);
}


function snapshot(inet_addr, done, wait)
{
	done = done || function(){};

	let kodak = connect_camera(inet_addr);

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
		}, wait);

	}, (res, callback) => {
		console.log('(3) try open photo website.');
		kodak.http_photos_ready((err, res)=> {
			err && callback('open photo website error!');
			err || callback(null, res);
		});

	}, (res, callback) => {
		console.log('(4) try got image list.');
		kodak.web.get_list((err, imgs)=> { 
			if (imgs.length===0) {
				callback('not found images');
			} else {
				callback(null, imgs);
			}
		});

	}, (res, callback) => {
		let news = res.pop();
		console.log('(5) download ', news.path);
		let img_file = __dirname + '/cache/' + path.basename(news.path) + '.jpg';

		kodak.web.download(news.path, img_file, (err, res)=>{
			callback(err, res);
		});

	}], (err, result) => {
		err && console.log(err);

		kodak.set_offline(()=>{
			done(err, result);
		});
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



