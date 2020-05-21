const {
    camel
} = require('change-case');
const {
    Bond,
    TransformBond,
    TimeBond
} = require('oo7')
const {
    nodeService
} = require('./nodeService')
const {
    SubscriptionBond
} = require('./subscriptionBond')
const {
    BlockNumber,
    Hash
} = require('./types');
const {
    decode,
    encode
} = require('./codec');
const {
    stringToBytes,
    hexToBytes,
    bytesToHex,
    toLE,
    leToNumber
} = require('./utils')
const {
    StorageBond,
    storageKey
} = require('./storageBond');
const {
    setMetadata
} = require('./metadata')
const fs = require('fs')

let chain = (() => {
    let head = new SubscriptionBond('chain_newHead').subscriptable()
    let finalizedHead = new SubscriptionBond('chain_finalizedHead').subscriptable()
    let height = head.map(h => new BlockNumber(h.number))
    let finalizedHeight = finalizedHead.map(h => new BlockNumber(h.number))
    let lag = Bond.all([height, finalizedHeight]).map(([h, f]) => new BlockNumber(h - f))
    let header = hashBond => new TransformBond(hash => nodeService().request('chain_getHeader', [hash]), [hashBond]).subscriptable()
    let block = hashBond => new TransformBond(hash => nodeService().request('chain_getBlock', [hash]), [hashBond]).subscriptable()
    let hash = numberBond => new TransformBond(number => nodeService().request('chain_getBlockHash', [number]) /*.then(hexToBytes)*/, [numberBond])
    return {
        head,
        finalizedHead,
        height,
        finalizedHeight,
        header,
        hash,
        block,
        lag
    }
})()

let system = (() => {
    let time = new TimeBond
    let name = new TransformBond(() => nodeService().request('system_name')).subscriptable()
    let version = new TransformBond(() => nodeService().request('system_version')).subscriptable()
    let chain = new TransformBond(() => nodeService().request('system_chain')).subscriptable()
    let properties = new TransformBond(() => nodeService().request('system_properties')).subscriptable()
    let health = new TransformBond(() => nodeService().request('system_health'), [], [time]).subscriptable()
    let peers = new TransformBond(() => nodeService().request('system_peers'), [], [time]).subscriptable()
    let pendingTransactions = new TransformBond(() => nodeService().request('author_pendingExtrinsics')).subscriptable()
    return {
        name,
        version,
        chain,
        properties,
        pendingTransactions,
        health,
        peers
    }
})()

let version = (new SubscriptionBond('state_runtimeVersion', [], r => {
    let apis = {}
    r.apis.forEach(([id, version]) => {
        if (typeof id !== 'string') {
            id = String.fromCharCode.apply(null, id)
        }
        apis[id] = version
    })
    return {
        authoringVersion: r.authoringVersion,
        implName: r.implName,
        implVersion: r.implVersion,
        specName: r.specName,
        specVersion: r.specVersion,
        apis
    }
})).subscriptable()

