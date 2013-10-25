var http = require('http'),
    device = require('./device'),
    Device = device.Device,
    devices = [];

device.on('switched', function (d) {
   console.log('switched', d.controls);
    var i,
        il;
    for(i = 0, il = d.controls.length; i < il; i++) {
        for(var ic = 0, ilc = devices.length; ic < ilc; ic++) {
            console.log(devices[ic].pin, typeof devices[ic].toggle);
            if(devices[ic].pin === d.controls[i] && typeof devices[ic].toggle === 'function') {
                devices[ic].toggle();
            }
        }
    }
});

devices.push(
    new Device('67', {
        type: 'light',
        actionType: 'onoff',
        ready: function () {
            //console.log('67 ready');
        }
    }),
    new Device('44', {
        type: 'light',
        actionType: 'switch',
        controls: ['67'],
        ready: function () {
            //console.log('44 ready');
        }
    })
);

var server = http.createServer(function (req, res) {

}).listen(8080);
