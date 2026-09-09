import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const chunkUrls = Array.from({length:13},(_,i)=>`https://vocal-duet-chunk-${String(i+1).padStart(2,'0')}.vercel.app/chunk.txt`);
const expected=[11000,11000,11000,11000,11000,11000,11000,11000,11000,11000,11000,11000,6468];
const chunkHashes=[
'353ece476757ef5a7f820cd5649c2a31860f986e58f15789ed90e54a2e2ae327','b6adc608eb90b4c09600bd3d76a4bd69f57b24eac1248c7a30d4263a5082c772','6ed688d823f63e21cc902427341001e3387cabfbda3c8005f1bcd576e1173f94','f6fe969e6b5356f9bfcbedd2956988c6789ab89518771da918dace8767b0b2e6','7aa2361deb67e2ab215806f9a1020f4432474e95cc2d928dd93682d003dc0c4a','128b2973b26f6b0dc530eb0b84f792fd9d13e4bcf74c49a318a2db2a956b1ac0','d1797253eeea6a24f8261d7c7e74feb3ceae5639046f7df061bbe2191df45aff','4fd8f1d74bdf0abf9e161c8903ff8865243eebe7513958990ced7c2338670657','d693c3ea83a5dd5747333e37abad31a6bde1e37ce15681e7c98d9bf1ae344a55','b49c4735f3c852612312b2009d32feccf0bfedbd595275935346560b9a6d967a','4c82eb26ade26640855520a3444ba662c2484cd13aa1b16821e3cbcfeb94b04b','e7363bb89974ab9d474d6a2de27814c2d06b2666a5a8a87ef09e97a8c13dbf50','ade1eea87ae4a283ce7ee5f326bc53157dc895878656da0432cbfffdc1c9453f'];
const p7='QsEp0cB+s4yg7uVkjorexuiU1sks1ergIqzBWfODTK00jlrDonq1l9SBC8VbknoZNXS7jhKGPxtP2Z7hT7DfMq0xFWe0aIxPiyC+kvcH/CpEw4c7d90G/RE4gqgBpLepZjbJz6BUBxDUNZ/TZPgQoOH3loBNLfqzTLbJ6+GwGhBA+300cTrhdMK9OOi4WVCi8I0bkcj65uEVyMBTFPL6hikV+JdqHP41dCm7crZb7CKiluqys58DBTicK3bLgV69D/HuSyKlEPXjUte0b8TR4XOuNeSl0Si6t8sZ4zUaNwswtGUI+LftMNxQ/AVuTv7+qsLyygqtpIjOAom0nGOVtKZbZ++x5zAqV8unNTxOtt3nyDy07/4/ws5jx0FlXaMPxMDkMARMzjnMyDmDCU9/6H23rnRGZ9KS1ZKNi6r/WwtXaGJJp7MEV2bJOYtzV7irvwNa+NZAJf2WB5RjJ3qlrodaxmwLNUlBDPiC3sOFMF8lWohn1Pf5';
const p13='Fy4hh+ESTUcSzLIbHoNydy/+W02QsOM1pRlFd45Y04zCSleS//kDJLkIuqsNiyMl4Q0+ujybHJQkhHgZMYoFgNc6HCfIpEbaa6KmF7XLhmBWjEBK0iDYelhUaRg34KzZUkVTcG7REbguNMzhNcVYv2O8cwiYAkwQxdKwB5k7N6Nck6y0oQG9FbOYiKpZWhCJuWySdYtWVcAiNd+2CvPb8zQ0nYaXtbtq0C3mtYg8wdgRTI66GBCiSkYNCR3tMDQF9rVxIlUlcM7JEO24Jm4nRX4tGklJjns7qH1pDuZIc629BvXvWmrZa1HBuhy+S8qsgZke6o45lMPs0/dePHxiTDhtyH5mTA598ZvP8B0b2IF1/r7hvldt9TvqH3tXyhOtMCawgtAfc3vPv7x38ZOfO2Rhtm+PZMAyNIbHjW53B0l3Ja3lamtH6eJrWj5vWzt8+1LDacZ9fes67urXimQyi1ozQvmm5+WXrDO9NOPScSkbW9KDvuqhbUSkiFRnB9gNY3s0yzyos5nqRbZmcOEohyFRb5DTneRRcOg+3v7ICJaxQFp+G91hd3v5bTVbxO2dvjha0H7u3ljx37i96F28rSpCk929Nyaah9+oP72h92FulgZyblMv/Lbv9jJOQmF8NtPWit+o3sIOhzwfQOXvfc9eAgKh8IcW7U44oa9pE6iq0qqn7o0rNY6asG0bf9XSuJ3HSZ9jZSrtpLUXec3mnq91YmD9yMLMnnGL9G7RcVPReu+87ZjOKShh59nVhRwIdZxhRVUWMMM4lq9xoIhx4z5CKXiXtZWOK81ZxNZjkWo2kHpn17DdK+dG3jaluUSFbtz2auloFtADFI5T/CXWNEHolYMEs0i/u3OOXSZ6WDaOOMv5S0ctQAnFLXuUQ5jfISuuK9Zx3VVE6EWP6aeWzkqJEOrRzrNF9G+wBHBOkj34C2VwRP9F2X32vvN/ATQewzve2wMA';
const sha256=x=>createHash('sha256').update(x).digest('hex');

