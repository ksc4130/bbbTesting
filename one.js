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
      if(!typeof val === 'undefined') {
          return pin.read();
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


Pin.prototype.read = function () {
    fs.exists(this.valuePath, function (exists) {
        if(!exists) {
            fs.writeFile(exportPath, self.id, function () {
                fs.writeFileSync(self.directionPath, 'out');
                return '' + fs.readFileSync(this.valuePath + valPath);
            });
        } else {
            fs.writeFileSync(self.directionPath, 'out');
            return '' + fs.readFileSync(this.valuePath + valPath);
        }
    });
};

Pin.prototype.write = function (val) {
    var self = this;
    fs.exists(this.valuePath, function (exists) {
        if(!exists) {
            fs.writeFile(exportPath, self.id, function () {
                fs.writeFileSync(self.directionPath, 'in');
                return '' + fs.writeFileSync(self.valuePath, val);
            });
        } else {
            fs.writeFileSync(self.directionPath, 'in');
            return '' + fs.writeFileSync(self.valuePath, val);
        }
    });
};

Pin.prototype.watch = function (freq) {
    var p = this;
    setTimeout(function () {
        fs.readFile(p.path + '/value', function (err, data) {
            if(err)
                return;
            if(data.toString() !== p.value.toString()) {
                p.value = data;
                console.log(p.id, p.value)
            }
        });
    }, freq || 20);
    p.watch(freq);
};

var pins = [
    new Pin(67),
    new Pin('AIN4')
];

pins[0].write(1);

setTimeout(function () {
    pins[0].write(0);
}, 1000);

setInterval(function () {
    //var p = pins[1];
    var p = obPin(67);
    var v = p();
    var nv = p();
    if(nv.toString() !== v.toString()) {
        p.value = nv;
        console.log(p());
    }
}, 250);

//pins[1].watch(250);

//fs.watchFile(pins[1].path + '/value', function (curr, prev) {
//    console.log('the current mtime is: ' + curr.mtime);
//    console.log('the previous mtime was: ' + prev.mtime);
//});
