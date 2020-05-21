const {TextDecoder} = require('text-encoding')
const {ss58Decode} = require('./ss58')
const {VecU8, AccountId, Hash, Signature, VoteThreshold, SlashPreference, Moment, Balance, BlockNumber, AccountIndex, Tuple, TransactionEra, Perbill, Permill, BtcBestHeader, BtcBlockHeader, BtcAddress, TxType, BtcTranscation, BtcUTXO, OrderProperty, CurrencyPair, TradingPair, OrderPairDetail, OrderType, TokenSymbol, OrderDetails, OrderStatus, FillT, IntentionProfsT, NominatorProfsT, NominationRecordT, MultiNodeIndexT, MatchNodeT, Bid, BidDetailT, FinancialRecord, Nominations, CandidateTx, BTCTxLogNodeIndex, BTCTxLog, StakingStats, CertProfs, RecordAction, SessionKey, HodlingRecord, VirtualIntentionProfs, BtcTransactionInput, BtcTransactionOutput, OutPoint, AssetType, UncheckedMortalExtrinsic, OrderDirection, HandicapT, EcdsaSignature, TrusteeEntity, SwitchStore, BitcoinTrusteeIntentionProps, BitcoinTrusteeSessionInfo, ApplicationState} = require('./types')
const {toLE, leToNumber, leToSigned, bytesToHex, stringToBytes, hexToBytes} = require('./utils')
const {metadata} = require('./metadata')
// const {call_decode}= require('./bonds')
const transforms = {
    MetadataHead: {
        magic: 'u32',
        version: 'u8'
    },
    MetadataBodyV4: {modules: 'Vec<ModuleMetadataV4>'},
    ModuleMetadataV4: {
        name: 'String',
        prefix: 'String',
        storage: 'Option<Vec<StorageFunctionMetadataV4>>',
        calls: 'Option<Vec<FunctionMetadataV4>>',
        events: 'Option<Vec<EventMetadataV4>>',
    },
    StorageHasher: {_enum: ['Blake2_128', 'Blake2_256', 'Twox128', 'Twox256', 'Twox64Concat']},
    StorageFunctionMetadataV4: {
        name: 'String',
        modifier: {_enum: ['Optional', 'Default']},
        type: {
            _enum: {
                Plain: 'String',
                Map: {hasher: 'StorageHasher', key: 'String', value: 'String', iterable: 'bool'},
                DoubleMap: {
                    hasher: 'StorageHasher',
                    first_key: 'String',
                    second_key: 'String',
                    value: 'String',
                    key2_hasher: 'String'
                }
            }
        },
        default: 'Vec<u8>',
        documentation: 'Docs',
        _post: x => {
            let def = null
            try {
                if (x.modifier.option == 'Default') {
                    def = decode(
                        x.default,
                        x.type.option === 'Plain' ? x.type.value : x.type.value.value
                    )
//					if (x.type.option == 'Plain')
//						console.log("Decoding default to:", x.name, x.modifier, x.default, x.type.value, def)
                }
            } catch (e) {
                console.log("Couldn't decode default!", x.name, x.modifier, x.default, x.type.value)
            }
            x.default = def
        }
    },
    FunctionMetadataV4: {
        name: 'String',
        arguments: 'Vec<FunctionArgumentMetadataV4>',
        documentation: 'Docs',
    },
    FunctionArgumentMetadataV4: {name: 'String', type: 'String'},
    EventMetadataV4: {
        name: 'String',
        arguments: 'Vec<String>',
        documentation: 'Vec<String>',
    },
    Docs: 'Vec<String>',

    MetadataBody: {modules: 'Vec<ModuleMetadata>'},
    ModuleMetadata: {
        name: 'String',
        prefix: 'String',
        storage: 'Option<Vec<StorageFunctionMetadata>>',
        calls: 'Option<Vec<FunctionMetadata>>',
        events: 'Option<Vec<EventMetadata>>',
    },
    StorageFunctionMetadata: {
        name: 'String',
        modifier: {_enum: ['Optional', 'Default']},
        type: {
            _enum: {
                Plain: 'String',
                Map: {hasher: 'StorageHasher', key: 'String', value: 'String', iterable: 'bool'},
                DoubleMap: {
                    hasher: 'StorageHasher',
                    first_key: 'String',
                    second_key: 'String',
                    value: 'String',
                    key2_hasher: 'StorageHasher'
                }
            }
        },
        default: 'Vec<u8>',
        documentation: 'Docs',
        _post: x => {
            let def = null
            try {
                if (x.modifier.option == 'Default') {
                    def = decode(
                        x.default,
                        x.type.option === 'Plain' ? x.type.value : x.type.value.value
                    )
//					if (x.type.option == 'Plain')
//						console.log("Decoding default to:", x.name, x.modifier, x.default, x.type.value, def)
                }
            } catch (e) {
                console.log("Couldn't decode default!", x.name, x.modifier, x.default, x.type.value)
            }
            x.default = def
        }
    },
    FunctionMetadata: {
        name: 'String',
        arguments: 'Vec<FunctionArgumentMetadata>',
        documentation: 'Docs',
    },
    FunctionArgumentMetadata: {name: 'String', type: 'String'},
    EventMetadata: {
        name: 'String',
        arguments: 'Vec<String>',
        documentation: 'Vec<String>',
    },
    NewAccountOutcome: {
        _enum: ['NoHint', 'GoodHint', 'BadHint']
    },
    UpdateBalanceOutcome: {
        _enum: ['Updated', 'AccountKilled']
    },

    Transaction: {
        version: 'u8',
        sender: 'Address',
        signature: 'Signature',
        index: 'Compact<Index>',
        era: 'TransactionEra',
        acceleration: 'Compact<Acceleration>',
        call: 'Call'
    },

    Phase: {
        _enum: {
            ApplyExtrinsic: 'u32',
            Finalization: undefined
        }
    },
    EventRecord: {
        phase: 'Phase',
        event: 'Event',
        topics: 'Vec<Hash>'
    },
    ValidatorPrefs: {
        unstakeThreshold: 'Compact<u32>',
        validatorPayment: 'Compact<Balance>'
    },
    UnlockChunk: {
        value: 'Compact<Balance>',
        era: 'Compact<BlockNumber>'
    },
    StakingLedger: {
        stash: 'AccountId',
        total: 'Compact<Balance>',
        active: 'Compact<Balance>',
        unlocking: 'Vec<UnlockChunk>'
    },
    IndividualExposure: {
        who: 'AccountId',
        value: 'Compact<Balance>'
    },
    Exposure: {
        total: 'Compact<Balance>',
        own: 'Compact<Balance>',
        others: 'Vec<IndividualExposure>'
    },

    'Exposure<AccountId,BalanceOf<T>>': 'Exposure',
    'IndividualExposure<AccountId,BalanceOf<T>>': 'IndividualExposure',
    'Schedule<Gas>': {
        offset: 'Gas',
        per_block: 'Gas'
    },
    ProposalIndex: 'u32',
    Gas: 'u64',
    LockPeriods: 'i8',

    TrusteeEntity: {
        _enum: {
            Bitcoin: 'Vec<u8>'
        }
    },
    '<LookupasStaticLookup>::Source': 'Address',
    '<T::LookupasStaticLookup>::Source': 'Address',
    'RawAddress<AccountId,AccountIndex>': 'Address',
    'Address<AccountId,AccountIndex>': 'Address',
    ParaId: 'u32',
    VoteIndex: 'u32',
    PropIndex: 'u32',
    ReferendumIndex: 'u32',
    Index: 'u64',

    KeyValue: '(Vec<u8>, Vec<u8>)',
    ParaId: 'u32',
    DigestItem: {
        _enum: ['Other', 'AuthoritiesChange', 'ChangesTrieRoot', 'Seal', 'Consensus']
    },
    'Box<Proposal>': 'Proposal',
    'CodeHash<T>':'Hash',
    SignedBalance: {
        _enum: {
            Positive: 'Balance',
            Negative: 'Balance'
        }
    },
    XRC20Selector: {
        _enum: [
            'BalanceOf',
            'TotalSupply',
            'Name',
            'Symbol',
            'Decimals',
            'Issue',
            'Destroy'
        ]
    },
    CallSwitcher: {
        _enum: [
            'Global',
            'Spot',
            'XBTC',
            'XBTCLockup',
            'SDOT'
        ]
    },
    Selector:'u32'

}