const parts=[];
for (let i=0;i<chunkUrls.length;i++) {
  const r=await fetch(chunkUrls[i], {cache:'no-store'});
  if(!r.ok) throw new Error(`chunk ${i+1}: ${r.status}`);
  let t=await r.text();
  if(i===6) t=t.slice(0,7000)+p7+t.slice(7500);
  if(i===12) t=t.slice(0,5500)+p13;
  if(t.length!==expected[i]) throw new Error(`chunk ${i+1} length ${t.length}/${expected[i]}`);
  if(sha256(t)!==chunkHashes[i]) throw new Error(`chunk ${i+1} sha mismatch`);
  parts.push(t);
}
let html=gunzipSync(Buffer.from(parts.join(''),'base64')).toString('utf8');

const binaryFiles=[
  'assets/images/featured-vocal-minseo.webp','assets/images/voice-yuna.webp','assets/images/voice-jun.webp','assets/images/voice-seoyun.webp','assets/images/song-starlight.webp'
];
const fragmentGroups=[
  ['assets/fragments/img06-01.txt','assets/fragments/img06-02.txt','assets/fragments/img06-03.txt','assets/fragments/img06-04.txt'],
  ['assets/fragments/img07-01.txt','assets/fragments/img07-02.txt','assets/fragments/img07-03.txt','assets/fragments/img07-04.txt'],
  ['assets/fragments/img08-01.txt','assets/fragments/img08-02.txt','assets/fragments/img08-03.txt'],
  ['assets/fragments/img09-01.txt','assets/fragments/img09-02.txt','assets/fragments/img09-03.txt','assets/fragments/img09-04.txt'],
  ['assets/fragments/img10-01.txt','assets/fragments/img10-02.txt','assets/fragments/img10-03.txt','assets/fragments/img10-04.txt']
];
const imageHashes=['03698571a773dc94e77815b301cea6a1719239d1b07d23569e39d1d54bc14efc','0409f8027473bd79bf06c560b361e788b0a0d11575d3c941f03789aa0207dfc1','e903981dfc447acc6a8824d0662da2b0298d2ebc3fb23ea30922ace77e32d5b8','fe7123ce625f78398bf2dbb6d3f28d87806987d69da44c7139bb4a949042f818','8192f2cf37c1986bb1603dd5bd76e404030e5e7df5a5ea657f8bf5592aaa3bee','5b117178bd1ce630cd979e69d01af51bc877dd128d3188d608bb90ffdb213ef6','6af54cf4ce05e175accd470ca97d8f4665ce00001fd13331989f0e521c865487','89492f82041cdb05435c4b11738006b1e8601a264f7e6d38cfb5d95e375991fc','7d4f32829d817a3dcd2dfc44a8f8406a39083bd3a9c0d030cbe8c4acb99c2920','c3a612a248293f7f0ff8b1272de6e9ad9803ee89708f19f88aab5f0461429815'];
const images=[];
for (const f of binaryFiles) images.push(await fs.readFile(f));
for (const group of fragmentGroups) {
  let b64=''; for (const f of group) b64+=(await fs.readFile(f,'utf8')).trim();
  images.push(Buffer.from(b64,'base64'));
}
for(let i=0;i<images.length;i++) if(sha256(images[i])!==imageHashes[i]) throw new Error(`image ${i+1} sha mismatch`);
for (const img of images) html=html.replace(/data:image\/webp;base64,[A-Za-z0-9+/=]+/,`data:image/webp;base64,${img.toString('base64')}`);

const cardPatch=`<style id="production-card-fix">
.voice-card:not(.duet-preview-card){height:389px;display:flex;flex-direction:column}
.voice-card:not(.duet-preview-card) .voice-card-media{flex:0 0 auto}
.voice-card:not(.duet-preview-card) .voice-card-content{height:164px;padding:12px 14px 14px;display:flex;flex-direction:column;align-items:stretch;box-sizing:border-box}
.voice-card:not(.duet-preview-card) .voice-card-content .meta{min-height:32px;line-height:16px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
.voice-card:not(.duet-preview-card) .voice-card-content .card-actions{margin-top:auto;padding-top:10px}
@media(max-width:389px){.voice-card:not(.duet-preview-card){height:379px}}
</style>`;
html=html.replace('</head>',`${cardPatch}</head>`);
html=html.replace(/<title>[^<]*<\/title>/,'<title>Vocalink</title>');
html=html.replaceAll('보컬 궁합 기반 듀엣 MVP','Vocalink');
if(html.includes('vocal-duet-chunk-')) throw new Error('runtime chunk dependency leaked into output');
if((html.match(/data:image\/webp;base64,/g)||[]).length!==10) throw new Error('image replacement count mismatch');
await fs.mkdir('dist',{recursive:true});
await fs.writeFile('dist/index.html',html);
console.log(`Vocalink built: ${html.length} chars, 10 verified WebP images, standalone output`);
