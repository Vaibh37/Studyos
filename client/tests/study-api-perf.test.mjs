import test from "node:test";
import assert from "node:assert/strict";
import { createStudyApiClient } from "../src/services/studyApiClient.js";

const tasks = "/api/tasks";
const response = (value, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => value });
const deferred = () => { let resolve, reject; const promise = new Promise((res, rej) => { resolve = res; reject = rej; }); return { resolve, reject, promise }; };
const account = (token) => ({ uid: token, getIdToken: async () => token });
function fixture({ fetcher, now, user = account("alice"), isOnline = () => true } = {}) {
  let current = user, calls = [];
  const client = createStudyApiClient({
    apiUrl: "https://example.invalid", getUser: () => current, getAppCheckToken: async () => "app-check",
    fetcher: async (url, options) => {
      calls.push({ path: url.split(".invalid")[1], ...options });
      return fetcher ? fetcher(url, options, calls.length) : response([{ id: calls.length }]);
    },
    isOnline, sleep: async () => {}, cacheOptions: { ttl: 20_000, now },
  });
  return { ...client, calls, changeUser: user => { current = user; client.setStudyDataScope(user); } };
}

test("duplicate study reads share one request, cache results, clone values and include auth/App Check", async () => {
  const f = fixture();
  const [a,b] = await Promise.all([f.readStudyData(tasks), f.readStudyData(tasks)]);
  assert.equal(f.calls.length,1);
  assert.deepEqual(a,b);
  a[0].id = 99;
  assert.deepEqual(await f.readStudyData(tasks), [{id:1}]);
  assert.equal(f.calls[0].headers.Authorization,"Bearer alice");
  assert.equal(f.calls[0].headers["X-Firebase-AppCheck"],"app-check");
  assert.equal(f.calls[0].cache,"no-store");
});

test("manual refresh, expiration, reconnect invalidation and standard reads bypass reuse", async () => {
  let now=0;
  const f=fixture({now:()=>now});
  await f.readStudyData(tasks);
  await f.readStudyData(tasks,{fresh:true});
  assert.equal(f.calls.length,2);
  assert.deepEqual(await f.readStudyData(tasks),[{id:2}]);
  now=20_001;
  assert.deepEqual(await f.readStudyData(tasks),[{id:3}]);
  f.invalidateStudyData();
  assert.deepEqual(await f.readStudyData(tasks),[{id:4}]);
  await f.apiRequest(tasks);await f.apiRequest(tasks);
  assert.equal(f.calls.length,6);
  assert.throws(()=>f.readStudyData("/api/security/me"),/Unexpected/);
});

test("write invalidates related study data even when the request fails", async () => {
  const f=fixture({fetcher:(_u,o,n)=>o.method==="PATCH"?response({message:"write failed"},500):response([{id:n}])});
  await f.readStudyData(tasks);await f.readStudyData("/api/subjects");
  await assert.rejects(f.apiRequest(tasks+"/1",{method:"PATCH",body:"{}"}),/write failed/);
  assert.deepEqual(await f.readStudyData(tasks),[{id:4}]);
  assert.deepEqual(await f.readStudyData("/api/subjects"),[{id:5}]);
});

test("an old in-flight GET cannot repopulate cache after a write", async () => {
  const old=deferred(), started=deferred();
  const f=fixture({fetcher:(_u,o,n)=>{if(n===1){started.resolve();return old.promise;}return response(o.method==="PATCH"?{_id:"1"}:[{id:n}])}});
  const first=f.readStudyData(tasks);
  await started.promise;
  await f.apiRequest(tasks+"/1",{method:"PATCH",body:"{}"});
  assert.deepEqual(await f.readStudyData(tasks),[{id:3}]);
  old.resolve(response([{id:1}]));
  assert.deepEqual(await first,[{id:1}]);
  assert.deepEqual(await f.readStudyData(tasks),[{id:3}]);
});

test("reads during a write do not leave a stale cached value", async () => {
  const finish=deferred(), started=deferred();
  const f=fixture({fetcher:(_u,o,n)=>o.method==="PATCH"?(started.resolve(),finish.promise):response([{id:n}])});
  await f.readStudyData(tasks);
  const write=f.apiRequest(tasks+"/1",{method:"PATCH",body:"{}"});
  await started.promise;
  assert.deepEqual(await f.readStudyData(tasks),[{id:3}]);
  finish.resolve(response({_id:"1"}));await write;
  assert.deepEqual(await f.readStudyData(tasks),[{id:4}]);
});

test("account switch isolates tokens and cache, rejecting old in-flight requests", async () => {
  const token=deferred(), tokenStarted=deferred();
  const old={uid:"old",getIdToken:()=>{tokenStarted.resolve();return token.promise}};
  const f=fixture({user:old});
  const first=f.readStudyData(tasks);
  const rejected=assert.rejects(first,/sign-in changed/);
  await tokenStarted.promise;
  f.changeUser(account("bob"));
  assert.deepEqual(await f.readStudyData(tasks),[{id:1}]);
  token.resolve("old");
  await rejected;
  assert.equal(f.calls.length,1);
  assert.equal(f.calls[0].headers.Authorization,"Bearer bob");
  f.changeUser(null);
  await f.readStudyData(tasks);await f.readStudyData(tasks);
  assert.equal(f.calls.length,3);
  assert.equal(f.calls[1].headers.Authorization,undefined);
});

test("account switch after fetch discards the response and leaves new account cache intact", async () => {
  const old=deferred(), started=deferred();
  const f=fixture({fetcher:(_u,_o,n)=>{if(n===1){started.resolve();return old.promise;}return response([{id:n}])}});
  const first=f.readStudyData(tasks), rejected=assert.rejects(first,/sign-in changed/);
  await started.promise;
  f.changeUser(account("bob"));
  assert.deepEqual(await f.readStudyData(tasks),[{id:2}]);
  old.resolve(response([{id:1}]));
  await rejected;
  assert.deepEqual(await f.readStudyData(tasks),[{id:2}]);
});

test("only safe private reads retry transient server/network failures; mutations and auth errors do not", async () => {
  const f=fixture({fetcher:(_u,_o,n)=>n===1?response({},503):response([{id:n}])});
  assert.deepEqual(await f.readStudyData(tasks),[{id:2}]);
  assert.equal(f.calls.length,2);
  const n=fixture({fetcher:(_u,_o,k)=>{if(k===1)throw new TypeError("network");return response([])}});
  await n.readStudyData(tasks);assert.equal(n.calls.length,2);
  const auth=fixture({fetcher:()=>response({message:"unauthorized"},401)});
  await assert.rejects(auth.readStudyData(tasks),/unauthorized/);assert.equal(auth.calls.length,1);
  const write=fixture({fetcher:()=>response({message:"unavailable"},503)});
  await assert.rejects(write.apiRequest(tasks,{method:"POST",body:"{}"}),/unavailable/);assert.equal(write.calls.length,1);
  const offline=fixture({fetcher:()=>{throw new TypeError("network")},isOnline:()=>false});
  await assert.rejects(offline.readStudyData(tasks),/offline/);assert.equal(offline.calls.length,1);
});

test("errors and malformed data are never cached", async () => {
  const f=fixture({fetcher:(_u,_o,n)=>n===1?response({message:"bad"},400):n===2?response(null):response([{id:n}])});
  await assert.rejects(f.readStudyData(tasks),/bad/);
  await assert.rejects(f.readStudyData(tasks),/incomplete study data/);
  assert.deepEqual(await f.readStudyData(tasks),[{id:3}]);
});
