(function () {
    var exportPath = '/sys/class/gpio/export',
        gpioPath = '/sys/class/gpio/gpio';
    
    exports.exportPin = function (pin, direction, value, edge, fn) {
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

    exports.setupPin = function (pin, direction, value, edge, fn) {
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
}());