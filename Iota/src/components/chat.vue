<template>
  <div id="chat">

    <div id="chat-nav">
      <div v-if="store.current">
        {{ store.current.mode }} channel
        {{ store.channels[store.current.mode][store.current.id].name }}
        <button
          v-on:click="invite(store.current.mode)"
          v-if="store.current.mode !== 'private'">
          invite
        </button>
      </div>
    </div>

    <div v-if="store.current" id="message-view">
      <div v-for="message in compMessages">

        <div class="message-block"
          v-if="message && message.type ==='message'">
          <div class="sender">
            {{ message.sender }} <span class="date"></span>
          </div>
          <div class="message" v-if="message.type === 'message'">
            {{ message.text }}
          </div>
        </div>

        <div class="join-message" v-if="message.type === 'join'">
          {{ checksum(message.root) }} joined
        </div>

        <div class="message-block" v-if="message.type === 'channel'">
          - saved {{ message.mode }} channel "{{ message.name }}"
            ({{ message.index || message.address }})
            {{ message.sidekey ? `and pass "${message.sidekey}"` : '' }}
        </div>
      </div>
    </div>

    <div v-else>
      select a conversation
    </div>

  </div>
</template>

<script>
import Vue from "vue";
export default Vue.extend({
  props: ["store"],
  data: function() {
    return {
      messages: []
    };
  },
  methods: {
    invite: async function(mode) {
      try {
        const id = this.store.current.id;
        prompt(
          `To invite people to this ${mode} channel, first share this root:`,
          this.store.channels[mode][id].root
        );
        const root = prompt(`now paste the participant's root:`);
        const participant = this.store.messaging.getChecksum(root);
        this.store.status = `inviting ${participant} to ${id}...`;
        await this.store.messaging.invite(this.store.current, root);
        this.store.status = "OK";
      } catch (e) {
        console.error(e);
      }
    },

    checksum: function(root) {
      return this.store.messaging.getChecksum(root);
    }
  },
  computed: {
    compMessages: function() {
      const master = this.store.channels[this.store.current.mode][
        this.store.current.id
      ];
      const slaves = this.store.channels[this.store.current.mode][
        this.store.current.id
      ].watching;
      let messages = this.store.channels[this.store.current.mode][
        this.store.current.id
      ].messages;

      if (messages) {
        messages.forEach(message => {
          message.sender = this.store.current.id;
        });
        if (slaves) {
          slaves.forEach(slave => {
            if (!!this.store.channels[this.store.current.mode][slave] &&
              !!this.store.channels[this.store.current.mode][slave].messages) {
              this.store.channels[this.store.current.mode][
                slave
              ].messages.forEach(message => {
                message.sender = slave;
              });
              messages = messages.concat(
                this.store.channels[this.store.current.mode][slave].messages
              );
            }
          });
        }
        messages.sort((a, b) => {
          return a.timestamp - b.timestamp;
        });
      }
      return messages;
    }
  }
});
</script>

<style lang="scss">
#chat {
  background-color: #c8c8c8;
  position: absolute;
  top: 100px;
  right: 0;
  bottom: 70px;
  left: 250px;
  padding: 70px 0px 0px 20px;

  #message-view {
    overflow-y: scroll;
    height: 100%;
  }

  .message-block {
    padding-bottom: 1rem;

    .sender {
      font-weight: bold;
      .date {
        font-weight: 300;
        color: #666;
      }
    }

    .message {
      padding-left: 1rem;
    }
  }

  .join-message {
    color: #22b1ab;
    padding-bottom: 1rem;
  }
}

#chat-nav {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 50px;
  background-color: #666;
}
</style>
