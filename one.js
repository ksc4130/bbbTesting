var fs = require('fs');

var digPath = '/sys/class/gpio/gpio',
    anPath = '/sys/devices/ocp.2/helper.14/',
    ids = [
        67,
        'AIN4'
    ];

var Pin = function (id) {
    if(ids.indexOf(id) < 0)
        return undefined;

    var self = this;

    self.id = id;
    self.value = null;
    if(typeof self.id === 'string')
        self.path = anPath + self.id;
    else
        self.path = digPath + self.id;

    return self;
};


Pin.prototype.read = function () {
    return fs.readFileSync(this.path + '/value');
};

Pin.prototype.write = function (val) {
    return fs.writeFileSync(this.path + '/value', val);
};

Pin.prototype.watch = function (freq) {
    setTimeout(function () {
        var p = pins[1];
        fs.readFile(p.path + '/value', function (err, data) {
            if(err)
                return;
            if(data.toString() !== p.value.toString())
                p.value = data;
            this.watch(freq);
        });
    }, freq || 20);
};

var pins = [
    new Pin(67),
    new Pin('AIN4')
];

pins[0].write(1);

setTimeout(function () {
    pins[0].write(0);
}, 1000);


//fs.watchFile(pins[1].path + '/value', function (curr, prev) {
//    console.log('the current mtime is: ' + curr.mtime);
//    console.log('the previous mtime was: ' + prev.mtime);
//});
