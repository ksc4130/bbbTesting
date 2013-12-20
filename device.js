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
        actionTypeDirections = {
            'switch': 'in',
            'sensor': 'in',
            'thermo': 'in',
            'onoff': 'out',
            'momentary': 'out'
        },
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

    function Device (args) {
        if(this === global) {
            return new Device(pin, args);
        }
        var self = this;

        args = args || {};

        if(!args.pin || args.pin.trim() === '') {
            console.log('rejected');
            self.id = null;
            return self;
        }

        self.deviceId = args.deviceId || 0;
        self.id = args.id || 0;
        self.workerId = args.workerId;
        self.pin = args.pin || '';
        self.name = args.name || 'untitled';
        self.actionType = args.actionType;
        self.type = args.type;
        self.controls = args.controls;

        self.isVisible = args.isVisible || false;

        //if it's an analog pin parse value as float else parse as int
        self.value = ko.utils.arrayFirst(globals.bbbAnalogPins, function (item) {
            return  item === self.pin;
        }) ? parseFloat(args.value) : parseInt(args.value);

        self.value = isNaN(self.value) ? pinWork.getValSync(self.pin, true) : self.value;

        self.direction =  actionTypeDirections[self.actionType];
        self.edge = edges[self.actionType];

        self.lastTrigger = args.lastTrigger;
        self.lastHighTrigger = args.lastTrigger;
        self.lastLowTrigger = args.lastTrigger;
        self.forceTrigger = args.forceTrigger || false;

        self.trigger = args.trigger;
        //self.highTrigger = args.highTrigger || 1;
        //self.lowTrigger = args.lowTrigger || 0;

        self.threshold = args.threshold;
        self.highThreshold = args.highThreshold || 1;
        self.lowThreshold = args.lowThreshold || 0;

        self.isLow = args.isLow || false;
        self.isHigh = args.isHigh || false;

        self.samplesLimit = args.samplesLimit || 10;
        self.sampleRate = args.sampleRate || 50;
        self.samples = args.samples || [];

        if(ko.utils.arrayFirst(globals.bbbAnalogPins, function (item) {
            return item === self.pin;
        })) {
            self.isAnalog = true;
            self.path = globals.analogPath + self.pin;
        } else {
            self.isAnalog = false;
            self.path = globals.gpioPath + self.pin +'/value';
        }


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
                pinWork.exportPin(item.pin, 'out', 0, 'both', null);
            });
        }

        if(!self.direction) {
            console.log('unknown action type unable to set direction', self.actionType, self.direction);
            return self;
        }

        self.setVal = function (val, fn) {
            fn = typeof fn === 'function' ? fn : function () {};
            var valO = self.value;
            pinWork.setVal(self.pin, val, function (err, val) {
                if(err) {
                    fn(err, null);
                    return;
                }
                self.value = val;
                if(valO !== val)
                    emitter.emit('change', self, valO);
                fn(null, val);
            });
        };

        self.getVal = function (fn) {
            var valO = self.value;
            fn = typeof fn === 'function' ? fn : function () {};
            pinWork.getVal(self.pin, function (err, val) {
                if(err) {
                    fn(err, null);
                    return;
                }
                self.value = val;
                if(valO !== val)
                    emitter.emit('change', self, valO);

                fn(null, val);
            });
        };

        self.init = function (err) {

            if(err) {
                console.log('error on device init', self.pin, self.name);
                return;
            }

            if(typeof self.ready === 'function') {
                self.ready(self);
            }

            if(self.direction === 'in') {
                //console.log('init direction in A', self.pin, self.name);
                (function () {
                    var checkState = function (val, valO, isHighO, isLowO, fn) {
                        //console.log('checkState', self.pin, val, valO, isHighO, isLowO, fn);
                            valO = valO || self.value;
                            isHighO = typeof isHighO === 'boolean' ? isHighO : self.isHigh;
                            isLowO =  typeof isLowO === 'boolean' ? isLowO : self.isLow;
                            self.value = val;

                            self.forceTrigger = !self.lastTrigger;// !self.lastHighTrigger || !self.lastLowTrigger;
                            var lastTriggerDiff = Math.abs(self.lastTrigger - val);
                            //var lastHighTriggerDiff = Math.abs(self.lastHighTrigger - val);
                            //var lastLowTriggerDiff = Math.abs(self.lastHighTrigger - val);
                            //console.log('trigger diff', lastHighTriggerDiff, lastLowTriggerDiff, lastTriggerDiff);
                            //set isHigh and isLow
                            if(self.forceTrigger || lastTriggerDiff >= self.highThreshold) {
                                self.isHigh = self.value >= (self.trigger + self.highThreshold);
                                //console.log('set ih high', self.isHigh);
                            }
                            if(self.forceTrigger || lastTriggerDiff >= self.lowThreshold) {
                                self.isLow = self.value <= (self.trigger - self.lowThreshold);
                                //console.log('set ih low', self.isLow);
                            }

                            //console.log(self.forceTrigger, self.trigger, self.lowThreshold, lastTriggerDiff, self.pin);

                        //check controls and triggers
                        if(self.controls.length) {
                            //handle highs
                            if(self.forceTrigger || isHighO != self.isHigh) {
                                self.lastHighTrigger = self.value;
                                var highs = ko.utils.arrayFilter(self.controls, function (item) {return item.type === 'high' && !item.trigger});
                                ko.utils.arrayForEach(highs, function (item) {
                                    item.value = self.isHigh ? 1 : 0;
                                    emitter.emit('changeControlled', item);
                                    console.log('changing controlled', item.name, item.pin, item.value);
                                });
                            }

                            //handle lows
                            if(self.forceTrigger || isLowO != self.isLow) {
                                self.lastLowTrigger = self.value;
                                var lows = ko.utils.arrayFilter(self.controls, function (item) {return item.type === 'low' && !item.trigger;});
                                //console.log('lows', self.pin, lows);
                                ko.utils.arrayForEach(lows, function (item) {
                                    item.value = self.isLow ? 1 : 0;
                                    emitter.emit('changeControlled', item);
                                    console.log('changing controlled', item.name, item.pin, item.value);
                                });
                            }

                        }

                            if(self.actionType === 'thermo' && valO !== val) {
                                //if(self.forceTrigger || (self.isLow !== isLowO || self.isHigh !== isHighO)) {
                                    self.lastTrigger = self.value;
                                    self.forceTrigger = false;
                                    emitter.emit('thermo', self, valO);
                                //} else if(valO !== val) {
                                    //emitter.emit('change', self, valO);
                                //}
                            } else if(valO !== val) {
                                if(self.actionType === 'switch') {
                                    //button was pressed do work
                                    //emitter.emit('switched', self);
                                    self.forceTrigger = false;
                                    self.lastTrigger = self.value;
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

                                } else {
                                    emitter.emit('change', self, valO);
                                }
                            }
                        if(typeof fn === 'function')
                            fn();
                    };//end check state

                    var checkVal = function () {
                        //console.log('init direction in checkVal A', self.pin, self.name);
                        pinWork.getVal(self.pin, function (err, val) {
                            if(self.type === 'temp') {
                                val = (val - 500) / 10;
                                val = ((val * 9/5) + 32).toFixed(2);
                            }

                            self.samples.push(val);
                            //console.log('samples A', self.pin, self.name, self.samples.length, self.samplesLimit);
                            if(self.samples.length === self.samplesLimit) {
                                //console.log('samples B', self.pin, self.name, self.samples.length, self.samplesLimit);
                                var average = 0.0;
                                for(var iSamples = 0, ilSamples = self.samplesLimit; iSamples < ilSamples; iSamples++) {
                                    average += parseFloat(self.samples[iSamples]);
                                }

                                val = (average/self.samplesLimit).toFixed(2);
                                checkState(val, self.value, self.isHigh, self.isLow, function () {
                                    self.samples = [];
                                    setTimeout(checkVal, self.sampleRate);
                                });

                            } else {
                                setTimeout(checkVal, self.sampleRate);
                            }

                        });//end get val
                    };
                    checkVal();
                }());
            }
        };


        console.log('export', self.pin, self.direction, (dontInitValActionTypes.indexOf(self.actionType) > -1 ? undefined : self.value), self.edge);
        pinWork.exportPin(self.pin, self.direction, (dontInitValActionTypes.indexOf(self.actionType) > -1 ? undefined : self.value), self.edge, self.init);

        return self;
    }

    exports.Device = Device;
    exports.on = function (event, fn) {
        emitter.on(event, fn);
    };
}());