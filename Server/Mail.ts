// import { User } from "./Users.ts";

export class Mail {
  from: string;
  to: string;
  data: string;
  date: Date;
  constructor(from: string, to: string, data: string) {
    this.from = from;
    this.to = to;
    this.data = data;
    this.date = new Date();
  }
  serialize(): string {
    return JSON.stringify(this);
  }
}
export class Mailbox {
  id: string;
  inbox: Mail[];
  sent: Mail[];
  trash: Mail[];
  constructor(id: string, inbox: Mail[], sent: Mail[], trash: Mail[]) {
    this.id = id;
    this.inbox = inbox;
    this.sent = sent;
    this.trash = trash;
  }

  send(mail: Mail): void {
    this.sent.push(mail);
  }
  receive(mail: Mail): void {
    this.inbox.push(mail);
  }
  delete(mail: Mail): void {
    this.trash.push(mail);
  }
  serialize(): string {
    return JSON.stringify(this);
  }
}
