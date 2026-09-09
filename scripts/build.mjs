import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

const chunkUrls = Array.from({length:13},(_,i)=>`https://vocal-duet-chunk-${String(i+1).padStart(2,'0')}.vercel.app/chunk.txt`);
const expected=[11000,11000,11000,11000,11000,11000,11000,11000,11000,11000,11000,11000,6468];
const p7='QsEp0cB+s4yg7uVkjorexuiU1sks1ergIqzBWfODTK00jlrDonq1l9SBC8VbknoZNXS7jhKGPxtP2Z7hT7DfMq0xFWe0aIxPiyC+kvcH/CpEw4c7d90G/RE4gqgBpLepZjbJz6BUBxDUNZ/TZPgQoOH3loBNLfqzTLbJ6+GwGhBA+300cTrhdMK9OOi4WVCi8I0bkcj65uEVyMBTFPL6hikV+JdqHP41dCm7crZb7CKiluqys58DBTicK3bLgV69D/HuSyKlEPXjUte0b8TR4XOuNeSl0Si6t8sZ4zUaNwswtGUI+LftMNxQ/AVuTv7+qsLyygqtpIjOAom0nGOVtKZbZ++x5zAqV8unNTxOtt3nyDy07/4/ws5jx0FlXaMPxMDkMARMzjnMyDmDCU9/6H23rnRGZ9KS1ZKNi6r/WwtXaGJJp7MEV2bJOYtzV7irvwNa+NZAJf2WB5RjJ3qlrodaxmwLNUlBDPiC3sOFMF8lWohn1Pf5';
const p13='Fy4hh+ESTUcSzLIbHoNydy/+W02QsOM1pRlFd45Y04zCSleS//kDJLkIuqsNiyMl4Q0+ujybHJQkhHgZMYoFgNc6HCfIpEbaa6KmF7XLhmBWjEBK0iDYelhUaRg34KzZUkVTcG7REbguNMzhNcVYv2O8cwiYAkwQxdKwB5k7N6Nck6y0oQG9FbOYiKpZWhCJuWySdYtWVcAiNd+2CvPb8zQ0nYaXtbtq0C3mtYg8wdgRTI66GBCiSkYNCR3tMDQF9rVxIlUlcM7JEO24Jm4nRX4tGklJjns7qH1pDuZIc629BvXvWmrZa1HBuhy+S8qsgZke6o45lMPs0/dePHxiTDhtyH5mTA598ZvP8B0b2IF1/r7hvldt9TvqH3tXyhOtMCawgtAfc3vPv7x38ZOfO2Rhtm+PZMAyNIbHjW53B0l3Ja3lamtH6eJrWj5vWzt8+1LDacZ9fes67urXimQyi1ozQvmm5+WXrDO9NOPScSkbW9KDvuqhbUSkiFRnB9gNY3s0yzyos5nqRbZmcOEohyFRb5DTneRRcOg+3v7ICJaxQFp+G91hd3v5bTVbxO2dvjha0H7u3ljx37i96F28rSpCk929Nyaah9+oP72h92FulgZyblMv/Lbv9jJOQmF8NtPWit+o3sIOhzwfQOXvfc9eAgKh8IcW7U44oa9pE6iq0qqn7o0rNY6asG0bf9XSuJ3HSZ9jZSrtpLUXec3mnq91YmD9yMLMnnGL9G7RcVPReu+87ZjOKShh59nVhRwIdZxhRVUWMMM4lq9xoIhx4z5CKXiXtZWOK81ZxNZjkWo2kHpn17DdK+dG3jaluUSFbtz2auloFtADFI5T/CXWNEHolYMEs0i/u3OOXSZ6WDaOOMv5S0ctQAnFLXuUQ5jfISuuK9Zx3VVE6EWP6aeWzkqJEOrRzrNF9G+wBHBOkj34C2VwRP9F2X32vvN/ATQewzve2wMA';
const parts=[];
for (let i=0;i<chunkUrls.length;i++) {
  const r=await fetch(chunkUrls[i]);
  if(!r.ok) throw new Error(`chunk ${i+1}: ${r.status}`);
  let t=await r.text();
  if(i===6) t=t.slice(0,7000)+p7+t.slice(7500);
  if(i===12) t=t.slice(0,5500)+p13;
  if(t.length!==expected[i]) throw new Error(`chunk ${i+1} length ${t.length}`);
  parts.push(t);
}
const html=gunzipSync(Buffer.from(parts.join(''),'base64')).toString('utf8');
await fs.mkdir('dist',{recursive:true});
await fs.writeFile('dist/index.html',html);
console.log('built',html.length);
