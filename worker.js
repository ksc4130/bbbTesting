var device = require('./device'),
    Device = device.Device;
Device.on('switched', function (d) {
   console.log('switched', d);
});
var d = new Device('68', {
    type: 'light',
    actionType: 'switch',
    ready: function () {
        console.log('68 ready');
    }
});
