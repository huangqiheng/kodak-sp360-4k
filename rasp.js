'use strict';

require('./config.js');
var fs  = require('fs');
var tty = fs.createWriteStream('/dev/tty1');

const Gpio = require('onoff').Gpio;
const  button = new Gpio(5, 'in', 'both');

button.watch((err, value)=> {
	if (err) {
		throw err;
	}
	if (value) {
		tft_console('button pressed: ' +  value);
	}
});

process.on('SIGINT', ()=> {
	button.unexport();
});

function tft_console(msg)
{
	console.log(msg);
	tty.write(msg+'\n');
}


