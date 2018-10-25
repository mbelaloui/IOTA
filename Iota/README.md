# IOTA-Messenger

IOTA-Messenger is an educational prototype for masked authenticated messaging on IOTA.

To run the webapp, simply do the following:

```
git clone https://github.com/io-studio/iota-messenger
cd iota-messenger
yarn
yarn start
```

## What is IOTA-Messenger

This prototype is used to demonstrate how to organize a distributed chatting platform on IOTA. The main component of it is the MAM library which allows us to create channels in the form of one-to-many (broadcasting). This app leverages these uni-directional channels to create multi-directional threads of channels. It also makes use of the different MAM modes: `private`, `restricted` and `public`.

### Private channels

Private channels are available only to your own seed. Only you can access these. That is why you cannot invite other accounts to create threads, and there are only private channels you can create.

Private channel index 0 is used to store data about the account, for instance which channels have been created at which index in which mode.

### Public channels/threads

Public one-to-many uni-directional channels are combined in threads that can be joined by anyone who has the root of the channel's merkle tree, to create public discussion rooms. Contents are not encrypted and can be publicly read on the tangle.

### Restricted channels/threads

A restricted channel and conversation threads created with it are accessed using the root of a restricted channel and the thread's password.

## Contributing

Forks & pull requests are most welcome, as I will continue to review them but not to develop this prototype much further. I think there is a good base in it, so feel free to enhance it how you like.

## Known issues

- decoding MAM messages received over ZMQ in restricted channels doesn't work
- joining a thread works up to 2 participants, it needs to be adjusted for more participants
- Value transfers are not implemented yet
