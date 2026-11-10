/* Preview-only storage namespacing. GitHub project sites share their origin.
 * Prevent accidental reuse/changes of the production Viewer's storage keys.
 * This is collision prevention, not an origin-level security boundary. */
(()=>{
 'use strict';
 if(!location.pathname.startsWith('/fromm-viewer-preview/'))return;
 const prefix='fromm.preview.v1::';
 const storage=window.localStorage;
 const get=Storage.prototype.getItem;
 const set=Storage.prototype.setItem;
 const remove=Storage.prototype.removeItem;
 const clear=Storage.prototype.clear;
 Storage.prototype.getItem=function(key){
  return get.call(this,this===storage?prefix+String(key):key);
 };
 Storage.prototype.setItem=function(key,value){
  return set.call(this,this===storage?prefix+String(key):key,value);
 };
 Storage.prototype.removeItem=function(key){
  return remove.call(this,this===storage?prefix+String(key):key);
 };
 Storage.prototype.clear=function(){
  if(this!==storage)return clear.call(this);
  const keys=[];
  for(let i=0;i<storage.length;i++){
   const key=storage.key(i);
   if(key?.startsWith(prefix))keys.push(key);
  }
  for(const key of keys)remove.call(storage,key);
 };
 window.FrommPreviewStorage={prefix};
})();