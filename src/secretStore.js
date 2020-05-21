const {Bond} = require('oo7');
const nacl = require('tweetnacl');
const {generateMnemonic, mnemonicToSeed} = require('bip39');
const {ss58Encode} = require('./ss58');
const {AccountId} = require('./types');
const {bytesToHex, hexToBytes, stringToSeed} = require('./utils');
//const { waitReady, isReady, keypairFromSeed, sign, verify, deriveKeypairHard, derivePublicSoft, deriveKeypairSoft } = require('@polkadot/wasm-schnorrkel');
//const wasmCrypto = require('@polkadot/wasm-crypto');

let cache = {}

function chainCodeFor(x) {
    let r = encode(x)
    if (r.length <= 32) {
        r = [...encode(x)]
        for (let i = r.length; i < 32; ++i) {
            r.push(0)
        }
        r = new Uint8Array(r)
    } else {
        r = blake2b(r)
    }
    return r
}

function deriveHardJunction(seed, cc) {
    return blake2b(encode(["Ed25519HDKD", seed, cc], ['String', '[u8]', '[u8]']), null, 32)
}

function edSeedFromUri(uri) {
    if (!cache[uri]) {
        if (uri.match(/^0x[0-9a-fA-F]{64}$/)) {
            cache[uri] = hexToBytes(uri)
        } else {
            let m = uri.match(/^([a-z]+( [a-z]+){11})?((\/\/?[^\/]*)*)(\/\/\/(.*))?$/)
            if (m) {
                let password = m[6] || ''
                let phrase = m[1] || DEV_PHRASE
                let seed = wasmCrypto.bip39ToMiniSecret(phrase, password)
//				let entropy = new Buffer(hexToBytes(mnemonicToEntropy(phrase)))
//				let salt = new Buffer(stringToBytes(`mnemonic${password}`))
//				let seed = pbkdf2Sync(entropy, salt, 2048, 64, 'sha512').slice(0, 32);
                let rest = m[3];
                while (rest != '') {
                    let m = rest.match(/^\/(\/?)([^\/]*)(\/.*)?$/)
                    if (m[1] == '/') {
                        // hard key -all good
                        seed = deriveHardJunction(seed, chainCodeFor(m[2]))
                    } else {
                        throw "Soft key"
                    }
                    rest = m[3] || ''
                }
                cache[uri] = seed
            } else {
                throw "Invalid secret URI"
            }
        }
    }
    return cache[uri]
}

function srKeypairToAccountId(pair) {
    return new AccountId(srKeypairToPublic(pair))
}

function srKeypairToPublic(pair) {
    return new Uint8Array(pair.slice(64, 96))
}

function srKeypairToSecret(pair) {
    return new Uint8Array(pair.slice(0, 64))
}

function srKeypairFromUri(uri) {
    if (!cache[uri]) {
        if (uri.match(/^0x[0-9a-fA-F]{64}$/)) {
            cache[uri] = keypairFromSeed(hexToBytes(uri))
        } else {
            let m = uri.match(/^([a-z]+( [a-z]+){11})?((\/\/?[^\/]*)*)(\/\/\/(.*))?$/)
            if (m) {
                let password = m[6] || ''
                let phrase = m[1] || DEV_PHRASE

                let seed = wasmCrypto.bip39ToMiniSecret(phrase, password)
                /*				let entropy = new Buffer(hexToBytes(mnemonicToEntropy(phrase)))
                                let salt = new Buffer(stringToBytes(`mnemonic${password}`))
                                let seed = pbkdf2Sync(entropy, salt, 2048, 64, 'sha512').slice(0, 32)*/
                let pair = keypairFromSeed(seed)

                let rest = m[3];
                while (rest != '') {
                    let m = rest.match(/^\/(\/?)([^\/]*)(\/.*)?$/)
                    let cc = chainCodeFor(m[2])
                    if (m[1] == '/') {
                        pair = deriveKeypairHard(pair, cc)
                    } else {
                        pair = deriveKeypairSoft(pair, cc)
                    }
                    rest = m[3] || ''
                }

                cache[uri] = pair
            } else {
                throw "Invalid secret URI"
            }
        }
    }
    return cache[uri]
}

/*
window.chainCodeFor = chainCodeFor
window.deriveHardJunction = deriveHardJunction
window.edSeedFromUri = edSeedFromUri
window.pbkdf2Sync = pbkdf2Sync
window.Buffer = Buffer
window.mnemonicToEntropy = mnemonicToEntropy
window.isReady = isReady
window.waitReady = waitReady
window.keypairFromSeed = keypairFromSeed
window.sign = sign
window.deriveKeypairHard = deriveKeypairHard
window.derivePublicSoft = derivePublicSoft
window.deriveKeypairSoft = deriveKeypairSoft
window.srKeypairFromUri = srKeypairFromUri
window.srKeypairToPublic = srKeypairToPublic
window.wasmCrypto = wasmCrypto
*/
const ED25519 = 'ed25519'
const SR25519 = 'sr25519'

