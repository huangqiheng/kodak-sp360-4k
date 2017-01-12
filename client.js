'use strict';

const fs= require('fs');
const async = require('async');
const url = require('url');
const path = require('path');
const [Kodak,KodakWeb] = require('./kodak.js');

/*
get_config((config)=>{
	console.log(config);

});

return;
*/

//let kodak_front = connect_camera(HOST_LOCALIP_A);
let kodak_back  = connect_camera(HOST_LOCALIP_B);

async.waterfall ([(callback) => {
	console.log('(1) check service ready.');
	kodak_back.service_on_ready((err, res)=> {
		err && callback('service not ready, error!');
		err || callback(null, res);
	});

}, (res, callback) => {
	console.log('(2) try open photo website.');
	kodak_back.http_photos_ready((err, res)=> {
		err && callback('open photo website error!');
		err || callback(null, res);
	});

}, (res, callback) => {
	console.log('(3) try got image list.');
	kodak_back.web.get_list((imgs)=> { 
		imgs && callback(null, imgs);
		imgs || callback('get image list error', null);
	});

}, (res, callback) => {
	let news = res.pop();
	console.log('(4) the newest image is: ', news.path);
	let basename = path.basename(news.path);
	let img_file = __dirname + '/' + basename + '.jpg';

	kodak_back.web.get_image(news.path, img_file, (filename)=>{
		console.log('File saved to', filename);
	});

}],(err, result) => {
	console.log(err);
});

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



