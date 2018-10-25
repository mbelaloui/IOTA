const Mam = require('mam.client');
const WebSocketClient = require('websocket').w3cwebsocket;
const pify = require('pify');

class Messaging {

  constructor(iota, seed, set) {
    console.debug('building Messaging object');
    this.iota     = iota;
    this.seed     = seed;
    this.set      = set;
    this.masters  = [];
    this.slaves   = [];
    this.received = [];
    this.channels = {
      private:    {},
      restricted: {},
      public:     {}
    };
  }

  async init() { try {
    this.dataID = { index: 0, mode: 'private', name: 'data' };
    this.dataID.id = await this._initChannel(this.dataID);
    this.data = await this.loadChannel(this.dataID);
    this._initChannels();
    this._initWS();

    return this.channels;
  } catch (e) { console.error(e) } }

  /*
  async fetchChannels() {
    try {
      console.debug('data channel', this.data);

      const channelIDs = this._getChannels();
      await Promise.all(channelIDs.map(async function (channelID) {
        try {
          console.debug(`loading ${channelID.mode} channel ${channelID.name}`);
          const channel = await this._initChannel(channelID);
        } catch (e) { console.error(e) }
      }.bind(this)));

      // this._getNextRoots();
      return this.channels;
    } catch (e) { console.error(e) }
  }
  */

  async createChannel(mode, sidekey) { try {
    const name  = prompt('enter a name for this channel');
    const index = this._generateID(mode);
    console.debug(`creating ${mode} channel ${name} (${index})`);
    const id = await this._initChannel({ index, mode, sidekey, name });
    this._addData({ type: 'channel', mode, sidekey, index, name });
    return id;
  } catch (e) { console.error(e) } }

  async send(packet, value, channelID) { try {
    console.debug(
      `sending message in ${channelID.mode} channel ${channelID.name}
      with ${value} IOTA`,
      packet
    );
    console.time('mam-create-message');
    packet.timestamp = Date.now();
    const data = this.iota.utils.toTrytes(JSON.stringify(packet));
    const message = Mam.create(
      this.channels[channelID.mode][channelID.id].state,
      data
    );
    console.timeEnd('mam-create-message');

    console.time('mam-attaching');
    this.channels[channelID.mode][channelID.id].state = message.state;
    await Mam.attach(message.payload, message.address);
    console.timeEnd('mam-attaching');

    if (this._getChannel(channelID).messages)
      this._storeMessage(channelID, packet);
    else
      console.debug('not storing message as channels was not loaded', packet);
    return packet;
  } catch (e) { console.error(e) } }

  async loadChannel(channelID) { try {
    console.debug(
      `loading ${channelID.mode} channel ${channelID.name} (${channelID.id})`
    );
    let channel = this._getChannel(channelID);

    console.time(`loaded-${channelID.mode}-${channelID.id}`);
    this.channels[channelID.mode][channelID.id] = Object.assign(
      { }, channel, await Mam.fetch(
        channel.root,
        channelID.mode,
        channelID.sidekey
      )
    );

    // TODO broken logic ?
    channel = this._getChannel(channelID);

    channel.messages = channel.messages.map(
      message => {
        message = this._extractMessage(message);
        if (message.type === 'join') {
          const id = this.getChecksum(message.root);
          if (this.masters.includes(id)) return ;
          const slaveID = {
            mode: channelID.mode,
            name: channelID.name,
            root: message.root,
            id
          };
          this._watchChannel(channelID, slaveID);
          this._initChannel(slaveID).then(() => this.loadChannel(slaveID));
        }
        return message;
      }
    ).filter(x => x);
    // set message sending index to current thread length
    channel.state.channel.start = channel.messages.length;
    channel.loaded = true;
    console.timeEnd(`loaded-${channelID.mode}-${channelID.id}`);

    return channel;
  } catch (e) { console.error(e) } }

