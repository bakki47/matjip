import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseInbox, mergeRecord} from './inbox-import.mjs';
const html=readFileSync('index.html','utf8');
const pages=vm.runInNewContext(html.slice(html.indexOf('const PAGES='),html.indexOf('\nconst ',html.indexOf('const PAGES=')+12))+'\nPAGES;');
const catalog=Object.fromEntries(Object.entries(pages).map(([k,v])=>[k,Array.from(v.shops,s=>s.id)]));
const example=JSON.parse(readFileSync('inbox.json','utf8'));
test('sample converts all nine records against actual shop catalog',()=>{
 const records=parseInbox(example,catalog);
 assert.equal(records.length,9);
 assert.equal(records.filter(x=>x.collection==='mylog').length,2);
 const chunggwang=records.find(x=>x.id==='m_chunggwang');
 assert.equal(chunggwang.data.n,'춘광식당');
 assert.equal(chunggwang.data.r.length,1);
 assert.equal(chunggwang.data.b,'name:곰찌');
});
test('repeated import preserves duplicate visits in source without accumulating them',()=>{
 const record=parseInbox(example,catalog).find(x=>x.id==='m_chunggwang').data;
 assert.deepEqual(mergeRecord(record,record),record);
 const old={...record,m:'기존 메모',star:5};
 const merged=mergeRecord(old,record);
 assert.equal(merged.star,5);
 assert.equal(merged.m,'기존 메모');
 assert.deepEqual(mergeRecord(merged,record),merged);
});
test('invalid files fail before writes',()=>{
 for(const mutate of [x=>x.version=2,x=>x.stamps[0].shopId='unknown',x=>x.log[0].visits[0].date='2026-02-30',x=>x.log[0].star=6,x=>x.log.push(x.log[0])]){
  const input=structuredClone(example);mutate(input);
  assert.throws(()=>parseInbox(input,catalog));
 }
});
