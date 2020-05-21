const substrate = require('../');
const { nodeUrl } = require('./config');
window = global;
const { storageKey } = require('../src/storageBond.js')
const { stringToBytes, hexToBytes, toLEHex, bytesToHex ,leToNumber} = require('../src/utils.js');
const { decode } = require('../src/codec.js')
//设置节点
substrate.setNodeUri([nodeUrl]);

const chain = substrate.chain;


(function test() {
  substrate.runtimeUp.then(() => {
      chain.height.tie(height=>{
          (async function () {
              var hash = await chain.hash(parseInt(height))
              var data_events = await substrate.runtime.core.events(hash)
              var events = substrate.decode(data_events, 'Vec<EventRecord>')
              console.log(height,hash,events)

          })()

      })
    
  })


})()
