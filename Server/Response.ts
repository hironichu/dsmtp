export interface SMTPResponse {
  code: number;
  message: string;
}

export class SmtpResponse implements SMTPResponse {
  code: number;
  message: string;
  constructor(code: number, message: string) {
    this.code = code;
    this.message = message;
  }
}