function addCodecTransform(type, transform) {
    if (!transforms[type]) {
        transforms[type] = transform
    }
}

var decodePrefix = ''

function decode(input, type) {
    if (typeof input.data === 'undefined') {
        input = {
            data: input
        }
    }
    if (typeof type === 'object') {
        let res = {}
        if (type instanceof Array) {
            // just a tuple
            res = new Tuple(type.map(t => decode(input, t)))
        } else if (!type._enum) {
            // a struct

            Object.keys(type).forEach(k => {
                if (k != '_post') {
                    res[k] = decode(input, type[k])
                    //console.log('k=',k,type[k],'abc',res[k])
                }
            })
        } else if (type._enum instanceof Array) {
            // simple enum
            let n = input.data[0]
            input.data = input.data.slice(1)
            res = {
                option: type._enum[n]
            }
        } else if (type._enum) {
            // enum
            // console.log(type)
            // console.log(input)

            let n = input.data[0]
            input.data = input.data.slice(1)
            let option = Object.keys(type._enum)[n]
            res = {
                option,
                value: typeof type._enum[option] === 'undefined' ? undefined : decode(input, type._enum[option])
            }
        }
        if (type._post) {
            type._post(res)
        }
        return res
    }
    type = type.replace(/ /g, '').replace(/(T::)+/, '')
    if (type == 'EventRecord<Event>') {
        type = 'EventRecord'
    }

    let reencodeCompact
    let p1 = type.match(/^<([A-Z][A-Za-z0-9]*)asHasCompact>::Type$/)
    if (p1) {
        reencodeCompact = p1[1]
    }
    let p2 = type.match(/^Compact<([A-Za-z][A-Za-z0-9]*)>$/)
    if (p2) {
        reencodeCompact = p2[1]
    }
    if (reencodeCompact) {
        return decode(encode(decode(input, 'Compact'), reencodeCompact), reencodeCompact)
    }

    // let dataHex = bytesToHex(input.data.slice(0, 50))
    //	console.log(decodePrefix + 'des >>>', type, dataHex)
    //	decodePrefix +=  "   "

    let res

    let transform = transforms[type]
    if (transform) {
        res = decode(input, transform)
        res._type = type
    } else {
        switch (type) {
            case 'Call':
            case 'Proposal': {
                let m = leToNumber(decode(input, 'u8'))
                let c = leToNumber(decode(input, 'u8'))
                let args = input.data
                input.data = input.data.slice(input.data.length)
                res = {
                    m: m,
                    c: c,
                    args: args.toHex()
                }
                break
                // throw "Cannot represent Call/Proposal"
            }
            case 'Digest': {
                res = decode(input, 'Vec<u8>')
                break;
            }

            case 'EventIndex': {
                res = decode(input, 'u32')
                break;
            }
            case 'EventTopics': {
                res = decode(input, 'Vec<u8>')
                break;
            }
            case 'DigestLog': {
                let digestitem = decode(input, 'DigestItem')
                let data = ''
                switch (digestitem.option) {
                    case 'AuthoritiesChange':
                        let vlist = decode(input, 'Vec<AccountId>')
                        data = []
                        for (var m = 0; m < vlist.length; m++) {
                            data[m] = {index: m, intention: vlist[m].toHex()}
                        }
                        break
                    case 'ChangesTrieRoot':
                        data = decode(input, 'Hash')
                        break
                    case 'Seal':
                        data = decode(input, '(u64, Signature)')
                        break
                    case 'Other':
                        data = decode(input, 'Vec<u8>')
                        data = bytesToHex(data)
                        break
                    case 'Consensus':
                        let e = input.data.slice(0, 4)
                        let engine = decode(input, 'u32')

                        let _data = decode(input, 'Vec<u8>')
                        _data = _data.toHex()
                        data = {
                            engine: e.toString(),
                            data: _data
                        }
                    default:
                        break
                }
                res = {
                    type: digestitem,
                    data: data
                }
                break
            }
            case 'Event': {
                let moduleIndex = leToNumber(decode(input, 'u8'))
                let module = metadata().outerEvent[moduleIndex]
                let moduleName = module.name
                let events = module.events

                if (events && events.length) {
                    let eventIndex = leToNumber(decode(input, 'u8'))

                    let eventName = events[eventIndex].name
                    let args = decode(input, events[eventIndex].arguments)
                    res = {
                        _type: 'Event',
                        moduleName,
                        eventName,
                        args
                    }
                }

                break
            }
            case 'Header': {
                let parent_hash = decode(input, 'Hash')
                let number = decode(input, 'Compact')
                let state_root = decode(input, 'Hash')
                let extrinsics_root = decode(input, 'Hash')

                // console.log(bytesToHex(encode(parent_hash,'Hash')))
                // console.log(bytesToHex(encode(number,'Compact')))
                // console.log(bytesToHex(encode(state_root,'Hash')))
                // console.log(bytesToHex(encode(extrinsics_root,'Hash')))

                let pre_header = bytesToHex(encode(parent_hash, 'Hash')) + '' + bytesToHex(encode(number, 'Compact')) + '' + bytesToHex(encode(state_root, 'Hash')) + '' + bytesToHex(encode(extrinsics_root, 'Hash')) + '00'

                let digest = decode(input, 'Vec<DigestLog>')
                res = {
                    parent_hash: parent_hash.toHex(),
                    number,
                    state_root: state_root.toHex(),
                    extrinsics_root: extrinsics_root.toHex(),
                    digest,
                    pre_header: (pre_header)
                }

                break;
            }
            case 'AccountId': {
                res = new AccountId(input.data.slice(0, 32))
                input.data = input.data.slice(32)
                break
            }
            case 'H512': {
                res = new Hash(input.data.slice(0, 64))
                input.data = input.data.slice(64)
                break
            }
            case 'H520': {
                res = new Hash(input.data.slice(0, 65))
                input.data = input.data.slice(65)
                break
            }
            case 'H264': {
                res = new Hash(input.data.slice(0, 33))
                input.data = input.data.slice(33)
                break
            }
            case 'SessionKey':
            case 'H256':
            case 'Hash': {
                res = new Hash(input.data.slice(0, 32))
                input.data = input.data.slice(32)
                break
            }
            case 'EthereumAddress': {
                res = input.data.slice(0, 20)
                res = bytesToHex(res)
                input.data = input.data.slice(20)
                break
            }
            case 'IntentionProfs<Balance,BlockNumber>': {
                res = new IntentionProfsT(
                    new Map([
                        ['total_nomination', decode(input, 'Balance')],
                        ['last_total_vote_weight', decode(input, 'u64')],
                        ['last_total_vote_weight_update', decode(input, 'BlockNumber')]
                    ]))
                break
            }
            case 'EcdsaSignature': {
                res = new EcdsaSignature(
                    new Map([
                        ['a', decode(input, 'H256')],
                        ['b', decode(input, 'H256')],
                        ['c', decode(input, 'i8')]
                    ]))
                break
            }
            case 'Signature': {
                res = new Signature(input.data.slice(0, 64))
                input.data = input.data.slice(64)
                break
            }
            case 'Price':
            case 'Amount':
            case 'Balance': {
                res = leToNumber(input.data.slice(0, 8))
                input.data = input.data.slice(8)
                res = new Balance(res)
                break
            }
            case 'BlockNumber': {
                res = leToNumber(input.data.slice(0, 8))
                input.data = input.data.slice(8)
                res = new BlockNumber(res)
                break
            }
            case 'AccountIndex': {
                res = decode(input, 'u32')
                break
            }
            case 'Moment': {
                let n = leToNumber(input.data.slice(0, 8))
                input.data = input.data.slice(8)
                res = new Moment(n)
                break
            }
            case 'VoteThreshold': {
                const VOTE_THRESHOLD = ['SuperMajorityApprove', 'NotSuperMajorityAgainst', 'SimpleMajority']
                res = new VoteThreshold(VOTE_THRESHOLD[input.data[0]])
                input.data = input.data.slice(1)
                break
            }
            case 'SlashPreference': {
                res = new SlashPreference(decode(input, 'u32'))
                break
            }
            case 'Perbill': {
                res = new Perbill(decode(input, 'u32') / 1000000000.0)
                break
            }
            case 'Permill': {
                res = new Permill(decode(input, 'u32') / 1000000.0)
                break
            }
            case 'Compact': {
                let len
                if (input.data[0] % 4 == 0) {
                    // one byte
                    res = input.data[0] >> 2
                    len = 1
                } else if (input.data[0] % 4 == 1) {
                    res = leToNumber(input.data.slice(0, 2)) >> 2
                    len = 2
                } else if (input.data[0] % 4 == 2) {
                    res = leToNumber(input.data.slice(0, 4)) >> 2
                    len = 4
                } else {
                    let n = (input.data[0] >> 2) + 4
                    res = leToNumber(input.data.slice(1, n + 1))
                    len = 1 + n
                }
                input.data = input.data.slice(len)
                break
            }
            case 'TxType': {
                res = new TxType(leToNumber(input.data.slice(0, 1)))
                input.data = input.data.slice(1)
                break
            }
            case 'ApplicationState':
                let status = leToNumber(decode(input, 'u8'))
                res = new ApplicationState(status)
                break

            case 'TxState': {
                res = input.data.slice(0, 1)
                input.data = input.data.slice(1)
                if (5 == leToNumber(res)) {
                    let a = decode(input, 'u32')
                    let b = decode(input, 'u32')
                }

                break
            }
            case 'Chain':
            case 'u8':
                res = input.data.slice(0, 1)
                input.data = input.data.slice(1)
                break
            case 'u16':
                res = leToNumber(input.data.slice(0, 2))
                input.data = input.data.slice(2)
                break
            case 'TradingPairIndex':
            case 'OrderPairID':
            case 'Acceleration':
            case 'u32':
            case 'ParaId':
            case 'VoteIndex':
            case 'PropIndex':
            case 'ReferendumIndex': {
                res = leToNumber(input.data.slice(0, 4))
                input.data = input.data.slice(4)
                break
            }
            case 'TradeHistoryIndex':
            case 'OrderIndex':
            case 'ID':
            case 'u64': {
                res = leToNumber(input.data.slice(0, 8))
                input.data = input.data.slice(8)
                break
            }
            case 'u128': {
                res = leToNumber(input.data.slice(0, 16))
                input.data = input.data.slice(16)
                break
            }
            case 'i8': {
                res = leToSigned(input.data.slice(0, 1))
                input.data = input.data.slice(1)
                break
            }
            case 'i16':
                res = leToSigned(input.data.slice(0, 2))
                input.data = input.data.slice(2)
                break
            case 'i32': {
                res = leToSigned(input.data.slice(0, 4))
                input.data = input.data.slice(4)
                break
            }
            case 'i64': {
                res = leToSigned(input.data.slice(0, 8))
                input.data = input.data.slice(8)
                break
            }
            case 'i128': {
                res = leToSigned(input.data.slice(0, 16))
                input.data = input.data.slice(16)
                break
            }
            case 'bool': {
                res = !!input.data[0]
                input.data = input.data.slice(1)
                break
            }
            case 'Vec<bool>': {
                let size = decode(input, 'Compact<u32>')
                res = [...input.data.slice(0, size)].map(a => !!a)
                input.data = input.data.slice(size)
                break
            }
            case 'Address<AccountId,AccountIndex>':
            case 'RawAddress<AccountId,AccountIndex>':
            case 'Address<AccountId, AccountIndex>':
            case 'Address': {
                let first = leToNumber(decode(input, 'u8'))
                if (0xff == first) {
                    res = decode(input, 'AccountId')
                } else {
                    if (first < 0xf0) {
                        res = first
                    } else if (first < 1 << 16) {
                        res = decode(input, 'u16')
                    } else if (first < 1 << 32) {
                        res = decode(input, 'u32')
                    } else if (first < 1 << 64) {
                        res = decode(input, 'u64')
                    }
                }

                break
            }
            case 'EthereumAddress': {
                res = new Hash(input.data.slice(0, 20))
                break
            }
            case 'BitcoinAddress': {
                let kind = leToNumber(input.data.slice(0, 1))
                input.data = input.data.slice(1)

                let network = leToNumber(input.data.slice(0, 1))
                input.data = input.data.slice(1)

                let hash = new Hash(input.data.slice(0, 20))
                input.data = input.data.slice(20)

                res = new BtcAddress(kind, network, hash)
                break
            }
            case 'BitcoinTrusteeType': {
                let _type = leToNumber(input.data.slice(0, 1))
                input.data = input.data.slice(1)

                if (0 == _type) {
                    res = {
                        'type': 'Normal',
                        'pubkey': decode(input, 'H520')
                    }
                } else if (1 == _type) {
                    res = {
                        'type': 'Compressed',
                        'pubkey': decode(input, 'H264')
                    }
                }
                break
            }
            case 'BitcoinTrusteeIntentionProps': {

                res = {
                    'about': decode(input, 'XString'),
                    'hot_entity': decode(input, 'BitcoinTrusteeType'),
                    'cold_entity': decode(input, 'BitcoinTrusteeType')
                }
                break
            }
            case 'BitcoinTrusteeSessionInfo<AccountId>':
            case 'BitcoinTrusteeSessionInfo': {
                res = new BitcoinTrusteeSessionInfo(
                    new Map([
                        ['trustee_list', decode(input, 'Vec<AccountId>')],
                        ['hot_address', decode(input, 'BitcoinTrusteeAddrInfo')],
                        ['cold_address', decode(input, 'BitcoinTrusteeAddrInfo')]
                    ]))
                break
            }
            case 'BitcoinTrusteeAddrInfo':
            case 'TrusteeAddrInfo': {

                let kind = leToNumber(input.data.slice(0, 1))
                input.data = input.data.slice(1)

                let network = leToNumber(input.data.slice(0, 1))
                input.data = input.data.slice(1)

                let hash = new Hash(input.data.slice(0, 20))
                input.data = input.data.slice(20)

                let redeem_script = decode(input, 'Vec<u8>')
                res = {
                    'kind': kind,
                    'network': network,
                    'addr': new BtcAddress(kind, network, hash),
                    'redeem_script': redeem_script
                }

                break
            }
            case 'Text':
            case 'Bytes':
            case 'RawHeader':
            case 'Vec<u8>': {
                let size = decode(input, 'Compact<u32>')
                res = input.data.slice(0, size)
                input.data = input.data.slice(size)
                break
            }
            case 'Memo': {
                let size = decode(input, 'Compact<u32>')
                res = input.data.slice(0, size)
                input.data = input.data.slice(size)
                // res = bytesToHex(res)
                break
            }
            case 'Desc':
            case 'AddrStr':
            case 'XString':
            case 'URL':
            case 'Name':
            case 'Token':
            case 'String': {
                let size = decode(input, 'Compact<u32>')
                res = input.data.slice(0, size)
                input.data = input.data.slice(size)
                res = new TextDecoder('utf-8').decode(res)
                break
            }
            case 'Type': {
                res = decode(input, 'String')
                while (res.indexOf('T::') != -1) {
                    res = res.replace('T::', '')
                }
                res = res.match(/^Box<.*>$/) ? res.slice(4, -1) : res
                break
            }
            case 'CurrencyPair': {
                res = new CurrencyPair(
                    new Map([
                        ['base', decode(input, 'Vec<u8>')],
                        ['counter', decode(input, 'Vec<u8>')]
                    ]))
                break
            }
            case 'OrderProperty': {
                res = new OrderProperty(
                    new Map([
                        ['account', decode(input, 'AccountId')],
                        ['pair', decode(input, 'TradingPairIndex')],
                        ['direction', decode(input, 'OrderDirection')],
                        ['amount', decode(input, 'Amount')],
                        ['price', decode(input, 'Price')],
                        ['index', decode(input, 'ID')],
                        ['class', decode(input, 'OrderType')],
                        ['create_time', decode(input, 'BlockNumber')]
                    ]))
                break
            }
            case 'TradingPair': {
                res = new TradingPair(
                    new Map([
                        ['id', decode(input, 'TradingPairIndex')],
                        ['currency_pair', decode(input, 'CurrencyPair')],
                        ['precision', decode(input, 'u32')],
                        ['min_unit', decode(input, 'u32')],
                        ['online', decode(input, 'bool')]
                    ]))
                break

            }
            case 'SwitchStore': {
                res = new SwitchStore(
                    new Map([
                        ['global', decode(input, 'bool')],
                        ['spot', decode(input, 'bool')],
                        ['xbtc', decode(input, 'bool')],
                        ['sdot', decode(input, 'bool')]
                    ]))
                break
            }
            case 'Side':
            case 'OrderDirection': {
                let direction = leToNumber(decode(input, 'u8'))
                res = new OrderDirection(direction)

                break
            }
            case 'OrderType': {
                let orderttype = leToNumber(decode(input, 'u8'))
                res = new OrderType(orderttype)

                break
            }
            case 'Asset': {
                let token = decode(input, 'Token')
                let token_name = decode(input, 'Token')
                let chain = decode(input, 'Chain')
                let precision = decode(input, 'u32')
                let desc = decode(input, 'Desc')

                res = {
                    token,
                    token_name,
                    chain,
                    precision,
                    desc
                }
                break;
            }
            case 'AssetType': {
                let type = leToNumber(decode(input, 'u8'))
                res = new AssetType(type)
                break
            }
            case 'AssetLimit': {
                /*AssetLimit {
                  CanMove,
                      CanTransfer,
                      CanDeposit,
                      CanWithdraw,
                      CanDestroyWithdrawal,
                      CanDestroyFree,
                }*/
                res = leToNumber(decode(input, 'u8'))
                break
            }
            case 'OrderStatus': {
                let status = leToNumber(decode(input, 'u8'))
                res = new OrderStatus(status)
                break
            }
            case 'OrderInfo<T>': {
                res = new OrderDetails(
                    new Map([
                        ['props', decode(input, 'OrderProperty')],
                        ['status', decode(input, 'OrderStatus')],
                        ['remaining', decode(input, 'Balance')],
                        ['fill_index', decode(input, 'Vec<ID>')],
                        ['already_filled', decode(input, 'Balance')],
                        ['lastupdate_time', decode(input, 'BlockNumber')]
                    ]))
                break
            }
            case 'HandicapInfo<T>': {
                res = new HandicapT(
                    new Map([
                        ['buy', decode(input, 'Price')],
                        ['sell', decode(input, 'Price')]
                    ]))
                break
            }
            case 'UncheckedMortalExtrinsic': {

                let version = decode(input, 'u8')

                if (1 != (1 & version[0])) {
                    console.log('version Error!' + version)
                }
                let address = ''
                let signature = ''
                let index = 0
                let era = 0
                let acceleration = 1
                if (128 & version[0]) {
                    address = decode(input, 'Address')
                    address = address.toHex()

                    signature = decode(input, 'Signature')
                    index = decode(input, 'Compact<Index>')
                    era = decode(input, 'TransactionEra')
                    acceleration = decode(input, 'Compact<Acceleration>')
                }

                let module = leToNumber(decode(input, 'u8'))
                let call = leToNumber(decode(input, 'u8'))
                version = version[0] & 0x7f

                res = new UncheckedMortalExtrinsic(
                    new Map([
                        ['version', version],
                        ['signed', address],
                        ['signature', signature],
                        ['index', index],
                        ['era', era],
                        ['acceleration', acceleration],
                        ['module', module.toString()],
                        ['call', call.toString()]
                    ])
                )
                break
            }
            case 'TransactionEra': {
                let first = leToNumber(decode(input, 'u8'))
                if (0 == first) {
                    res = 'Immortal'
                } else {
                    let second = leToNumber(decode(input, 'u8'))
                    let encoded = first + (second << 8)
                    let period = 2 << (encoded % (1 << 4))
                    let quantize_factor = Math.max(1, period >> 12)
                    let phase = (encoded >> 4) * quantize_factor
                    if (period >= 4 && phase < period) {
                        res = '(Mortal(' + period + ',' + phase + '))'
                    } else {
                        res = 'None'
                    }
                }

                break
            }
            default: {
                let m = type.match(/CodecBTreeMap<(.*)>/) || type.match(/BTreeMap<(.*)>/)
                if (m) {
                    let size = decode(input, 'u32')
                    res = [...new Array(size)].map(() => decode(input, m[1].split(',')))

                    break
                }
                let v = type.match(/^Vec<(.*)>$/)
                if (v) {
                    let size = decode(input, 'Compact<u32>')
                    res = [...new Array(size)].map(() => decode(input, v[1]))
                    break
                }
                let o = type.match(/^Option<(.*)>$/)
                if (o) {
                    let some = decode(input, 'bool')
                    if (some) {
                        res = decode(input, o[1])
                    } else {
                        res = null
                    }
                    break
                }
                let t = type.match(/^\((.*)\)$/)
                if (t) {
                    res = new Tuple(...decode(input, t[1].split(',')))
                    break
                }
                throw 'Unknown type to decode: ' + type
            }
        }
    }
    //	decodePrefix = decodePrefix.substr(3)
    //	console.log(decodePrefix + 'des <<<', type, res)
    return res
}

