var ko = require('knockout');
module.exports = (new function () {
    var self = this;
    self.secret = 'Askindl23@146Fscmaijnd523CXVWGN#63@#7efbsd23#$Rb';
    self.dbName = 'kyngster';
    self.collections = ['settings', 'devices'];
    self.exportPath = '/sys/class/gpio/export';
    self.gpioDir = '/sys/class/gpio/';
    self.gpioPath = '/sys/class/gpio/gpio';
    self.analogPath = '/sys/devices/ocp.2/helper.14/'
    self.bbbAnalogPins = [
        'P9_33',
        'P9_35',
        'P9_36',
        'P9_37',
        'P9_38',
        'P9_39',
        'P9_40',
        'AIN0',
        'AIN1',
        'AIN2',
        'AIN3',
        'AIN4',
        'AIN5'
    ]
    self.pinsAll = [
        {
        isBbb: true,
        isRpi: false,
        isAnalog: false,
        isDigital: true,
        direction: null,
        edge: null,
        value: null,
        rail: 'P8_11',
        gpio: 30,
        pin: 30
        },
        {
            isBbb: true,
            isRpi: false,
            isAnalog: true,
            isDigital: false,
            direction: null,
            edge: null,
            value: null,
            rail: 'P8_38',
            gpio: null,
            pin: 'AIN3'
        }
    ];

    self.digitalPins = {};
    self.analogPins = {};

    ko.utils.arrayForEach(self.pinsAll, function (item) {
       if(item.isDigital) {
           self.digitalPins[item.pin] = item;
       } else if(item.isAnalog) {
           self.analogPins[item.pin] = item;
       }
    });

    self.guid = function () {
        var d = new Date().getTime();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c=='x' ? r : (r&0x7|0x8)).toString(16);
        });
    };


    return self;
});