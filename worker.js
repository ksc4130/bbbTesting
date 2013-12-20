var device = require('./device')
    , fs = require('fs')
    , ko = require('knockout')
    , globals = require('./globals')
    , uuid = require('node-uuid')
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
        conn.emit('toggleControlled', d);
    } else {
        var dev = ko.utils.arrayFirst(devices, function (item) {
           return item.id === d.id;
        });
        dev.setVal(d.value, function (err, val) {
            if(!err) {
                if(dev && dev.isVisible) {
                    Transmit('change', {id: d.id, value: d.value});
                }
            }
        });
    }
});

device.on('thermo', function (d, oldVal) {
    console.log('thermo', {id: d.id, isLow: d.isLow, isHigh: d.isHigh, value: d.value, trigger: d.trigger});
        Transmit('thermo', {id: d.id, isLow: d.isLow, isHigh: d.isHigh, value: d.value, trigger: d.trigger});
});

var init = function () {
    var hasControls = ko.utils.arrayFilter(devices, function (item) {
        return item.controls && item.controls.length > 0;
    });

    ko.utils.arrayForEach(hasControls, function(item) {
        item.controls = ko.utils.arrayMap(item.controls, function (con) {
            var first = ko.utils.arrayFirst(devices, function (f) {return f.pin === con.pin});
            return {
                workerId: workerId,
                id: first.id,
                pin: con.pin,
                type: con.type,
                name: first.name
            };
        });
        db.devices.update({id: item.id}, {$set: {controls: item.controls}});
    });

//    mapped = ko.utils.arrayMap(devices, function (curDev){
//        curDev.id = uuid.v4();
//        curDev.workerId = workerId;
//        return new Device(curDev.pin, curDev);
//    });

    conn.on('initWorker', function () {
        console.log('init worker');
        conn.emit('initWorker', {secret: secret, workerId: workerId,  devices: devices});
    });

    conn.on('transmit', function (data) {
        console.log('transmit'. data);
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
        var device = ko.utils.arrayFirst(devices, function (item) {
            return item.id === data.id;
        });

        if(device) {
            device.trigger = data.trigger;
            device.forceTrigger = true;

            db.devices.find({id: device.id}, function (err, found) {
                if(err) {
                    console.log('updating trigger error', err);
                    return;
                }
                if(!err && found) {
                    found.trigger = data.trigger;
                    db.devices.save({id: found.id}, {$set: {trigger: found.trigger}});
                }
            })
        } else
            console.log("can't find device for id ", data.id);
    });

    conn.on('change', function (data) {
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

    //isVisible: true
    db.devices.find({}, function (err, found) {
        var mapped = [],
            guids = [];

        if(err)
            console.log('error pulling device from db', err);

        if(!err && found.length > 0) {
            console.log('using saved devices');

            mapped = ko.utils.arrayMap(found, function (curDev){
                //curDev.id = uuid.v4();
                //curDev.workerId = workerId;
                guids.push(curDev.id);
                return new Device(curDev.pin, curDev);
            });

            console.log('guids check', mapped.length, ko.utils.arrayGetDistinctValues(guids).length);
            devices = mapped;
            //console.log('init found', mapped);
            init();
        } else {
            console.log('using args.devices');

            mapped = ko.utils.arrayMap(args.devices, function (curDev){
                curDev.id = globals.guid();
                guids.push(curDev.id);
                curDev.workerId = workerId;
                db.devices.save(curDev);

                return new Device(curDev.pin, curDev);
            });

            console.log('guids check', mapped.length, ko.utils.arrayGetDistinctValues(guids).length);
            //db.devices.save(found, function (err) {
                //console.log('init created', found);
                devices = ko.utils.arrayFilter(mapped, function (item) {
                    return item.id;
                });

                init();
            //});

        }

    });
};