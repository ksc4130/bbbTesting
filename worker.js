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
    ,savedDevs = []
    ,devsPath = './devs.txt'
    ,transmit = false
    ,isUsingSavedDevs = false;

var serverUrl = 'http://kyngster.com:4131';
var conn = io.connect(serverUrl);
var secret = 'Askindl23@146Fscmaijnd523CXVWGN#63@#7efbsd23#$Rb';

function Transmit(event, data) {
    if(transmit) {
        conn.emit(event, data);
    }

}

function saveDevices() {
    var devs = JSON.stringify(devices);
    console.log('saving devices');
    fs.writeFile(devsPath, devs, function (err) {
        if(err)
            console.log('error writing devs file', err);
    });
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
        //console.log('emitting toggle controlled for', d.pin, d.workerId);
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
    if(devices && devices.length > 0) {
        devices.forEach(function (item) {
            if(typeof item.dispose === 'function')
                item.dispose();
        });
    }
    //console.log('device for io server', data);
    devices = ko.utils.arrayMap(data, function (dev){
        var savedDev;
        if(isUsingSavedDevs) {
            console.log('is using saved dev');
            savedDev = ko.utils.arrayFirst(savedDevs, function (item) {
                return item.id === dev.id;
            });

            if(savedDev) {
                console.log('found saved dev', savedDev);
                dev.trigger = savedDev.trigger;
            }
        }

        var toReturn = new Device(dev);

        if(savedDev) {
            toReturn.setVal(savedDev.value);
        }

        return toReturn;
    });

    conn.emit('devices', devices);

    init();
});

var init = function () {

    conn.on('transmit', function (data) {
        console.log('transmit'. data);
        transmit = data;
        if(data) {
            devices.forEach(function (d) {
                if(d.isVisible) {
                    if(d.actionType === 'thermo')
                        Transmit('thermo', {id: d.id, isLow: d.isLow, isHigh: d.isHigh, value: d.value});
                    else
                        Transmit('change', {id: d.id, value: d.value});
                }
            });
        }
    });

    conn.on('setTrigger', function(data) {
        var device = ko.utils.arrayFirst(devices, function (item) {
            return item.id === data.id;
        });

        if(device) {
            device.highThreshold = parseFloat(data.highThreshold || device.highThreshold);
            device.lowThreshold = parseFloat(data.lowThreshold || device.lowThreshold);
            device.threshold = parseFloat(data.threshold || device.threshold);
            device.trigger = parseFloat(data.trigger || device.trigger);
            device.forceTrigger = true;
            Transmit('thermo', {id: device.id, isLow: device.isLow, isHigh: device.isHigh, highThreshold: device.highThreshold, lowThreshold: device.lowThreshold, threshold: device.threshold, value: device.value, trigger: device.trigger});
            saveDevices();
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
            saveDevices();
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

    fs.exists(devsPath, function (exists) {
        workerId = args.workerId;
        if(exists) {
            console.log('using saved devices');
            isUsingSavedDevs = true;
            fs.readFile(devsPath, function (err, data) {
                var devs = JSON.parse(data);
                savedDevs = devs;
                devices = devs;
            });
        } else {
            devices = args.devices;
        }
    });

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