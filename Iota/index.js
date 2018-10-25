import Vue from 'vue';
const IOTA = require('iota.lib.js');

import './assets/styles/main.scss';

import Messaging from './src/messaging.service.js'

import nav       from './src/components/nav.vue';
import chat      from './src/components/chat.vue';
import chatbox   from './src/components/chatbox.vue';
import sidebar   from './src/components/sidebar.vue';

const data = {
  store: {
    vue:          undefined,
    iota:         undefined,
    status:       'insert / generate seed',
    account: {
      seed:       undefined,
    },
    messaging:    undefined,
    channels:     undefined,
    current:      undefined,
    isSending:    false,
    reset:        undefined
  },
}

const app = new Vue({
  el: '#app',
  // data: function() { return data },
  data,
  components: {
    'im-nav':     nav,
    'im-sidebar': sidebar,
    'im-chat':    chat,
    'im-chatbox': chatbox,
  },
  created: async function() {
    console.debug('#app created');

    // hard copy for latter logging out
    this.store.reset = JSON.parse(JSON.stringify(data.store));
    this.store.vue = this;

    // TODO IOTA Service
    this.iota = await this.iotaInit();

    // TODO where to move this ?
    const seed = localStorage.getItem('seed');
    if (seed) {
      console.debug('got seed from previous session: ', seed);
      this.store.account.seed = seed;
    }

  },
  methods: {
    iotaInit: function() {
      return new Promise ((resolve, reject) => {

        console.time('iota-init');
        const iota = new IOTA({ provider: 'https://node.iota-tangle.io:14265' });
        iota.api.getNodeInfo((error, info) => {
          if (error) reject(error);
          else {
            console.debug(info);
            resolve(iota);
          }
          console.timeEnd('iota-init');
        });

      });
    },
    startMessaging: async function(seed) {
      console.time('messaging-init');

      const messaging = new Messaging(this.iota, seed, this.$set);
      this.store.messaging = messaging;
      this.store.channels  = messaging.channels;
      this.store.slaves    = messaging.slaves;

      this.store.status = "opening messaging account...";
      await messaging.init();

      this.store.status = "OK";
      console.timeEnd('messaging-init');
      return ;
    }
  },
  watch: {
    'store.account.seed': async function(seed, prev) { try {
      if (!!seed) { /* TODO check seed */
        console.debug('detected new seed');
        localStorage.setItem('seed', seed);
        await this.startMessaging(seed);
      }
    } catch (e) { console.error(e) } }
  }
});
