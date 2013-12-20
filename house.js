var fs = require('fs'),
    anPath = '/sys/devices/ocp.2/helper.14/';
var exists = fs.existsSync(anPath + 'AIN1');
if(!exists) {
    fs.writeFileSync('/sys/devices/bone_capemgr.9/slots', 'cape-bone-iio');
}
var worker = require('./worker'),
    Device = require('./device').Device,
    devices = [
        {
            pin: '67',
            name: 'Den',
            type: 'light',
            actionType: 'onoff',
            isVisible: true,
            ready: function () {

            }
        },
        {
            pin:'30',
            name: 'Living Room',
            type: 'light',
            actionType: 'onoff',
            isVisible: true,
            ready: function () {

            }
        },
        {
            in:'68',
            name: 'Garage Door',
            type: 'overheadDoor',
            actionType: 'momentary',
            isVisible: true,
            ready: function () {

            }
        },
        {
            pin:'44',
            type: 'light',
            actionType: 'switch',
            controls: [{pin: '67', type: 'low'}],//den light
            ready: function () {

            }
        },
        {
            pin:'31',
            type: 'light',
            actionType: 'switch',
            controls: [{pin: '30', type: 'low'}],//living room light
            ready: function () {

            }
        },
        {
            pin:'46',
            type: 'light',
            actionType: 'switch',
            controls: [{pin: '26', type: 'low'}],
            ready: function () {

            }
        },
        {
            pin:'26',
            name: 'Garage',
            type: 'light',
            actionType: 'onoff',
            isVisible: true,
            ready: function () {

            }
        },
        {
            pin:'65',
            name: 'Cool',
            type: 'cool',
            actionType: 'onoff',
            isVisible: false,
            ready: function () {

            }
        },
        {
            pin:'61',
            name: 'Heat',
            type: 'heat',
            actionType: 'onoff',
            isVisible: false,
            ready: function () {

            }
        },
        {
            pin:'AIN3',
            name: 'Thermo',
            type: 'temp',
            actionType: 'thermo',
            controls: [
                {
                    type: 'high',
                    pin: '61'
                },
                {
                    type: 'low',
                    pin: '65'
                }
            ],
            cool: '65',
            heat: '61',//65
            trigger: 75.5,
            threshold: 1,
            highThreshold: 3,
            lowThreshold: 1,
            tolerance: .5,
            isVisible: true,
            ready: function () {

            }
        }//,
//        {pin:'AIN3', {
//            name: 'Temp',
//            type: 'temp',
//            actionType: 'sensor',
//            isVisible: true,
//            ready: function () {
//
//            }
//        }),
//        {pin:'AIN1', {
//            name: 'Light',
//            type: 'light',
//            actionType: 'sensor',
//            isVisible: true,
//            ready: function () {
//
//            }
//        })
    ];

worker.init({
    workerId: '315e5058-1e20-4cd4-9a25-16e64eb1188a',
    devices: devices
});


//new Device('67', {
//    name: 'Den',
//    type: 'light',
//    actionType: 'onoff',
//    isVisible: true,
//    ready: function () {
//
//    }
//}),
//    new Device('30', {
//        name: 'Living Room',
//        type: 'light',
//        actionType: 'onoff',
//        isVisible: true,
//        ready: function () {
//
//        }
//    }),
//    new Device('68', {
//        name: 'Garage Door',
//        type: 'overheadDoor',
//        actionType: 'momentary',
//        isVisible: true,
//        ready: function () {
//
//        }
//    }),
//    new Device('44', {
//        type: 'light',
//        actionType: 'switch',
//        controls: ['67'],//den light
//        ready: function () {
//
//        }
//    }),
//    new Device('31', {
//        type: 'light',
//        actionType: 'switch',
//        controls: ['30'],//living room light
//        ready: function () {
//
//        }
//    }),
//    new Device('46', {
//        type: 'light',
//        actionType: 'switch',
//        controls: ['26'],
//        ready: function () {
//
//        }
//    }),
//    new Device('26', {
//        name: 'Garage',
//        type: 'light',
//        actionType: 'onoff',
//        isVisible: true,
//        ready: function () {
//
//        }
//    }),
//    new Device('65', {
//        name: 'Cool',
//        type: 'cool',
//        actionType: 'onoff',
//        isVisible: false,
//        ready: function () {
//
//        }
//    }),
//    new Device('61', {
//        name: 'Heat',
//        type: 'heat',
//        actionType: 'onoff',
//        isVisible: false,
//        ready: function () {
//
//        }
//    }),
//    new Device('AIN3', {
//        name: 'Thermo',
//        type: 'temp',
//        actionType: 'thermo',
//        cool: '65',
//        heat: '61',//65
//        trigger: 75.5,
//        threshold: 1,
//        tolerance: .5,
//        isVisible: true,
//        ready: function () {
//
//        }