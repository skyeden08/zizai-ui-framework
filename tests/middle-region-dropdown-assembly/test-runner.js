import { LayoutContainer } from "../../src/components/layout-container.js";
import { TopRegion } from "../../src/components/top-region.js";
import { LeftRegion } from "../../src/components/left-region.js";
import { MiddleRegion } from "../../src/components/middle-region.js?rev=phase8-dropdown-1";
import { RightRegion } from "../../src/components/right-region.js";

let started = false;
async function startTests() {
  if (started) return;
  started = true;
  const output = document.getElementById("results");
  const fixture = document.getElementById("fixture");
  const lines = [];
  let completed = 0, passed = 0, failed = 0;
  const render = (message = "") => {
    output.textContent = [...lines, `已完成：${completed} 項；通過：${passed}；未通過：${failed}`, message].filter(Boolean).join("\n");
    output.dataset.status = message.startsWith("ERROR") ? "error" : "running";
  };
  const test = (name, ok, detail = "") => {
    completed++;
    if (ok) { passed++; lines.push(`PASS  ${name}`); }
    else { failed++; lines.push(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
    render();
  };
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const width = element => element.getBoundingClientRect().width;
  const near = (a,b,t=2) => Math.abs(a-b)<=t;
  const drag = (handle,id,startX,endX) => {
    handle.setPointerCapture = () => {};
    handle.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,cancelable:true,pointerId:id,pointerType:"mouse",isPrimary:true,button:0,buttons:1,clientX:startX}));
    handle.dispatchEvent(new PointerEvent("pointermove",{bubbles:true,cancelable:true,pointerId:id,pointerType:"mouse",isPrimary:true,button:0,buttons:1,clientX:endX}));
    handle.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,cancelable:true,pointerId:id,pointerType:"mouse",isPrimary:true,button:0,clientX:endX}));
  };
  try {
    if (!output || !fixture || typeof PointerEvent !== "function") throw new Error("測試環境必要節點或 PointerEvent 不存在");
    for (const [tag, ctor] of [["zizai-layout-container",LayoutContainer],["zizai-top-region",TopRegion],["zizai-left-region",LeftRegion],["zizai-middle-region",MiddleRegion],["zizai-right-region",RightRegion]]) {
      if (!customElements.get(tag)) customElements.define(tag,ctor);
    }
    const container=document.createElement("zizai-layout-container");
    container.style.height="36rem";
    const top=document.createElement("zizai-top-region"),left=document.createElement("zizai-left-region"),middle=document.createElement("zizai-middle-region"),right=document.createElement("zizai-right-region");
    container.append(top,left,middle,right);fixture.replaceChildren(container);
    container.connectRegion(left);container.connectRegion(middle);container.connectRegion(right);
    await frame();await frame();
    const mr=middle.shadowRoot, rr=right.shadowRoot;
    const header=mr.querySelector('[data-role="dropdown-header"]');
    const trigger=mr.querySelector('[data-role="dropdown-trigger"]');
    const menu=mr.querySelector('[data-role="dropdown-menu"]');
    const option=menu?.querySelector('[data-dropdown-option]');
    const content=mr.querySelector("#region-content");
    const conversation=mr.querySelector('[data-role="conversation-position"]');
    const input=mr.querySelector('[data-role="input-position"]');
    const initial=[width(left),width(middle),width(right)];
    test("需求主題列位於中間區標頭下方、對話內容上方",!!header&&!!trigger&&header.compareDocumentPosition(content)&Node.DOCUMENT_POSITION_FOLLOWING&&header.parentElement===mr.querySelector(".region-frame"));
    test("需求主題選單只呈現尚未建立，未發明選項",menu?.children.length===1&&option?.textContent.trim()==="尚未建立"&&trigger?.textContent==="需求主題：尚未建立");
    trigger?.click();
    const opened=!menu.hidden&&trigger.getAttribute("aria-expanded")==="true";
    test("中間區需求主題下拉選單可開啟與收合",opened);
    option?.click();
    const selected=menu.hidden&&trigger.dataset.selectedValue==="not-created"&&trigger.textContent==="需求主題：尚未建立"&&trigger.getAttribute("aria-expanded")==="false";
    test("中間區可選取尚未建立，選取狀態由中間區自身持有",selected&&mr.contains(trigger)&&!container.shadowRoot.querySelector('[data-role="dropdown-trigger"]')&&!Object.keys(window).some(k=>/dropdown.*(state|option)|selected.*topic/i.test(k)));
    const rightTrigger=rr.querySelector('[data-role="dropdown-trigger"]'),rightMenu=rr.querySelector('[data-role="dropdown-menu"]');
    rightTrigger?.click();const rightOpen=!rightMenu.hidden&&rightTrigger.getAttribute("aria-expanded")==="true";
    rightTrigger?.click();const rightClosed=rightMenu.hidden&&rightTrigger.getAttribute("aria-expanded")==="false";
    test("右側區既有下拉選單仍可正常開啟與收合",rightOpen&&rightClosed);
    let allCollapse=true;
    for(const [name,region] of [["左側區",left],["中間區",middle],["右側區",right]]) {
      const root=region.shadowRoot,t=root.querySelector('[data-role="collapse-toggle"]'),body=root.querySelector(".region-content");
      if(!t||!body){allCollapse=false;continue;}
      t.click();const a=body.hidden&&t.getAttribute("aria-expanded")==="false";
      t.click();const b=!body.hidden&&t.getAttribute("aria-expanded")==="true";
      allCollapse=allCollapse&&a&&b;
    }
    test("左、中、右區既有區域級開合仍正常",allCollapse);
    const leftHandle=left.shadowRoot.querySelector('[data-role="resize-handle"]'),middleHandle=mr.querySelector('[data-role="resize-handle"]');
    const before=[width(left),width(middle),width(right)];
    if(leftHandle)drag(leftHandle,501,180,200);await frame();
    const leftDrag=!!leftHandle&&width(left)>before[0]+8&&near(width(middle),before[1])&&near(width(right),before[2]);
    const midBefore=[width(left),width(middle),width(right)];
    if(middleHandle)drag(middleHandle,502,300,270);await frame();
    const middleDrag=!!middleHandle&&width(middle)<midBefore[1]-8&&width(right)>midBefore[2]+8&&near(width(left),midBefore[0]);
    test("左／中拖曳調整仍正常，僅影響相鄰區域",leftDrag&&middleDrag);
    test("左、中、右區初始寬度維持 2:4:4",initial.every(x=>x>0)&&near(initial[1]/initial[0],2,.05)&&near(initial[2]/initial[0],2,.05),initial.map(x=>x.toFixed(1)).join(" / "));
    test("原有對話呈現位置與對話輸入位置未受影響",!!conversation&&!!input&&conversation.getAttribute("aria-label")==="對話呈現位置"&&input.getAttribute("aria-label")==="對話輸入位置"&&conversation.querySelector("slot[name='conversation']")&&input.querySelector("slot[name='input']")&&content.contains(conversation)&&content.contains(input));
    const source=await (await fetch(new URL("../../src/components/middle-region.js?rev=phase8-dropdown-1",import.meta.url))).text();
    test("中間區引用第二階段既有 bindDropdown，未自行實作事件能力",source.includes('import { bindDropdown, syncDropdownState } from "../capabilities/dropdown.js";')&&source.includes("bindDropdown({")&&!/addEventListener\(["']click["']/.test(source));
    render(failed===0?"測試結束：全部通過":"測試結束：有項目未通過");
    output.dataset.status=failed===0?"passed":"failed";
  } catch(error) {
    const message=error instanceof Error?`${error.name}: ${error.message}`:String(error);
    lines.push(`ERROR  ${message}`);render(`ERROR 已中止：${message}`);output.dataset.status="error";
  }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startTests,{once:true});else startTests();