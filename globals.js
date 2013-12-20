module.exports = (new function () {
    var self = this;
    self.secret = 'Askindl23@146Fscmaijnd523CXVWGN#63@#7efbsd23#$Rb';
    self.dbName = 'kyngster';
    self.collections = ['settings', 'devices'];
    self.exportPath = '/sys/class/gpio/export';
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
    self.pins = [
      {
        isBbb: true,
        isRpi: false,
        isAnalog: false,
        direction: null,
        edge: null,
        value: null,
        rail: 'P8_11',
        gpio: 30
      }
    ];
    return self;
});