var worker = require('./worker'),
    Device = require('./device').Device,
    devices = [
        new Device('AIN3', {
            name: 'Temp',
            type: 'temp',
            actionType: 'sensor',
            isVisible: true,
            ready: function () {

            }
        })
    ];

worker.init(devices);