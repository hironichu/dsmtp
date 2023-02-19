import { Domain } from "./Domain.ts";
import { Mailbox } from "./Mail.ts";
import { User } from "./Users.ts";
import { SMTPContext } from "./Interfaces.ts";
import { Security } from "./Security.ts";

export class SMTPServer implements SMTPContext {
  public users: User[];
  public mails: Mailbox[];
  public domains: Domain[];
  #security: Security;
  constructor(security: Security) {
    this.users = [];
    this.mails = [];
    this.domains = [];
    this.#security = security;
    this.#security.load(this).then(() => {
      console.log("SMTPContext data restored from previous session");
      console.info("Users: ", this.users);
      console.info("Domains: ", this.domains);
      console.info("Mailboxes: ", this.mails);
    }).catch((ex) => {
      console.error("Error restoring the context... ", ex);
      Deno.exit(1);
    });
    this.#security.init(this);
  }

  saveContext() {
    /// use the security module to save the context
  }
}
