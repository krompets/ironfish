/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { Assert } from '../../assert'
import { Blockchain } from '../../blockchain'
import { WorkerPool } from '../../workerPool'
import { Identity, PrivateIdentity, privateIdentityToIdentity } from '../identity'
import { IdentifyMessage } from '../messages/identify'
import { IsomorphicWebSocketConstructor } from '../types'

/**
 * Wraps configuration needed for establishing connections with other peers
 * and maintains references to all known peers.
 */
export class LocalPeer {
  readonly chain: Blockchain
  readonly workerPool: WorkerPool
  // our keypair for encrypting messages
  readonly privateIdentity: PrivateIdentity
  // the identity we expose to other peers
  readonly publicIdentity: Identity
  // the agent of the local client
  readonly agent: string
  // the protocol version of the local client
  readonly version: number
  // constructor for either a Node WebSocket or a browser WebSocket
  readonly webSocket: IsomorphicWebSocketConstructor

  // optional port the local peer is listening on
  port: number | null
  // optional a human readable name for the node
  name: string | null
  // simulated latency in MS that gets added to connection.send
  simulateLatency = 0

  constructor(
    identity: PrivateIdentity,
    agent: string,
    version: number,
    chain: Blockchain,
    workerPool: WorkerPool,
    webSocket: IsomorphicWebSocketConstructor,
  ) {
    this.privateIdentity = identity
    this.publicIdentity = privateIdentityToIdentity(identity)
    this.chain = chain
    this.workerPool = workerPool
    this.agent = agent
    this.version = version

    this.webSocket = webSocket
    this.port = null
    this.name = null
  }

  /**
   * Construct an Identify message with our identity and version.
   */
  getIdentifyMessage(): IdentifyMessage {
    Assert.isNotNull(this.chain.head, 'Cannot connect to the network without a genesis block')

    return new IdentifyMessage({
      agent: this.agent,
      head: this.chain.head.hash.toString('hex'),
      identity: this.publicIdentity,
      name: this.name || undefined,
      port: this.port,
      sequence: Number(this.chain.head.sequence),
      version: this.version,
      work: this.chain.head.work.toString(),
    })
  }

  /**
   * Encrypt a string for recipient with the stored private identity.
   * @param plainTextMessage The string to encrypt.
   * @param recipient The public key of the recipient of the message.
   */
  async boxMessage(
    plainTextMessage: string,
    recipient: Identity,
  ): Promise<{ nonce: string; boxedMessage: string }> {
    return this.workerPool.boxMessage(plainTextMessage, this.privateIdentity, recipient)
  }

  /**
   * Decrypt a message using a nonce from a sender.
   * @param boxedMessage An encrypted message string.
   * @param nonce A nonce, generated by boxMessage.
   * @param sender The public key of the message sender.
   */
  async unboxMessage(
    boxedMessage: string,
    nonce: string,
    sender: Identity,
  ): Promise<{ message: string | null }> {
    return this.workerPool.unboxMessage(boxedMessage, nonce, sender, this.privateIdentity)
  }
}
