'use strict';

const [Kodak,KodakWeb] = require('./kodak.js');

//let kodak_front = connect_camera(HOST_LOCALIP_A);
let kodak_back  = connect_camera(HOST_LOCALIP_B);

kodak_back.service_on_ready((err, res)=> {
	err || kodak.open_website((err, res)=> {
		err && console.log(err);
		err || console.log('open website succefully.');

		kodak_back.web.get_list((imgs)=> { callback(null,imgs)}, 1000);
	});
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



