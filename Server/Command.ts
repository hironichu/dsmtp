// Command handler for the SMTP server, it contains a very basic implementation of the SMTP protocol

import { SMTPCommand, SMTPContext } from "./Interfaces.ts";
import { SMTPResponse } from "./Response.ts";




export class HELOCommand implements SMTPCommand {
  execute(_args: string[], _context: SMTPContext): SMTPResponse {
    // process HELO command logic
    return { code: 220, message: "Hello" };
  }
}

export class MAILCommand implements SMTPCommand {
  execute(_args: string[], _context: SMTPContext): SMTPResponse {
    // process MAIL command logic
    return { code: 250, message: "OK" };
  }
}
