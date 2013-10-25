(function () {
    'use strict';

    var fs = require('fs'),
        pinWork = require('./pinWork'),
        EventEmitter = require('events').EventEmitter,
        emitter = new EventEmitter(),
        exportPath = '/sys/class/gpio/export',
        gpioPath = '/sys/class/gpio/gpio',
        anPath = '/sys/devices/ocp.2/helper.14/',
        idDeviceCnt = 0,
        zero = new Buffer('0'),
        one = new Buffer('1'),
        device,
        bbbToggle,
        inputActionTypes = [
            'switch',
            'sensor'
        ],
        outputActionTypes = [
            'onoff',
            'momentary'
        ],
        edges = {
          'switch': 'both',
          'onoff': 'both',
          'momentary': 'both'
        },
        bbbAnalogPins = [
            'P9_33',
            'P9_35',
            'P9_36',
            'P9_37',
            'P9_38',
            'P9_39',
            'P9_40'
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
        console.log(args.value);
        if(self.actionType === 'switch') {
            self.value = new Buffer(args.value, 'ascii')
        } else {
           self.value = parseInt(args.value);
        }

        self.controls = args.controls;
        self.freq = args.freq || 5;
        self.isVisible = args.isVisible || false;
        self.gpio = null;
        self.ready = args.ready;

        if(!self.direction) {
            console.log('unknown action type unable to set direction', self.actionType, self.direction);
            return self;
        }

        var Epoll = require('epoll').Epoll,
            valuefd = fs.openSync( gpioPath + self.pin + '/value', 'r'),
            buffer = new Buffer(1),
            poller,
            eventType;

        self.init = function (err) {

            if(typeof self.ready === 'function') {
                self.ready(self);
            }

            if(self.actionType === 'switch') {
                eventType = self.actionType === 'switch' ? 'switched' : '';
                poller = new Epoll(function (err, fd, events) {
                    fs.readSync(fd, buffer, 0, 1, 0);
                    if(self.value[0] === one[0]) {
                        if(buffer[0] === zero[0]) {
                            //button was pressed do work
                            emitter.emit(eventType, self);
                        }
                    }
                    self.value = buffer;
                });
                fs.readSync(valuefd, buffer, 0, 1, 0);

                poller.add(valuefd, Epoll.EPOLLPRI);
            }

        };

        if(self.actionType === 'onoff') {
             poller = new Epoll(function (err, fd, events) {
                fs.readSync(fd, buffer, 0, 1, 0);
                if(new Buffer(self.value, 'ascii')[0] !== buffer[0]) {
                    self.value = parseInt(buffer.toString('ascii'));
                    emitter.emit('onoff', self);
                }
            });

            self.toggle = function (val, fn) {
                var v = val || (1 - self.value);
                fs.writeFile(gpioPath + self.pin +'/value', v, function (err) {
                    if(err) {
                        console.log('error setting value for pin', pin);
                        if(typeof fn === 'function') {
                            fn(err, null);
                        }
                        return;
                    }
                    self.value = v;
                    if(typeof fn === 'function') {
                        fn(null, v);
                    }
                });
            }
        } else if(self.actionType === 'momentary') {
            self.toggle = function () {

                fs.writeFile(gpioPath + self.pin +'/value', 1, function (err) {
                    if(err) {
                        console.log('error setting value for pin', pin);
                        if(typeof fn === 'function') {
                            fn(err, null);
                        }
                        return;
                    }
                    setTimeout(function (fn) {
                        fs.writeFile(gpioPath + self.pin +'/value', 0, function (err) {
                            if(err) {
                                console.log('error setting value for pin', pin);
                                if(typeof fn === 'function') {
                                    fn(err, null);
                                }
                                return;
                            }
                        });
                    }, 50);
                });
            }
        }

        if(poller) {
            fs.readSync(valuefd, buffer, 0, 1, 0);

            poller.add(valuefd, Epoll.EPOLLPRI);
        }

        pinWork.exportPin(self.pin, self.direction, self.value, self.edge, self.init);
        return self;
    }

    exports.Device = Device;
    exports.on = function (event, fn) {
        emitter.on(event, fn);
    };
}());