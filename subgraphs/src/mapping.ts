import { log, BigInt, store } from '@graphprotocol/graph-ts';
import { InstanceAddedToChannel, InstanceCreated, InstanceRemovedFromChannel, InstanceURIUpdated, Registry, Transfer as TransferEvent } from '../generated/Registry/Registry';
import { Channel, Instance, InstanceChannel, Owner, Transfer } from '../generated/schema';

export function handleTransfer(event: TransferEvent): void {
  log.info('Transfer detected. From: {} | To: {} | TokenID: {}', [
    event.params.from.toHexString(),
    event.params.to.toHexString(),
    event.params.id.toHexString(),
  ]);

  let previousOwner = Owner.load(event.params.from.toHexString());
  let newOwner = Owner.load(event.params.to.toHexString());
  let channel = Channel.load(event.params.id.toHexString());
  let transferId = event.transaction.hash
    .toHexString()
    .concat(':'.concat(event.transactionLogIndex.toHexString()));
  let transfer = Transfer.load(transferId);
  let registry = Registry.bind(event.address);

  if (previousOwner == null &&
    event.params.from.toHexString() != "0x0000000000000000000000000000000000000000") {
    previousOwner = new Owner(event.params.from.toHexString());
    previousOwner.balance = BigInt.fromI32(0);
  } else if (previousOwner) {
    let prevBalance = previousOwner.balance;
    if (prevBalance > BigInt.fromI32(0)) {
      previousOwner.balance = prevBalance.minus(BigInt.fromI32(1));
    }
  }

  if (newOwner == null && event.params.to.toHexString() != "0x0000000000000000000000000000000000000000") {
    newOwner = new Owner(event.params.to.toHexString());
    newOwner.balance = BigInt.fromI32(1);
  } else if (newOwner) {
    let prevBalance = newOwner.balance;
    newOwner.balance = prevBalance.plus(BigInt.fromI32(1));
  }

  if (channel == null) {
    channel = new Channel(event.params.id.toHexString());
    const channelName = registry.try_channelIdToChannelName(event.params.id);
    const uri = registry.try_tokenURI(event.params.id);
    if (!uri.reverted) {
      channel.uri = uri.value;
    } else {
      throw new Error("tokenURI reverted");
    }
    if (!channelName.reverted) {
      channel.name = channelName.value;
    } else {
      throw new Error("channelIdToChannelName reverted");
    }
  }

  channel.owner = event.params.to.toHexString();

  if (transfer == null) {
    transfer = new Transfer(transferId);
    transfer.channel = event.params.id.toHexString();
    transfer.from = event.params.from.toHexString();
    transfer.to = event.params.to.toHexString();
    transfer.timestamp = event.block.timestamp;
    transfer.block = event.block.number;
    transfer.transactionHash = event.transaction.hash.toHexString();
  }

  if (previousOwner) {
    previousOwner.save();
  }
  if (newOwner) {
    newOwner.save();
  }
  channel.save();
  transfer.save();
}

export function handleInstanceCreated(event: InstanceCreated): void {

  log.info('InstanceCreated detected. From: {} | InstanceId: {}', [
    event.params.creator.toHexString(),
    event.params.instanceId.toHexString(),
  ]);

  const instance = new Instance(event.params.instanceId.toHexString());

  instance.contractAddress = event.params.instance.value0.toHexString();
  instance.chainId = event.params.instance.value1;
  instance.uri = event.params.instance.value2;
  instance.creator = event.params.creator.toHexString();

  instance.save();
}

export function handleInstanceURIUpdated(event: InstanceURIUpdated): void {

  log.info('InstanceURIUpdated detected. InstanceId: {} | URI: {}', [
    event.params.instanceId.toHexString(),
    event.params.instanceURI.toString(),
  ]);

  const instance = Instance.load(event.params.instanceId.toHexString());
  if(!instance) {
    return
  }
  instance.uri = event.params.instanceURI;
  instance.save();
}

export function handleInstanceAddedToChannel(event: InstanceAddedToChannel): void {

  log.info('InstanceAddedToChannel detected. ChannelId: {} | InstanceId: {}', [
    event.params.channelId.toHexString(),
    event.params.instanceId.toHexString(),
  ]);

  const instance = Instance.load(event.params.instanceId.toHexString());

  if(!instance) {
    return;
  }

  const channel = Channel.load(event.params.channelId.toHexString());

  if(!channel) {
    return;
  }

  const instanceChannelId = event.params.instanceId
  .toHexString()
  .concat(':'.concat(event.params.channelId.toHexString())); 

  if(InstanceChannel.load(instanceChannelId)) {
    // skip duplicate
    return
  }

  const instanceChannel = new InstanceChannel(instanceChannelId);
  
  instanceChannel.instance = event.params.instanceId.toHexString();
  instanceChannel.channel = event.params.channelId.toHexString();
  instanceChannel.timestamp = event.block.timestamp;
  instanceChannel.block = event.block.number;
  instanceChannel.transactionHash = event.transaction.hash.toHexString();

  instanceChannel.save();
}


export function handleInstanceRemovedFromChannel(event: InstanceRemovedFromChannel): void {

  log.info('InstanceRemovedToChannel detected. ChannelId: {} | InstanceId: {}', [
    event.params.channelId.toHexString(),
    event.params.instanceId.toHexString(),
  ]);

  const instance = Instance.load(event.params.instanceId.toHexString());

  if(!instance) {
    return;
  }

  const channel = Channel.load(event.params.channelId.toHexString());

  if(!channel) {
    return;
  }

  const instanceChannelId = event.params.instanceId
  .toHexString()
  .concat(':'.concat(event.params.channelId.toHexString())); 

  if(!InstanceChannel.load(instanceChannelId)) {
    // can't delete connections that don't exist
    return
  }

  store.remove("InstanceChannel", instanceChannelId)
}