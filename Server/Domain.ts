export class Domain {
    public readonly name: string;
    public ext: string;
    
    constructor(domain: string) {
        //verify the domain name using a Regex pattern,  it should only be a xxx.xxx format
        const pattern = new RegExp(/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,6}$/);
        if (!pattern.test(domain)) {
            throw new TypeError("Invalid Domain: Invalid format");
        }
        this.name = domain.split(".")[0];
        this.ext = domain.split(".")[1];
    }
    public async verify(): Promise<boolean> {
        try {
            await Deno.resolveDns(this.name, "A");
            return true;
        } catch {
            return false;
        }
    }
    public get domain(): string {
        return `${this.name}.${this.ext}`;
    }
    public toString(): string {
        return `Domain: ${this.name}`;
    }
}

