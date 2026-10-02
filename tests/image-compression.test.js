// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fitImage, prepareImage } from '../src/imageCompression';
let canvases;
beforeEach(() => {
  canvases=[];
  URL.createObjectURL=vi.fn(()=>'blob:source'); URL.revokeObjectURL=vi.fn();
  vi.stubGlobal('Image',class {
    naturalWidth=3000; naturalHeight=2000;
    set src(value) { queueMicrotask(()=>this.onload()); }
  });
  const create=document.createElement.bind(document);
  vi.spyOn(document,'createElement').mockImplementation(tag => {
    if(tag!=='canvas') return create(tag);
    const canvas={width:0,height:0,dimensions:null,getContext:()=>({drawImage:vi.fn()}),
      toBlob(callback,type,quality) { this.dimensions=[this.width,this.height,type,quality]; callback(new Blob(['webp'],{type})); }};
    canvases.push(canvas); return canvas;
  });
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
it('preserves aspect ratio and never enlarges smaller images',()=>{
  expect(fitImage(3000,2000,1600)).toEqual({width:1600,height:1067});
  expect(fitImage(100,50,480)).toEqual({width:100,height:50});
});
it('encodes a compressed full image and a small thumbnail and releases the source',async()=>{
  const original=new File(['x'.repeat(1000)],'photo.png',{type:'image/png'});
  const result=await prepareImage(original);
  expect(result.full.size).toBeLessThan(original.size);
  expect(canvases[0].dimensions).toEqual([1600,1067,'image/webp',0.82]);
  expect(canvases[1].dimensions).toEqual([480,320,'image/webp',0.75]);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:source');
});
it('preserves an animated GIF for the expanded image',async()=>{
  const original=new File(['x'.repeat(1000)],'animated.gif',{type:'image/gif'});
  const result=await prepareImage(original);
  expect(result.full).toBe(original); expect(canvases).toHaveLength(1);
  expect(result.thumbnail.type).toBe('image/webp');
});
