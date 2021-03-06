import { log, BigInt, store } from "@graphprotocol/graph-ts";
import {
  InstanceAddedToChannel,
  InstanceCreated,
  InstanceRemovedFromChannel,
  InstanceURIUpdated,
  NewChannelTokenURIGenerator,
  Registry,
  Transfer as TransferEvent
} from "../generated/Registry/Registry";
import { Channel, Instance, InstanceChannel, Owner, Transfer } from "../generated/schema";

export function handleTransfer(event: TransferEvent): void {
  log.info("Transfer detected. From: {} | To: {} | TokenID: {}", [
    event.params.from.toHexString(),
    event.params.to.toHexString(),
    event.params.id.toString()
  ]);

  let previousOwner = Owner.load(event.params.from.toHexString());
  let newOwner = Owner.load(event.params.to.toHexString());
  let channel = Channel.load(event.params.id.toString());
  let transferId = event.transaction.hash
    .toHexString()
    .concat(":".concat(event.transactionLogIndex.toHexString()));
  let transfer = Transfer.load(transferId);
  let registry = Registry.bind(event.address);

  if (
    previousOwner == null &&
    event.params.from.toHexString() != "0x0000000000000000000000000000000000000000"
  ) {
    previousOwner = new Owner(event.params.from.toHexString());
    previousOwner.balance = BigInt.fromI32(0);
  } else if (previousOwner) {
    let prevBalance = previousOwner.balance;
    if (prevBalance > BigInt.fromI32(0)) {
      previousOwner.balance = prevBalance.minus(BigInt.fromI32(1));
    }
  }

  if (
    newOwner == null &&
    event.params.to.toHexString() != "0x0000000000000000000000000000000000000000"
  ) {
    newOwner = new Owner(event.params.to.toHexString());
    newOwner.balance = BigInt.fromI32(1);
  } else if (newOwner) {
    let prevBalance = newOwner.balance;
    newOwner.balance = prevBalance.plus(BigInt.fromI32(1));
  }

  if (channel == null) {
    channel = new Channel(event.params.id.toString());
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
    transfer.channel = event.params.id.toString();
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
  log.info("InstanceCreated detected. From: {} | InstanceId: {}", [
    event.params.creator.toHexString(),
    event.params.instanceId.toString()
  ]);

  const instance = new Instance(event.params.instanceId.toString());

  instance.creator = event.params.instance.value0.toHexString();
  instance.contractAddress = event.params.instance.value1.toHexString();
  instance.chainId = event.params.instance.value2;
  instance.uri = event.params.instance.value3;

  instance.save();
}

export function handleInstanceURIUpdated(event: InstanceURIUpdated): void {
  log.info("InstanceURIUpdated detected. InstanceId: {} | URI: {}", [
    event.params.instanceId.toString(),
    event.params.instanceURI.toString()
  ]);

  const instance = Instance.load(event.params.instanceId.toString());
  if (!instance) {
    return;
  }
  instance.uri = event.params.instanceURI;
  instance.save();
}

export function handleInstanceAddedToChannel(event: InstanceAddedToChannel): void {
  log.info("InstanceAddedToChannel detected. ChannelId: {} | InstanceId: {}", [
    event.params.channelId.toString(),
    event.params.instanceId.toString()
  ]);

  const instance = Instance.load(event.params.instanceId.toString());

  if (!instance) {
    return;
  }

  const channel = Channel.load(event.params.channelId.toString());

  if (!channel) {
    return;
  }

  const instanceChannelId = event.params.instanceId
    .toString()
    .concat(":".concat(event.params.channelId.toString()));

  if (InstanceChannel.load(instanceChannelId)) {
    // skip duplicate
    return;
  }

  const instanceChannel = new InstanceChannel(instanceChannelId);

  instanceChannel.instance = event.params.instanceId.toString();
  instanceChannel.channel = event.params.channelId.toString();
  instanceChannel.timestamp = event.block.timestamp;
  instanceChannel.block = event.block.number;
  instanceChannel.transactionHash = event.transaction.hash.toHexString();

  instanceChannel.save();
}

export function handleInstanceRemovedFromChannel(event: InstanceRemovedFromChannel): void {
  log.info("InstanceRemovedToChannel detected. ChannelId: {} | InstanceId: {}", [
    event.params.channelId.toString(),
    event.params.instanceId.toString()
  ]);

  const instance = Instance.load(event.params.instanceId.toString());

  if (!instance) {
    return;
  }

  const channel = Channel.load(event.params.channelId.toString());

  if (!channel) {
    return;
  }

  const instanceChannelId = event.params.instanceId
    .toString()
    .concat(":".concat(event.params.channelId.toString()));

  if (!InstanceChannel.load(instanceChannelId)) {
    // can't delete connections that don't exist
    return;
  }

  store.remove("InstanceChannel", instanceChannelId);
}

export function handleNewChannelTokenURIGenerator(event: NewChannelTokenURIGenerator): void {
  log.info("NewChannelTokenURIGenerator detected. ChannelTokenURIGenerator: {}", [
    event.params.generator.toHexString()
  ]);

  const contract = Registry.bind(event.address);
  let callResult = contract.try_currentChannelId();

  if (callResult.reverted) {
    log.info("currentChannelId reverted?!", []);
    return;
  }

  let currentChannelId = callResult.value;

  // Registry starts at 1
  for (let id = BigInt.fromI32(1); id.lt(currentChannelId); id = id.plus(BigInt.fromI32(1))) {
    let channel = Channel.load(id.toString());

    if (channel) {
      let uri = contract.try_tokenURI(id);
      if (!uri.reverted) {
        channel.uri = uri.value;
      } else {
        throw new Error("tokenURI reverted");
      }
      channel.save();
    } else {
      throw new Error("Unable to fetch a valid channel ID");
    }
  }
}