let runtime = {
    version,
    metadata: new Bond,
    core: (() => {
        let authorityCount = new SubscriptionBond('state_storage', [
            ['0x' + bytesToHex(stringToBytes(':auth:len'))]
        ], r => decode(hexToBytes(r.changes[0][1]), 'u32'))
        let authorities = authorityCount.map(
            n => [...Array(n)].map((_, i) =>
                new SubscriptionBond('state_storage',
                    [
                        ['0x' + bytesToHex(stringToBytes(":auth:")) + bytesToHex(toLE(i, 4))]
                    ],
                    r => decode(hexToBytes(r.changes[0][1]), 'AccountId')
                )
            ), 2)
        let code = new SubscriptionBond('state_storage', [
            ['0x' + bytesToHex(stringToBytes(':code'))]
        ], r => hexToBytes(r.changes[0][1]))
        let codeHash = new TransformBond(() => nodeService().request('state_getStorageHash', ['0x' + bytesToHex(stringToBytes(":code"))]).then(hexToBytes), [], [version])
        let codeSize = new TransformBond(() => nodeService().request('state_getStorageSize', ['0x' + bytesToHex(stringToBytes(":code"))]), [], [version])
        let heapPages = new SubscriptionBond('state_storage', [
            ['0x' + bytesToHex(stringToBytes(':heappages'))]
        ], r => decode(hexToBytes(r.changes[0][1]), 'u64'))
        let events = hashBond => new TransformBond(
            (blockhash) => nodeService().request('state_getStorage', [storageKey('System Events', []), blockhash]).then(hexToBytes).catch(e => {
                return []
            }),
            [hashBond]
        );
        let storage = storageBond =>
            new TransformBond(
                datakey =>
                    nodeService()
                        .request('state_getStorage', [datakey])
                        .then(hexToBytes),
                [storageBond],
                []
            );
        let sub_storage = datakey =>
            new SubscriptionBond('state_storage', [
                [datakey]
            ], r => hexToBytes(r.changes[0][1])).subscriptable();
        let metaData = new TransformBond(
            () =>
                nodeService()
                    .request('state_getMetadata', [])
                    .then(hexToBytes),
            [],
            [chain.head]
        );
        return {
            authorityCount,
            authorities,
            code,
            codeHash,
            codeSize,
            version,
            heapPages,
            storage,
            sub_storage,
            metaData,
            events
        }
    })()
}

let calls = {}
let call_decode = {};

class RuntimeUp extends Bond {
    initialise() {
        let that = this
        initRuntime(() => that.trigger(true))
    }
}

let runtimeUp = new RuntimeUp

let onRuntimeInit = []

function trans_funname(source) {
    if (source.indexOf('-') < 0 && source.indexOf('_') < 0) {
        return source;
    }
    return source.replace(/[-_][^-_]/g, function (match) {
        return match.charAt(1).toUpperCase();
    });

}

