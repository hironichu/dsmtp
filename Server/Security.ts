// Handle security for the server,
// This server does not support TLS, the security is basically just decrypting the password and user data with it
// We use the crypto module to encrypt and decrypt the data
import { base64ToBytesArr } from "../utils.ts";
import { Domain } from "./Domain.ts";
import { Mailbox } from "./Mail.ts";
import { SMTPServer } from "./Smtp.ts";
import { User } from "./Users.ts";
export interface ISecurity {
  load(context: SMTPServer): Promise<void>;
}

export class Security implements ISecurity {
  #key: CryptoKey | null = null;
  #iv: Uint8Array | null = null;
  lastUpdated: number = Date.now();
  //Hashes of each index of the data, so we can check integrity of the data for each update
  #hashes = new Map<string, string>();
  constructor() {
    //read the key from the file, do not keep it in memory
    const key = Deno.readFileSync("./server.key");
    //read the salt and iv from the localStorage
    const enc_salt = localStorage.getItem("salt");
    const enc_iv = localStorage.getItem("iv");
    if (!enc_salt || !enc_iv) {
      throw new Error("The salt or iv is missing");
    }
    this.#iv = new Uint8Array(base64ToBytesArr(enc_iv));
    window.crypto.subtle.importKey(
      "raw",
      key,
      "AES-GCM",
      true,
      ["encrypt", "decrypt"],
    ).then((key) => {
      this.#key = key;
    });
  }
  public init(server: SMTPServer) {
    this.#update(server);
  }
  async load(server: SMTPServer) {
    // console.log(this.#key, this.#iv, localStorage)
    if (!this.#key || !this.#iv) throw new Error("The key or iv is missing");
    const smtpData = localStorage.getItem("smtpData");
    try {
      if (smtpData === null) throw new Error("The data is missing");
      const restored = await this.decrypt(smtpData!);
      //check if the record is empty
      if (Object.keys(restored).length === 0) {
        console.info("[DSMTP] No data to restore");
        const data = {
          users: server.users,
          domains: server.domains,
          mails: server.mails,
        };
        const encrypted = await this.encrypt(JSON.stringify(data));
        if (encrypted === null) throw new Error("The data is missing");
        localStorage.setItem("smtpData", encrypted);
      } else {
        console.info("[DSMTP] Restoring the data");
        if (
          restored.users === undefined || restored.domains === undefined ||
          restored.mails === undefined
        ) throw new Error("The data is missing");
        server.users = restored.users as unknown as User[];
        server.domains = restored.domains as unknown as Domain[];
        server.mails = restored.mails as unknown as Mailbox[];
      }
    } catch (ex) {
      throw ex;
    }
  }
  #update(context: SMTPServer) {
    if (!this.#key || !this.#iv) throw new Error("The key or iv is missing");
    Promise.all([
      (async () => {
        let lastTime = Date.now();
        //Loop every 5 seconds and update the data
        while (true) {
          //check if lastTime is more than 5 seconds ago
          if (Date.now() - lastTime < 5000) {
            console.log(5000 - (Date.now() - lastTime));
            await new Promise((resolve) =>
              setTimeout(resolve, 5000 - (Date.now() - lastTime))
            );
            continue;
          }
          console.info("[DSMTP] Updating the data");
          const data = {
            users: context.users,
            domains: context.domains,
            mails: context.mails,
          };
          const encrypted = await this.encrypt(JSON.stringify(data));
          if (encrypted === null) throw new Error("The data is missing");
          localStorage.setItem("smtpData", encrypted);
          console.info("[DSMTP] Data updated " + new Date().toLocaleString());
          lastTime = Date.now();
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      })(),
    ]);
  }
  private async decrypt(data: string): Promise<Record<string, unknown>> {
    if (!this.#key || !this.#iv) throw new Error("The key or iv is missing");
    try {
      const decodedbuffer = base64ToBytesArr(data);
      const decryptedbuff = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: this.#iv },
        this.#key,
        new Uint8Array(decodedbuffer),
      );
      const decoded = new TextDecoder().decode(decryptedbuff);
      return JSON.parse(decoded);
    } catch (ex) {
      throw ex;
    }
  }
  private async encrypt(data: string): Promise<string | null> {
    if (!this.#key || !this.#iv) throw new Error("The key or iv is missing");
    try {
      const buff = new TextEncoder().encode(data);
      const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: this.#iv },
        this.#key,
        buff,
      );
      const buffer = new Uint8Array(encrypted);
      return btoa(
        buffer.reduce((data, byte) => data + String.fromCharCode(byte), ""),
      );
    } catch (ex) {
      throw ex;
    }
  }
  public HMACverify() {
    //Function that check a HMAC
  }
  public HMACsign() {
    //Function that check a HMAC
  }

  public encryptPassword() {
    //Function that encrypt a password
  }
  public decryptPassword() {
    //Function that decrypt a password
  }
}
