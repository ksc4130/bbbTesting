(function () {
    'use strict';

    var fs = require('fs')
        , globals = require('./globals')
        , ko = require('knockout')
        , pinWork = require('./pinWork')
        , EventEmitter = require('events').EventEmitter
        , emitter = new EventEmitter()
        , dontInitValActionTypes = [
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
        anSubs = {},
        pinSubs = {},
        digSubs = {};

    function Device (pin, args) {
        if(this === global) {
            return new Device(pin, args);
        }
        var self = this;

        args = args || {};

        self.deviceId = args.deviceId || 0;
        self.workerId = args.workerId;
        self.name = args.name || 'untitled';
        self.actionType = args.actionType;
        self.type = args.type;
        self.controls = args.controls;

        //if it's an analog pin parse value as float else parse as int
        self.value = ko.utils.arrayFirst(globals.bbbAnalogPins, function (item) {
            return  item === self.pin;
        }) ? parseFloat(args.value) : parseInt(args.value);

        self.pin = pin || (args.pin || '');

        self.direction = (inputActionTypes.indexOf(self.actionType) > -1) ? 'in' :
            (outputActionTypes.indexOf(self.actionType) > -1) ? 'out' : null;
        self.edge = edges[self.actionType];

        self.lastTrigger = args.lastTrigger;
        self.lastHighTrigger = args.lastTrigger;
        self.lastLowTrigger = args.lastTrigger;
        self.forceTrigger = args.forceTrigger || false;

        self.trigger = args.trigger;
        //self.highTrigger = args.highTrigger || 1;
        //self.lowTrigger = args.lowTrigger || 0;

        self.thershold = args.thershold;
        self.highThershold = args.highThershold || 1;
        self.lowThershold = args.lowThershold || 0;

        self.isLow = args.isLow || false;
        self.isHigh = args.isHigh || false;

        self.samplesLimit = args.samplesLimit || 10;
        self.sampleRate = args.sampleRate || 50;
        self.samples = args.samples || [];



//        if(args.value !== '0' && args.value !== '1') {
//            args.value = '0';
//        }
        //self.isVisible = args.isVisible || false;
//        self.cool = args.cool;
//        self.heat = args.heat;

//        if(self.cool) {
//            pinWork.exportPin(self.cool, 'out', (dontInitValActionTypes.indexOf('onoff') > -1 ? undefined : 0), 'both', null);
//        }
//        if(self.heat) {
//            pinWork.exportPin(self.heat, 'out', (dontInitValActionTypes.indexOf('onoff') > -1 ? undefined : 0), 'both', null);
//        }

        if(self.actionType === 'momentary') {
            self.toggle = function () {
                self.setVal(1, function (err, fn) {
                    setTimeout(function (fn) {
                        self.setVal(0, fn);
                    }, 150);
                });
            }
        } else {
            self.toggle = function (val, fn) {
                var v = val || (1 - self.value);
                self.setVal(v, fn);
            }
        }

        if(self.controls && self.controls.length > 0) {
            var toExport = ko.utils.arrayFilter(self.controls, function (item) {
                return item.workerId === self.workerId && !ko.utils.arrayFirst(globals.bbbAnalogPins, function (p) {return item.pin === p;});
            });
            ko.utils.arrayForEach(toExport, function(item) {
                pinWork.exportPin(toExport.pin, 'out', 0, null, null);
            });
        }

        if(!self.direction) {
            console.log('unknown action type unable to set direction', self.actionType, self.direction);
            return self;
        }

        self.setVal = function (val, fn) {
            fn = typeof fn === 'function' ? fn : function () {};
            pinWork.setVal(self.pin, val, function (err, val) {
                if(err) {
                    fn(err, null);
                    return;
                }
                var valO = self.value;
                self.value = val;
                if(valO !== val)
                    emitter.emit('change', self, valO);
                fn(null, val);
            });
        };

        self.getVal = function (fn) {
            fn = typeof fn === 'function' ? fn : function () {};
            pinWork.getVal(self.pin, function (err, val) {
                if(err) {
                    fn(err, null);
                    return;
                }
                var valO = self.value;
                self.value = val;
                if(valO !== val)
                    emitter.emit('change', self, valO);

                fn(null, val);
            });
        };

        self.init = function (err) {
            if(typeof self.ready === 'function') {
                self.ready(self);
            }



            if(self.direction === 'in') {
                (function () {
                    if(!pinSubs[self.pin]) {
                        pinSubs[self.pin] = [];

                        var checkVal = function () {
                            pinWork.getVal(self.pin, function (err, val) {
                                if(self.type === 'temp') {
                                    val = (val - 500) / 10;
                                    val = ((val * 9/5) + 32).toFixed(2);
                                }
                                console.log('sample', self.name, val);
                                self.samples.push(val);
                                if(self.samples.length === self.samplesLimit) {
                                    var average = 0.0;
                                    for(var iSamples = 0, ilSamples = self.samplesLimit; iSamples < ilSamples; iSamples++) {
                                        average += parseFloat(self.samples[iSamples]);
                                    }

                                    val = (average/self.samplesLimit).toFixed(2);

                                    for(var i = 0, il = pinSubs[self.pin].length; i < il; i++) {
                                        (function (sub, val) {
                                            sub(val);
                                        }(pinSubs[self.pin][i], val));
                                    }
                                    self.samples = [];
                                }
                                setTimeout(checkVal, self.sampleRate);
                            });//end get val
                        };
                        checkVal();
                    }
                    pinSubs[self.pin].push(function (val) {
                        var valO = self.value,
                            isHighO = self.isHigh,
                            isLowO = self.isLow;
                        self.value = val;


                        var lastTriggerDiff = Math.abs(self.lastTrigger - val);
                        var lastHighTriggerDiff = Math.abs(self.lastHighTrigger - val);
                        var lastLowTriggerDiff = Math.abs(self.lastHighTrigger - val);
                        //set isHigh and isLow
                        if(lastHighTriggerDiff >= self.highThershold) {
                            self.isHigh = self.value >= (self.trigger + self.highThershold);
                        }
                        if(lastLowTriggerDiff >= self.lowThershold) {
                            self.isLow = self.value <= (self.trigger - self.lowThershold);
                        }


                            //check controls and triggers
                        if(self.controls.length) {

                            //handle highs
                            if(isHighO != self.isHigh) {
                                self.lastHighTrigger = self.value;
                                var highs = ko.utils.arrayFilter(self.controls, function (item) {return item.type === 'high' && !item.trigger});
                                ko.utils.arrayForEach(highs, function (item) {
                                    item.value = self.isHigh ? 1 : 0;
                                    emitter.emit('changeControlled', item);
                                });
                            }

                            //handle lows
                            if(isLowO != self.isLow) {
                                self.lastLowTrigger = self.value;
                                var lows = ko.utils.arrayFilter(self.controls, function (item) {return item.type === 'low' && !item.trigger;});
                                ko.utils.arrayForEach(lows, function (item) {
                                    item.value = self.isLow ? 1 : 0;
                                    emitter.emit('changeControlled', item);
                                });
                            }

                        }

                        if(self.actionType === 'thermo') {

                            if(self.forceTrigger || (self.isLow !== isLowO || self.isHigh !== isHighO)) {
                                self.lastTrigger = self.value;
                                self.forceTrigger = false;
                                emitter.emit('thermo', self, valO);
                            } else if(valO !== val) {
                                emitter.emit('change', self, valO);
                            }
                        } else if(valO !== val) {
                            if(self.actionType === 'switch') {
                                //button was pressed do work
                                //emitter.emit('switched', self);
                                if(self.value < valO) {
                                    var lowSwitched = ko.utils.arrayFilter(self.controls, function (item) {return item.type === 'low' && !item.trigger;});
                                    ko.utils.arrayForEach(lowSwitched, function (item) {
                                        emitter.emit('toggleControlled', item);
                                    });
                                } if(self.value > valO) {
                                    var highSwitched = ko.utils.arrayFilter(self.controls, function (item) {return item.type === 'high' && !item.trigger;});
                                    ko.utils.arrayForEach(highSwitched, function (item) {
                                        emitter.emit('toggleControlled', item);
                                    });
                                }

                            }

                            emitter.emit('change', self, valO);
                        }

                    });//end anSub push
                    
                    
                    
                    
                    
                    
                    
//                    if(globals.bbbAnalogPins.indexOf(self.pin) > -1) {
//                        if(!anSubs[self.pin]) {
//                            anSubs[self.pin] = [];
//
//                            var checkAn = function () {
//                                pinWork.getVal(self.pin, function (err, val) {
//                                    val = parseFloat(val ? val.toString() : '0');
//                                    if(self.type === 'temp') {
//                                        val = (val - 500) / 10;
//                                        val = ((val * 9/5) + 32).toFixed(2);
//                                    } else {
//
//                                    }
//
//                                    self.samples.push(val);
//                                    if(self.samples.length === self.samplesLimit) {
//                                        var average = 0.0;
//                                        for(var iSamples = 0, ilSamples = self.samplesLimit; iSamples < ilSamples; iSamples++) {
//                                            average += parseFloat(self.samples[iSamples]);
//                                        }
//
//                                        val = (average/self.samplesLimit).toFixed(2);
//
//                                        for(var i = 0, il = anSubs[self.pin].length; i < il; i++) {
//                                            (function (sub, val) {
//                                                sub(val);
//                                            }(anSubs[self.pin][i], val));
//                                        }
//                                        self.samples = [];
//                                    }
//                                    setTimeout(checkAn, self.sampleRate);
//                                });//end get val
//                            };
//                            checkAn();
//                        }
//                        anSubs[self.pin].push(function (val) {
//                            var valO = self.value;
//                            self.value = val;
//
//                                if(self.actionType === 'thermo') {
//
//                                    if(self.forceTrigger || !self.lastTrigger || Math.abs(self.lastTrigger - val) > self.threshold) {
//
//                                        var cv,
//                                            hv;
//                                        if(self.value >= self.trigger + self.threshold) {
//                                            cv = 1;
//                                        } else if(self.value <= self.trigger){
//                                            cv = 0;
//                                        }
//                                        if(self.value <= self.trigger - self.threshold) {
//                                            hv = 1;
//                                        } else if(self.value >= self.trigger){
//                                            hv = 0;
//                                        }
//                                        self.isCool = (cv === 1);
//                                        self.isHeat = (hv === 1);
//                                        self.lastTrigger = self.value;
//                                        self.forceTrigger = false;
//                                        emitter.emit('thermo', self, valO);
//                                    } else if(valO !== val) {
//                                        emitter.emit('change', self, valO);
//                                    }
//
//
//                                } else if(valO !== val) {
//                                    emitter.emit('change', self, valO);
//                                }
//
//                        });//end anSub push
                    //} else {
//                        var buffer = new Buffer(1),
//                            val,
//                            valuefd = fs.openSync(globals.gpioPath + self.pin + '/value', 'r');
//
//                        var poller = new Epoll(function (err, fd, events) {
//                            var valO = self.value;
//                            fs.readSync(fd, buffer, 0, 1, 0);
//                            val = parseInt(buffer.toString('ascii'));
//                            var hasChanged = (self.value !== val);
//                            if(self.actionType === 'switch' && val < self.value) {
//                                //button was pressed do work
//                                emitter.emit('switched', self);
//                            }
//
//                            self.value = val;
//                            if(hasChanged) {
//                                emitter.emit('change', self, valO);
//                            }
//                        });
//
//                        fs.readSync(valuefd, buffer, 0, 1, 0);
//
//                        poller.add(valuefd, Epoll.EPOLLPRI);
                    //}
                }());
            }
        };

        if(globals.bbbAnalogPins.indexOf(pin) > -1) {
            var exists = fs.existsSync(globals.analogPath + 'AIN1');
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