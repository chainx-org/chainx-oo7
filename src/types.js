const {
  BigNumber
} = require('bignumber.js');
const Address = require('btc-address');
const binConv = require('binstring');

function toBtcAddress(hash160, network = null, addresstype = null) {
  var n = network ? network : 'testnet'; //mainnet
  var t = addresstype?addresstype:'pubkeyhash';
  var address= new Address(
    binConv(hash160, {
      in: 'hex',
      out: 'bytes',
    }),
    t,
    n
  );
  return address.toString();
}

function toLE(val, bytes) {
  let r = new VecU8(bytes);
  for (var o = 0; val > 0; ++o) {
    r[o] = val % 256;
    val /= 256;
  }
  return r;
}

function stringToBytes(s) {
  var data = new VecU8(s.length);
  for (var i = 0; i < s.length; i++) {
    data[i] = s.charCodeAt(i);
  }
  return data;
}

function bytesToHex(uint8arr) {
  if (!uint8arr) {
    return '';
  }
  var hexStr = '';
  for (var i = 0; i < uint8arr.length; i++) {
    var hex = (uint8arr[i] & 0xff).toString(16);
    hex = hex.length === 1 ? '0' + hex : hex;
    hexStr += hex;
  }

  return hexStr.toLowerCase();
}

function bytesToRIHex(uint8arr) {
  if (!uint8arr) {
    return '';
  }
  var hexStr = '';
  for (var i = 0; i < uint8arr.length; i++) {
    var hex = (uint8arr[i] & 0xff).toString(16);
    hex = hex.length === 1 ? '0' + hex : hex;
    hexStr = hex + hexStr;
  }

  return hexStr.toLowerCase();
}

class VecU8 extends Uint8Array {
  toJSON() {
    return {
      _type: 'VecU8',
      data: Array.from(this),
      hex: this.toHex()
    }
  }
  toPrimitive() {
    return Buffer.from(this).toString('utf8');
  }
  toString() {
    return Buffer.from(this).toString('utf8');
  }
  toStringBuffer() {
    return Buffer.from(Buffer.from(this).toString('utf8'), 'hex');
  }
  toHex() {
    return Buffer.from(this).toString('hex');
  }
}

class AccountId extends Uint8Array {
  toJSON() {
    return {
      _type: 'AccountId',
      data: Array.from(this),
      hex: this.toHex()
    }
  }
  compare(other) {
    return this.length === other.length && this.every((v, i) => other[i] === v)
  }
  memberOf(set) {
    return set.find(item => this.compare(item)) !== undefined
  }
  toHex() {
    return bytesToHex(Array.from(this));
  }
  toString() {
    return bytesToHex(Array.from(this));
  }
  toPrimitive() {
    return this.toHex();
  }
}

class Hash extends Uint8Array {
  toJSON() {
    return {
      _type: 'Hash',
      data: Array.from(this),
      hex: this.toHex()
    }
  }
  toRightHex() {
    return bytesToRIHex(this);
  }
  toHex() {
    return bytesToHex(this);
  }
}

class Signature extends Uint8Array {
  toJSON() {
    return {
      _type: "Signature",
      data: Array.from(this)
    }
  }
  toString() {
    return bytesToHex(this);
  }
}

class VoteThreshold extends String {
  toJSON() {
    return {
      _type: 'VoteThreshold',
      data: this + ''
    }
  }
}

class BlockNumber extends Number {
  toJSON() {
    return {
      _type: 'BlockNumber',
      data: this + 0
    }
  }
  toNumber() {
    return this.valueOf();
  }

  toPrimitive() {
    return this.toString(10);
  }
}

class AccountIndex extends Number {
  toJSON() {
    return {
      _type: 'AccountIndex',
      data: this + 0
    }
  }
}

class Tuple extends Array {
  toJSON() {
    return {
      _type: 'Tuple',
      data: Array.from(this)
    }
  }
}

class SlashPreference extends Number {
  toJSON() {
    return {
      _type: 'SlashPreference',
      data: this + 0
    }
  }
}

class Perbill extends Number {
  toJSON() {
    return {
      _type: 'Perbill',
      data: this + 0
    }
  }
}

