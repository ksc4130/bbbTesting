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

    Device.prototype.checkState = function (val, valO, isHighO, isLowO, fn) {
        var self = this;
        var valDiff = (val - self.value);
        if(valDiff > self.valueTooHighLowThreshold) {
            self.valueTooHighCnt++;
            if(self.valueTooHighCnt < self.valueTooHighLowCntOut) {
                console.log('value too high val:', val, 'valDiff:', valDiff, 'sampleRate:', self.sampleRate);
                //if(!self.isDisposed)
                // setTimeout(self.checkVal, self.sampleRate);
                if(typeof fn === 'function')
                    fn();
                return;
            } else {
                self.valueTooHighCnt = 0;
            }
        }  else {
            self.valueTooHighCnt = 0;
        }

        if(valDiff < 0 && Math.abs(valDiff) > self.valueTooHighLowThreshold) {
            self.valueTooLowCnt++;
            if(self.valueTooLowCnt < self.valueTooHighLowCntOut) {
                console.log('value too low val:', val, 'valDiff:', valDiff, 'sampleRate:', self.sampleRate);
                //if(!self.isDisposed)
                // setTimeout(self.checkVal, self.sampleRate);
                if(typeof fn === 'function')
                    fn();
                return;
            } else {
                self.valueTooLowCnt = 0;
            }
        } else {
            self.valueTooLowCnt = 0;
        }

        var forceTrigger = !self.lastTrigger || self.forceTrigger;
        var wasTriggered = false;
        //console.log('checkState', self.pin, val, valO, isHighO, isLowO, fn);
        valO = valO || self.value;
        isHighO = typeof isHighO === 'boolean' ? isHighO : self.isHigh;
        isLowO =  typeof isLowO === 'boolean' ? isLowO : self.isLow;
        self.value = val;

        // !self.lastHighTrigger || !self.lastLowTrigger;
        var lastTriggerDiff = Math.abs(self.lastTrigger - val);
        //var lastHighTriggerDiff = Math.abs(self.lastHighTrigger - val);
        //var lastLowTriggerDiff = Math.abs(self.lastHighTrigger - val);
        //console.log('trigger diff', lastHighTriggerDiff, lastLowTriggerDiff, lastTriggerDiff);
        //set isHigh and isLow
        if(forceTrigger || (lastTriggerDiff >= self.highThreshold) || (val <= self.trigger && isHighO)) {
            if(self.actionType === 'thermo')
                console.log('thermo in last trigger diff >= highThresh', self.value, self.trigger, self.highThreshold);
            self.isHigh = self.value >= (self.trigger + self.highThreshold);
            //console.log('set ih high', self.isHigh);
        }
        if(forceTrigger || (lastTriggerDiff >= self.lowThreshold) || (val >= self.trigger && isLowO)) {
            if(self.actionType === 'thermo')
                console.log('thermo in last trigger diff >= lowThresh', self.value, self.trigger,  self.lowThreshold);
            self.isLow = self.value <= (self.trigger - self.lowThreshold);
            //console.log('set ih low', self.isLow);
        }

        //console.log(self.forceTrigger, self.trigger, self.lowThreshold, lastTriggerDiff, self.pin);
        //if(self.actionType === 'thermo')
        //console.log('thermo checkState forceTrigger:', forceTrigger, 'self.forceTrigger:', self.forceTrigger, 'lastTriggerDiff:', lastTriggerDiff, 'highThreshold:', self.highThreshold, 'lowThreshold:', self.lowThreshold, 'isHigh:', self.isHigh, 'isHighO:', isHighO, 'isLow:', self.isLow, 'isLowO:', isLowO)
        //check controls and triggers
        if(self.controls && self.controls.length > 0) {
            //handle highs
            if(forceTrigger || (isHighO !== self.isHigh && lastTriggerDiff >= self.highThreshold) && self.actionType !== 'switch') {
                if(self.actionType === 'thermo')
                    console.log('thermo isHighO !== self.isHigh lastTriggerDiff >= self.highThreshold', forceTrigger);
                wasTriggered = true;
                var highs = ko.utils.arrayFilter(self.controls, function (item) {return item && item.type === 'high' && !item.trigger});
                ko.utils.arrayForEach(highs, function (item) {
                    item.value = self.isHigh ? 1 : 0;
                    emitter.emit('changeControlled', item);
                    //console.log('changing controlled', item.name, item.pin, item.value);
                });
            }

            //handle lows
            if(forceTrigger || (isLowO !== self.isLow && lastTriggerDiff >= self.lowThreshold) && self.actionType !== 'switch') {
                if(self.actionType === 'thermo')
                    console.log('thermo isLowO !== self.isLow lastTriggerDiff >= self.lowThreshold', forceTrigger, isLowO !== self.isLow, lastTriggerDiff >= self.lowThreshold);
                wasTriggered = true;
                var lows = ko.utils.arrayFilter(self.controls, function (item) {return item && item.type === 'low' && !item.trigger;});
                //console.log('lows', self.pin, lows);
                ko.utils.arrayForEach(lows, function (item) {
                    item.value = self.isLow ? 1 : 0;
                    emitter.emit('changeControlled', item);
                    //console.log('changing controlled', item.name, item.pin, item.value);
                });
            }

        }

        if(wasTriggered) {
            self.lastLowTrigger = self.value;
            self.lastTrigger = self.value;
            self.forceTrigger = false;
        }

        if(self.actionType === 'thermo' && valO !== val) {
            //console.log('***************** thermo samples', val, self.sampleRate, self.samplesLimit, self.samples.length);
            //if(self.forceTrigger || (self.isLow !== isLowO || self.isHigh !== isHighO)) {
//                if(!(self.forceTrigger || (isLowO != self.isLow && lastTriggerDiff >= self.lowThreshold)) && ! (self.forceTrigger || (isHighO != self.isHigh && lastTriggerDiff >= self.highThreshold))) {
//                    self.isLow = isLowO;
//                    self.isHigh = isHighO;
//                }

            //self.forceTrigger = false;
            emitter.emit('thermo', self, valO);
            //} else if(valO !== val) {
            //emitter.emit('change', self, valO);
            //}
        } else if(self.actionType === 'switch' && valO !== val) {
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

        } else if(valO !== val) {
            emitter.emit('change', self, valO);
        }
        if(typeof fn === 'function')
            fn();
    };

    Device.prototype.checkVal = function () {
        var self = this;
        //console.log('init direction in checkVal A', self.pin, self.name);
        pinWork.getVal(self.pin, function (err, val) {
            if(err) {
                console.log('error in checkVal', self.pin, err);
                if(!self.isDisposed)
                    setTimeout(self.checkVal, self.sampleRate);
                return;
            }
            if(self.type === 'temp') {
                val = pinWork.calcTempF(val);
            }
            var valDiff = (val - self.value);
            if(valDiff > self.sampleTooHighLowThreshold) {
                self.sampleTooHighCnt++;
                if(self.sampleTooHighCnt < self.sampleTooHighLowCntOut) {
                    console.log('sample too high val:', val, 'valDiff:', valDiff, 'sampleRate:', self.sampleRate);
                    if(!self.isDisposed)
                        setTimeout(self.checkVal, self.sampleRate);
                    return;
                } else {
                    self.sampleTooHighCnt = 0;
                }
            }  else {
                self.sampleTooHighCnt = 0;
            }

            if(valDiff < 0 && Math.abs(valDiff) > self.sampleTooHighLowThreshold) {
                self.sampleTooLowCnt++;
                if(self.sampleTooLowCnt < self.sampleTooHighLowCntOut) {
                    console.log('sample too low val:', val, 'valDiff:', valDiff, 'sampleRate:', self.sampleRate);
                    if(!self.isDisposed)
                        setTimeout(self.checkVal, self.sampleRate);
                    return;
                } else {
                    self.sampleTooLowCnt = 0;
                }
            } else {
                self.sampleTooLowCnt = 0;
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
                self.checkState(val, self.value, self.isHigh, self.isLow, function () {
                    self.samples = [];
                    if(!self.isDisposed)
                        setTimeout(self.checkVal, self.sampleRate);
                });

            } else {
                if(!self.isDisposed)
                    setTimeout(self.checkVal, self.sampleRate);
            }

        });//end get val
    };

    function Device (args) {
        if(this === global) {
            return new Device(args);
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
        self.isDisposed = false;

        self.isVisible = args.isVisible || false;

        //if it's an analog pin parse value as float else parse as int
        self.value = ko.utils.arrayFirst(globals.bbbAnalogPins, function (item) {
            return  item === self.pin;
        }) ? parseFloat(args.value) : parseInt(args.value);

        self.value = isNaN(self.value) ? 0 : self.value;//pinWork.getValSync(self.pin, true) : self.value;

        if(self.type === 'temp') {
            self.value = pinWork.calcTempF(self.value);
        }

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
        console.log('new device sample rate', self.name, self.sampleRate);
        self.samples = args.samples || [];
        self.sampleTooHighCnt = 0;
        self.sampleTooLowCnt = 0;
        self.sampleTooHighLowCntOut = args.sampleTooHighLowCntOut || 3;
        self.sampleTooHighLowThreshold = args.sampleTooHighLowCntOut || 3;

        self.valueTooHighCnt = 0;
        self.valueTooLowCnt = 0;
        self.valueTooHighLowCntOut = args.sampleTooHighLowCntOut || 3;
        self.valueTooHighLowThreshold = args.sampleTooHighLowCntOut || 3;

//        self.checkVal = function () {
//            //console.log('init direction in checkVal A', self.pin, self.name);
//            pinWork.getVal(self.pin, function (err, val) {
//                if(err) {
//                    console.log('error in checkVal', self.pin, err);
//                    if(!self.isDisposed)
//                        setTimeout(self.checkVal, self.sampleRate);
//                    return;
//                }
//                if(self.type === 'temp') {
//                    val = pinWork.calcTempF(val);
//                }
//                var valDiff = (val - self.value);
//                if(valDiff > self.sampleTooHighLowThreshold) {
//                    self.sampleTooHighCnt++;
//                    if(self.sampleTooHighCnt < self.sampleTooHighLowCntOut) {
//                        console.log('sample too high val:', val, 'valDiff:', valDiff, 'sampleRate:', self.sampleRate);
//                        if(!self.isDisposed)
//                            setTimeout(self.checkVal, self.sampleRate);
//                        return;
//                    } else {
//                        self.sampleTooHighCnt = 0;
//                    }
//                }  else {
//                    self.sampleTooHighCnt = 0;
//                }
//
//                if(valDiff < 0 && Math.abs(valDiff) > self.sampleTooHighLowThreshold) {
//                    self.sampleTooLowCnt++;
//                    if(self.sampleTooLowCnt < self.sampleTooHighLowCntOut) {
//                        console.log('sample too low val:', val, 'valDiff:', valDiff, 'sampleRate:', self.sampleRate);
//                        if(!self.isDisposed)
//                            setTimeout(self.checkVal, self.sampleRate);
//                        return;
//                    } else {
//                        self.sampleTooLowCnt = 0;
//                    }
//                } else {
//                    self.sampleTooLowCnt = 0;
//                }
//
//                self.samples.push(val);
//                //console.log('samples A', self.pin, self.name, self.samples.length, self.samplesLimit);
//                if(self.samples.length === self.samplesLimit) {
//                    //console.log('samples B', self.pin, self.name, self.samples.length, self.samplesLimit);
//                    var average = 0.0;
//                    for(var iSamples = 0, ilSamples = self.samplesLimit; iSamples < ilSamples; iSamples++) {
//                        average += parseFloat(self.samples[iSamples]);
//                    }
//
//                    val = (average/self.samplesLimit).toFixed(2);
//                    self.checkState(val, self.value, self.isHigh, self.isLow, function () {
//                        self.samples = [];
//                        if(!self.isDisposed)
//                            setTimeout(self.checkVal, self.sampleRate);
//                    });
//
//                } else {
//                    if(!self.isDisposed)
//                        setTimeout(self.checkVal, self.sampleRate);
//                }
//
//            });//end get val
//        };//end checkVal

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
                    if(!self.isDisposed)
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
                return item && item.workerId === self.workerId && !ko.utils.arrayFirst(globals.bbbAnalogPins, function (p) {return item.pin === p;});
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
                self.checkVal();
            }
        };

        self.dispose = function () {
            self.isDisposed = true;
        };


        //console.log('export', self.pin, self.direction, (dontInitValActionTypes.indexOf(self.actionType) > -1 ? undefined : self.value), self.edge);
        pinWork.exportPin(self.pin, self.direction, (dontInitValActionTypes.indexOf(self.actionType) > -1 ? undefined : self.value), self.edge, self.init);

        return self;
    }

    exports.Device = Device;
    exports.on = function (event, fn) {
        emitter.on(event, fn);
    };
}());