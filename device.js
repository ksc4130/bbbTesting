
//TODO: average temp reading fix thresh


(function () {
    'use strict';

    var fs = require('fs'),
        pinWork = require('./pinWork'),
        EventEmitter = require('events').EventEmitter,
        Epoll = require('epoll').Epoll,
        emitter = new EventEmitter(),
        gpioPath = '/sys/class/gpio/gpio',
        anPath = '/sys/devices/ocp.2/helper.14/',
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
          'sensor': 'both',
          'thermo': 'both'
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
        idCnter = 0,
        anSubs = {};

    function Device (pin, args) {
        if(this === global) {
            return new Device(pin, args);
        }
        var self = this;

        args = args || {};

        self.id = args.id || 0;
        self.oId = idCnter++;
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

        self.isCool = args.isCool || false;
        self.isHeat = args.isHeat || false;

        self.highThreshold = args.highThreshold || false;
        self.lowThreshold = args.lowThreshold || false;

        self.cool = args.cool;
        self.heat = args.heat;
        self.trigger = args.trigger;
        self.lastTrigger = args.lastTrigger;
        self.threshold = args.threshold;
        self.forceTrigger = args.forceTrigger || false;

        if(self.cool) {
            pinWork.exportPin(self.cool, 'out', (dontInitValActionTypes.indexOf('onoff') > -1 ? undefined : 0), 'both', null);
        }
        if(self.heat) {
            pinWork.exportPin(self.heat, 'out', (dontInitValActionTypes.indexOf('onoff') > -1 ? undefined : 0), 'both', null);
        }

        if(self.controls && self.controls.length > 0) {
            for(var icc = 0, ilcc = self.controls.length; icc < ilcc; icc++) {
                pinWork.exportPin(self.controls[icc], 'out', (dontInitValActionTypes.indexOf('onoff') > -1 ? undefined : 0), 'both', null);
            }
        }

        if(!self.direction) {
            console.log('unknown action type unable to set direction', self.actionType, self.direction);
            return self;
        }

        self.setVal = function (val, fn) {
            var self = this;
            console.log('setting', self.pin, val);
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
                    if(bbbAnalogPins.indexOf(self.pin) > -1) {
                        if(!anSubs[self.pin]) {
                            anSubs[self.pin] = [];
	                        var samplesLimit = 10,
		                        sampleRate = 25,
		                        samples = [];
                            var checkAn = function () {
                                fs.readFile(anPath + self.pin, function (err, val) {
	                                console.log('a', val.toString());
                                    val = parseFloat(val.toString());
	                                console.log('b', val.toString());
	                                samples.push(val);
                                    if(samples.length === samplesLimit) {
	                                    var average = 0.0;
	                                    for(var iSamples = 0, ilSamples = samples.length; iSamples < ilSamples; iSamples++) {
		                                	average += samples[iSamples];
	                                    }

	                                    val = average/(samples - 1);
	                                    console.log('c', val.toString());
	                                    if(self.type === 'temp') {
		                                    val = (val - 500) / 10;
		                                    val = ((val * 9/5) + 32).toFixed(2);
	                                    } else {

	                                    }
	                                    for(var i = 0, il = anSubs[self.pin].length; i < il; i++) {
		                                    console.log(self.pin, val, self.trigger);
		                                    anSubs[self.pin][i](val);
	                                    }
	                                    samples = [];
                                    }
                                    setTimeout(checkAn, sampleRate);
                                });

                            };
                            checkAn();
                        }
                        anSubs[self.pin].push(function (val) {
                            var valO = self.value;
                            self.value = val;
                                if(self.actionType === 'thermo') {
                                    if(self.forceTrigger || !self.lastTrigger || Math.abs(self.lastTrigger - val) > .75 || valO !== val) {
                                        var cv,
                                            hv;
                                        if(self.value >= self.trigger + self.threshold) {
                                            cv = 1;
                                        } else if(self.value <= self.trigger){
                                            cv = 0;
                                        }
                                        if(self.value <= self.trigger - self.threshold) {
                                            hv = 1;
                                        } else if(self.value >= self.trigger){
                                            hv = 0;
                                        }
                                        self.isCool = (cv === 1);
                                        self.isHeat = (hv === 1);
                                        self.lastTrigger = self.value;
                                        self.forceTrigger = false;
                                        emitter.emit('thermo', self, valO);
                                    }


                                } else if(valO !== val) {
                                    emitter.emit('change', self, valO);
                                }

                        });
                    } else {
                        var buffer = new Buffer(1),
                            val,
                            valuefd = fs.openSync(gpioPath + self.pin + '/value', 'r');

                        var poller = new Epoll(function (err, fd, events) {
                            var valO = self.value;
                            fs.readSync(fd, buffer, 0, 1, 0);
                            val = parseInt(buffer.toString('ascii'));
                            var hasChanged = (self.value !== val);
                            if(self.actionType === 'switch' && val < self.value) {
                                //button was pressed do work
                                emitter.emit('switched', self);
                            }

                            self.value = val;
                            if(hasChanged) {
                                emitter.emit('change', self, valO);
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