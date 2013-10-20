var fs = require('fs');

var digPath = '/sys/class/gpio/gpio';

var pin = {
    id: 67,
    path: function () {
        return digPath + this.id;
    },
    read: function () {
        return fs.readFileSync(this.path() + '/value');
    },
    write: function (val) {
        return fs.writeFileSync(this.path() + '/value', val);
    }
}

pin.write(1);