import { Mailbox } from "./Mail.ts";

//TODO(Hironichu) Add Docs/Login/Register methods
export class User {
  public id = "";
  public password = "";
  public mailboxes: Mailbox[] = [];
  public constructor(id: string, password: string) {
    this.id = id;
    this.password = password;
  }
}
