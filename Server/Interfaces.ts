import { User } from "./Users.ts";
import { Mailbox } from "./Mail.ts";
import { SMTPResponse } from "./Response.ts";
import { Domain } from "./Domain.ts";
import { SMTPServer } from "./Smtp.ts";
import { ClientConn } from "./Session.ts";
import { Security } from "./Security.ts";

export interface SMTPCommand {
  execute(
    args: string[],
    context: SMTPServer,
    client: ClientConn,
    cmd_text?: string,
  ): Promise<SMTPResponse> | SMTPResponse | void;
}

export interface SMTPContext {
  users: User[];
  mails: Mailbox[];
  domains: Domain[];
}
