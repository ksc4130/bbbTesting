var fs = require('fs');

var exportPath = '/sys/class/gpio/export',
    digPath = '/sys/class/gpio/gpio',
    anPath = '/sys/devices/ocp.2/helper.14/',
    ids = [
        67,
        'AIN4'
    ];

var obPin = function (id) {
  var pin = new Pin(id);

  return function(val) {
      if(typeof val === 'undefined') {
          return pin.readSync();
      } else {
          pin.write(val);
      }
  }
};

var exportPin = function (pin) {

};

var Pin = function (id) {
    if(ids.indexOf(id) < 0)
        return undefined;

    var self = this;

    self.id = id;
    self.value = '';
    self.isAnalog = typeof self.id === 'string';
    if(self.isAnalog) {
        self.path = anPath + self.id;
        self.valuePath = self.path;
    }
    else {
        self.path = digPath + self.id;
        self.valuePath = self.path + '/value';
        self.directionPath = self.path + '/direction';
    }

    return self;
};

Pin.prototype.readSync = function () {
    var self = this;
    var exists = fs.existsSync(this.valuePath);
    if(!exists) {
        console.log('doesn\'t exist', self.id);
        fs.writeFileSync(exportPath, self.id);
    }
    fs.writeFileSync(self.directionPath, 'in');
    return '' + fs.readFileSync(self.valuePath);
};

Pin.prototype.read = function () {
    var self = this;
    fs.exists(this.valuePath, function (exists) {
        if(!exists) {
            fs.writeFile(exportPath, self.id, function () {
                fs.writeFileSync(self.directionPath, 'in');
                return '' + fs.readFileSync(self.valuePath);
            });
        } else {
            fs.writeFileSync(self.directionPath, 'in');
            return '' + fs.readFileSync(self.valuePath);
        }
    });
};

Pin.prototype.write = function (val) {
    var self = this;
    fs.exists(this.valuePath, function (exists) {
        if(!exists) {
            fs.writeFile(exportPath, self.id, function () {
                fs.writeFileSync(self.directionPath, 'out');
                return '' + fs.writeFileSync(self.valuePath, val);
            });
        } else {
            fs.writeFileSync(self.directionPath, 'out');
            return '' + fs.writeFileSync(self.valuePath, val || 0);
        }
    });
};

Pin.prototype.writeSync = function (val) {
    var self = this;
    var exists = fs.existsSync(this.valuePath);
        if(!exists) {
            console.log('doesn\'t exist', self.id);
            fs.writeFile(exportPath, self.id)
        }
        fs.writeFileSync(self.directionPath, 'out');
        return '' + fs.writeFileSync(self.valuePath, val || 0);
};

var pins = [
    new Pin(67),
    new Pin('AIN4')
];

console.log(pins[0].readSync());
pins[0].writeSync(1);
console.log(pins[0].readSync());


setTimeout(function () {
    pins[0].writeSync(0);
    console.log(pins[0].readSync());
}, 1000);

//setInterval(function () {
//    //var p = pins[1];
//    var p = obPin(67);
//    var v = p.value || '';
//    var nv = p() || '';
//
//    if(nv.toString() !== v.toString()) {
//        p.value = nv;
//        console.log('val new', nv);
//    }
//}, 250);

//pins[1].watch(250);

//fs.watchFile(pins[1].path + '/value', function (curr, prev) {
//    console.log('the current mtime is: ' + curr.mtime);
//    console.log('the previous mtime was: ' + prev.mtime);
//});
