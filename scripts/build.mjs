import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

const chunkUrls = Array.from({length:13},(_,i)=>`https://vocal-duet-chunk-${String(i+1).padStart(2,'0')}.vercel.app/chunk.txt`);
const expected=[11000,11000,11000,11000,11000,11000,11000,11000,11000,11000,11000,11000,6468];
const p13='Fy4hh+ESTUcSzLIbHoNydy/+W02QsOM1pRlFd45Y04zCSleS//kDJLkIuqsNiyMl4Q0+ujybHJQkhHgZMYoFgNc6HCfIpEbaa6KmF7XLhmBWjEBK0iDYelhUaRg34KzZUkVTcG7REbguNMzhNcVYv2O8cwiYAkwQxdKwB5k7N6Nck6y0oQG9FbOYiKpZWhCJuWySdYtWVcAiNd+2CvPb8zQ0nYaXtbtq0C3mtYg8wdgRTI66GBCiSkYNCR3tMDQF9rVxIlUlcM7JEO24Jm4nRX4tGklJjns7qH1pDuZIc629BvXvWmrZa1HBuhy+S8qsgZke6o45lMPs0/dePHxiTDhtyH5mTA598ZvP8B0b2IF1/r7hvldt9TvqH3tXyhOtMCawgtAfc3vPv7x38ZOfO2Rhtm+PZMAyNIbHjW53B0l3Ja3lamtH6eJrWj5vWzt8+1LDacZ9fes67urXimQyi1ozQvmm5+WXrDO9NOPScSkbW9KDvuqhbUSkiFRnB9gNY3s0yzyos5nqRbZmcOEohyFRb5DTneRRcOg+3v7ICJaxQFp+G91hd3v5bTVbxO2dvjha0H7u3ljx37i96F28rSpCk929Nyaah9+oP72h92FulgZyblMv/Lbv9jJOQmF8NtPWit+o3sIOhzwfQOXvfc9eAgKh8IcW7U44oa9pE6iq0qqn7o0rNY6asG0bf9XSuJ3HSZ9jZSrtpLUXec3mnq91YmD9yMLMnnGL9G7RcVPReu+87ZjOKShh59nVhRwIdZxhRVUWMMM4lq9xoIhx4z5CKXiXtZWOK81ZxNZjkWo2kHpn17DdK+dG3jaluUSFbtz2auloFtADFI5T/CXWNEHolYMEs0i/u3OOXSZ6WDaOOMv5S0ctQAnFLXuUQ5jfISuuK9Zx3VVE6EWP6aeWzkqJEOrRzrNF9G+wBHBOkj34C2VwRP9F2X32vvN/ATQewzve2wMA';

const parts=[];
for (let i=0;i<chunkUrls.length;i++) {
  const r=await fetch(chunkUrls[i], {cache:'no-store'});
  if(!r.ok) throw new Error(`chunk ${i+1}: ${r.status}`);
  let t=await r.text();
  if(i===12) t=t.slice(0,5500)+p13;
  if(t.length!==expected[i]) throw new Error(`chunk ${i+1} length ${t.length}/${expected[i]}`);
  parts.push(t);
}
let html=gunzipSync(Buffer.from(parts.join(''),'base64')).toString('utf8');

const binaryFiles=[
  'assets/images/featured-vocal-minseo.webp',
  'assets/images/voice-yuna.webp',
  'assets/images/voice-jun.webp',
  'assets/images/voice-seoyun.webp',
  'assets/images/song-starlight.webp'
];
const fragmentGroups=[
  ['assets/fragments/img06-01.txt','assets/fragments/img06-02.txt','assets/fragments/img06-03.txt','assets/fragments/img06-04.txt'],
  ['assets/fragments/img07-01.txt','assets/fragments/img07-02.txt','assets/fragments/img07-03.txt','assets/fragments/img07-04.txt'],
  ['assets/fragments/img08-01.txt','assets/fragments/img08-02.txt','assets/fragments/img08-03.txt'],
  ['assets/fragments/img09-01.txt','assets/fragments/img09-02.txt','assets/fragments/img09-03.txt','assets/fragments/img09-04.txt'],
  ['assets/fragments/img10-01.txt','assets/fragments/img10-02.txt','assets/fragments/img10-03.txt','assets/fragments/img10-04.txt']
];
const images=[];
for (const f of binaryFiles) images.push((await fs.readFile(f)).toString('base64'));
for (const group of fragmentGroups) {
  let b64='';
  for (const f of group) b64+=(await fs.readFile(f,'utf8')).trim();
  images.push(b64);
}
if(images.length!==10) throw new Error('image count mismatch');
for (const b64 of images) html=html.replace(/data:image\/webp;base64,[A-Za-z0-9+/=]+/,`data:image/webp;base64,${b64}`);

const cardPatch=`<style id="production-card-fix">
.voice-card:not(.duet-preview-card) .voice-card-content{height:164px;padding:12px 14px 14px;display:flex;flex-direction:column;align-items:stretch}
.voice-card:not(.duet-preview-card) .voice-card-content .meta{min-height:16px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.voice-card:not(.duet-preview-card) .voice-card-content .card-actions{margin-top:auto;padding-top:10px}
</style>`;
html=html.replace('</head>',`${cardPatch}</head>`);
html=html.replace(/<title>[^<]*<\/title>/,'<title>Vocalink</title>');
html=html.replaceAll('보컬 궁합 기반 듀엣 MVP','Vocalink');
if(html.includes('vocal-duet-chunk-')) throw new Error('runtime chunk dependency leaked into output');
if((html.match(/data:image\/webp;base64,/g)||[]).length!==10) throw new Error('image replacement count mismatch');
await fs.mkdir('dist',{recursive:true});
await fs.writeFile('dist/index.html',html);
console.log(`Vocalink built: ${html.length} chars, 10 embedded WebP images, standalone output`);
