const { Bond } = require('oo7');
const { SubscriptionBond } = require('./subscriptionBond');
const { encode } = require('./codec');
const { secretStore } = require('./secretStore');
const { bytesToHex, toLE } = require('./utils');
const { TransactionEra, AccountIndex } = require('./types');
const { runtimeUp, runtime, chain } = require('./bonds');
const { ss58Decode } = require('./ss58');

class TransactionBond extends SubscriptionBond {
  constructor(data) {
    super('author_submitAndWatchExtrinsic', ['0x' + bytesToHex(data)], null, { sending: true });
  }
}

function composeTransaction(sender, call, index, era, checkpoint, senderAccount, secretKey,acc) {
  return new Promise((resolve, reject) => {
    if (typeof sender == 'string') {
      sender = ss58Decode(sender);
    }
    if (sender instanceof Uint8Array && sender.length == 32) {
      senderAccount = sender;
    } else if (!senderAccount) {
      reject(`Invalid senderAccount when sender is account index`);
    }
    
    let acceleration= (typeof acc != 'undefined' )?acc:1;
    let e = encode([index, call, era,checkpoint,acceleration], ['Compact<Index>', 'Call','TransactionEra', 'Hash','Compact<Acceleration>']);

    signature = secretKey ? secretStore().signWithSecret(secretKey, e) : secretStore().sign(senderAccount, e);

    let signedData = encode(
      encode({
        _type: 'Transaction',
        version: 0x81,
        sender,
        signature,
        index,
        era,
        acceleration,
        call,
      }),
      'Vec<u8>'
    );

    
    setTimeout(() => resolve(signedData), 1000);
  });
}

// tx = {
//   sender
//   call
//   longevity?
//   index?
// }
function post(tx, secretKey) {
  return Bond.all([tx, chain.height, runtimeUp])
    .map(([o, height, unused]) => {
      if (o instanceof Uint8Array) {
        // already assembled and signed
        return o
      }
      let { sender, call, index, longevity, acceleration,compact } = o;
      // defaults
      longevity = typeof longevity === 'undefined' ? 256 : longevity;
      compact = typeof compact === 'undefined' ? true : compact;
      acceleration=typeof acceleration === 'undefined' ? 1 : acceleration;

      let senderAccount =
        typeof sender == 'number' || sender instanceof AccountIndex ? runtime.balances.lookupIndex(sender) : sender;

      let era;
      let eraHash;
      if (longevity === true) {
        era = new TransactionEra();
        eraHash = chain.hash(0);
      } else {
        // use longevity with height to determine era and eraHash
        let l = Math.min(15, Math.max(1, Math.ceil(Math.log2(longevity)) - 1));
        let period = 2 << l;
        let factor = Math.max(1, period >> 12);
        let Q = (n, d) => Math.floor(n / d) * d;
        let eraNumber = Q(height, factor);
        let phase = eraNumber % period;
        era = new TransactionEra(period, phase);
        eraHash = chain.hash(eraNumber);
      }
      let oo={
        sender,
        call,
        era,
        eraHash,
        index: index || runtime.system.accountNonce(senderAccount),
        senderAccount,
        acceleration:acceleration
      };
      

      return oo;
    }, 2)
    .latched(false)
    .map(o => (o && o instanceof Uint8Array ? o :composeTransaction(o.sender, o.call, o.index, o.era, o.eraHash, o.senderAccount, secretKey,o.acceleration)))
    .map(composed => {
      return composed ? new TransactionBond(composed) : { signing: true };
    });
}

module.exports = { composeTransaction, post };
