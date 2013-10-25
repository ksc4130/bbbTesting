var http = require('http'),
    device = require('./device'),
    Device = device.Device;
device.on('switched', function (d) {
   console.log('switched', d);
});
var d = new Device('68', {
    type: 'light',
    actionType: 'switch',
    ready: function () {
        console.log('68 ready');
    }
});

var server = http.createServer(function (req, res) {

}).listen(8080);
