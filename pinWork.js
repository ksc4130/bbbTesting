(function () {
    var fs = require('fs'),
        setupPin,
        exportPin,
        setPinValue,
        exportPath = '/sys/class/gpio/export',
        gpioPath = '/sys/class/gpio/gpio';

    setupPin = function (pin, direction, value, edge, fn) {
        var workingPath = gpioPath + pin;

        if(typeof direction === 'string') {
            fs.writeFile(workingPath +'/direction', direction, function (err) {
                if(err) {
                    console.log('error setting direction for pin', pin);
                    if(typeof fn === 'function') {
                        fn(err);
                    }
                    return;
                }
                if(typeof value !== 'undefined' && value !== null) {
                    fs.writeFile(workingPath +'/value', value, function (err) {
                        if(err) {
                            console.log('error setting value for pin', pin);
                            if(typeof fn === 'function') {
                                fn(err);
                            }
                            return;
                        }
                    });
                }
                if(typeof edge === 'string') {
                    fs.writeFile(workingPath +'/edge', edge, function (err) {
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
        }
    };

    exportPin = function (pin, direction, value, edge, fn) {
        var workingPath = gpioPath + pin;
        console.log(workingPath);
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