const substrate = require('../');
const {nodeUrl} = require('./config');
window = global;
const {storageKey} = require('../src/storageBond.js')
const {stringToBytes, hexToBytes, toLEHex, bytesToHex, leToNumber} = require('../src/utils.js');
const {decode} = require('../src/codec.js')
//设置节点
substrate.setNodeUri([nodeUrl]);
var secretstore = substrate.secretStore();
const chain = substrate.chain;
var fs = require('fs');
const Chainx = require('chainx.js').default;
const {compactAddLength} = require('@chainx/util');
const {Abi} = require('@chainx/api-contract');

(async function () {
    // await substrate.runtimeUp
    // console.log(substrate.calls.xcontracts)

    let mo_pri = '0x436861696e582d5361746f736869202020202020202020202020202020202020'
    let mo_pub = '0x3f53e37c21e24df9cacc2ec69d010d144fe4dace6b2f087f466ade8b6b72278f'

    var wasm = fs.readFileSync("/home/parachain/flipper/target/flipper.wasm")
    var abi = fs.readFileSync("/home/parachain/flipper/target/old_abi.json")
    //let Abi = new Abi(abi)
    const chainx = new Chainx('ws://127.0.0.1:8087');

    // 等待异步的初始化
    await chainx.isRpcReady();

    //上传合约
    let putcode = await chainx.api.tx.xContracts.putCode(5000000, compactAddLength(wasm))

    putcode.signAndSend('0x436861696e582d5361746f736869202020202020202020202020202020202020', (error, response) => {
        for (var i = 0; response.events && (i < response.events.length); i++) {
            if ('CodeStored' == response.events[i].method) {
                let code = response.events[i].event.data[0]
                console.log('Code:' + code)
                console.log('putCode 交易成功');

                (async function () {
                    let instantiate = await chainx.api.tx.xContracts.instantiate(1, 500000, code, [])
                    instantiate.signAndSend('0x436861696e582d5361746f736869202020202020202020202020202020202020', (error, response) => {
                        console.log(response)
                    })


                })()

                break;
            }
        }

    });


})()


