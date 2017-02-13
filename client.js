'use strict';

const fs= require('fs');
const async = require('async');
const url = require('url');
const path = require('path');
const spawn = require('child_process').spawn;
const [Kodak,KodakWeb] = require('./kodak.js');

//check if it's calling this script file directly
if (process.argv[1] === __filename) {
	switch (process.argv[2].toLowerCase()) {
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
	case 'ab':
	case 'ba':
		snapshot_photos((paths)=>{
			if (paths) {
				console.log('photo A: ', paths[0]);
				console.log('photo B: ', paths[1]);
			} else {
				console.log('error.');
			}
		});
		break;
	default:
	}
} else {
	module.exports = snapshot_photos;
}

function stitch_panorama(left_img, right_img, callback)
{
	let args_base = ['-z','LZW', '-r','ldr', '-m','TIFF_m', '-o','out'];
	let args = [PTO_FILE, left_img, right_img];

	async.waterfall([(callback)=>{
		let nona = spawn('nona', [...args_base, '-i', '0', ...args]);
	}, (res, callback) => {
		let nona = spawn('nona', [...args_base, '-i', '1', ...args]);
	}], (err, res) => {

	});


	let output_img;
	let enblend = spawn('enblend', ['-o',output_img,'--compression=100',out0000.tif, out0001.tif]);

}

function snapshot_photos(done)
{
	let snaper = [];
	let outputs = [];
	let has_return = false;

	function trigger(snap){
		snaper.push(snap);
		if (snaper.length === 2) {
			//console.log('have two trigger, then action.');
			for (let snap_item of snaper) {
				snap_item();
			}
		}
	}

	function result_paths(paths){
		has_return || done(paths);
		has_return = true;
	}

	snapshot(HOST_LOCALIP_A, (err, result) => {
		if (err) {
			return result_paths(null);
		}
		outputs.push(result);
		(outputs.length===2) && result_paths(outputs);
		//console.log('photo A: ', result);
	}, trigger);

	snapshot(HOST_LOCALIP_B, (err, result) => {
		if (err) {
			return result_paths(null);
		}
		outputs.push(result);
		(outputs.length===2) && result_paths(outputs);
		//console.log('photo B: ', result);
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

	

