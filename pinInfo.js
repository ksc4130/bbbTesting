module.exports = {
    deviceBaseFields: [
        'id',//'oId
        'type',
        'actionType',
        'direction',
        'edge',
        'value',
        'isVisible',
        'controls'
    ],
    gpioPath: '/sys/class/gpio/gpio',
    anPath: '/sys/devices/ocp.2/helper.14/',
    dontInitValActionTypes: [
        'switch',
        'sensor'
    ],
    inputActionTypes: [
        'switch',
        'sensor',
        'thermo'
    ],
    outputActionTypes: [
        'onoff',
        'momentary'
    ],
    edges: {
        'switch': 'both',
        'onoff': 'both',
        'momentary': 'both',
        'sensor': 'both',
        'thermo': 'both'
    },
    analogPins: [
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
}