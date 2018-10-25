<template>
  <div id="sidebar">

    <div id="channels">
      <h3>channels</h3>
      <div v-if="!store.channels || !store.messaging">
        No channels yet
      </div>
      <div v-else v-for="mode in modes">
        <div v-if="Object.keys(store.channels[mode]).length > 0">

          <div class="mode-header">
            <h4>{{ mode }}</h4>
            <div class="controls">
              <button v-on:click="createChannel(mode)">
                create
              </button>
              <button
                v-if="mode !== 'private'"
                v-on:click="joinChannel(mode)">
                join
              </button>
            </div>
          </div>

          <a href=# class="channel"
            v-for="(channel, id) in store.channels[mode]"
            v-on:click="selectChannel(mode, id)"
            v-if="!store.slaves.find(e => e.id === id)"
            >
            [ {{ id }} ] {{ channel.name }}
            <br>
            {{ channel.loaded ? `${channel.watching.length} joined` : 'click to load' }}

          </a>

        <!--
        <div v-if="modeHasChannels(mode)">
          <h4>{{ mode }}</h4>
          <div v-if="mode === 'private'">
            <a href=# class="channel" v-on:click="selectChannel('private', 0)">
              [0] {{store.channels[mode][0].name}}
            </a>
          </div>
          <div v-for="(message, index) in store.messaging.data.messages">
            <a
              href=# class="channel"
              v-if="message.type === 'channel' && message.mode === mode"
              v-on:click="selectChannel(mode, index)"
            >
              [ {{ index }} ] {{message.index}}
            </a>
          </div>
        -->
        </div>
      </div>
    </div>

    <div id="create-channel">
      <div v-if="store.channels && Object.keys(store.channels[mode]).length === 0"
        v-for="mode in modes">
        <button v-on:click="createChannel(mode)">
          create {{ mode }} channel
        </button>
        <button v-on:click="joinChannel(mode)">
          join {{ mode }} channel
        </button>
      </div>
      <button v-on:click="fetchAll()" disabled>
        fetch all channels
      </button>
      <br>
      <button v-on:click="test()" disabled>test</button>
    </div>

    <div id="status">
      {{ store.status }}
    </div>

  </div>
</template>

<script>
import Vue from 'vue';
export default Vue.extend({
  props: ['store'],
  data: function() { return {
    modes: ['private', 'restricted', 'public'],
    slaves: []
  } },
  methods: {
    selectChannel: async function(mode, id) {
      console.debug(`selected ${mode} channel ${id}`);
      const channelID = { mode, id, name: this.store.channels[mode][id].name };
      // if (!this.store.channels[mode][id].loaded)
        this.store.messaging.loadChannel(channelID);
      this.store.current = channelID;
    },
    createChannel: async function(mode) { try {
      let sidekey = null;
      if (mode === 'restricted')
        sidekey = prompt('Please insert a passphrase to restrict your channel');
      this.store.status = `creating ${mode} channel...`
      await this.store.messaging.createChannel(mode, sidekey);
      this.store.status = `OK`
    } catch (e) { console.error(e) } },

    joinChannel: async function(mode) { try {
      const root = prompt(`root of the ${mode} channel:`);
      const sidekey = mode === 'restricted' ? prompt('password:') : null;
      const id = this.store.messaging.getChecksum(root);
      this.store.status = `joining ${mode} channel ${id}...`;
      const joined = await this.store.messaging.join(mode, root, sidekey);
      this.selectChannel(joined.mode, joined.id);
      this.store.status = 'OK';
    } catch (e) { console.error(e) } },

    test: function() {
      console.log(this.store.channels.public);
      console.log(Object.keys(this.store.channels.public))
    },
    modeHasChannels: function(mode) {
      // TODO use store.channels
      let hasChannels = false;
      this.store.messaging.data.messages.forEach(message => {
        if (message.mode === mode && message.type === 'channel') {
          hasChannels = true;
        }
      });
      return hasChannels;
    }
  },
  mounted: function() {
  },
});
</script>

<style lang="scss">

#sidebar {
  background: linear-gradient(210deg,#22b1ab,#18817c);
  position: fixed;
  top: 100px;
  bottom: 0;
  left: 0;
  width: 210px;
  padding: 20px !important;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: stretch;
}

#sidebar #channels {
  flex-grow: 1;
}

#sidebar .channel {
  display: block;
  margin-bottom: 10px;
}

#sidebar .mode-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

#sideba

#sidebar #status {
  margin-top: 20px;
}

</style>
