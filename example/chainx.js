const Chainx = require('chainx.js').default;

(async () => {
    // 目前只支持 websocket 链接
    const chainx = new Chainx('ws://127.0.0.1:8087');

    // 等待异步的初始化
    await chainx.isRpcReady();

    // 查询某个账户的资产情况
    const bobAssets = await chainx.asset.getAssetsByAccount('5RbPQs4cyU7d7Qi7uYFic7ubuFhMWMaUHDgda3T76Rs1tghd', 0, 10);

    console.log('bobAssets: ', JSON.stringify(bobAssets));

    // 构造交易参数（同步）

    const extrinsic = chainx.asset.transfer('5R54JzRJZpEa9dPaFjhNPkuCGq6u4qgg5oWfGZpQUn35Lvif', 'PCX', '1000', '转账 PCX');

    // 查看 method 哈希
    console.log('Function: ', extrinsic.method.toHex());

    // 签名并发送交易，0x0000000000000000000000000000000000000000000000000000000000000000 是用于签名的私钥
    // extrinsic.signAndSend('0x436861696e582d5361746f736869202020202020202020202020202020202020', (error, response) => {
    //     if (error) {
    //         console.log(error);
    //     } else if (response.status === 'Finalized') {
    //         if (response.result === 'ExtrinsicSuccess') {
    //             console.log('交易成功');
    //         }
    //     }
    // });

    // let nominate=chainx.stake.nominate('5R54JzRJZpEa9dPaFjhNPkuCGq6u4qgg5oWfGZpQUn35Lvif', 1000, '投票');
    // nominate.signAndSend('0x436861696e582d5361746f736869202020202020202020202020202020202020', (error, response) => {
    //     if (error) {
    //         console.log(error);
    //     } else if (response.status === 'Finalized') {
    //         if (response.result === 'ExtrinsicSuccess') {
    //             console.log('nominate 交易成功');
    //         }
    //     }
    // });

    console.log(JSON.stringify(await chainx.asset.getAssetsByAccount('5R54JzRJZpEa9dPaFjhNPkuCGq6u4qgg5oWfGZpQUn35Lvif', 0, 10)))
    let sell=chainx.trade.putOrder(0, 'Limit', 'Sell', 100, 100)
    sell.signAndSend('0x436861696e582d5361746f736869202020202020202020202020202020202020', (error, response) => {
        if (error) {
            console.log(error);
        } else if (response.status === 'Finalized') {
            if (response.result === 'ExtrinsicSuccess') {
                console.log('putOrder 交易成功');
            }
        }
    });


})();