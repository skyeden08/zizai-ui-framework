let started=false;
async function startTests(){
 if(started)return; started=true;
 const results=document.getElementById("results"),fixture=document.getElementById("fixture"),lines=[];
 let completed=0,passed=0,failed=0;
 window.__resizeTestLines=lines; window.__resizeTestCompleted=0;
 const render=(message="")=>{
  if(!results)return window.__resizeTestReportError?.("找不到結果容器 #results");
  results.textContent=[...lines,`已完成：${completed} 項；通過：${passed}；未通過：${failed}`,message].filter(Boolean).join("\n");
  results.dataset.status=message.startsWith("ERROR")?"error":"running"; window.__resizeTestCompleted=completed;
 };
 const record=(name,ok,detail="")=>{completed++;if(ok){passed++;lines.push(`PASS  ${name}`)}else{failed++;lines.push(`FAIL  ${name}${detail?` — ${detail}`:""}`)}render()};
 const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 const w=r=>r.getBoundingClientRect().width, close=(a,b,t=2)=>Math.abs(a-b)<=t;
 const widths=()=>[w(left),w(middle),w(right)], fmt=a=>a.map(x=>x.toFixed(1)).join(" / ");
 const drag=async(region,dx,id)=>{
  const h=region.shadowRoot.querySelector('[data-role="resize-handle"]');if(!h)throw Error("找不到分隔線拖曳把手");
  h.setPointerCapture=()=>{};const init={bubbles:true,cancelable:true,pointerId:id,isPrimary:true,button:0,clientX:200};
  h.dispatchEvent(new PointerEvent("pointerdown",init));
  h.dispatchEvent(new PointerEvent("pointermove",{...init,buttons:1,clientX:200+dx}));
  h.dispatchEvent(new PointerEvent("pointerup",{...init,buttons:0,clientX:200+dx}));await frame();
 };
 try{
  if(!results||!fixture)throw Error("缺少測試結果區或掛載區");if(typeof PointerEvent!=="function")throw Error("瀏覽器不支援 PointerEvent");
  const [{LayoutContainer},{TopRegion},{LeftRegion},{MiddleRegion},{RightRegion}]=await Promise.all([
   import("../../src/components/layout-container.js"),import("../../src/components/top-region.js"),
   import("../../src/components/left-region.js"),import("../../src/components/middle-region.js"),import("../../src/components/right-region.js")]);
  for(const [n,k] of [["zizai-layout-container",LayoutContainer],["zizai-top-region",TopRegion],["zizai-left-region",LeftRegion],["zizai-middle-region",MiddleRegion],["zizai-right-region",RightRegion]])if(!customElements.get(n))customElements.define(n,k);
  const container=document.createElement("zizai-layout-container");
  const top=document.createElement("zizai-top-region"),left=document.createElement("zizai-left-region"),middle=document.createElement("zizai-middle-region"),right=document.createElement("zizai-right-region");
  container.append(top,left,middle,right);fixture.append(container);container.connectRegion(left);container.connectRegion(middle);container.connectRegion(right);await frame();
  const initial=widths(),containerWidth=container.getBoundingClientRect().width,leftEdge=left.getBoundingClientRect().left,rightEdge=right.getBoundingClientRect().right;
  record("初始比例維持 2:4:4",close(initial[1]/initial[0],2,.03)&&close(initial[2]/initial[0],2,.03),`實際寬度：${fmt(initial)}`);
  const lh=left.shadowRoot.querySelector('[data-role="resize-handle"]'),mh=middle.shadowRoot.querySelector('[data-role="resize-handle"]'),rh=right.shadowRoot.querySelector('[data-role="resize-handle"]');
  record("拖曳入口只位於兩條內部分隔線，外側邊框沒有拖曳入口",Boolean(lh&&mh&&!rh)&&close(lh.getBoundingClientRect().right,left.getBoundingClientRect().right,1)&&close(mh.getBoundingClientRect().right,middle.getBoundingClientRect().right,1),`左／中：${Boolean(lh)}；中／右：${Boolean(mh)}；右區重複入口：${Boolean(rh)}`);
  const check=async(name,region,dx,id,before,a,b,c)=>{
   await drag(region,dx,id);const after=widths(),expected=[...before];expected[a]+=dx;expected[b]-=dx;
   const pairBefore=before[a]+before[b],pairAfter=after[a]+after[b];
   const pairOk=close(after[a],expected[a])&&close(after[b],expected[b])&&close(pairAfter,pairBefore);
   const thirdOk=close(after[c],before[c]);
   const outerOk=close(container.getBoundingClientRect().width,containerWidth)&&close(left.getBoundingClientRect().left,leftEdge)&&close(right.getBoundingClientRect().right,rightEdge);
   record(name,pairOk&&thirdOk&&outerOk,`前：${fmt(before)}；後：${fmt(after)}；兩區總寬：${pairBefore.toFixed(1)} → ${pairAfter.toFixed(1)}；第三區不變：${thirdOk}；外側固定：${outerOk}`);
   return after;
  };
  let current=await check("左／中分隔線往右：左變寬、中變窄，右不變",left,(initial[0]+initial[1])*0.08,101,initial,0,1,2);
  current=await check("左／中分隔線往左：左變窄、中變寬，右不變",left,-(current[0]+current[1])*0.04,102,current,0,1,2);
  current=await check("中／右分隔線往右：中變寬、右變窄，左不變",middle,(current[1]+current[2])*0.06,103,current,1,2,0);
  current=await check("中／右分隔線往左：中變窄、右變寬，左不變",middle,-(current[1]+current[2])*0.03,104,current,1,2,0);
  record("整體版面寬度及左右外側邊界固定",close(container.getBoundingClientRect().width,containerWidth)&&close(left.getBoundingClientRect().left,leftEdge)&&close(right.getBoundingClientRect().right,rightEdge));
  const contents=[left,middle,right].map(r=>r.shadowRoot.querySelector(".region-content"));
  record("三區獨立垂直捲動設定維持",contents.every(el=>getComputedStyle(el).overflowY==="auto"));
  const topPosition=getComputedStyle(top).position,cs=getComputedStyle(container);
  record("上方區固定與 column-gap 分隔線設定維持",topPosition==="sticky"&&cs.columnGap==="1px",`上方區 position=${topPosition}；column-gap=${cs.columnGap}`);
  const toggle=left.shadowRoot.querySelector('[data-role="collapse-toggle"]');toggle.click();const collapsed=contents[0].hidden;toggle.click();record("收合與展開行為維持",collapsed&&!contents[0].hidden);
  render(`測試結束：${failed===0?"全部通過":"有項目未通過"}`);results.dataset.status=failed===0?"passed":"failed";
 }catch(error){lines.push(`ERROR  ${error instanceof Error?error.name+": "+error.message:String(error)}`);render(`已中止；已完成 ${completed} 項`);if(results)results.dataset.status="error"}
}
function launch(){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startTests,{once:true});else startTests()}
try{launch()}catch(error){window.__resizeTestReportError?.(error instanceof Error?error.name+": "+error.message:String(error))}
