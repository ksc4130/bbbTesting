var device = require('./device'),
    Device = device.Device,
    devices = [];

var io = require('socket.io-client');
var serverUrl = 'http://192.168.1.10:4131';
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
    if(d.isVisible)
        conn.emit('change', {id: d.id, value: d.value});

    if(d.actionType === 'thermo') {
        var c,
            cv,
            h,
            hv;
        if(d.value >= d.trigger + d.threshold) {
            c = d.pin;
            cv = 1;
        } else if(d.value <= d.trigger){
            c = d.pin;
            cv = 0;
        }
        if(d.value <= d.trigger - d.threshold) {
            h = d.pin;
            hv = 1;
        } else if(d.value >= d.trigger){
            h = d.pin;
            hv = 0;
        }

        if(c || h) {
            for(var ic = 0, ilc = devices.length; ic < ilc; ic++) {
                if(c && devices[ic].pin === c) {
                    (function (dev) {
                        dev.setVal(cv);
                    }(devices[ic]));
                }
                if(h && devices[ic].pin === h) {
                    (function (dev) {
                        dev.setVal(hv);
                    }(devices[ic]));
                }
            }
        }
    }
});

module.exports.init = function (devs) {
    devices = devs;

    conn.on('initWorker', function () {
        conn.emit('initWorker', {secret: secret, devices: devices});
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
        } else
            console.log("can't find device for id ", data.id);

    });
};