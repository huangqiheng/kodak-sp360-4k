'use strict';

var Gpio = require('onoff').Gpio,
  button = new Gpio(22, 'in', 'both');

button.watch(function(err, value) {
	console.log('button pressed');
});
