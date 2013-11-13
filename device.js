(function () {
    'use strict';

    var fs = require('fs'),
        pinWork = require('./pinWork'),
        EventEmitter = require('events').EventEmitter,
        Epoll = require('epoll').Epoll,
        emitter = new EventEmitter(),
        exportPath = '/sys/class/gpio/export',
        gpioPath = '/sys/class/gpio/gpio',
        anPath = '/sys/devices/ocp.2/helper.14/',
        idDeviceCnt = 0,
        zero = new Buffer('0'),
        one = new Buffer('1'),
        device,
        bbbToggle,
        ainInited = false,
        dontInitValActionTypes = [
            'switch',
            'sensor'
        ],
        inputActionTypes = [
            'switch',
            'sensor',
            'thermo'
        ],
        outputActionTypes = [
            'onoff',
            'momentary'
        ],
        edges = {
          'switch': 'both',
          'onoff': 'both',
          'momentary': 'both',
          'sensor': 'both'
        },
        bbbAnalogPins = [
            'P9_33',
            'P9_35',
            'P9_36',
            'P9_37',
            'P9_38',
            'P9_39',
            'P9_40',
            'AIN0',
            'AIN1',
            'AIN2',
            'AIN3',
            'AIN4',
            'AIN5',
        ],
        idCnter = 0;

    function Device (pin, args) {
        if(this === global) {
            return new Device(pin, args);
        }
        var self = this;

        args = args || {};

        self.id = args.id || idCnter++;
        self.actionType = args.actionType;
        self.type = args.type;

        self.direction = (inputActionTypes.indexOf(self.actionType) > -1) ? 'in' :
            (outputActionTypes.indexOf(self.actionType) > -1) ? 'out' : null;

        self.edge = edges[self.actionType];
        self.pin = pin || (args.pin || '');
        self.name = args.name || 'untitled';

        if(args.value !== '0' && args.value !== '1') {
            args.value = '0';
        }

        self.value = parseInt(args.value);

        self.controls = args.controls;
        self.isVisible = args.isVisible || false;
        self.ready = args.ready;

        if(!self.direction) {
            console.log('unknown action type unable to set direction', self.actionType, self.direction);
            return self;
        }

        self.setVal = function (val, fn) {
            var self = this;
            fs.writeFile(gpioPath + self.pin +'/value', val, function (err) {
                if(err) {
                    console.log('error setting value for pin', pin);
                    if(typeof fn === 'function') {
                        fn(err, null);
                    }
                    return;
                }
                var valO = self.value;
                self.value = val;
                emitter.emit('change', self, valO);
                if(typeof fn === 'function') {
                    fn(null, val);
                }
            });
        };

        self.getVal = function (fn) {
            var self = this;
            fs.readFile(gpioPath + self.pin +'/value', function (err, val) {
                if(err) {
                    console.log('error setting value for pin', pin);
                    if(typeof fn === 'function') {
                        fn(err, null);
                    }
                    return;
                }
                var valO = self.value;
                self.value = val;
                if(valO != val)
                    emitter.emit('change', self, valO);
                if(typeof fn === 'function') {
                    fn(null, val);
                }
            });
        };

        self.init = function (err) {
            if(typeof self.ready === 'function') {
                self.ready(self);
            }

            if(self.actionType === 'onoff') {
                self.toggle = function (val, fn) {
                    var v = val || (1 - self.value);
                    self.setVal(v, fn);
                }
            } else if(self.actionType === 'momentary') {
                self.toggle = function () {
                    self.setVal(1, function (err, fn) {
                        setTimeout(function (fn) {
                            self.setVal(0, fn);
                        }, 150);
                    });
                }
            }

            if(self.direction === 'in') {
                (function () {
                    if(bbbAnalogPins.indexOf(pin) > -1) {
                        setInterval(function () {
                            var val = fs.readFileSync(anPath + self.pin).toString();
                            if(self.type === 'temp') {
                                val = (val - 500) / 10;
                                val = ((val * 9/5) + 32).toFixed(2);
                            } else {

                            }

                            if(self.value !== val) {
                                self.value = val;
                                emitter.emit('change', self, val);
                            }
                        }, 150);
                    } else {
                        var buffer = new Buffer(1),
                            val,
                            valuefd = fs.openSync(gpioPath + self.pin + '/value', 'r');;
                        var poller = new Epoll(function (err, fd, events) {
                            fs.readSync(fd, buffer, 0, 1, 0);
                            val = parseInt(buffer.toString('ascii'));
                            var hasChanged = (self.value !== val);
                            if(self.actionType === 'switch' && val < self.value) {
                                //button was pressed do work
                                emitter.emit('switched', self);
                            }
                            self.value = val;
                            if(hasChanged) {
                                emitter.emit('change', self, val);
                            }
                        });

                        fs.readSync(valuefd, buffer, 0, 1, 0);

                        poller.add(valuefd, Epoll.EPOLLPRI);
                    }
                }());
            }
        };

        if(bbbAnalogPins.indexOf(pin) > -1) {
            var exists = fs.existsSync(anPath + 'AIN1');
            if(!exists) {
                fs.writeFileSync('/sys/devices/bone_capemgr.9/slots', 'cape-bone-iio');
            }
            self.init(null);
        } else {
            pinWork.exportPin(self.pin, self.direction, (dontInitValActionTypes.indexOf(self.actionType) > -1 ? undefined : self.value), self.edge, self.init);
        }

        return self;
    }

    exports.Device = Device;
    exports.on = function (event, fn) {
        emitter.on(event, fn);
    };
}());