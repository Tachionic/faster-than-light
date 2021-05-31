import { assert } from "chai"

class Record {
  constructor (address, shares) {
    this.address = address
    this.shares = shares
  }
}

class RecordList {
  records
  constructor (addresses, sharesList){
    assert(addresses.length == sharesList.length)
    this.records = addresses.map((address, index) => {
      return new Record(address, sharesList[index])
    })
  }
  addresses = () => {
    return this.records.map((record) => { return record.address })
  }
  sharesList = () => {
    return this.records.map((record) => { return record.shares })
  }
}

export { RecordList }
