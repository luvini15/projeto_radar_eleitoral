/** Layout groups only: preserves each input row and its metric values. */
export function reportGroups<T>(rows:readonly T[],size:number):T[][]{
 if(!Number.isInteger(size)||size<1)throw new RangeError('Invalid layout group size')
 return Array.from({length:Math.ceil(rows.length/size)},(_,i)=>rows.slice(i*size,(i+1)*size))
}