function overrideType(uri, type) {
    let m = uri.match(/^((ed25519:)|(sr25519:))?(.*)$/)
    if (m) {
        switch (m[1]) {
            case 'ed25519:':
                type = ED25519
                break
            case 'sr25519:':
                type = SR25519
                break
            default:
        }
        uri = m[4];
    }
    return {uri, type}
}

let localStorage = process.browser ? window.localStorage : undefined;

function seedFromPhrase(phrase) {
    if (!cache[phrase]) {
        cache[phrase] = phrase.match(/^0x[0-9a-fA-F]{64}$/)
            ? hexToBytes(phrase)
            : new Uint8Array(mnemonicToSeed(phrase).slice(0, 32));
    }
    return cache[phrase];
}

class SecretStore extends Bond {
    constructor() {
        super();
        this._keys = [];
        this._load();
    }

    create() {
        return generateMnemonic();
    }


    //just for test
    submitFromSeed(seed_, name) {
        let seed = stringToSeed(seed_);
        let key = nacl.sign.keyPair.fromSeed(seed);
        let account = new AccountId(key.publicKey);

        this._keys.push({seed, name});
        this._sync();

        return account;
    }

    submit(phrase, name) {
        this._keys.push({phrase, name});
        this._sync();
        return this.accountFromPhrase(phrase);
    }

    accountFromPhrase(phrase) {
        return new AccountId(nacl.sign.keyPair.fromSeed(seedFromPhrase(phrase)).publicKey);
    }

    accounts() {
        return this._keys.map(k => k.account);
    }

    find(identifier) {
        if (this._keys.indexOf(identifier) !== -1) {
            return identifier;
        }
        if ((identifier instanceof Uint8Array && identifier.length == 32) || identifier instanceof AccountId) {
            identifier = ss58Encode(identifier);
        }
        return this._byAddress[identifier] ? this._byAddress[identifier] : this._byName[identifier];
    }

    sign(from, data) {
        let item = this.find(from);
        if (item) {
            console.info(`Signing data from ${item.name}`, bytesToHex(data));
            let sig = nacl.sign.detached(data, item.key.secretKey);
            console.info(`Signature is ${bytesToHex(sig)}`);
            if (!nacl.sign.detached.verify(data, sig, item.key.publicKey)) {
                console.warn(`Signature is INVALID!`);
                return null;
            }
            return sig;
        }
        return null;
    }

    signWithSecret(secretKey, data) {
        let item = nacl.sign.keyPair.fromSecretKey(secretKey);
        if (item) {
            let sig = nacl.sign.detached(data, item.secretKey);
            if (!nacl.sign.detached.verify(data, sig, item.publicKey)) {
                return null;
            }
            return sig;
        }
        return null;
    }

    forget(identifier) {
        let item = this.find(identifier);
        if (item) {
            console.info(`Forgetting key ${item.name} (${item.address}, ${item.phrase})`);
            this._keys = this._keys.filter(i => i !== item);
            this._sync();
        }
    }

    _load() {
        if (localStorage && localStorage.secretStore) {
            this._keys = JSON.parse(localStorage.secretStore).map(({seed, phrase, name}) => ({
                phrase,
                name,
                seed: hexToBytes(seed),
            }));
        } else if (localStorage && localStorage.secretStore2) {
            this._keys = JSON.parse(localStorage.secretStore2).map(({seed, name}) => ({phrase: seed, name}));
        } else {
            this._keys = [
                {
                    name: 'Default',
                    phrase: generateMnemonic(),
                },
            ];
        }
        this._sync();
    }

    _sync() {
        let byAddress = {};
        let byName = {};
        this._keys = this._keys.map(({seed, phrase, name, key}) => {
            seed = seed || seedFromPhrase(phrase);
            key = key || nacl.sign.keyPair.fromSeed(seed);
            let account = new AccountId(key.publicKey);
            let address = ss58Encode(account);
            let item = {seed, phrase, name, key, account, address};
            byAddress[address] = item;
            byName[name] = item;
            return item;
        });
        this._byAddress = byAddress;
        this._byName = byName;
        if (localStorage) {
            localStorage.secretStore = JSON.stringify(
                this._keys.map(k => ({seed: bytesToHex(k.seed), phrase: k.phrase, name: k.name}))
            );
        }
        this.trigger({keys: this._keys, byAddress: this._byAddress, byName: this._byName});
    }
}

let s_secretStore = null;

function secretStore() {
    if (s_secretStore === null) {
        s_secretStore = new SecretStore();
    }
    return s_secretStore;
}

module.exports = {secretStore, SecretStore};
