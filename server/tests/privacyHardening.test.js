const test = require('node:test');
const assert = require('node:assert/strict');
const { logError, safeErrorDetails } = require('../utils/safeLogger');
const { publicGroupMessage } = require('../utils/publicGroupMessage');

test('server error logs omit raw credential-like values, private content, stacks and unrecognized codes', () => {
  const secret = 'private test marker';
  const error = Object.assign(new Error(secret), { name: 'MongoServerError', code: 11000, keyValue: { title: secret }, metadata: { token: secret } });
  let logged;
  logError('save note failed', error, (...args) => { logged = JSON.stringify(args); });
  assert(!logged.includes(secret));
  assert.deepEqual(safeErrorDetails(error), { type: 'MongoServerError', code: '11000' });
  assert.deepEqual(safeErrorDetails({name: secret, code: secret}), {type:'Error'});
  assert.deepEqual(safeErrorDetails({code: {toString() {throw Error('unexpected conversion')}}}), {type:'Error'});
});

test('message DTO drops future private fields at every level and preserves the visible message contract', () => {
  const data = {_id:'message', userId:'sender', message:'hello', deletedFor:['reader'], __v:10, secret:'private',
    attachments:[{storageKey:'path',fileName:'a.pdf',mimeType:'application/pdf',size:12,uploadedBy:'sender',internal:'private'}],
    replyTo:{messageId:'previous',message:'quoted',internal:'private'},
    reactions:[{emoji:'👍',userId:'reader',internal:'private'}]};
  const dto=publicGroupMessage(data);
  assert.deepEqual(dto,{_id:'message',userId:'sender',message:'hello',
    attachments:[{storageKey:'path',fileName:'a.pdf',mimeType:'application/pdf',size:12,uploadedBy:'sender'}],
    replyTo:{messageId:'previous',message:'quoted'}, reactions:[{emoji:'👍',userId:'reader'}]});
  assert(!JSON.stringify(dto).includes('private'));
  assert.equal(data.deletedFor.length,1);
  const unsent=publicGroupMessage({...data,isUnsent:true});
  assert.equal(unsent.message,null);assert.equal(unsent.replyTo,null);
  assert.deepEqual(unsent.attachments,[]);assert.deepEqual(unsent.reactions,[]);
});
