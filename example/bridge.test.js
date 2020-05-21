const substrate = require('../');
const { bytesToHex, stringToBytes, toRIHex, toBtcAddress } = require('../src/utils');
global.localStorage = {};
const { nodeUrl } = require('./config');

const bitcoin = require('bitcoinjs-lib');
const bscript = bitcoin.script;
const OPS = require('bitcoin-ops');
const OP_INT_BASE = OPS.OP_RESERVED; // OP_1 - 1

window = global;

//设置节点
substrate.setNodeUri([nodeUrl]);

function sleep(time) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(' enough sleep~');
    }, time);
  });
}

substrate.runtimeUp.then(() => {
  function getTxByNum(number) {
    bridge.hashsForNumber(number).tie(hashlist => {
      if (hashlist.length == 0) return;
      var hash = hashlist[0];
      console.log('#num=' + number + ',hash=' + hash.toRightHex());
      bridge.blockTxids(hash).tie(data => {
        //console.log(data)
        for (var i = 0; i < data.length; i++) {
          console.log('#blockTxids:[' + i + '] ' + data[i].toRightHex());

          bridge.txSet(data[i]).tie(tx => {
            console.log('AccountId#' + '=>' + bytesToHex(tx[0]));
            console.log('btcAddress#' + '=>' + toBtcAddress(tx[1].hash.toHex(), 'testnet'));
            console.log('TxType#' + '=>' + tx[2].toName());
            console.log('value#' + '=>' + tx[3]);
            console.log('H256#' + '=>' + bytesToHex(tx[4]));
          });
        }
      });
    });
  }

  let bridge = substrate.runtime.bridge_btc;
  //getTxByNum(918004)

  // testRedeemScript(bridge);
  // testReceiveAddress(bridge);
  //testBestIndex(bridge);
  // testUTXO(bridge);
  // testRegInfoMaxIndex(bridge);
  // testBlockHeaderFor(bridge);

  // testTxSet()

  //   (async function(){
  //     let best=await bridge.bestIndex
  //     //console.log(best)
  //      bridge.bestIndex.finalise()
  //    //await  sleep(10000)
  //     bridge.bestIndex.tie(data2 => {
  //       console.log('#111block number:' + data2.number);
  //       console.log('#111 block hash:0x' + data2.hash.toRightHex());

  //     })
  //   })()
  // (async function() {

  //      bridge.bestIndex.tie(async () => {
  //       bridge.bestIndex.finalise();
  //       //await sleep(10000);
  //       bridge.bestIndex.tie(data2 => {
  //         console.log('#2222block number:' + data2.number);
  //         console.log('#2222 block hash:0x' + data2.hash.toRightHex());
  //       });
  //     });
  //   })();

  (async function() {
    bridge.bestIndex.tie(async () => {
      //bridge.bestIndex.finalise();
      console.log('444');
    });
    bridge.bestIndex.finalise();

    bridge.bestIndex.tie(data2 => {
      console.log('#333 block number:' + data2.number);
      console.log('#333 block hash:0x' + data2.hash.toRightHex());
    });
  })();
});
