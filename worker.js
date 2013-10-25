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
                (function (dev) {
                    dev.toggle(null, function (err, d) {
                        conn.emit('change', {id: dev.id, state: d});
                    });
                }(devices[ic]));
            }
        }
    }
});

device.on('onoff', function (d) {
   console.log('onoff', d.pin);
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




var io = require('socket.io-client');
var fs = require('fs');
var serverUrl = 'http://192.168.1.10:4131';
var conn = io.connect(serverUrl);
var secret = 'Askindl23@146Fscmaijnd523CXVWGN#63@#7efbsd23#$Rb';
var util = require('util');
var device = require('./device');
var me = {};

conn.on('initWorker', function (data) {
    console.log('init', util.inspect(data));

    me = data;
    fs.writeFile('./meinfo.json', JSON.stringify(data), function (err) {
        if(err) throw err;

        console.log('created meinfo.json');
    })
});

conn.on('devices', function (data) {
    console.log('device for io server');
    for(var i = 0, il = data.length; i < il; i++) {
        var dev = device(null, data[i]);

        if(dev.name === 'Den') {
            dev.on('change', function (d) {
                console.log('change***********', d);
                conn.emit('change', {id: d.id, state: d.state});
            });
        }
        devices.push(dev);
    }
    //console.log(devices);
});

conn.on('change', function (data) {
    console.log('change', util.inspect(data));
    var device;

    for(var i = 0, il = devices.length; i < il; i++) {
        if(devices[i].id.toString() === data.id.toString()) {
            device = devices[i];
            break;
        }
    }
    if(typeof device !== 'undefined' && device !== null) {
        device.toggle(function (x, d) {
            //if(d.isVisible)
            conn.emit('change', {id: device.id, state: d});
        });
    } else
        console.log("can't find device for id ", data.id);

});