class Permill extends Number {
  toJSON() {
    return {
      _type: 'Permill',
      data: this + 0
    }
  }
}

class Moment extends Date {
  constructor(seconds) {
    super(seconds * 1000)
    this.number = seconds
  }
  toJSON() {
    return {
      _type: 'Moment',
      data: this.number
    }
  }
}

class Balance extends Number {
  toJSON() {
    return {
      _type: 'Balance',
      data: this + 0
    }
  }
  add(b) {
    return new Balance(this + b)
  }
  sub(b) {
    return new Balance(this - b)
  }
  toPrimitive() {
    return this.toString(10);
  }
}
class Amount extends Balance {}
class Price extends Balance {}
class TokenBalance extends Balance {}
class TransactionEra {
  constructor(period, phase) {
    if (typeof period === 'number' && typeof phase === 'number') {
      this.period = 2 << Math.min(15, Math.max(1, Math.ceil(Math.log2(period)) - 1))
      this.phase = phase % this.period
    }
  }
  toString() {
    return {
      period: this.period,
      phase: this.phase
    };
  }
  encode() {
    if (typeof this.period === 'number' && typeof this.phase === 'number') {
      let l = Math.min(15, Math.max(1, Math.ceil(Math.log2(this.period)) - 1))
      let factor = Math.max(1, this.period >> 12)
      let res = toLE((Math.floor(this.phase / factor) << 4) + l, 2)
      return res
    } else {
      return new Uint8Array([0])
    }
  }
}


class BtcBestHeader {
  constructor(number, hash) {
    if (number instanceof BlockNumber && hash instanceof Hash) {
      this.number = number;
      this.hash = hash;
    }
  }
  toJSON() {
    return {
      _type: 'BtcBestHeader',
      data: {
        number: this.number,
        hash: this.hash,
      },
    };
  }
}

class BtcBlockHeader {
  constructor(version, parent, merkle, time, bits, nonce) {
    this.version = version;
    this.previous_header_hash = parent;
    this.merkle_root_hash = merkle;
    this.time = time;
    this.bits = bits;
    this.nonce = nonce;
  }
  toJSON() {
    return {
      _type: 'BtcBlockHeader',
      data: {
        version: this.version,
        previous_header_hash: this.previous_header_hash,
        merkle_root_hash: this.merkle_root_hash,
        merkle_root_hash: this.merkle_root_hash,
        time: this.time,
        bits: this.bits,
        nonce: this.nonce,
      },
    };
  }
}

class BtcAddress {
  constructor(kind, network, hash) {
    this.kind = kind == 0 ? 'pubkeyhash' : 'scripthash';
    this.network = network == 0 ? 'mainnet' : 'testnet';
    this.hash = hash;
  }
  toString(){
    let addr=toBtcAddress(this.hash.toHex(), this.network,this.kind)
    return {
      kind: this.kind,
      network: this.network,
      hash: this.hash,
      address:addr
    }
  }
  toJSON() {
    return {
      _type: 'BtcAddress',
      data: {
        kind: this.kind,
        network: this.network,
        hash: this.hash
      },
    };
  }
}

class BtcUTXO {
  constructor(txid, index, balance, is_spent) {
    this.txid = txid;
    this.index = index;
    this.balance = balance;
    this.is_spent = is_spent;
  }
  toJSON() {
    return {
      _type: 'BtcUTXO',
      data: {
        txid: this.txid.toHex(),
        index: this.index,
        balance: this.balance,
        is_spend: this.is_spent,
      },
    };
  }
}

class TxType {
  constructor(txtype) {
    this.txtype = txtype;
  }
  toString() {
    return this.toName();
  }
  
  toName() {
    if (0 == this.txtype) {
      return 'Withdraw';
    } else if (1 == this.txtype) {
      return 'Deposit';
    } else if (2 == this.txtype) {
      return 'HotAndCold';
    } else if (3 == this.txtype) {
      return 'TrusteeTransition';
    }else if (4 == this.txtype) {
      return 'Lock';
    }else if (5 == this.txtype) {
      return 'Unlock';
    }

    return 'Irrelevance';
  }
  toJSON() {
    return {
      _type: 'TxType',
      data: this.txtype,
      name: this.toName(),
    };
  }
}

