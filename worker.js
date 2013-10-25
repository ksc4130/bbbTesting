var Device = require('./device');

var d = new Device('68', {
    type: 'switch',
    actionType: 'switch',
    ready: function () {
        console.log('68 ready');
    }
});