  async join(mode, root, sidekey) { try {
    // TODO check address
    console.debug(`subscribing to ${mode} channel`, root);

    const sendID = { mode, sidekey };
    sendID.id = await this.createChannel(sendID.mode, sendID.sidekey);

    const receiveID = { mode, root, sidekey };
    receiveID.id = await this._initChannel(receiveID);

    this._watchChannel(sendID, receiveID);
    await this.send({ type: 'join', root: receiveID.root }, 0, sendID);

    const send = this._getChannel(sendID);
    prompt('give this root to the invitation sender', send.root);

    return sendID;
  } catch(e) { console.error(e) } }

  async _watchChannel(sendID, receiveID) { try {
    if (this.slaves.find(id => id.id === receiveID.id)) return ;
    this.slaves.push(receiveID);
    this.channels[sendID.mode][sendID.id].watching.push(
      this.getChecksum(receiveID.root)
    );
  } catch(e) { console.error(e) } }

  async invite(channelID, root) { try {
    console.debug(
      `inviting user to ${channelID.mode} channel ${channelID.name}`,
      root
    );
    // TODO check address
    const slaveID = { root, mode: channelID.mode };
    slaveID.id = await this._initChannel(
      { mode: channelID.mode, name: channelID.name, root }
    );
    this._watchChannel(channelID, slaveID);
    await this.send({ type: 'join', root: slaveID.root }, 0, channelID);
  } catch(e) { console.error(e) } }

  getChecksum(address) {
    const checkedAddress = this.iota.utils.addChecksum(address)
    return checkedAddress.substr(checkedAddress.length - 9);
  }

  /*
  _getThread(id, mode) {
    return this.channels[mode][id];
  }
  */

  /*
  _getNextRoots() {
    const nextRoots = { private: [], restricted: [], public: [] };
    const modes = Object.keys(nextRoots);
    modes.map(mode => {
      const channels = Object.keys(this.channels[mode]);
      channels.map(channel => {
        const messages = this.channels[mode][channel].messages;
        nextRoots[mode].push(messages[messages.length - 1].nextRoot);
      });
    });
    console.log(nextRoots);
  }
  */

  /*
  ** _initChannel
  ** channelID
  **   mode, name, [index], [root]
  */
  async _initChannel(channelID) { try {
    console.log(`initializing ${channelID.mode} channel ${channelID.name}`);
    let channel = { name: channelID.name };

    let root = true;
    if (!channelID.address && channelID.index !== undefined) {
      channelID.root = await this._deriveAddress(this.seed, channelID.index);
      root = false;
    }

    channel.state = Mam.init(this.iota, channelID.root);
    if (channelID.mode !== 'public')
      channel.state = Mam.changeMode(
        channel.state,
        channelID.mode,
        channelID.sidekey
      );

    if (!root) {
      channel.root = Mam.getRoot(channel.state);
      this.masters.push(this.getChecksum(channel.root));
    } else {
      channel.root = channelID.root;
    }

    channel.watching = [];
    channel.received = [];
    channel.loaded = false;
    this._storeChannel(channelID, channel);
    console.debug('stored channel', channel);

    return this.getChecksum(channel.root);
  } catch (e) { console.error(e) } }

  _getChannels() {
    return this.data.messages.filter(
      message => message.type === 'channel'
    );
  }

  _initChannels() {
    const channelIDs = this._getChannels();
    channelIDs.map(channelID => this._initChannel(channelID));
  }

  _generateID(mode) {
    const max = 999999;
    let index;
    do { index = Math.floor(Math.random() * (max - 1)) }
    while (this.channels[mode][index]);
    return index;
  }

  async _addData(data) { try {
    await this.send(data, 0, this.dataID);
  } catch (e) { console.error(e) } }