function initialiseFromMetadata(md) {
    console.log("initialiseFromMetadata", md)
    md.outerEvent = []
    md.modules.forEach((m) => {
        if (m.events && m.events.length) {
            md.outerEvent.push({
                name: m.prefix,
                events: m.events
            })
        }
    })
    setMetadata(md)
    let callIndex = 0;

    md.modules.forEach((m) => {
        let o = {}
        let c = {}
        if (m.storage) {
            let storePrefix = m.prefix
            m.storage.forEach(item => {
                //console.log(item.name,trans_funname(item.name))
                let old_itemname = item.name
                item.name = trans_funname(item.name)
                if (item.type.PlainType)
                    item.type.option = 'Plain'
                else if (item.type.MapType)
                    item.type.option = 'Map'

                switch (item.type.option) {
                    case 'Plain': {

                        o[camel(item.name)] = new StorageBond(`${storePrefix} ${item.name}`, item.type.value, [], item.modifier.option == 'Default' ? item.default : null, 'Twox128')
                        break
                    }
                    case 'Map': {
                        let keyType = item.type.value.key
                        let valueType = item.type.value.value
                        let hasDefault = item.modifier.option == 'Default'

                        o[camel(item.name)] = (keyBond, useDefault = hasDefault) => new TransformBond(key => new StorageBond(`${storePrefix} ${item.name}`, valueType, encode(key, keyType), useDefault ? item.default : null, item.type.value.hasher.option),
                            [keyBond]
                        ).subscriptable()
                        if (item.type.value.iterable) {
                            o[camel(item.name)].head = new StorageBond(`head of ${storePrefix} ${item.name}`, keyType)
                            let prefix = `${storePrefix} ${item.name}`;
                            let rest
                            rest = (pre, head) => {
                                if (head == null) {
                                    return pre
                                } else {
                                    return new TransformBond(
                                        l => l && l[0] ?
                                            rest([...pre, {
                                                key: head,
                                                value: l[0][0]
                                            }], l[0][2]) :
                                            pre,
                                        [new StorageBond(prefix, [valueType, `Option<${keyType}>`, `Option<${keyType}>`], encode(head, keyType))]
                                    )
                                }
                            }
                            o[camel(item.name)].all = o[camel(item.name)].head.map(x => rest([], x))
                        }
                    }
                }

                item.name = old_itemname
            })
        }


        if (m.calls) {
            let thisCallIndex = callIndex
            callIndex++

            call_decode[thisCallIndex] = {};
            //console.log(m.name,m.calls)
            m.calls.forEach((item, id) => {
                //console.log(item.name,trans_funname(item.name))
                let old_itemname = item.name
                item.name = trans_funname(item.name)
                call_decode[thisCallIndex][id] = {
                    "module": (m.prefix != '' ? m.prefix : m.name),
                    "call": old_itemname
                };
                call_decode[thisCallIndex][id].decode = function (input) {
                    let result = new Array()
                    for (var i = 0; i < item.arguments.length; i++) {
                        let arg = decode(input, item.arguments[i].type);
                        if ('Proposal' == item.arguments[i].type || 'Box<T::Proposal>' == item.arguments[i].type) {
                            //arg.args=call_decode[arg.m][arg.c].decode(arg.args)
                            arg = JSON.stringify(arg)
                        } else if ('Chain' == item.arguments[i].type) {
                            switch (arg) {
                                case 0:
                                    arg = 'ChainX';
                                    break;
                                case 1:
                                    arg = 'Bitcoin';
                                    break;
                                case 2:
                                    arg = 'Ethereum';
                                    break;
                                default:
                                    break;
                            }
                        } else if ('TrusteeEntity' == item.arguments[i].type) {
                            arg = {
                                option: arg.option,
                                value: arg.value.toHex()
                            };
                        } else {

                            if (arg) {
                                if ((item.arguments[i].type == 'Vec<u8>' || (item.arguments[i].type == 'Option<Vec<u8>>')) && 'XBridgeOfBTC' == m.prefix && ('push_header' == item.name || 'push_transaction' == item.name || 'sign_withdraw_tx' == item.name || 'create_withdraw_tx' == item.name)) {
                                    arg = arg.toHex();
                                } else if ((item.arguments[i].type == 'Vec<u8>') && 'XBridgeOfSDOT' == m.prefix && 'sign_data' == item.arguments[i].name) {
                                    arg = arg.toHex();
                                } else if ('XBridgeOfSDOT' == m.prefix && 'ethereum_signature' == item.arguments[i].name) {
                                    arg = JSON.stringify(arg)
                                } else if ('Bytes' == item.arguments[i].type || 'Option<Bytes>' == item.arguments[i].type) {
                                    arg = arg.toHex();
                                } else if (('Vec<u8>' == item.arguments[i].type) && 'push_transaction' == item.name && ('XBridgeOfBTCLockup' == m.prefix)) {
                                    arg = arg.toHex();
                                } else if (('Vec<u8>' == item.arguments[i].type) && 'put_code' == item.name && ('XContracts' == m.prefix)) {
									arg = arg.toHex();
								}else if (('Vec<u8>' == item.arguments[i].type) && 'call' == item.name && ('XContracts' == m.prefix)) {
                                    arg = arg.toHex();
                                } else if (('Vec<u8>' == item.arguments[i].type) && 'instantiate' == item.name && ('XContracts' == m.prefix)) {
                                    arg = arg.toHex();
                                } else if ('RawHeader' == item.arguments[i].type) {
                                    arg = arg.toHex();
                                } else if ('H512' == item.arguments[i].type) {
                                    arg = arg.toHex();
                                } else if ('H264' == item.arguments[i].type) {
                                    arg = arg.toHex();
                                } else if ('next_key' == item.arguments[i].name) {
                                    arg = arg.toHex();
                                } else if ('multi_sig_id' == item.arguments[i].name) {
                                    arg = arg.toHex();
                                } else if ('code_hash' == item.arguments[i].name) {
                                    arg = arg.toHex();
                                } else if (typeof arg.toString) {
                                    arg = arg.toString();
                                } else if (typeof arg.toHex) {
                                    arg = arg.toHex();
                                }
                            }
                        }

                        result.push({
                            "name": item.arguments[i].name,
                            "data": arg
                        });
                    }
                    return result;
                };
                call_decode[thisCallIndex][id].help = JSON.stringify(item.arguments.map(x => {
                    var o = {}
                    o.name = x.name
                    o.type = x.type;
                    return o;
                }));

                if (item.arguments.length > 0 && item.arguments[0].name == 'origin' && item.ar[0].type == 'Origin') {
                    item.arguments = item.arguments.slice(1)
                }
                c[camel(item.name)] = function (...bondArgs) {
                    if (bondArgs.length != item.arguments.length) {
                        throw `Invalid number of argments (${bondArgs.length} given, ${item.arguments.length} expected)`
                    }
                    return new TransformBond(args => {
                        let encoded_args = encode(args, item.arguments.map(x => x.type))
                        let res = new Uint8Array([thisCallIndex, id, ...encoded_args]);
                        console.log(`Encoding call ${m.name}.${item.name} (${thisCallIndex}.${id}): ${bytesToHex(res)}`)
                        return res
                    }, [bondArgs], [], 3, 3, undefined, true)
                }
                c[camel(item.name)].help = item.arguments.map(a => a.name)
                c[camel(item.name)].sudo = args => {
                    return new Uint8Array([thisCallIndex, id, ...encode(args, item.arguments.map(x => x.type))]);
                }

                item.name = old_itemname;
            })
        }
        runtime[camel(m.name)] = o
        calls[camel(m.name)] = c
    })
    md.modules.forEach(m => {
        if (m.storage) {
            try {
                require(`./srml/${m.name}`).augment(runtime, chain)
            } catch (e) {
                if (!e.toString().startsWith('Error: Cannot find module')) {
                    throw e
                }
            }
        }
    })
    if (onRuntimeInit !== null) {
        onRuntimeInit.forEach(f => {
            if (f) f()
        })
        onRuntimeInit = null
    }

    //console.log(call_decode)

    runtime.metadata.trigger(md)
}

