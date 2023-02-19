import { Domain } from "./Domain.ts";
import { Mailbox } from "./Mail.ts";
import { User } from "./Users.ts";
import { SMTPContext } from "./Interfaces.ts";
import { Security } from "./Security.ts";
import { SmtpResponse } from "./Response.ts";
import { ClientConn } from "./Session.ts";
import { encoder } from "../utils.ts";

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
      console.log("[DSMTP] SMTPContext data restored from previous session");
      console.info("[DSMTP] Users:", this.users.length);
      console.info("[DSMTP] Domains:", this.domains.length);
      console.info("[DSMTP] Mailboxes:", this.mails.length);
    }).catch((ex) => {
      console.error("Error restoring the context... ", ex);
      Deno.exit(1);
    });
    this.#security.init(this);
  }
  public async sendResponse(response: SmtpResponse, client: ClientConn) {
    await client.conn.write(
      encoder.encode(`${response.code} ${response.message}\r\n`),
    );
  }
  spawnThread() {
  }
}
