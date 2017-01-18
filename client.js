'use strict';

const fs= require('fs');
const async = require('async');
const url = require('url');
const path = require('path');
const spawn = require('child_process').spawn;
const [Kodak,KodakWeb] = require('./kodak.js');

switch (process.argv[2]) {
case 't': 
	setInterval(()=> {
		let chl = spawn('node', [__dirname+'/client.js']);

		chl.stdout.on('data', (data) => {
			console.log(`stdout: ${data}`);
		});

		chl.stderr.on('data', (data) => {
			console.log(`stderr: ${data}`);
		});

		chl.on('close', (code) => {
			console.log(`child process exited with code ${code}`);
		});
	}, 10000);
	break;
case 'a':
	snapshot(HOST_LOCALIP_A, (err, result) => {
		console.log('photo A: ', result);
		process.exit(0);
	});
	break;
case 'b':
	snapshot(HOST_LOCALIP_B, (err, result) => {
		console.log('photo B: ', result);
		process.exit(0);
	});
	break;
default:
	let snaper = [];
	let outputs = [];

	function trigger(snap){
		snaper.push(snap);
		if (snaper.length === 2) {
			console.log('have two trigger, then action.');
			for (let snap_item of snaper) {
				snap_item();
			}
		}
	}

	snapshot(HOST_LOCALIP_A, (err, result) => {
		outputs.push(result);
		console.log('photo A: ', result);
		(outputs.length===2) && process.exit(0);
	}, trigger);

	snapshot(HOST_LOCALIP_B, (err, result) => {
		outputs.push(result);
		console.log('photo B: ', result);
		(outputs.length===2) && process.exit(0);
	}, trigger);
}

function snapshot(inet_addr, done, wait)
{
	done = done || function(){};

	let kodak = connect_camera(inet_addr);

	async.waterfall([(callback) => {
		kodak.log('(1) make sure service ready.');
		kodak.service_on_ready((err, res)=> {
			err && callback('service not ready, error!');
			err || callback(null, res);
		});

	}, (res, callback) => {
		kodak.log('(2) now take a snapshot.');
		kodak.take_snapshot((err, res)=> {
			err && callback('take_snapshot, error!');
			err || callback(null, res);
		}, wait);

	}, (res, callback) => {
		kodak.log('(3) try open photo website.');
		kodak.http_photos_ready((err, res)=> {
			err && callback('open photo website error!');
			err || callback(null, res);
		});

	}, (res, callback) => {
		kodak.log('(4) try got image list.');
		kodak.web.get_list((err, imgs)=> { 
			if (imgs.length===0) {
				callback('not found images');
			} else {
				callback(null, imgs);
			}
		});

	}, (res, callback) => {
		let news = res.pop();
		kodak.log('(5) download '+ news.path);
		let img_name = path.basename(news.path) + '.jpg';

		kodak.web.download(news.path, img_name, (err, res)=>{
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
	console.log('Received SIGINT.....');
	process.exit();
});



