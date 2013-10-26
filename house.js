var worker = require('./worker'),
    Device = require('./device').Device,
    devices = [
        new Device('67', {
            name: 'Den Lights',
            type: 'light',
            actionType: 'onoff',
            isVisible: true,
            ready: function () {

            }
        }),
        new Device('68', {
            name: 'Garage Door',
            type: 'overheadDoor',
            actionType: 'momentary',
            isVisible: true,
            ready: function () {

            }
        }),
        new Device('44', {
            type: 'light',
            actionType: 'switch',
            controls: ['67'],
            ready: function () {

            }
        }),
        new Device('26', {
            name: 'Barn Motion',
            type: 'motion',
            actionType: 'sensor',
            isVisible: true
        })
    ];

worker.init(devices);