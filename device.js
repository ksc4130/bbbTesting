(function () {
    'use strict';

    var pinWork = require('./pinWork'),
        exportPath = '/sys/class/gpio/export',
        gpioPath = '/sys/class/gpio/gpio',
        anPath = '/sys/devices/ocp.2/helper.14/',
        idDeviceCnt = 0,
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

        var self = this;

        args = args || {};

        self.id = args.id;
        self.actionType = args.actionType;
        self.type = args.type;
        self.direction = (inputActionTypes.indexOf(self.actionType) > -1) ? 'in' :
            (outputActionTypes.indexOf(self.actionType) > -1) ? 'out' : null;
        self.pin = pin || (args.pin || '');
        self.name = args.name || 'untitled';
        self.value = args.value;
        self.controls = args.controls;
        self.freq = args.freq || 5;
        self.isVisible = args.isVisible || false;
        self.gpio = null;

        self.subs = {};

        if(!self.direction) {
            console.log('unknown action type unable to set direction', self.actionType, self.direction);
            return self;
        }

        if(self.type === 'light') {
            if(self.actionType === 'onoff') {
                pinWork.exportPin(self.pin, self.direction, self.value, 'both', args.ready);
            }
        }
    }
}());