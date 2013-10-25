var Device = require('./device');

var d = new Device('68', {
    type: 'light',
    actionType: 'switch',
    ready: function () {
        console.log('68 ready');
    }
});
