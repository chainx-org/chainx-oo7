const substrate = require('../');
const {nodeUrl} = require('./config');
const { hexToBytes } = require('../src/utils');
window = global;
var secretstore = substrate.secretStore();

//设置节点
substrate.setNodeUri([nodeUrl]);

const chain = substrate.chain;


(async function test() {
    await substrate.runtimeUp

    let print = function (asset) {
        for (var i = 0; i < asset.length; i++) {
            console.log(asset[i][0][0].toString(), asset[i][0][1].toString());
        }
    }

    let mo_pri='0x436861696e582d5361746f736869202020202020202020202020202020202020'
    let mo_pub='0x3f53e37c21e24df9cacc2ec69d010d144fe4dace6b2f087f466ade8b6b72278f'
    secretstore.submitFromSeed(mo_pri,'mocius');
    let mocius=secretstore.find('mocius');
    console.log('mocius',mocius.account.toHex())
    let co_pub='0x56758d236714a2fa7981af8c8177dddc6907875b2c23fd5c842922c8a2c5a1be'

    let mo = await substrate.runtime.xassets.assetBalance([mo_pub, 'PCX'])
    print(mo)
    let co=  await substrate.runtime.xassets.assetBalance([co_pub, 'PCX'])
    print(co)
    substrate.calls.xassets.transfer(co_pub,"PCX", 100000,"test").then((transfer_to_co) => {
        console.log(transfer_to_co)
        //发送交易
        substrate.post({
            sender: mocius.account,
            call: transfer_to_co,
        }).tie((data) => {
            console.log(data);
        });

    })

})()
