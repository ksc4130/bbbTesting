var exists = fs.existsSync(anPath + 'AIN1');
if(!exists) {
    fs.writeFileSync('/sys/devices/bone_capemgr.9/slots', 'cape-bone-iio');
}
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
        new Device('AIN3', {
            name: 'Temp',
            type: 'temp',
            actionType: 'sensor',
            isVisible: true,
            ready: function () {

            }
        }),
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