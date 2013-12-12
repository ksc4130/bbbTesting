var device = require('./device'),
    Device = device.Device,
    id,
    devices = [];

var io = require('socket.io-client');
var serverUrl = 'http://162.243.52.16:4131';
var conn = io.connect(serverUrl);
var secret = 'Askindl23@146Fscmaijnd523CXVWGN#63@#7efbsd23#$Rb';

device.on('switched', function (d) {
    var i,
        il;
    for(i = 0, il = d.controls.length; i < il; i++) {
        for(var ic = 0, ilc = devices.length; ic < ilc; ic++) {
            if(devices[ic].pin === d.controls[i] && typeof devices[ic].toggle === 'function') {
                (function (dev) {
                    dev.toggle(null, function (err, d) {
                        conn.emit('change', {id: dev.id, value: d});
                    });
                }(devices[ic]));
            }
        }
    }
});

device.on('change', function (d, oldVal) {
    if(d.isVisible) {
        conn.emit('change', {id: d.id, value: d.value});
    }
});

device.on('thermo', function (d, oldVal) {
    if(d.cool || d.heat) {
        var cv = d.isCool ? 1 : 0,
            hv = d.isHeat ? 1 : 0;

        conn.emit('thermo', {id: d.id, isCool: d.isCool, isHeat: d.isHeat, value: d.value});

        for(var ic = 0, ilc = devices.length; ic < ilc; ic++) {
            if(d.cool && devices[ic].pin === d.cool) {
                (function (dev) {
                    if(dev.value !== cv)
                        dev.setVal(cv);
                }(devices[ic]));
            }
            if(d.heat && devices[ic].pin === d.heat) {
                (function (dev) {
                    if(dev.value !== hv)
                        dev.setVal(hv);
                }(devices[ic]));
            }
        }
    }
});

module.exports.init = function (args) {
    id = args.id;
    devices = args.devices;

    conn.on('initWorker', function () {
        conn.emit('initWorker', {secret: secret, devices: devices});
    });

    conn.on('devices', function (data) {
        console.log('device for io server');
        for(var i = 0, il = data.length; i < il; i++) {
            for(var ic = 0, ilc = devices.length; ic < ilc; ic++) {
                if(devices[ic].oId === data[i].oId) {
                    devices[ic].id = data[i].id;
                }
            }
        }
    });

    conn.on('setTrigger', function(data) {
        var device;

        for(var i = 0, il = devices.length; i < il; i++) {
            if(devices[i].id.toString() === data.id.toString()) {
                device = devices[i];
                break;
            }
        }

        if(typeof device !== 'undefined' && device !== null) {
            device.trigger = data.trigger;
            device.forceTrigger = true;
            console.log(device.id, device.trigger);
        } else
            console.log("can't find device for id ", data.id);
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
        } else
            console.log("can't find device for id ", data.id);

    });
};