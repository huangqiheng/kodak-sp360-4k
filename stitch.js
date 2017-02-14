'use strict';

const fs= require('fs');
const async = require('async');
const url = require('url');
const path = require('path');
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
		snapshot_photos((err, paths)=>{
			err && console.log(err);
			err || console.log('photo A: ', paths[0]);
			err || console.log('photo B: ', paths[1]);
		});
		break;
	case 'pano':
		let left_img = process.argv[3] ||  CACHE_ROOT + '/101_S0JA0010000048L0.jpg';
		let right_img = process.argv[4] ||  CACHE_ROOT + '/102_S0JA0010000048L0.jpg';

		stitch_panorama(left_img, right_img, (err, res)=>{
			err && console.log(err);
			err || console.log('pano photo: ', res);
		});	
		break;
	case 'gen':
		gen_panorama((err, res)=>{
			err && console.log(err);
			err || console.log('output pano: ', res);
		});
		break;
	default:
	}
} else {
	module.exports = gen_panorama;
}

function gen_panorama(callback)
{
	snapshot_photos((err, paths)=>{
		err && callback(err);
		err || stitch_panorama(paths[0], paths[1], callback);
	});
}

function stitch_panorama(left_img, right_img, done)
{
	const bname = CACHE_ROOT + '/out';
	const files = [bname, bname+'0000.tif', bname+'0001.tif', bname+'_pano.jpg'];
	let args_base = ['-z','LZW', '-r','ldr', '-m','TIFF_m', '-o',files[0]];
	let args = [PTO_FILE, left_img, right_img];

	async.waterfall([(callback)=>{
		if (!fs.existsSync(left_img)) {
			callback('left file not exists.');
			return;
		}
		if (!fs.existsSync(right_img)) {
			callback('right file not exists.');
			return;
		}
		fs.existsSync(files[0]) && fs.unlinkSync(files[0]);
		fs.existsSync(files[1]) && fs.unlinkSync(files[1]);
		fs.existsSync(files[2]) && fs.unlinkSync(files[2]);
		fs.existsSync(files[3]) && fs.unlinkSync(files[3]);
		callback(null, 'done');	
	}, (res, callback) => {
		spawn_run('nona', [...args_base, '-i', '0', ...args], (err, res)=>{
			if (fs.existsSync(files[1])) {
				callback(err, res);
			} else {
				callback('nona first error.');
			}
		});
	}, (res, callback) => {
		spawn_run('nona', [...args_base, '-i', '1', ...args], (err, res)=>{
			if (fs.existsSync(files[2])) {
				callback(err, res);
			} else {
				callback('nona second error.');
			}
		});
	}, (res, callback) => {
		spawn_run('enblend', ['-o',files[3],'--compression=100',files[1], files[2]], (err, res)=>{
			if (fs.existsSync(files[3])) {
				callback(err, files[3]);
			} else {
				callback('enblend error.');
			}
		});
	}], (err, res) => {
		if (err === null) {
			let out_basename = path.basename(left_img, '.jpg');
			let out_file = WEB_IMG + '/' + out_basename + '_pano.jpg';
			move(res, out_file, (err)=>{
				err && done(err);
				err || done(null, out_file);
			});
		} else {
			done(err);
		}
	});
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

	function result_paths(err, paths){
		has_return || done(err, paths);
		has_return = true;
	}

	snapshot(HOST_LOCALIP_A, (err, result) => {
		if (err) {
			return result_paths(err);
		}
		outputs.push(result);
		(outputs.length===2) && result_paths(null, outputs);
		//console.log('photo A: ', result);
	}, trigger);

	snapshot(HOST_LOCALIP_B, (err, result) => {
		if (err) {
			return result_paths(err);
		}
		outputs.push(result);
		(outputs.length===2) && result_paths(null, outputs);
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

	

