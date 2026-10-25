// Requires Node 22+ and installed Edge/Chrome. No npm/browser download required.
// All screenshots and the isolated browser profile stay inside Sharpie.
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd();
const output=path.join(root,'TestResults','final-project');mkdirSync(output,{recursive:true});
const browserPath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
if(!browserPath)throw new Error('Install Edge or Chrome before running this local browser check.');
const base=process.env.SHARPIE_QA_URL||'http://127.0.0.1:5186';
const port=9347;
const navigationOnly=!!process.env.SHARPIE_QA_NAVIGATION_ONLY;
const fixture=`${base}/scripts/final-project-preview.html${navigationOnly?'?student':''}`;
const browser=spawn(browserPath,['--headless=new','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${port}`,`--user-data-dir=${path.join(root,'node_modules','.cache','final-project-browser')}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));let socket,id=0;const pending=new Map();const errors=[];
const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>{pending.delete(key);reject(new Error(`CDP timeout: ${method}`));},method==="Page.captureScreenshot"||method==="Page.printToPDF"?60000:15000);pending.set(key,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});socket.send(JSON.stringify({id:key,method,params}));});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value;};
const wait=async(expression,timeout=10000)=>{const start=Date.now();while(Date.now()-start<timeout){if(await evaluate(`Boolean(${expression})`))return;await delay(120);}throw new Error(`Timed out: ${expression}`);};
const click=async text=>{await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!b)throw new Error('Button missing: '+${JSON.stringify(text)});if(b.disabled)throw new Error('Button disabled: '+${JSON.stringify(text)});b.click();})()`);await delay(120);};
const seed=async patch=>{await evaluate(`localStorage.setItem(finalQA.storageKey('final-qa'),JSON.stringify({...finalQA.freshProgress(),...${JSON.stringify(patch)}})); window.__qaReloading=true`);await send('Page.navigate',{url:fixture});await wait('!window.__qaReloading && !!document.querySelector(".fp-header") && !!window.finalQA');await delay(150);};
const core={best:3,transition:true,flowPaths:{0:['true','false'],1:['true','false'],2:['true','false']},built:[0,1,2]};
const range=async(label,value)=>{await evaluate(`(()=>{const input=document.querySelector('input[aria-label="${label}"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`);await delay(80);};
const saved=()=>evaluate(`JSON.parse(localStorage.getItem(finalQA.storageKey('final-qa')))`);
const energyTo=async target=>{
  await evaluate(`(()=>{const current=Number(document.querySelector('.br-slot').textContent);const label=${target}>current?'Increase energy':'Decrease energy';const button=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===label);for(let i=0;i<Math.abs(${target}-current);i++)button.click();})()`);
};
// The first run also films the 3D tape change: door, cassette, lens dive, PLAY.
let deckFilmed=false;
const startTutorial=async()=>{
  if(!deckFilmed){await wait('!!document.querySelector(".br-tape")',15000);await delay(400);const shelf=await send('Page.captureScreenshot',{format:'png'});writeFileSync(path.join(output,'tape-library.png'),Buffer.from(shelf.data,'base64'));}
  await evaluate(`window.__tapeDeckPace=${deckFilmed?1:0.25};document.querySelector(".br-primary--hero").click()`);await wait('!!document.querySelector(".br-deck")',5000);
  if(!deckFilmed){deckFilmed=true;await wait('document.querySelector(".br-deck")?.classList.contains("is-3d")',15000);let elapsed=0;
    // Filmed at quarter speed so each shot lands on its moment.
    for(const [at,name] of [[1000,'tape-door'],[2300,'tape-loaded'],[3150,'tape-lens'],[3800,'tape-play']].map(([at,name])=>[at*4,name])){await delay(at-elapsed);elapsed=at;const shot=await send('Page.captureScreenshot',{format:'png'});writeFileSync(path.join(output,`${name}.png`),Buffer.from(shot.data,'base64'));}}
  await wait('!!document.querySelector(".br-overlay--briefing")',15000);await click('START TUTORIAL');await wait('!!document.querySelector(".br-coach")',15000);};
const pressLabel=async label=>{await evaluate(`[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')===${JSON.stringify(label)}).click()`);await delay(120);};
try{
  let target;for(let i=0;i<70;i++){try{const list=await(await fetch(`http://127.0.0.1:${port}/json`)).json();target=list.find(t=>t.type==='page');if(target)break;}catch{}await delay(150);}
  if(!target)throw new Error('Browser debugging endpoint did not start.');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p?.reject(new Error(m.error.message));else p?.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value||a.description).join(' '));};
  await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1366,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:fixture});await wait('!!window.finalQA && !!document.querySelector(".fp-header")');
  if(!process.env.SHARPIE_QA_LAYOUT_ONLY&&!process.env.SHARPIE_QA_HUB_ONLY&&!process.env.SHARPIE_QA_BACKROOM_ONLY){
  await seed({});assert.equal(await evaluate('document.querySelectorAll(".fp-stage:disabled").length'),1);
  if(!navigationOnly){await pressLabel('Teacher preview');await evaluate('document.querySelectorAll(".fp-stage")[2].click()');await wait('!!document.querySelector(".fp-shadow-layout")');await pressLabel('Exit teacher preview');assert.equal((await saved()).activity,'overview');}
  else assert.equal(await evaluate('document.querySelectorAll(".fp-header button").length'),1);
  await evaluate('document.querySelectorAll(".fp-stage")[1].click()');await wait('!!document.querySelector(".lab-intro")');
  assert.equal((await saved()).labVisited,true);
  await click('BACK');await wait('!!document.querySelector(".lab-home")');
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".lab-station")].map(b=>b.getAttribute("aria-label"))'),['Live Flow','Quiz','Code Builder']);
  await pressLabel('Live Flow');
  console.log('PASS first visit Live Flow, lab home with three stations on reentry, and immediate stage access');
  for(let i=0;i<3;i++){
    await click('START LIVE FLOW');await wait('!!document.querySelector(".fp-flow-svg")');
    if(i===0){await pressLabel('Increase grade');assert.equal(await evaluate('Number(document.querySelector(".lab-stepper output").textContent)'),5.25);}
    const label=['grade','age','views'][i];
    for(const [j,value] of [[6.75,7],[12,13],[1000,1100]][i].entries()){
      await range(label,value);await click('PREDICT & RUN');await evaluate('document.querySelector(".lab-predict .is-true").click()');
      const branch=(i===0?value>=7:i===1?value<=12:value>1000)?'true':'false';
      await wait('!!document.querySelector(\'[data-segment="'+branch+'-end"]\')');
      assert.equal(await evaluate('document.querySelectorAll(".fp-wire-fill").length'),4);
      if(j===0)await wait('[...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="PREDICT & RUN"&&!b.disabled)');
      else await wait('!!document.querySelector(".lab-done")');
    }
    await click(i===2?'TAKE THE QUIZ →':'NEXT TICKET →');
  }
  assert.deepEqual((await saved()).flowPaths,{0:['false','true'],1:['true','false'],2:['false','true']});
  await wait('!!document.querySelector(".lab-quiz-intro")');
  await click('BACK');await wait('!!document.querySelector(".lab-home")');await pressLabel('Quiz');
  assert.match(await evaluate('document.querySelector(".lab-quiz-intro h1").textContent'),/Read it/);
  await click('START QUIZ');await wait('!!document.querySelector(".lab-answers")');
  console.log('PASS predicted flow branches, bold selected wires, worker output, the quiz next and from the lab home');
  if(!navigationOnly){
  await seed({...core,activity:'builder'});
  for(let index=0;index<10;index++){
    await evaluate(`document.querySelectorAll('.lab-ticket-group button')[${index}].click()`);await delay(100);
    const c=await evaluate(`finalQA.challenges[${index}]`);
    if(c.level.predict){await evaluate(`document.querySelector('[aria-label="Predict the output"] button').click()`);await delay(50);}
    if(c.level.repair.length){await click('RUN TESTS');await wait('!!document.querySelector(".lab-coach.is-wrong")');}
    const lines=['decl',`if (${c.condition})`,`Console.WriteLine(${JSON.stringify(c.yes)});`,'else',`Console.WriteLine(${JSON.stringify(c.no)});`];
    const open=[0,1,2,3,4].filter(n=>!c.level.given.includes(n));
    for(const n of open){await evaluate(`(()=>{const s=document.querySelector('[data-slot="${n}"]');if(s.classList.contains('is-filled'))s.click();})()`);await delay(50);}
    for(const n of open){
      await evaluate(`document.querySelector('[data-slot="${n}"]').click()`);await delay(50);
      await evaluate(`(()=>{const b=[...document.querySelectorAll('.lab-pieces button')].find(b=>b.dataset.line===${JSON.stringify(lines[n])});if(!b||b.disabled)throw new Error('Missing code piece');b.click();})()`);await delay(50);
    }
    await click('RUN TESTS');await wait('!!document.querySelector(".lab-done") && document.querySelectorAll(".lab-spec tr.is-pass").length===document.querySelectorAll(".lab-spec tbody tr").length');
  }
  assert.equal((await saved()).built.length,10);console.log('PASS building all ten programs from the code bank, with prediction and debugging, and real execution');
  await seed({...core,activity:'quiz'});
  for(let index=0;index<20;index++){
    const answer=await evaluate(`finalQA.questions[${index}].answer`);await evaluate(`document.querySelectorAll('.lab-answers button')[${answer}].click()`);await delay(60);await click(index===19?'SEE RESULTS':'NEXT');
    if(index%5===4&&index<19){await wait('!!document.querySelector(".lab-checkpoint")');await evaluate('document.querySelector(".lab-checkpoint .fp-primary").click()');await delay(60);}
  }
  assert.equal((await saved()).mastered.length,20);assert.equal((await saved()).quizIndex,20);await send('Page.reload');await wait('!!document.querySelector(".lab-review")');console.log('PASS twenty answers, saved quiz results and resume');
  await seed({...core,activity:'shadow'});
  for(let index=0;index<4;index++){
    assert.equal(await evaluate('document.querySelector("fieldset").disabled'),true);
    await click('01 · RUN BROKEN SYSTEM');await wait('!document.querySelector("fieldset").disabled && ![...document.querySelectorAll("button")].some(b=>b.textContent==="RUNNING…")');
    const m=await evaluate(`finalQA.missions[${index}]`);
    for(let n=0;n<2;n++){
      await evaluate(`document.querySelectorAll('.fp-patch-controls .fp-toggle button')[${n}].click()`);await delay(50);
      await evaluate(`[...document.querySelectorAll('.fp-patch-controls .fp-pieces button')].find(b=>b.textContent===${JSON.stringify(m.repaired[n])}).click()`);await delay(50);
    }
    await click('03 · RUN SIMULATION');await wait('document.querySelector(".fp-feedback")?.textContent.includes("PATCH SUCCESSFUL")');
    await click(index===3?'GENERATE AUDIT REPORT →':'NEXT CASE →');
  }
  await wait('!!document.querySelector(".fp-report")');assert.equal((await saved()).repaired.length,4);
  await evaluate(`(()=>{const t=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,'A rule can run correctly while hiding legitimate criticism.');t.dispatchEvent(new Event('input',{bubbles:true}));})()`);await delay(100);
  await send('Page.reload');await wait('!!document.querySelector(".fp-report")');assert.match(await evaluate('document.querySelector("textarea").value'),/legitimate criticism/);
  await send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:output});await click('↓ Export image');await delay(500);assert(existsSync(path.join(output,'Sharpie-White-Hat-Audit.svg')));
  const pdf=await send('Page.printToPDF',{printBackground:true,preferCSSPageSize:true});writeFileSync(path.join(output,'audit-report.pdf'),Buffer.from(pdf.data,'base64'));console.log('PASS broken systems, four repairs, feed updates, reflection reload, SVG/PDF exports');

  }
  }
  if(!process.env.SHARPIE_QA_LAYOUT_ONLY&&!process.env.SHARPIE_QA_HUB_ONLY&&!process.env.SHARPIE_QA_FLOW_ONLY){
  await seed({activity:'matrix'});await startTutorial();
  assert.match(await evaluate('document.querySelector(".br-coach").textContent'),/MAKE IT TRUE/);
  await energyTo(61);await wait('!document.querySelector(".br-coach")',5000);
  await wait('JSON.parse(localStorage.getItem(finalQA.storageKey("final-qa")))?.backroom?.gates>=1',15000);
  await wait('!!document.querySelector(".br-coach")',20000);assert.match(await evaluate('document.querySelector(".br-coach").textContent'),/FOLLOW THE CORRIDOR/);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});
  await wait('!!document.querySelector(".br-toast.is-bad")',15000);await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight'});
  assert.match(await evaluate('document.querySelector(".br-toast").textContent'),/WALL SCRAPE/);assert.equal(await evaluate('!!document.querySelector(".br-overlay--gameOver")'),false);
  await pressLabel('Pause run');assert.match(await evaluate('document.querySelector(".br-overlay").textContent'),/PAUSE/);await click('KEEP RUNNING');
  await wait('!!document.querySelector(".br-overlay--mistake")',30000);assert.match(await evaluate('document.querySelector(".br-overlay--mistake").textContent'),/THE GATE STAYED SHUT[\s\S]*70 < 30/);
  console.log('PASS Backrooms tutorial guide, gate opening, wall scrape without game over, pause and resume, closed-gate explanation');
  }
  const checks=[];
  for(const size of [{name:'desktop',width:1366,height:900},{name:'ipad',width:1024,height:768},{name:'ipad-short',width:1024,height:694},{name:'phone',width:390,height:844}]){
    if(process.env.SHARPIE_QA_VIEWPORT&&process.env.SHARPIE_QA_VIEWPORT!==size.name)continue;
    await send('Emulation.setDeviceMetricsOverride',{width:size.width,height:size.height,deviceScaleFactor:1,mobile:false});
    for(const activity of navigationOnly?['overview','matrix','lab','flow','quiz-intro']:process.env.SHARPIE_QA_HUB_ONLY?[]:process.env.SHARPIE_QA_OVERVIEW_ONLY?['overview']:process.env.SHARPIE_QA_BACKROOM_ONLY?['overview','matrix']:['overview','matrix','lab','flow','builder','quiz-intro','quiz','shadow','report']){
      await seed({...core,activity,repaired:[0,1,2,3],observed:[0,1,2,3],completedAt:'2026-10-13T12:00:00Z'});
      if(activity==='matrix'){
        await startTutorial();await energyTo(75);
        if(size.name==='ipad'){
          await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
          const point=await evaluate(`(()=>{const r=document.querySelector('[aria-label="Increase energy"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
          await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(150);
          const afterTouch=await evaluate('Number(document.querySelector(".br-slot").textContent)');assert(afterTouch>75&&afterTouch<=100);
          await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowUp',code:'ArrowUp'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowUp',code:'ArrowUp'});await delay(120);
          assert(await evaluate('Number(document.querySelector(".br-slot").textContent)')>afterTouch);
          await pressLabel('Pause run');assert.match(await evaluate('document.querySelector(".br-overlay").textContent'),/PAUSE/);await click('KEEP RUNNING');
          await send('Emulation.setTouchEmulationEnabled',{enabled:false});console.log('PASS native tablet tap, keyboard after focus, and pause and resume');
        }
        if(size.name==='ipad-short'){await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});assert.equal(await evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches'),true);}
      }
      if(activity==='flow'){
        const intro=await send('Page.captureScreenshot',{format:'png'});writeFileSync(path.join(output,`${size.name}-flow-intro.png`),Buffer.from(intro.data,'base64'));checks.push(`${size.name}/flow-intro`);
        await click('START LIVE FLOW');await click('PREDICT & RUN');await evaluate('document.querySelector(".lab-predict .is-false").click()');await wait('!!document.querySelector(\'[data-segment="false-end"]\')');await delay(650);
      }
      if(activity==='quiz'){
        // Answers deal in after a pause; the layout checks then run on the taller feedback state.
        await delay(1300);const question=await send('Page.captureScreenshot',{format:'png'});writeFileSync(path.join(output,`${size.name}-quiz-question.png`),Buffer.from(question.data,'base64'));checks.push(`${size.name}/quiz-question`);
        await evaluate('(()=>{const q=finalQA.questions[0];document.querySelectorAll(".lab-answer")[(q.answer+1)%4].click();})()');await delay(600);
      }
      await delay(150);
      const layout=await evaluate(`(()=>{const el=document.querySelector('.fp-content');const wide=[...document.querySelectorAll('.fp-content button')].filter(b=>{const r=b.getBoundingClientRect();return r.width&& (r.left < -1||r.right>innerWidth+1)}).map(b=>b.textContent);return {scroll:el.scrollWidth>el.clientWidth+2,wide,viewport:[innerWidth,innerHeight]};})()`);
      assert.equal(await evaluate('document.querySelector(".fp-header").getBoundingClientRect().height'),44);
      assert.equal(layout.scroll,false,`${size.name}/${activity} horizontal page overflow`);
      // The IF / ELSE Lab is designed to fit the screen: no vertical scrolling outside phones.
      if(size.name!=='phone'&&['lab','flow','builder','quiz-intro','quiz'].includes(activity))assert.equal(await evaluate('(()=>{const el=document.querySelector(".fp-content");return el.scrollHeight<=el.clientHeight+2&&document.scrollingElement.scrollHeight<=innerHeight+2})()'),true,`${size.name}/${activity} scrolls vertically`);assert.deepEqual(layout.wide,[],`${size.name}/${activity} clipped buttons`);
      const shot=await send('Page.captureScreenshot',{format:'png'});writeFileSync(path.join(output,`${size.name}-${activity}.png`),Buffer.from(shot.data,'base64'));checks.push(`${size.name}/${activity}`);
      if(activity==='flow'&&size.name==='ipad-short'){
        for(const flowIndex of [1,2]){
          await seed({...core,activity:'flow',flowIndex});
          await click('START LIVE FLOW');
          await click('PREDICT & RUN');await evaluate(`document.querySelector(".lab-predict .is-${flowIndex===1?'true':'false'}").click()`);
          await wait(`!!document.querySelector('[data-segment="${flowIndex===1?'true':'false'}-end"]')`);await delay(650);
          assert(await evaluate('document.querySelector(".lab-col--chart").getBoundingClientRect().bottom<=innerHeight'),`Flow ${flowIndex+1} output below tablet viewport`);
          const extra=await send('Page.captureScreenshot',{format:'png'});writeFileSync(path.join(output,`${size.name}-flow-${flowIndex+1}.png`),Buffer.from(extra.data,'base64'));checks.push(`${size.name}/flow-${flowIndex+1}`);
        }
      }
      await send('Emulation.setEmulatedMedia',{features:[]});
    }
    await send('Page.navigate',{url:`${base}/scripts/final-project-preview.html?hub`});await wait('!!document.querySelector(".module-grid-six")');
    assert.equal(await evaluate('document.querySelectorAll(".module-card").length'),6);
    const hubLayout=await evaluate(`(()=>{const cards=[...document.querySelectorAll('.module-card')].map(c=>{const r=c.getBoundingClientRect();return {x:r.x,right:r.right,top:r.top,bottom:r.bottom};});return {wide:cards.some(c=>c.x<0||c.right>innerWidth+1),clipped:innerWidth>820&&cards.some(c=>c.bottom>innerHeight+1)};})()`);
    assert.equal(hubLayout.wide,false,`${size.name} hub overflow`);assert.equal(hubLayout.clipped,false,`${size.name} sixth card below viewport`);
    const overlaps=await evaluate(`(()=>{const card=document.querySelector('.final-project-module'),text=card.querySelector('.module-content small').getBoundingClientRect(),button=card.querySelector('.module-open').getBoundingClientRect();return text.left<button.right&&text.right>button.left&&text.top<button.bottom&&text.bottom>button.top;})()`);
    assert.equal(overlaps,false,`${size.name} subtitle overlaps the Open button`);
    const hubShot=await send('Page.captureScreenshot',{format:'png'});writeFileSync(path.join(output,`${size.name}-hub.png`),Buffer.from(hubShot.data,'base64'));checks.push(`${size.name}/hub`);
    await evaluate(`[...document.querySelectorAll('.module-card')].find(b=>b.textContent.includes('Final project')).click()`);await wait('!!document.querySelector(".fp-header")');
  }
  assert.deepEqual(errors,[],'Browser console errors');writeFileSync(path.join(output,process.env.SHARPIE_QA_HUB_ONLY?'hub-checks.json':process.env.SHARPIE_QA_OVERVIEW_ONLY?'overview-checks.json':process.env.SHARPIE_QA_BACKROOM_ONLY?'backroom-checks.json':'checks.json'),JSON.stringify({passed:checks,errors},null,2));console.log(`PASS ${checks.length} responsive captures, no horizontal page overflow or console errors`);
}catch(error){console.error(error);if(socket?.readyState===1){try{console.error(await evaluate('document.body.innerText'));const shot=await send('Page.captureScreenshot',{format:'png'});writeFileSync(path.join(output,'failure.png'),Buffer.from(shot.data,'base64'));}catch{}}process.exitCode=1;
}finally{if(socket?.readyState===1)socket.send(JSON.stringify({id:++id,method:'Browser.close'}));socket?.close();browser.kill();}
