/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import bufio from 'bufio'
import { Serializable } from '../../common/serializable'

export enum NetworkMessageType {
  Disconnecting = 0,
  CannotSatisfyRequest = 1,
  GetBlocksRequest = 2,
  GetBlocksResponse = 3,
  Identify = 4,
  PeerList = 5,
  PeerListRequest = 6,
  Signal = 7,
  SignalRequest = 8,
}

export abstract class NetworkMessage implements Serializable {
  readonly type: NetworkMessageType

  constructor(type: NetworkMessageType) {
    this.type = type
  }

  abstract serialize(): Buffer
  abstract getSize(): number

  serializeWithMetadata(): Buffer {
    const headerSize = 9
    const bw = bufio.write(headerSize + this.getSize())
    bw.writeU8(this.type)
    bw.writeU64(this.getSize())
    bw.writeBytes(this.serialize())
    return bw.render()
  }
}
