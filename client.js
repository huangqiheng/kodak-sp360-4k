'use strict';

const HOST_LOCALIP_A = '172.16.0.101';
const HOST_LOCALIP_B = '172.16.0.102';
const CAM_HOST = '172.16.0.254';
const CAM_CMD_PORT = 9175;
const CAM_WEB_PORT = 9175;
const PROXY_HOST = '127.0.0.1';

const [Kodak,KodakWeb] = require('./kodak.js');
const tcpProxy = require('tcp-proxy');
const range = require("range");
const http = require('http');
const httpProxy = require('http-proxy');


let [kodak_front, kodak_back] = connect_cameras();

kodak_front.service_on_ready((err, res)=> {
	err || kodak.open_website((err, res)=> {
		err && console.log(err);
		err || console.log('open website succefully.');
	});
});


function make_http_proxy(dist_host, dist_port, local_addr, listen_port)
{
	return httpProxy.createProxyServer({
		target:'http://'+dist_host + ':' + dist_port,
		localAddress: local_addr
	
	}).listen(listen_port);
}

function make_tcp_proxy(dist_host, dist_port, local_addr, listen_port) 
{
	return tcpProxy.createServer({
		target: {
			host: dist_host,
			port: dist_port,
			localAddress: local_addr
		}
	}).listen(listen_port);
}

function connect_cameras(host_local_ipaddr) 
{
	// camera command port
	var proxy_port = get_random_port();
	var proxy = make_tcp_proxy(CAM_HOST, CAM_CMD_PORT, host_local_ipaddr, proxy_port);

	const kodak_9715 = new Kodak({
		host: PROXY_HOST,
		port: proxy_port,
		needHeartbeat: false,
		headerLength: 0x34
	});

	kodak_9715.cam_proxy = proxy;

	//camera web
	var proxy_port = get_random_port();
	var proxy = make_http_proxy(CAM_HOST, CAM_WEB_PORT, host_local_ipaddr, proxy_port);

	const kodak_80 = new KodakWeb({
		default_port: proxy_port
	});

	kodak_80.cam_proxy = proxy;

	//return objects
	return [kodak_9715, kodak_80];
}

function get_random_port()
{
	const PORT_BASE = 10000;

	if (global.random_ports === undefined) {
		global.random_ports = range.range(PORT_BASE, PORT_BASE+10); 
	}

	return global.random_ports.pop();
}

	
//------------------------------------------
//  cleanup

process.on('SIGINT', () => {
	console.log('Received SIGINT.');
	process.exit();
});



