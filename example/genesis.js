
const { nodeService } = require('../src/nodeService')
const { stringToBytes, hexToBytes, bytesToHex, toLE, leToNumber } = require('../src/utils')
const { StorageBond, storageKey } = require('../src/storageBond');
const { nodeUrl } = require('./config');
const substrate = require('../');

substrate.setNodeUri([nodeUrl]);
const chain = substrate.chain;

chain.hash(0).tie(hash => {
    console.log(`hash of block 0: ${hash}`);

    let d=nodeService().request('state_getStorage', [storageKey('System Events', []), hash]).then(data=>{
        console.log(hexToBytes(data))
    })

})

