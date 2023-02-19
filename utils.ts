export const base64ToBytesArr = (str: string) => {
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