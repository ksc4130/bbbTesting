(function () {
    var fs = require('fs'),
        setupPin,
        exportPin,
        setPinValue,
        exportPath = '/sys/class/gpio/export',
        gpioPath = '/sys/class/gpio/gpio';

    setupPin = function (pin, direction, value, edge, fn) {
        var workingPath = gpioPath + pin,
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
                }
                if(typeof edge === 'string') {
                    fs.writeFile(workingPath +'/edge', edge, function (err) {
                        if(err) {
                            console.log('error setting edge for pin', pin);
                            doCallbackCheck(err);
x                        } else {
                            doCallbackCheck(null);
                        }
                    });
                }

            });
        }
    };

    exportPin = function (pin, direction, value, edge, fn) {
        var workingPath = gpioPath + pin;

        fs.exists(workingPath, function (exists) {
            if(!exists) {
                fs.writeFile(exportPath, pin, function (err) {
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
}());