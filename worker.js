var device = require('./device'),
    io = require('socket.io-client'),
    Device = device.Device,
    id,
    devices = [],
    transmit = false;

var ejdb = require('ejdb'),
    uuid = require('node-uuid');

var db = ejdb.open('worker', ejdb.DEFAULT_OPEN_MODE);

var serverUrl = 'http://kyngster.com:4131';
var conn = io.connect(serverUrl);
var secret = 'Askindl23@146Fscmaijnd523CXVWGN#63@#7efbsd23#$Rb';

function Transmit(event, data) {
    if(transmit)
        conn.emit(event, data);
}


device.on('switched', function (d) {
    var i,
        il;
    for(i = 0, il = d.controls.length; i < il; i++) {
        for(var ic = 0, ilc = devices.length; ic < ilc; ic++) {
            if(devices[ic].pin === d.controls[i] && typeof devices[ic].toggle === 'function') {
                (function (dev) {
                    dev.toggle(null, function (err, d) {
                        Transmit('change', {id: dev.id, value: d});
                    });
                }(devices[ic]));
            }
        }
    }
});

device.on('change', function (d, oldVal) {
    if(d.isVisible) {
        Transmit('change', {id: d.id, value: d.value});
    }
});

device.on('thermo', function (d, oldVal) {
    if(d.cool || d.heat) {
        var cv = d.isCool ? 1 : 0,
            hv = d.isHeat ? 1 : 0;
        Transmit('thermo', {id: d.id, isCool: d.isCool, isHeat: d.isHeat, value: d.value, trigger: d.trigger});

        for(var ic = 0, ilc = devices.length; ic < ilc; ic++) {
            if(d.cool && devices[ic].pin === d.cool) {
                (function (dev) {
                    if(dev.value !== cv) {
                        dev.setVal(cv);
                        console.log('cool', dev.value, cv);
                    }
                }(devices[ic]));
            }
            if(d.heat && devices[ic].pin === d.heat) {
                (function (dev) {
                    if(dev.value !== hv) {
                        console.log('heat', dev.value, cv);
                        dev.setVal(hv);
                    }
                }(devices[ic]));
            }
        }
    }
});

var init = function () {

    conn.on('initWorker', function () {
        conn.emit('initWorker', {secret: secret, workerId: id,  devices: devices});
    });

    conn.on('transmit', function (data) {
        transmit = data;
    });

    conn.on('devices', function (data) {
        console.log('device for io server');
//        for(var i = 0, il = data.length; i < il; i++) {
//            for(var ic = 0, ilc = devices.length; ic < ilc; ic++) {
//                if(devices[ic].oId === data[i].oId) {
//                    devices[ic].id = data[i].id;
//                }
//            }
//        }
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
            if(!db.isOpen) {
                db = ejdb.open('worker', ejdb.DEFAULT_OPEN_MODE);
            }
            db.find('devices', {id: device.id}, function (err, cursor, cnt) {
                if(err) {
                    console.log('updating trigger error', err);
                    return;
                }
                if(cnt > 0) {
                    var found = cursor.object();
                    found.trigger = data.trigger;
                    db.save('devices', {_id: found._id, trigger: found.trigger}, function () {
                        cursor.close();
                        db.close();
                    });
                }
            })
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
}


module.exports.init = function (args) {
    id = args.id;
    db.find('devices', {isVisible: true}, function (err, cursor, cnt) {
        var found = [],
            curDev;

        if(err)
            console.log('error pulling device from db', err);
        else if(cnt > 0) {
            while(cursor.next()) {
                curDev = cursor.object();
                found.push(new Device(curDev.pin, curDev));
            }
            console.log('init found', found);
            devices = found;

            init();
            cursor.close();
            db.close();
        } else {
            for(var i = 0, il = args.devices.length; i < il; i++) {
                curDev = args.devices[i];
                curDev.id = uuid.v4();
                curDev.workerId = id;
                found.push(new Device(curDev.pin, curDev));
            }
            db.save('devices', found, function (err) {
                console.log('init created', found);
                devices = found;

                init();
                cursor.close();
                db.close()
            });

        }

    });
};