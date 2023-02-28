import { Mailbox } from "./Mail.ts";

export class User {
  public id = "";
  public password = "";
  public mailboxes: Mailbox[] = [];
  public constructor(id: string, password: string) {
    this.id = id;
    this.password = password;
  }
}
