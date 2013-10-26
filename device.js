(function () {
    'use strict';

    var fs = require('fs'),
        pinWork = require('./pinWork'),
        EventEmitter = require('events').EventEmitter,
        Epoll = require('epoll').Epoll,
        emitter = new EventEmitter(),
        exportPath = '/sys/class/gpio/export',
        gpioPath = '/sys/class/gpio/gpio',
        anPath = '/sys/devices/ocp.2/helper.14/',
        idDeviceCnt = 0,
        zero = new Buffer('0'),
        one = new Buffer('1'),
        device,
        bbbToggle,
        dontInitValActionTypes = [
            'switch',
            'sensor'
        ],
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
          'momentary': 'both',
          'sensor': 'both'
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

        if(self.actionType === 'switch') {
            self.value = new Buffer(args.value, 'ascii')
        } else {
           self.value = parseInt(args.value);
        }

        self.controls = args.controls;
        self.isVisible = args.isVisible || false;
        self.ready = args.ready;

        if(!self.direction) {
            console.log('unknown action type unable to set direction', self.actionType, self.direction);
            return self;
        }

        self.valuefd = fs.openSync(gpioPath + self.pin + '/value', 'r');

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

            var poller = new Epoll(function (err, fd, events) {
                var buffer = new Buffer(1),
                    val;
                fs.readSync(fd, buffer, 0, 1, 0);
                val = parseInt(buffer.toString('ascii'));
                //if(self.value[0] === one[0]) {
                    //if(buffer[0] === zero[0]) {
                if(self.actionType === 'switch' && val < self.value) {
                    //button was pressed do work
                    emitter.emit('switched', self);
                }

                    //}
                //}
                if(self.value !== val) {
                    emitter.emit('change', self);
                }

                self.value = buffer;
            });

            fs.readSync(self.valuefd, self.buffer, 0, 1, 0);

            poller.add(self.valuefd, Epoll.EPOLLPRI);
        };

        pinWork.exportPin(self.pin, self.direction, (dontInitValActionTypes.indexOf(self.actionType) > -1 ? undefined : self.value), self.edge, self.init);
        return self;
    }

    Device.prototype.setVal = function (val, fn) {
        var self = this;
        fs.writeFile(gpioPath + self.pin +'/value', val, function (err) {
            if(err) {
                console.log('error setting value for pin', pin);
                if(typeof fn === 'function') {
                    fn(err, null);
                }
                return;
            }
            self.value = val;
            if(typeof fn === 'function') {
                fn(null, val);
            }
        });
    };

    exports.Device = Device;
    exports.on = function (event, fn) {
        emitter.on(event, fn);
    };
}());