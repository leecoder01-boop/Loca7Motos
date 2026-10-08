import QRCode from 'qrcode';
export function pixQr(payload:string){
  const matrix=QRCode.create(payload,{errorCorrectionLevel:'M'}).modules;
  let path='';
  for(let y=0;y<matrix.size;y++)for(let x=0;x<matrix.size;x++)if(matrix.get(y,x))path+=`M${x+4} ${y+4}h1v1h-1z`;
  return {size:matrix.size+8,path};
}
