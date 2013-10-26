var worker = require('./worker'),
    Device = require('./device').Device,
    devices = [
        new Device('27', {
            name: 'Barn Lights',
            type: 'light',
            actionType: 'onoff',
            isVisible: true,
            ready: function () {

            }
        }),
        new Device('17', {
            name: 'Flood Lights',
            type: 'light',
            actionType: 'onoff',
            isVisible: true,
            ready: function () {

            }
        }),
        new Device('22', {
            type: 'light',
            actionType: 'switch',
            controls: ['17'],
            ready: function () {

            }
        }),
        new Device('23', {
            type: 'light',
            actionType: 'switch',
            controls: ['27'],
            ready: function () {

            }
        })
    ];

worker.init(devices);