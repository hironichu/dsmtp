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
//TODO(Hironichu) Add Docs
export class Security implements ISecurity {
  #key: CryptoKey | null = null;
  #iv: Uint8Array | null = null;
  lastUpdated: number = Date.now();
  //Hashes of each index of the data, so we can check integrity of the data for each update
  #hashes = new Map<string, string>();
  #HMAC: CryptoKey | null = null;
  constructor() {
    const key = Deno.readFileSync("./server.key");
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
      //Generate a HMAC key from the salt
      this.#key = key;
    });
    window.crypto.subtle.generateKey(
      {
        name: "HMAC",
        hash: { name: "SHA-512" },
      },
      true,
      ["sign", "verify"],
    ).then((key) => {
      this.#HMAC = key;
    });
  }
  //TODO(Hironichu) Add Docs
  public init(server: SMTPServer) {
    this.#update(server);
  }
  //TODO(Hironichu) Add Docs
  async load(server: SMTPServer) {
    if (!this.#key || !this.#iv) throw new Error("The key or iv is missing");
    const smtpData = localStorage.getItem("smtpData");
    try {
      if (smtpData === null) throw new Error("The data is missing");
      const restored = await this.decrypt(smtpData!);
      //Check if the record is empty
      if (Object.keys(restored).length === 0) {
        console.info("[DSMTP] No data to restore");

        const data = {
          users: server.users,
          domains: server.domains,
          mails: server.mails,
        };
        this.#hashes.set(
          "users",
          await this.digest(JSON.stringify(data.users)),
        );
        this.#hashes.set(
          "domains",
          await this.digest(JSON.stringify(data.domains)),
        );
        this.#hashes.set(
          "mails",
          await this.digest(JSON.stringify(data.mails)),
        );

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

        //Set the new hashes
        this.#hashes.set(
          "users",
          await this.digest(JSON.stringify(server.users)),
        );
        this.#hashes.set(
          "domains",
          await this.digest(JSON.stringify(server.domains)),
        );
        this.#hashes.set(
          "mails",
          await this.digest(JSON.stringify(server.mails)),
        );
      }
    } catch (ex) {
      throw ex;
    }
  }
  //TODO(Hironichu) Add Docs
  #update(context: SMTPServer) {
    if (!this.#key || !this.#iv) throw new Error("The key or iv is missing");
    Promise.all([
      (async () => {
        let lastTime = Date.now();

        while (true) {
          if (Date.now() - lastTime < 5000) {
            await new Promise((resolve) =>
              setTimeout(resolve, 5000 - (Date.now() - lastTime))
            );
            continue;
          }
          const usersHash = await this.digest(JSON.stringify(context.users));
          const domainsHash = await this.digest(
            JSON.stringify(context.domains),
          );

          const mailsHash = await this.digest(JSON.stringify(context.mails));
          if (
            usersHash === this.#hashes.get("users") &&
            domainsHash === this.#hashes.get("domains") &&
            mailsHash === this.#hashes.get("mails")
          ) {
            lastTime = Date.now();
            await new Promise((resolve) => setTimeout(resolve, 5000));
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
          //Save the data
          localStorage.setItem("smtpData", encrypted);
          //Update the hashes with the new ones
          this.#hashes.set("users", usersHash);
          this.#hashes.set("domains", domainsHash);
          this.#hashes.set("mails", mailsHash);

          console.info("[DSMTP] Data updated " + new Date().toLocaleString());
          lastTime = Date.now();

          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      })(),
    ]);
  }
  //TODO(Hironichu) Add Docs
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
  //TODO(Hironichu) Add Docs
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
    if (!this.#HMAC) throw new Error("The HMAC key is missing");
    //Function that verify the HMAC
  }
  public async HMACsign(data: string): Promise<ArrayBuffer> {
    if (!this.#HMAC) throw new Error("The HMAC key is missing");

    const signature = await window.crypto.subtle.sign(
      "HMAC",
      this.#HMAC,
      new TextEncoder().encode(data),
    );

    return signature;
  }
  public async digest(data: string): Promise<string> {
    if (!data) throw new Error("The data is missing");
    try {
      const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(data),
      );

      const hashArray = Array.from(new Uint8Array(hash));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0"));

      return hashHex.join("");
    } catch (ex) {
      throw ex;
    }
  }
  public encryptPassword() {
    //Function that encrypt a password
  }
  public decryptPassword() {
    //Function that decrypt a password
  }
}