class ReservedType {
  constructor(reservedtype) {
    this.reservedtype = reservedtype;
  }
  toString() {
    if (0 == this.reservedtype) {
      return 'Others';
    } else if (1 == this.reservedtype) {
      return 'Funds';
    } else if (2 == this.reservedtype) {
      return 'Exchange';
    }

    return 'NoDefind';
  }
}


class OrderType {
  constructor(_type) {
    switch (_type) {
      case 'Limit':
      case 0:
        this._type = 0;
        this.__type = 'Limit';
        break;
      case 'Market':
      case 1:
        this._type = 1;
        this.__type = 'Market';
        break;
      default:
        break;
    }
  }

  toString() {
    return this.__type;
  }
}

class OrderDirection {
  constructor(_type) {
    switch (_type) {
      case 'Buy':
      case 0:
        this._type = 0;
        this.__type = 'Buy';
        break;
      case 'Sell':
      case 1:
        this._type = 1;
        this.__type = 'Sell';
        break;
      default:
        break;
    }
  }

  toString() {
    return this.__type;
  }
}

class RecordAction {
  constructor(_action) {
    switch (_action[0]) {
      case 0:
        {
          switch (_action[1]) {
            case 0:
              {
                this.action = 'Deposit_Invalid';
                break;
              }
            case 1:
              {
                this.action = 'Deposit_Success';
                break;
              }
            case 2:
              {
                this.action = 'Deposit_Failed';
                break;
              }
            default:
              break;
          }
          break;
        }
      case 1:
        {
          switch (_action[1]) {
            case 0:
              {
                this.action = 'Withdrawal_Invalid';
                break;
              }
            case 1:
              {
                this.action = 'Withdrawal_Locking';
                break;
              }
            case 2:
              {
                this.action = 'Withdrawal_Success';
                break;
              }
            case 3:
              {
                this.action = 'Withdrawal_Failed';
                break;
              }
            default:
              break;
          }
          break;
        }
      default:
        break;
    }
  }
  toString() {
    return this.action;
  }
}

class ApplicationState{
  constructor(status) {
    switch (status) {
      case 0:
        this.status = 'Applying';
        break;
      case 1:
        this.status = 'Processing';
        break;
      case 2:
        this.status = 'NormalFinish';
        break;
      case 3:
        this.status = 'RootFinish';
        break;
      case 4:
        this.status = 'NormalCancel';
        break;
      case 5:
        this.status = 'RootCancel';
        break;
      default:
        this.status = 'Unknown';
        break;
    }
  }
  toString() {
    return this.status;
  }
}
class OrderStatus {
  constructor(status) {
    switch (status) {
      case 0:
        this.status = 'ZeroFill';
        break;
      case 1:
        this.status = 'ParitialFill';
        break;
      case 2:
        this.status = 'Filled';
        break;
      case 3:
        this.status = 'ParitialFillAndCanceled';
        break;
      case 4:
        this.status = 'Canceled';
        break;
      default:
        this.status = 'NotDefined';
        break;
    }
  }
  toString() {
    return this.status;
  }
}

class TokenSymbol extends VecU8 {}
class Channel extends VecU8 {}

function reviver(key, bland) {
  if (typeof bland == 'object' && bland) {
    switch (bland._type) {
      case 'VecU8':
        return new VecU8(bland.data);
      case 'AccountId':
        return new AccountId(bland.data);
      case 'Hash':
        return new Hash(bland.data);
      case 'Signature':
        return new Signature(bland.data);
      case 'VoteThreshold':
        return new VoteThreshold(bland.data);
      case 'SlashPreference':
        return new SlashPreference(bland.data);
      case 'Perbill':
        return new Perbill(bland.data);
      case 'Permill':
        return new Permill(bland.data);
      case 'Moment':
        return new Moment(bland.data);
      case 'Tuple':
        return new Tuple(bland.data);
      case 'Balance':
        return new Balance(bland.data);
      case 'BlockNumber':
        return new BlockNumber(bland.data);
      case 'AccountIndex':
        return new AccountIndex(bland.data);
    }
  }
  return bland;
}