  _deriveAddress(seed, index) { return new Promise(function (resolve, reject) {
    console.time(`iota-newaddress-${index}`);
    this.iota.api.getNewAddress(seed, { index }, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
      console.timeEnd(`iota-newaddress-${index}`, derived);
    });
  }.bind(this)); }

  _extractMessage(trytes) {
    const message = JSON.parse(this.iota.utils.fromTrytes(trytes));
    return message;
  }

  _storeChannel(channelID, channel) {
    const id = this.getChecksum(channel.root);
    this.set(this.channels[channelID.mode], id, channel);
    console.debug(`stored ${channelID.mode} channel ${channelID.name}`);
  }

  _storeMessage(channelID, message) {
    console.debug(`storing message`, channelID, message);
    this.channels[channelID.mode][channelID.id].messages.push(message);
  }

  _getChannel(channelID) {
    console.debug('getting channel', channelID);
    return this.channels[channelID.mode][channelID.id];
  }

  async getMessageFromHashes(slave) { try {
    const messagesGen = await this.txHashesToMessages(slave.received)
    slave.received = [];
    for (let message of messagesGen) {
      // Unmask the message
      const ret = Mam.decode(
        // message, sidekey, nextRoot
        message, null, slave.nextRoot
      );
      console.log(ret);
      slave.messages.push(JSON.parse(this.iota.utils.fromTrytes(ret.payload)));
      slave.nextRoot = ret.next_root;
    }
  } catch (e) { console.error(e) } }

  async txHashesToMessages(hashes) { try {
    const bundles = {}

    const processTx = txo => {
      const bundle = txo.bundle
      const msg = txo.signatureMessageFragment
      const idx = txo.currentIndex
      const maxIdx = txo.lastIndex

      if (bundle in bundles) {
        bundles[bundle].push([idx, msg]);
      } else {
        bundles[bundle] = [ [idx, msg] ];
      }

      if (bundles[bundle].length == maxIdx + 1) {
        let l = bundles[bundle]
        delete bundles[bundle]
        return l
          .sort((a, b) => b[0] < a[0])
          .reduce((acc, n) => acc + n[1], '')
      }
    }

    const objs = await pify(
      this.iota.api.getTransactionsObjects.bind(this.iota.api)
    )(hashes);
    return objs
      .map(result => processTx(result))
      .filter(item => item !== undefined)
  } catch (e) { console.error(e) } }

  _accumulateMessages(message, slave) {
    slave.received.push(message.signatureMessageFragment);
    if (message.lastIndex == message.currentIndex) {
      this.getMessageFromHashes(slave);
    }
  }

  _initWS() {
    // Initiate connection to ws proxy for zmq.
    this.wsClient = new WebSocketClient('ws://localhost:1337', 'echo-protocol');
    this.wsClient.onerror = () => console.error('Connection Error');
    this.wsClient.onopen  = () => console.debug('WebSocket Client Connected');
    this.wsClient.onclose = () => console.debug('echo-protocol Client Closed');

    // Function handling zmq response via ws proxy.
    this.wsClient.onmessage = async (e) => { try {
      if (typeof e.data === 'string') {
        const payload = e.data.split(',');

        if (payload[0] === 'tx') {
          const tx = {
            signatureMessageFragment: payload[1],
            address:                  payload[2],
            value:                    payload[3],
            obsoleteTag:              payload[4],
            timestamp:                payload[5],
            currentIndex:             payload[6],
            lastIndex:                payload[7],
            bundle:                   payload[8],
            branchTransaction:        payload[9],
            trunkTransaction:         payload[10],
            attachmentTimestamp:      payload[11],
            attachmentTag:            payload[12],
            // attachmentTimestampLowerBound
            // attachmentTimestampUpperBound
            // nonce
          };
          this.slaves.map(slaveID => {
            const slave = this.channels[slaveID.mode][slaveID.id];
            if (slave.nextRoot === tx.address) {
              this._accumulateMessages(tx, slave);
            }
          });
        }

        else if (payload[0] === 'sn') {
          // console.log(payload);
          // const hash = payload[2];
          // const tx = await this._getTransaction(hash);
          // console.log(tx);
          // console.log(this.iota.utils.fromTrytes(tx[0]));
        }
      }
    } catch(e) { console.error(e) } };
  }

  /*
  _getTransaction(hash) { return new Promise((resolve, reject) => {
    this.iota.api.getTrytes([ hash ], (error, data) => {
      if (error) reject(error);
      resolve(data);
    })
  })}
  */

}

module.exports = Messaging;