function decodeMetadata(bytes) {
    let input = {
        data: bytes
    }
    let head = decode(input, 'MetadataHead')

    if (head.magic === 0x6174656d) {
        if (head.version[0] == 4) {
            return decode(input, 'MetadataBodyV4')
        } else if (head.version[0] == 5) {
            return decode(input, 'MetadataBody')
        } else {
            throw `Metadata version ${head.version} not supported`
        }
    } else {
        let md = decode(bytes, 'Legacy_RuntimeMetadata')
        md.modules = md.modules.map(m => {
            m.name = m.prefix
            m.prefix = m.storage ? m.storage.prefix : null
            m.storage = m.storage ? m.storage.items : null
            m.calls = m.module && m.module.call ? m.module.call.functions : null
            return m
        })
        return md
    }
}

function initRuntime(callback = null) {
    if (onRuntimeInit instanceof Array) {
        onRuntimeInit.push(callback)
        version.tie(() => {
            console.info("Initialising runtime")
            nodeService().request('state_getMetadata')
                .then(blob => decodeMetadata(hexToBytes(blob)))
                .then(initialiseFromMetadata)
        })
    } else {
        // already inited runtime
        if (callback) {
            callback()
        }
    }
}

function runtimePromise() {
    return new Promise((resolve, reject) => initRuntime(() => resolve(runtime)))
}

function callsPromise() {
    return new Promise((resolve, reject) => initRuntime(() => resolve(calls)))
}

module.exports = {
    initRuntime,
    runtimeUp,
    runtimePromise,
    callsPromise,
    runtime,
    calls,
    chain,
    system,
    call_decode
}
