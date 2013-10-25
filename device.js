(function () {
    'use strict';

    var pinWork = require('./pinWork'),
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
          'switch': 'both'
        },
        bbbAnalogPins = [
            'P9_33',
            'P9_35',
            'P9_36',
            'P9_37',
            'P9_38',
            'P9_39',
            'P9_40'
        ];

    function Device (pin, args) {
        if(this === global) {
            return new Device(pin, args);
        }

        console.log('in device', pin, args);

        var self = this;

        args = args || {};

        self.id = args.id;
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
        self.value = new Buffer(args.value, 'ascii');
        self.controls = args.controls;
        self.freq = args.freq || 5;
        self.isVisible = args.isVisible || false;
        self.gpio = null;
        self.ready = args.ready;

        if(!self.direction) {
            console.log('unknown action type unable to set direction', self.actionType, self.direction);
            return self;
        }

        self.init = function (err) {
            console.log('init', self.pin);
            if(typeof self.ready === 'function') {
                self.ready(self);
            }

            if(self.actionType === 'switch') {
                var Epoll = require('epoll').Epoll,
                    fs = require('fs'),
                    valuefd = fs.openSync( gpioPath + self.pin + '/value', 'r'),
                    buffer = new Buffer(1);

                // Create a new Epoll. The callback is the interrupt handler.
                var poller = new Epoll(function (err, fd, events) {
                    // Read GPIO value file. Reading also clears the interrupt.
                    fs.readSync(fd, buffer, 0, 1, 0);
                    //console.log('poller', buffer[0]);
                    if(self.value[0] === one[0]) {
                        console.log('poller a', buffer.toString());
                        //mitter.emit('switched', self);
                        if(buffer[0] === zero[0]) {
                            console.log('poller b');
                            //button was pressed do work
                            emitter.emit('switched', self);
                        }
                    }

                    self.value = buffer;
                    //console.log(events, fd, buffer.toString() === '1' ? 'pressed' : 'released');
                });

                // Read the GPIO value file before watching to
                // prevent an initial unauthentic interrupt.
                fs.readSync(valuefd, buffer, 0, 1, 0);

                // Start watching for interrupts.
                poller.add(valuefd, Epoll.EPOLLPRI);
            }
        };

        pinWork.exportPin(self.pin, self.direction, self.value, self.edge, self.init);


//        if(self.type === 'light') {
//            if(self.actionType === 'onoff') {
//
//            } else if(self.actionType === 'switch') {
//                pinWork.exportPin(self.pin, self.direction, self.value, 'both', args.ready);
//            }
//        }
    }

    exports.Device = Device;
    exports.on = function (event, fn) {
        emitter.on(event, fn);
    };
}());