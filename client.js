'use strict';

const HOST_LOCALIP_A = '172.16.0.101';
const HOST_LOCALIP_B = '172.16.0.102';
const CAM_HOST = '172.16.0.254';
const CAM_CMD_PORT = 9175;
const PROXY_HOST = '127.0.0.1';

const Kodak = require('./kodak.js');
const tcpProxy = require('tcp-proxy');

let [kodak_front, kodak_back] = connect_cameras();

kodak_front.service_on_ready((err, res)=> {
	err || kodak.open_website((err, res)=> {
		err && console.log(err);
		err || console.log('open website succefully.');
	});
});


function connect_cameras() 
{
	const PROXY_PORT_A = 19175;
	const PROXY_PORT_B = 29175;

	//------------------------------------------
	//  camera a
	
	let proxy_a = tcpProxy.createServer({
		target: {
			host: CAM_HOST,
			port: CAM_CMD_PORT,
			localAddress: HOST_LOCALIP_A
		}
	});
	proxy_a.listen(PROXY_PORT_A);

	const kodak_a = new Kodak({
		host: PROXY_HOST,
		port: PROXY_PORT_A,
		needHeartbeat: false,
		headerLength: 0x34
	});
	kodak_a.tcp_proxy = proxy_a;

	//------------------------------------------
	//  camera b

	let proxy_b = tcpProxy.createServer({
		target: {
			host: CAM_HOST,
			port: CAM_CMD_PORT,
			localAddress: HOST_LOCALIP_B
		}
	});
	proxy_b.listen(PROXY_PORT_B);

	const kodak_b = new Kodak({
		host: PROXY_HOST,
		port: PROXY_PORT_B,
		needHeartbeat: false,
		headerLength: 0x34
	});
	kodak_b.tcp_proxy = proxy_b;


	//------------------------------------------
	//  cleanup
	
	process.on('SIGINT', () => {
		console.log('Received SIGINT.');
		kodak_a.close();
		proxy_a.close();
		kodak_b.close();
		proxy_b.close();
		process.exit();
	});


	return [kodak_a, kodak_b];
};


