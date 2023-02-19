// This code is used to init the private key of the server in order to encrypt the localStorage data.
// Note : The key is not used to encrypt the user data, it is used to encrypt the localStorage data.
// The user data is encrypted using the user password. The user password is used to encrypt the localStorage data.


//Check locally if the key is already generated `server.key`
// If not, generate a new key and save it locally
try {
    Deno.statSync("./server.key");
    console.log("The key is already generated");
    const res = prompt("Say OK to regenerate the key, warning this will delete all the data\n\r");
    if (res === "OK") {
        Deno.removeSync("./server.key");
        console.log("The key has been deleted");
    } else {
        console.log("Exiting");
        Deno.exit(1);
    }
} catch {
    //
}

localStorage.clear();
const smtpData = localStorage.getItem("smtpData") ?? "{}";


//prompt user for the KEY to use to generate the key
const PASSWORD = prompt("Enter a secret phrase to generate the key (please make it dificult to recreate!) \n\r");
if (!PASSWORD) {
    console.log("Empty secret phrase, Exiting");
    Deno.exit(1);
}
if (PASSWORD.length < 8) {
    console.log("The secret phrase is too short, Exiting");
    Deno.exit(1);
}
const iv = crypto.getRandomValues(new Uint8Array(12));
const KEY_FROM = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(PASSWORD),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
);
const salt = window.crypto.getRandomValues(new Uint8Array(16));

const DERIVED_KEY = await window.crypto.subtle.deriveKey(
    {"name": "PBKDF2", salt: salt, "iterations": 100000, "hash": "SHA-512" },
    KEY_FROM,
    { "name": "AES-GCM", "length": 256},
    true,
    [ "encrypt", "decrypt" ]
);
//save the salt and iv in the localStorage
localStorage.setItem("salt", btoa(salt.reduce((data, byte) => data + String.fromCharCode(byte), '')));
localStorage.setItem("iv", btoa(iv.reduce((data, byte) => data + String.fromCharCode(byte), '')));
//save the key in a file
const keydata = await crypto.subtle.exportKey("raw", DERIVED_KEY);
await Deno.writeFile("./server.key", new Uint8Array(keydata), { mode : 0o600 });

const base64ToBytesArr = (str: string) => {
	const abc = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"];
	const result = [];
	for(let i = 0; i < str.length / 4; i++) {
	  const chunk = [...str.slice(4*i,4*i+4)]
	  const bin = chunk.map(x=> abc.indexOf(x).toString(2).padStart(6,"0")).join(''); 
	  const bytes = bin.match(/.{1,8}/g)!.map(x=> +('0b'+x));
	  result.push(...bytes.slice(0,3 - (str[4*i+2] === "=" ? 1 : 0) - (str[4*i+3] === "=" ? 1 : 0)));
	}
	return result;
}
const data = await window.crypto.subtle.encrypt( { name: "AES-GCM", iv: iv }, DERIVED_KEY, new TextEncoder().encode(smtpData));
const buffer = new Uint8Array(data)
const base64String = btoa(buffer.reduce((data, byte) => data + String.fromCharCode(byte), ''));
localStorage.setItem("smtpData", base64String);

try {
    const keydata_file = Deno.readFileSync("./server.key");
    const keydata_import = await window.crypto.subtle.importKey(
        "raw",
        keydata_file,
        "AES-GCM",
        true,
        ["encrypt", "decrypt"],
    );
    const iv_s = base64ToBytesArr(localStorage.getItem("iv")!);
    const decodedbuffer = base64ToBytesArr(base64String);
    const data_decoded = await window.crypto.subtle.decrypt( { name: "AES-GCM", iv: new Uint8Array(iv_s) }, keydata_import, new Uint8Array(decodedbuffer) );
    console.log(new TextDecoder().decode(data_decoded));
} catch (e) {
    console.error("Error while decrypting the data, deleting the key and the data");
    Deno.removeSync("./server.key");
    localStorage.clear();
    console.error(e);
}