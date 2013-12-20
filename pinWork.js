(function () {
    var fs = require('fs')
        , globals = require('./globals')
        , ko = require('knockout')
        , setupPin
        , exportPin
        , setVal
        , getVal;

    setVal = function (pin, val, fn) {
        var path;
        if(ko.utils.arrayFirst(globals.bbbAnalogPins, function (item) {
            return item === pin;
        })) {
            console.log('setting analog pin', pin, val);
            path = globals.analogPath + pin;
        } else {
            console.log('setting digital pin', pin, val);
            path = globals.gpioPath + pin +'/value';
        }
        val = val ? val.toString() : '0';
        val = ko.utils.arrayFirst(globals.bbbAnalogPins, function (item) { return self.pin === item; })
            ? parseFloat(val) : parseInt(val)
        fs.writeFile(path, val, function (err) {
            if(err) {
                console.log('error setting value for pin', pin);
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

    getVal = function (pin, fn) {
        var path;
        if(ko.utils.arrayFirst(globals.bbbAnalogPins, function (item) {
            return item === pin;
        })) {
            console.log('getting analog pin', pin);
            path = globals.analogPath + pin;
        } else {
            console.log('getting digital pin', pin);
            path = globals.gpioPath + pin +'/value';
        }

        fs.readFile(path, function (err, val) {
            val = val ? val.toString() : '0';
            val = ko.utils.arrayFirst(globals.bbbAnalogPins, function (item) { return self.pin === item; })
                ? parseFloat(val) : parseInt(val)
            if(err) {
                console.log('error setting value for pin', pin);
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
                if(err) {
                    console.log('error setting direction for pin', pin);
                    doCallbackCheck(err);
                } else {
                    doCallbackCheck(null);
                }
                if(typeof value !== 'undefined' && value !== null) {
                    fs.writeFile(workingPath +'/value', value, function (err) {
                        if(err) {
                            console.log('error setting value for pin', pin);
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
        var workingPath = globals.gpioPath + pin;

        fs.exists(workingPath, function (exists) {
            if(!exists) {
                fs.writeFile(globals.exportPath, pin, function (err) {
                    if(err) {
                        console.log('error exporting pin', pin);
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
    };


    exports.exportPin = exportPin;
    exports.setupPin = setupPin;
    exports.setVal = setVal;
    exports.getVal = getVal;
}());