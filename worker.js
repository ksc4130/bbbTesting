var http = require('http'),
    device = require('./device'),
    Device = device.Device,
    devices = [];

device.on('switched', function (d) {
    var i,
        il;
    for(i = 0, il = d.controls.length; i < il; i++) {
        for(var ic = 0, ilc = devices.length; ic < ilc; ic++) {
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
    if(d.isVisible)
        conn.emit('change', {id: d.id, state: d.value});
});

devices.push(
    new Device('67', {
        name: 'Den Lights',
        type: 'light',
        actionType: 'onoff',
        isVisible: true,
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


var io = require('socket.io-client');
var fs = require('fs');
var serverUrl = 'http://192.168.1.10:4131';
var conn = io.connect(serverUrl);
var secret = 'Askindl23@146Fscmaijnd523CXVWGN#63@#7efbsd23#$Rb';
var util = require('util');
var me = {};

conn.on('initWorker', function () {
    conn.emit('initWorker', {devices: devices});
});

conn.on('devices', function (data) {
    console.log('device for io server');
    for(var i = 0, il = data.length; i < il; i++) {
        for(var ic = 0, ilc = devices.length; ic < ilc; ic++) {
            if(devices[ic].pin === data[i].pin) {
                devices[ic].id = data[i].id;
            }
        }
    }
});

conn.on('change', function (data) {
    var device;

    for(var i = 0, il = devices.length; i < il; i++) {
        if(devices[i].id.toString() === data.id.toString()) {
            device = devices[i];
            break;
        }
    }
    if(typeof device !== 'undefined' && device !== null) {
        device.toggle(null);
//            function (x, d) {
//            if(device.isVisible)
//                conn.emit('change', {id: device.id, state: d});
//        });
    } else
        console.log("can't find device for id ", data.id);

});
