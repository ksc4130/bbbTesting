var worker = require('./worker'),
    Device = require('./device').Device,
    devices = [
        {pin: '27',
            name: 'Barn Lights',
            type: 'light',
            actionType: 'onoff',
            isVisible: true,
            ready: function () {

            }
        },
        {pin: '17',
            name: 'Flood Lights',
            type: 'light',
            actionType: 'onoff',
            isVisible: true,
            ready: function () {

            }
        },
        {pin: '22',
            type: 'light',
            actionType: 'switch',
            controls: ['17'],
            ready: function () {

            }
        },
        {pin: '23',
            type: 'light',
            actionType: 'switch',
            controls: ['27'],
            ready: function () {

            }
        },
        {pin: '24',
            name: 'Barn Motion',
            type: 'motion',
            actionType: 'sensor',
            isVisible: true
        }
    ];

worker.init({
    id: '36af9e74-2344-44d4-bc02-1608a851e1b0',
    devices: devices
});


//[
//    new Device('27', {
//        name: 'Barn Lights',
//        type: 'light',
//        actionType: 'onoff',
//        isVisible: true,
//        ready: function () {
//
//        }
//    }),
//    new Device('17', {
//        name: 'Flood Lights',
//        type: 'light',
//        actionType: 'onoff',
//        isVisible: true,
//        ready: function () {
//
//        }
//    }),
//    new Device('22', {
//        type: 'light',
//        actionType: 'switch',
//        controls: ['17'],
//        ready: function () {
//
//        }
//    }),
//    new Device('23', {
//        type: 'light',
//        actionType: 'switch',
//        controls: ['27'],
//        ready: function () {
//
//        }
//    }),
//    new Device('24', {
//        name: 'Barn Motion',
//        type: 'motion',
//        actionType: 'sensor',
//        isVisible: true
//    })
//];