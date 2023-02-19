import { User } from "./Users.ts";
import { Mailbox } from "./Mail.ts";
import { SMTPResponse } from "./Response.ts";
import { Domain } from "./Domain.ts";


export interface SMTPCommand {
    execute(args: string[], context: SMTPContext): SMTPResponse;
}
  
export interface SMTPContext {
    users: User[];
    mails: Mailbox[];
    domains: Domain[];
}