(function () {
    'use strict';

    var fs = require('fs')
        , globals = require('./globals')
        , ko = require('knockout')
        , isAnalog
        , getBasePath
        , getValuePath
        , setupPin
        , exportPin
        , setVal
        , getVal
        , calcTempF
        , getValSync;

    isAnalog =  function (pin) {
        return ko.utils.arrayFirst(globals.bbbAnalogPins, function (item) {
            return item === pin;
        }) ? true : false;
    };

    getBasePath = function (pin) {
        return isAnalog(pin) ? globals.analogPath + pin : globals.gpioPath + pin;
    };

    getValuePath = function (pin) {
        return isAnalog(pin) ? globals.analogPath + pin : globals.gpioPath + pin + '/value';
    };

    setVal = function (pin, val, fn) {
        var path
            , isAnalog = false;

        if(ko.utils.arrayFirst(globals.bbbAnalogPins, function (item) {
            return item === pin;
        })) {
            path = globals.analogPath + pin;
            isAnalog = true;
        } else {
            path = globals.gpioPath + pin +'/value';
        }

        if(isAnalog) {
            console.log('tried to set analog value');
            fn('oops', null);
            return;
        }


        val = val ? val.toString() : '0';
        val = ko.utils.arrayFirst(globals.bbbAnalogPins, function (item) { return pin === item; })
            ? parseFloat(val) : parseInt(val)
        fs.writeFile(path, val, function (err) {
            if(err) {
                console.log('error setting value for pin', pin, 'in setVal');
                if(typeof fn === 'function') {
                    fn(err, null);
                }
                return;
            }
            if(typeof fn === 'function') {
                fn(null, val);
            }
        });
    };

    getValSync = function (pin, cleanUp) {
        if(!pin || pin.trim() === '') {
            console.log('getValSync bad pin', pin);
            return null;
        }
        var path;
        if(ko.utils.arrayFirst(globals.bbbAnalogPins, function (item) {
            return item === pin;
        })) {
            path = globals.analogPath + pin;
        } else {
            path = globals.gpioPath + pin +'/value';
        }

        var val = fs.readFileSync(path, {encoding: 'ascii'});
        val = val ? val.toString() : '0';
        val = ko.utils.arrayFirst(globals.bbbAnalogPins, function (item) { return pin === item; })
            ? parseFloat(val) : parseInt(val)

        return isNaN(val) && cleanUp ? 0 : val;
    };

    getVal = function (pin, fn) {
        var path;
        if(ko.utils.arrayFirst(globals.bbbAnalogPins, function (item) {
            return item === pin;
        })) {
            path = globals.analogPath + pin;
        } else {
            path = globals.gpioPath + pin +'/value';
        }

        fs.readFile(path, function (err, val) {
            val = val ? val.toString() : '0';
            val = ko.utils.arrayFirst(globals.bbbAnalogPins, function (item) { return pin === item; })
                ? parseFloat(val) : parseInt(val)
            if(err) {
                console.log('error getting value for pin', pin, path);
                if(typeof fn === 'function') {
                    fn(err, null);
                }
                return;
            }
            if(typeof fn === 'function') {
                fn(null, val);
            }
        });
    };

    setupPin = function (pin, direction, value, edge, fn) {
        var workingPath = globals.gpioPath + pin,
            cnt = 0,
            errAll = null;

        var doCallbackCheck = function (err) {
            cnt++;
            if(err) {
                errAll = err;
            }
            if(cnt === 3 && typeof fn === 'function') {
                fn(errAll);
            }
        };

        if(typeof direction === 'string') {
            fs.writeFile(workingPath +'/direction', direction, function (err) {
                //console.log('setup pin dir', direction, pin);
                if(err) {
                    console.log('error setting direction for pin', pin);
                    doCallbackCheck(err);
                } else {
                    doCallbackCheck(null);
                }
                if(typeof value !== 'undefined' && value !== null) {
                    fs.writeFile(workingPath +'/value', value, function (err) {
                        //console.log('setup pin val', value, pin);
                        if(err) {
                            console.log('error setting value for pin', pin, 'in setup');
                            doCallbackCheck(err);
                        } else {
                            doCallbackCheck(null);
                        }
                    });
                } else {
                    doCallbackCheck(null);
                }
                if(typeof edge === 'string') {
                    fs.writeFile(workingPath +'/edge', edge, function (err) {
                        //console.log('setup pin edge', edge, pin);
                        if(err) {
                            console.log('error setting edge for pin', pin);
                            doCallbackCheck(err);
                        } else {
                            doCallbackCheck(null);
                        }
                    });
                } else {
                    doCallbackCheck(null);
                }

            });
        }
    };

    exportPin = function (pin, direction, value, edge, fn) {
        var workingPath = getBasePath(pin);
        if(isAnalog(pin)) {
            var exists = fs.existsSync(globals.analogPath + 'AIN1');
            if(!exists) {
                fs.writeFile('/sys/devices/bone_capemgr.9/slots', 'cape-bone-iio', function (err) {
                    if(typeof fn === 'function')
                        fn(err);
                });
            } else {
                fn(null);
            }
        } else {
            fs.exists(workingPath, function (exists) {
                if(!exists) {
                    fs.writeFile(globals.exportPath, pin, function (err) {
                        if(err) {
                            console.log('error exporting pin', pin, workingPath);
                            if(typeof fn === 'function') {
                                fn(err);
                            }
                            return;
                        }
                        setupPin(pin, direction, value, edge, fn);
                    });
                } else {
                    setupPin(pin, direction, value, edge, fn);
                }
            });
        }
    };

    calcTempF = function (val) {
        val = (val - 500) / 10;
        val = ((val * 9/5) + 32).toFixed(2);
        return val;
    };


    exports.calcTempF = calcTempF;
    exports.isAnalog = isAnalog;
    exports.getBasePath = getBasePath;
    exports.getValuePath = getValuePath;
    exports.exportPin = exportPin;
    exports.setupPin = setupPin;
    exports.setVal = setVal;
    exports.getVal = getVal;
    exports.getValSync = getValSync;
}());