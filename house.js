var fs = require('fs'),
    anPath = '/sys/devices/ocp.2/helper.14/';
var exists = fs.existsSync(anPath + 'AIN1');
if(!exists) {
    fs.writeFileSync('/sys/devices/bone_capemgr.9/slots', 'cape-bone-iio');
}
var worker = require('./worker'),
    Device = require('./device').Device,
    devices = [
        new Device('67', {
            name: 'Den',
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
        new Device('46', {
            type: 'light',
            actionType: 'switch',
            controls: ['26'],
            ready: function () {

            }
        }),
        new Device('26', {
            name: 'Garage',
            type: 'light',
            actionType: 'onoff',
            isVisible: true,
            ready: function () {

            }
        }),
        new Device('AIN3', {
            name: 'Thermo',
            type: 'temp',
            actionType: 'thermo',
            cool: '67',
            heat: '26',
            trigger: 75.5,
            threshold:.5,
            isVisible: true,
            ready: function () {

            }
        }),
//        new Device('AIN3', {
//            name: 'Temp',
//            type: 'temp',
//            actionType: 'sensor',
//            isVisible: true,
//            ready: function () {
//
//            }
//        }),
        new Device('AIN1', {
            name: 'Light',
            type: 'light',
            actionType: 'sensor',
            isVisible: true,
            ready: function () {

            }
        })
    ];

worker.init(devices);