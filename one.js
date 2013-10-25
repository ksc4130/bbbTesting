var fs = require('fs'),
    events = require('events'),
    emitter = new events.EventEmitter;

var exportPath = '/sys/class/gpio/export',
    gpioPath = '/sys/class/gpio/gpio',
    anPath = '/sys/devices/ocp.2/helper.14/',
    ids = [
        67,
        'AIN4'
    ];

//var obPin = function (id) {
//  var pin = new Pin(id);
//
//  return function(val) {
//      if(typeof val === 'undefined') {
//          return pin.readSync();
//      } else {
//          pin.write(val);
//      }
//  }
//};

var analogPins = [
    'P9_33',
    'P9_35',
    'P9_36',
    'P9_37',
    'P9_38',
    'P9_39',
    'P9_40'
];

var exportPin = function (pin, direction, value, edge, fn) {
    var workingPath = gpioPath + pin;

    fs.exists(workingPath, function (exists) {
       if(!exists) {
           fs.write(exportPath, pin, function (err) {
                if(err) {
                    console.log('error exporting pin', pin);
                    if(typeof fn === 'function') {
                        fn(err);
                    }
                    return;
                }
                fn(null);
           });
       }
    });
};

var setupPin = function (pin, direction, value, edge, fn) {
    var workingPath = gpioPath + pin;

    if(typeof direction === 'string') {
        fs.write(workingPath +'/direction', direction, function (err) {
            if(err) {
                console.log('error setting direction for pin', pin);
                if(typeof fn === 'function') {
                    fn(err);
                }
                return;
            }
            if(typeof value !== 'undefined' && value !== null) {
                fs.write(workingPath +'/value', value, function (err) {
                    if(err) {
                        console.log('error setting value for pin', pin);
                        if(typeof fn === 'function') {
                            fn(err);
                        }
                        return;
                    }
                    if(typeof edge === 'string') {
                        fs.write(workingPath +'/edge', edge, function (err) {
                            if(err) {
                                console.log('error setting edge for pin', pin);
                                if(typeof fn === 'function') {
                                    fn(err);
                                }
                                return;
                            }
                            fn(null);
                        });
                    }
                });
            } else {
                if(typeof edge === 'string') {
                    fs.write(workingPath +'/edge', edge, function (err) {
                        if(err) {
                            console.log('error setting edge for pin', pin);
                            if(typeof fn === 'function') {
                                fn(err);
                            }
                            return;
                        }
                        fn(null);
                    });
                }
            }
        });
    }
};

var Pin = function (id, direction) {
    if(ids.indexOf(id) < 0)
        return undefined;

    var self = this;

    self.id = id;
    self.value = '';
    self.isAnalog = typeof self.id === 'string';
    if(self.isAnalog) {
        self.path = anPath + self.id;
        self.valuePath = self.path;
    }
    else {
        self.path = gpioPath + self.id;
        self.valuePath = self.path + '/value';
        self.directionPath = self.path + '/direction';
    }

    var exists = fs.existsSync(self.path);
    if(!exists) {
        console.log('doesn\'t exist', self.id);
        fs.writeFileSync(exportPath, self.id);
    }

    self.value = self.readSync();

    return self;
};

//Pin.prototype.setDirection = function (direction) {
//    fs.writeFileSync(self.directionPath, direction);
//};

Pin.prototype.readSync = function () {
    var self = this;
    fs.writeFileSync(self.directionPath, 'in');
    return '' + fs.readFileSync(self.valuePath);
};

Pin.prototype.read = function () {
    var self = this;
    return '' + fs.readFileSync(self.valuePath);
};

Pin.prototype.write = function (val) {
    var self = this;
    fs.writeFileSync(self.directionPath, 'out');
    return '' + fs.writeFileSync(self.valuePath, val || 0);
};

Pin.prototype.writeSync = function (val) {
    var self = this;
    fs.writeFileSync(self.directionPath, 'out');
    return '' + fs.writeFileSync(self.valuePath, val || 0);
};

var pins = [
    new Pin(67)//,
    //new Pin('AIN4')
];

console.log(pins[0].readSync());
pins[0].writeSync(0);
//console.log(pins[0].readSync());


setTimeout(function () {
    pins[0].writeSync(0);
    console.log(pins[0].readSync());
}, 1000);

//setInterval(function () {
//    //var p = pins[1];
//    var p = obPin(67);
//    var v = p.value || '';
//    var nv = p() || '';
//
//    if(nv.toString() !== v.toString()) {
//        p.value = nv;
//        console.log('val new', nv);
//    }
//}, 250);

//pins[1].watch(250);

//fs.watchFile(pins[1].path + '/value', function (curr, prev) {
//    console.log('the current mtime is: ' + curr.mtime);
//    console.log('the previous mtime was: ' + prev.mtime);
//});