class Struct extends Map {
  toJSON() {
    const json = {};
    for (const [key, value] of this.entries()) {
      if (typeof value !== 'object' || !value) {
        json[key] = value;
      } else if (typeof value.toPrimitive === 'function') {
        json[key] = value.toPrimitive();
      } else if (typeof value.toJSON === 'function') {
        json[key] = value.toJSON();
      }
    }
    return json;
  }
}

class IntentionProfsT extends Struct {}

class NominatorProfsT extends Struct {}

class NominationRecordT extends Struct {}

class MultiNodeIndexT extends Struct {}

class MatchNodeT extends Struct {}
class Bid extends Struct {}
class BidDetailT extends Struct {}
class FinancialRecord extends Struct {}
class Nominations extends Struct {}

class CandidateTx extends Struct {}

class BTCTxLogNodeIndex extends Struct {}
class BTCTxLog extends Struct {}

class StakingStats extends Struct {}

class OrderPairDetail extends Struct {}

class CertProfs extends Struct {}

class SessionKey extends Hash {}

class HodlingRecord extends Struct {}
class VirtualIntentionProfs extends Struct {}

class BtcTransactionInput extends Struct {}
class BtcTransactionOutput extends Struct {}
class OutPoint extends Struct {}
class BtcTranscation extends Struct {}

class UncheckedMortalExtrinsic extends Struct {}

class OrderProperty extends Struct {}
class CurrencyPair extends Struct {}
class TradingPair extends Struct {}
class OrderDetails extends Struct {}
class HandicapT extends Struct {}
class TrusteeEntity extends Struct {}

class SwitchStore extends Struct {}
class FillT extends Struct {}
class EcdsaSignature extends Struct {}

class BitcoinTrusteeSessionInfo extends Struct {}
class BitcoinTrusteeIntentionProps extends Struct {}

class AssetType {
  constructor(type) {
    switch (type) {
      case 0:
        this.type = 'Free';
        break;
      case 1:
        this.type = 'ReservedStaking';
        break;
      case 2:
        this.type = 'ReservedWithdrawal';
        break;
      case 3:
        this.type = 'ReservedDexSpot';
        break;
      case 4:
        this.type = 'ReservedDexFuture';
        break;
      default:
        this.type = 'NotDefined';
        break;
    }
  }
  toString() {
    return this.type;
  }
}
module.exports = {
  VecU8,
  AccountId,
  Hash,
  Signature,
  VoteThreshold,
  SlashPreference,
  Moment,
  Balance,
  BlockNumber,
  AccountIndex,
  Tuple,
  TransactionEra,
  Perbill,
  Permill,
  reviver,
  BtcBestHeader,
  BtcBlockHeader,
  BtcAddress,
  TxType,
  BtcTranscation,
  BtcUTXO,
  OrderPairDetail,
  OrderType,
  Amount,
  Price,
  TokenSymbol,
  TokenBalance,
  OrderDetails,
  OrderStatus,
  FillT,
  IntentionProfsT,
  NominatorProfsT,
  NominationRecordT,
  MultiNodeIndexT,
  MatchNodeT,
  Bid,
  BidDetailT,
  Channel,
  FinancialRecord,
  Nominations,
  CandidateTx,
  BTCTxLogNodeIndex,
  BTCTxLog,
  ReservedType,
  StakingStats,
  CertProfs,
  RecordAction,
  SessionKey,
  HodlingRecord,
  VirtualIntentionProfs,
  BtcTransactionInput,
  BtcTransactionOutput,
  OutPoint,
  UncheckedMortalExtrinsic,
  AssetType,
  OrderDirection,
  HandicapT,
  EcdsaSignature,
  OrderProperty,
  CurrencyPair,
  TradingPair,
  TrusteeEntity,
  SwitchStore,
  BitcoinTrusteeSessionInfo,
  BitcoinTrusteeIntentionProps,
  ApplicationState
}