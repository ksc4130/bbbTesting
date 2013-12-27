var device = require('./device')
    , fs = require('fs')
    , ko = require('knockout')
    , globals = require('./globals')
    , pinWork = require('./pinWork')
    , watch = require('watch')
    , db = require("mongojs").connect(globals.dbName, globals.collections)
    , io = require('socket.io-client')
    , Device = device.Device
    , workerId
    , devices = []
    transmit = false;

var serverUrl = 'http://kyngster.com:4131';
var conn = io.connect(serverUrl);
var secret = 'Askindl23@146Fscmaijnd523CXVWGN#63@#7efbsd23#$Rb';

function Transmit(event, data) {
    if(transmit) {
        conn.emit(event, data);
    }

}

device.on('switched', function (d) {
    var dev = ko.utils.arrayFirst(devices, function(item) {
        return item.id === d.id;
    });
    dev.toggle(null, function (err, d) {
        Transmit('change', {id: dev.id, value: d});
    });
});

device.on('change', function (d, oldVal) {
    //console.log('change', d.id, d.pin, d.isVisible);
    if(d.isVisible) {
        Transmit('change', {id: d.id, value: d.value});
    }
});

device.on('changeControlled', function (d, oldVal) {
    if(d.workerId !== workerId) {
        conn.emit('changeControlled', d);
    } else {
        var dev = ko.utils.arrayFirst(devices, function (item) {
           return item.id === d.id;
        });

        if(!dev)
            return;
        //console.log('change controlled', dev);
        dev.setVal(d.value, function (err, val) {
            if(!err) {
                if(dev && dev.isVisible) {
                    Transmit('change', {id: d.id, value: d.value});
                }
            }
        });
    }
});

device.on('toggleControlled', function (d, oldVal) {
    if(d.workerId !== workerId) {
        console.log('emitting toggle controlled for', d.pin, d.workerId);
        conn.emit('toggleControlled', d);
    } else {
        var dev = ko.utils.arrayFirst(devices, function (item) {
           return item.id === d.id;
        });
        if(dev) {
            dev.toggle(null, function (err, d) {
                Transmit('change', {id: dev.id, value: d});
            });
        }
    }
});

device.on('thermo', function (d, oldVal) {
    //console.log('thermo event', d.name, d.isHigh, d.isLow);
    //console.log('thermo', {id: d.id, isLow: d.isLow, isHigh: d.isHigh, value: d.value, trigger: d.trigger});
        Transmit('thermo', {id: d.id, isLow: d.isLow, isHigh: d.isHigh, value: d.value});
});

conn.on('initWorker', function () {
    //console.log('init worker');
    conn.emit('initWorker', {secret: secret, workerId: workerId,  devices: devices});
});

conn.on('devices', function (data) {
    //console.log('device for io server', data);
    devices = ko.utils.arrayMap(data, function (dev){
        return new Device(dev);
    });

    conn.emit('devices', devices);

    init();
});

var init = function () {

    conn.on('transmit', function (data) {
        console.log('transmit'. data);
        transmit = data;
    });

    conn.on('setTrigger', function(data) {
        var device = ko.utils.arrayFirst(devices, function (item) {
            return item.id === data.id;
        });

        if(device) {
            device.highThreshold = data.highThreshold || device.highThreshold;
            device.lowThreshold = data.lowThreshold || device.lowThreshold;
            device.threshold = data.threshold || device.threshold;
            device.trigger = data.trigger || device.trigger;
            device.forceTrigger = true;
            Transmit('thermo', {id: device.id, isLow: device.isLow, isHigh: device.isHigh, highThreshold: device.highThreshold, lowThreshold: device.lowThreshold, threshold: device.threshold, value: device.value, trigger: device.trigger});

        } else
            console.log("can't find device for id ", data.id);
    });

    conn.on('change', function (data) {
        //console.log('*************change', data);
        var device = ko.utils.arrayFirst(devices, function (item) {
            return item.id === data.id;
        });

        if(device && typeof device !== 'undefined' && device !== null) {
            device.toggle(null);
        } else
            console.log("can't find device for id ", data.id);

    });

    conn.on('toggleControlled', function (data) {
        var dev = ko.utils.arrayFirst(devices, function(item) {
            return item.id === d.id;
        });
        dev.toggle(null, function (err, d) {
            Transmit('change', {id: dev.id, value: d});
        });
    });
};


module.exports.init = function (args) {
    workerId = args.workerId;
    devices = args.devices;
    //init();
    //isVisible: true
//    db.devices.find({}, function (err, found) {
//        var mapped = [];
//
//        if(err)
//            console.log('error pulling device from db', err);
//
//        if(!err && found.length > 0) {
//
//            mapped = ko.utils.arrayMap(found, function (curDev){
//                return new Device(curDev);
//            });
//
//            devices = mapped;
//            //console.log('init found', mapped);
//            init();
//        } else {
//            console.log('using args.devices');
//
//            mapped = ko.utils.arrayMap(args.devices, function (curDev){
//                curDev.id = globals.guid();
//                curDev.workerId = workerId;
//                db.devices.save(curDev);
//                return new Device(curDev);
//            });
//
//            //db.devices.save(found, function (err) {
//                //console.log('init created', found);
//                devices = ko.utils.arrayFilter(mapped, function (item) {
//                    return item.id;
//                });
//
//                init();
//            //});
//
//        }
//
//    });
};