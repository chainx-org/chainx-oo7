var substrate = require('..');
const {
    bytesToHex
} = require('../src/utils')
global.localStorage = {};

const { nodeUrl } = require('./config');
window = global;

//设置节点
substrate.setNodeUri([nodeUrl]);


var alice_seed = 'Alice';
var alice_account_58 = '5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaDtZ';
var alice_account_u8 = substrate.ss58Decode(alice_account_58); //58地址=》u8
var alice_account_public = '0x' + bytesToHex(alice_account_u8); //公钥
var alice_account_address = substrate.ss58Encode(alice_account_u8);
//秘钥管理
var secretstore = substrate.secretStore();
//注意! 
//submitFromSeed只是为了适应ychainx的测试链配置，正式环境应该使用 submit方法
secretstore.submitFromSeed(alice_seed, 'alice');
var alice = secretstore.find('alice');


async function init_runtime() {
    await substrate.runtimeUp;
}


(async function () {
    await init_runtime()
    
    //查询当前开关
    let Switch=await substrate.runtime.xfeeManager.switch
    console.log(Switch)

    //设置开关
    let  setSwitchStore =await substrate.calls.xfeeManager.setSwitchStore([0/*global*/,0/*spot*/ ,1/*xbtc*/,0/*sdot*/])
    await substrate.post({
        sender: alice.account,
        call: setSwitchStore
    }).tie((data) => {
        console.log(data)
    })
    
})()