function encode(value, type = null) {
    // if an array then just concat
    if (type instanceof Array) {
        if (value instanceof Array) {
            let x = value.map((i, index) => encode(i, type[index]))
            let res = new Uint8Array()
            x.forEach(x => {
                r = new Uint8Array(res.length + x.length)
                r.set(res)
                r.set(x, res.length)
                res = r
            })
            return res
        } else {
            throw 'If type is array, value must be too ' + type
        }
    }
    if (typeof value == 'object' && !type && value._type) {
        type = value._type
    }
    if (typeof type != 'string') {
        throw 'type must be either an array or a string'
    }
    type = type.replace(/ /g, '').replace(/^(T::)+/, '')

    if (typeof value == 'string' && value.startsWith('0x')) {
        value = hexToBytes(value)
    }

    if (transforms[type]) {
        let transform = transforms[type]
        if (transform instanceof Array || typeof transform == 'string') {
            // just a tuple or string
            return encode(value, transform)
        } else if (!transform._enum) {
            // a struct
            let keys = []
            let types = []
            Object.keys(transform).forEach(k => {
                keys.push(value[k])
                types.push(transform[k])
            })
            return encode(keys, types)
        } else if (transform._enum instanceof Array) {
            // simple enum
            return new Uint8Array([transform._enum.indexOf(value.option)])
        } else if (transform._enum) {
            // enum
            let index = Object.keys(transform._enum).indexOf(value.option)
            let value = encode(value.value, transform._enum[value.option])
            return new Uint8Array([index, ...value])
        }
    }

    // other type-specific transforms
    if (type == 'Vec<u8>' || type.trim() == 'Token' || type.trim() == 'Memo' || type.trim() == 'Bytes' || type.trim() == 'RawHeader') {
        if (typeof value == 'object' && value instanceof Uint8Array) {
            return new Uint8Array([...encode(value.length, 'Compact<u32>'), ...value])
        }
        if (typeof value == 'string') {
            return new Uint8Array([...encode(value.length, 'Compact'), ...stringToBytes(value)])
        }
    }

    let match_vec = type.match(/^Vec<(.*)>$/)
    if (match_vec) {
        if (value instanceof Array) {
            let res = new Uint8Array([...encode(value.length, 'Compact<u32>')])
            value.forEach(v => {
                let x = encode(v, match_vec[1])
                r = new Uint8Array(res.length + x.length)
                r.set(res)
                r.set(x, res.length)
                res = r
            })
            return res
        }
    }

    let t = type.match(/^\((.*)\)$/)
    if (t) {
        return encode(value, t[1].split(','))
    }

    if (type == '<T::LookupasStaticLookup>::Source' || type == 'Address' || type == 'RawAddress<AccountId,AccountIndex>' || type == 'Address<AccountId,AccountIndex>') {
        if (typeof value == 'string') {
            value = ss58Decode(value)
        }
        if (typeof value == 'object' && value instanceof Uint8Array && value.length == 32) {
            return new Uint8Array([0xff, ...value])
        }
        if (typeof value == 'number' || value instanceof AccountIndex) {
            if (value < 0xf0) {
                return new Uint8Array([value])
            } else if (value < 1 << 16) {
                return new Uint8Array([0xfc, ...toLE(value, 2)])
            } else if (value < 1 << 32) {
                return new Uint8Array([0xfd, ...toLE(value, 4)])
            } else if (value < 1 << 64) {
                return new Uint8Array([0xfe, ...toLE(value, 8)])
            }
        }
    }

    if (type == 'AccountId') {
        if (typeof value == 'string') {
            return ss58Decode(value)
        }
        if (value instanceof Uint8Array && value.length == 32) {
            return value
        }
    }

    if (typeof value == 'number' ||
        (typeof value == 'string' && +value + '' == value) ||
        (type == 'Balance' && value instanceof Balance) ||
        (type == 'AccountIndex' && value instanceof AccountIndex) ||
        (type == 'BlockNumber' && value instanceof BlockNumber)
    ) {
        value = +value
        switch (type) {
            case 'u128':
            case 'i128':
                return toLE(value, 16)
            case 'ID':
            case 'Moment':
            case 'Price':
            case 'Balance':
            case 'Index':
            case 'u64':
            case 'u64':
            case 'BlockNumber':
            case 'i64':
                return toLE(value, 8)
            case 'AccountIndex':
            case 'ParaId':
            case 'TradingPairIndex':
            case 'Acceleration':
            case 'u32':
            case 'i32':
                return toLE(value, 4)
            case 'u16':
            case 'i16':
                return toLE(value, 2)
            case 'u8':
            case 'i8':
                return toLE(value, 1)
            default:
                break
        }
    }

    if (value instanceof AccountIndex && type == 'AccountIndex') {
        return toLE(value, 4)
    }

    if ((value instanceof Perbill || typeof value === 'number') && type == 'Perbill') {
        return toLE(value * 1000000000, 4)
    }

    if ((value instanceof Permill || typeof value === 'number') && type == 'Permill') {
        return toLE(value * 1000000, 4)
    }

    if (value instanceof Uint8Array) {
        if (type == 'Signature' && value.length == 64) {
            return value
        }
        if (type == 'Hash' && value.length == 32) {
            return value
        }
        if (type == 'H512' && value.length == 64) {
            return value
        }
    }

    if (value.constructor.name == type && typeof value.encode == 'function') {
        return value.encode()
    } else if (type == 'TransactionEra') {
        console.error('TxEra::encode bad', type, value)
    }

    if (type.match(/^<[A-Z][A-Za-z0-9]*asHasCompact>::Type$/) || type.match(/^Compact<[A-Za-z][A-Za-z0-9]*>$/) || type === 'Compact') {
        if (value < 1 << 6) {
            return new Uint8Array([value << 2])
        } else if (value < 1 << 14) {
            return toLE((value << 2) + 1, 2)
        } else if (value < 1 << 30) {
            return toLE((value << 2) + 2, 4)
        } else {
            let bytes = 0
            for (let v = value; v > 0; v = Math.floor(v / 256)) {
                ++bytes
            }
            return new Uint8Array([3 + ((bytes - 4) << 2), ...toLE(value, bytes)])
        }
    }

    if (type == 'bool') {
        return new Uint8Array([value ? 1 : 0])
    }

    if (typeof type == 'string' && type.match(/\(.*\)/)) {
        return encode(value, type.substr(1, type.length - 2).split(','))
    }
    if (type == 'SwitchStore') {
        return new Uint8Array(value.map(v => v ? 1 : 0))
    }
    if (type.trim() == 'OrderPair' && typeof value == 'object') {
        return new Uint8Array([
            ...encode(value.first.length, 'Compact<u32>'),
            ...(typeof value.first == 'string' ? stringToBytes(value.first) : value.first),
            ...encode(value.second.length, 'Compact<u32>'),
            ...(typeof value.second == 'string' ? stringToBytes(value.second) : value.second)
        ])
    }

    if (type.trim() == 'OrderType' || type.trim() == 'Side') {
        if (typeof value == 'number') {
            return toLE(value, 1)
        } else {
            return toLE(value._type, 1)
        }
    }
    if (type.trim() == 'ReservedType') {
        return toLE(value.reservedtype, 1)
    }
    // Maybe it's pre-encoded?
    if (typeof value == 'object' && value instanceof Uint8Array) {
        switch (type) {
            case 'Call':
            case 'Proposal':
                break
            default:
                console.warn(`Value passed apparently pre-encoded without whitelisting ${type}`)
        }
        return value
    }

    throw `Value cannot be encoded as type: ${value}, ${type}`
}

module.exports = {
    decode,
    encode,
    addCodecTransform
}
