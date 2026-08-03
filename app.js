(() => {
  "use strict";
  const DB_NAME = "answersearch-db", STORE = "banks", DB_VERSION = 1;
  const els = Object.fromEntries(["uploadPanel","dropZone","fileInput","loadError","workspace","bankCount","bankList","searchInput","resetSearchBtn","typeFilter","fileSummary","resultSummary","emptyState","noResult","results","firstUse","addBankBtn","asideAddBtn","firstAddBtn","closeUploadBtn"].map(id => [id, document.getElementById(id)]));
  let banks = [], activeBankId = "", db;

  const aliases = {
    type:["类型","题型","type","questiontype","题目类型","分类"],
    question:["题干","题目","问题","提问","标题","名称","主题","关键词","question","title","name","subject","prompt","key"],
    answer:["答案","正确答案","参考答案","回复","内容","正文","详情","说明","知识","知识内容","value","answer","content","detail","description","response"],
    explanation:["解析","答案解析","备注","补充","解释","来源","出处","explanation","analysis","remark","note","source"],
    optionA:["选项a","a","optiona","答案a"], optionB:["选项b","b","optionb","答案b"],
    optionC:["选项c","c","optionc","答案c"], optionD:["选项d","d","optiond","答案d"],
    optionE:["选项e","e","optione","答案e"], optionF:["选项f","f","optionf","答案f"]
  };
  const allAliasNames = new Set(Object.values(aliases).flat().map(normalizeHeader));
  const titleAliases = new Set(aliases.question.map(normalizeHeader));
  const answerAliases = new Set(aliases.answer.map(normalizeHeader));

  function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:"id"});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  function dbGetAll(){return new Promise((resolve,reject)=>{const r=db.transaction(STORE,"readonly").objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);});}
  function dbPut(bank){return new Promise((resolve,reject)=>{const r=db.transaction(STORE,"readwrite").objectStore(STORE).put(bank);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);});}
  function dbDelete(id){return new Promise((resolve,reject)=>{const r=db.transaction(STORE,"readwrite").objectStore(STORE).delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);});}

  const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  function normalizeHeader(v){return String(v??"").trim().toLowerCase().replace(/[\s_\-—（）()【】[\]：:]/g,"");}
  const normalize=v=>String(v??"").toLowerCase().replace(/\s+/g,"");
  const clean=v=>String(v??"").trim();
  function pinyinText(v){try{return window.pinyinPro?.pinyin(String(v??""),{toneType:"none",type:"array"}).join("").toLowerCase()||"";}catch{return"";}}
  function isBlankRow(row){return !row.some(v=>clean(v));}
  function trimMatrix(matrix){
    const rows=(matrix||[]).map(row=>(row||[]).map(clean)).filter(row=>!isBlankRow(row));
    if(!rows.length)return [];
    let last=0; rows.forEach(r=>r.forEach((v,i)=>{if(v)last=Math.max(last,i);}));
    return rows.map(r=>Array.from({length:last+1},(_,i)=>r[i]||""));
  }
  function looksLikeHeader(row, nextRows){
    const values=row.map(clean).filter(Boolean);
    if(!values.length)return false;
    const normalized=values.map(normalizeHeader);
    if(normalized.some(v=>allAliasNames.has(v)))return true;
    const unique=new Set(normalized).size===normalized.length;
    const short=values.filter(v=>v.length<=24).length/values.length>=0.8;
    const dataBelow=nextRows.some(r=>r.some(Boolean));
    const repeatedBelow=nextRows.slice(0,5).some(r=>r.some((v,i)=>v&&normalizeHeader(v)===normalized[i]));
    return unique&&short&&dataBelow&&!repeatedBelow;
  }
  function uniqueHeaders(row){
    const used=new Map();
    return row.map((v,i)=>{
      const base=clean(v)||`第${i+1}列`;
      const count=(used.get(base)||0)+1; used.set(base,count);
      return count===1?base:`${base}_${count}`;
    });
  }
  function aliasIndex(headers,key){
    const wanted=new Set(aliases[key].map(normalizeHeader));
    return headers.findIndex(h=>wanted.has(normalizeHeader(h)));
  }
  function getCell(row,index){return index>=0?clean(row[index]):"";}
  function extraFields(headers,row,excluded){
    return headers.map((label,i)=>({label,value:getCell(row,i),i}))
      .filter(x=>x.value&&!excluded.has(x.i))
      .map(({label,value})=>({label,value}));
  }
  function buildRecord({question,answer="",explanation="",options=[],extras=[],sheetName="",kind="knowledge",id}){
    const q=clean(question), a=clean(answer), ex=clean(explanation);
    const safeExtras=(extras||[]).filter(x=>clean(x.value));
    const allText=[q,a,ex,...options,...safeExtras.flatMap(x=>[x.label,x.value]),sheetName].join(" ");
    return {
      id, type:options.some(Boolean)?"choice":"qa", kind, question:q||a||"未命名条目",
      options, answer:a, explanation:ex, extras:safeExtras, sheetName,
      searchText:normalize(allText), pinyinText:pinyinText(allText)
    };
  }
  function parseSheet(matrix,sheetName){
    const rows=trimMatrix(matrix);
    if(!rows.length)return [];
    const hasHeader=looksLikeHeader(rows[0],rows.slice(1,6));
    const headers=hasHeader?uniqueHeaders(rows[0]):rows[0].map((_,i)=>`第${i+1}列`);
    const dataRows=hasHeader?rows.slice(1):rows;
    const qIdx=aliasIndex(headers,"question"), aIdx=aliasIndex(headers,"answer"), eIdx=aliasIndex(headers,"explanation"), tIdx=aliasIndex(headers,"type");
    const optionIdx=["optionA","optionB","optionC","optionD","optionE","optionF"].map(k=>aliasIndex(headers,k));
    const recognized=[qIdx,aIdx,eIdx,tIdx,...optionIdx].some(i=>i>=0);
    const colCount=headers.length;
    return dataRows.map((row,rowIndex)=>{
      if(isBlankRow(row))return null;
      const values=row.map(clean);
      const nonEmpty=values.map((v,i)=>({v,i})).filter(x=>x.v);
      if(!nonEmpty.length)return null;
      const options=optionIdx.map(i=>getCell(row,i));
      const excluded=new Set([qIdx,aIdx,eIdx,tIdx,...optionIdx].filter(i=>i>=0));
      let question="",answer="",explanation="",extras=[],kind="knowledge";

      if(recognized){
        question=getCell(row,qIdx);
        answer=getCell(row,aIdx);
        explanation=getCell(row,eIdx);
        extras=extraFields(headers,row,excluded);
        if(!question){
          const candidate=nonEmpty.find(x=>!excluded.has(x.i))||nonEmpty[0];
          question=candidate?.v||"";
          extras=extras.filter(x=>x.value!==question);
        }
        kind=options.some(Boolean)?"question":(qIdx>=0&&aIdx>=0?"qa":"knowledge");
      } else if(colCount===1){
        question=nonEmpty[0].v;
        kind="knowledge";
      } else if(colCount===2){
        question=values[0]||values[1];
        answer=values[0]?values[1]:"";
        kind="knowledge";
      } else {
        const titleCandidate=headers.findIndex(h=>titleAliases.has(normalizeHeader(h)));
        const contentCandidate=headers.findIndex(h=>answerAliases.has(normalizeHeader(h)));
        const primary=titleCandidate>=0?titleCandidate:nonEmpty[0].i;
        question=getCell(row,primary);
        const secondary=contentCandidate>=0&&contentCandidate!==primary?contentCandidate:-1;
        answer=getCell(row,secondary);
        const excludedFallback=new Set([primary,secondary].filter(i=>i>=0));
        extras=extraFields(headers,row,excludedFallback);
        kind="knowledge";
      }
      if(!question&&!answer&&!extras.length)return null;
      return buildRecord({id:`${sheetName}-${rowIndex+1}`,question,answer,explanation,options,extras,sheetName,kind});
    }).filter(Boolean);
  }
  function parseCsvMatrix(text){
    const rows=[];let row=[],cell="",quoted=false;
    for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];
      if(c==='"'&&quoted&&n==='"'){cell+='"';i++;}
      else if(c==='"')quoted=!quoted;
      else if(c===","&&!quoted){row.push(cell);cell="";}
      else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&n==="\n")i++;row.push(cell);if(row.some(v=>clean(v)))rows.push(row);row=[];cell="";}
      else cell+=c;
    }
    row.push(cell);if(row.some(v=>clean(v)))rows.push(row);return rows;
  }
  async function readFile(file){
    const ext=file.name.split(".").pop().toLowerCase();
    if(ext==="csv")return [{name:"CSV",matrix:parseCsvMatrix(await file.text())}];
    if(!window.XLSX)throw new Error("Excel 解析组件加载失败，请检查网络或改用 CSV。");
    const book=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:false});
    if(!book.SheetNames.length)throw new Error("文件中没有可读取的工作表。");
    return book.SheetNames.map(name=>({name,matrix:XLSX.utils.sheet_to_json(book.Sheets[name],{header:1,defval:"",raw:false,blankrows:false})}));
  }
  async function handleFiles(files){
    hideError();
    for(const file of [...files]){
      const ext=file.name.split(".").pop().toLowerCase();
      if(!["xlsx","xls","csv"].includes(ext)){showError(`${file.name} 格式不支持`);continue;}
      try{
        const sheets=await readFile(file);
        const records=sheets.flatMap(s=>parseSheet(s.matrix,s.name));
        if(!records.length)throw new Error("未识别到有效内容");
        const existing=banks.find(b=>b.name===file.name);
        const bank={id:existing?.id||uid(),name:file.name,questions:records,updatedAt:Date.now(),sheetCount:sheets.length};
        await dbPut(bank);
        banks=banks.filter(b=>b.id!==bank.id).concat(bank).sort((a,b)=>b.updatedAt-a.updatedAt);
        activeBankId=bank.id;
      }catch(err){showError(`${file.name}：${err.message||"解析失败"}`);}
    }
    els.fileInput.value=""; closeUpload(); render();
  }
  function migrateBank(bank){
    bank.questions=(bank.questions||[]).map((q,i)=>{
      q.extras=q.extras||[]; q.kind=q.kind|| (q.options?.some(Boolean)?"question":"qa");
      q.sheetName=q.sheetName||"";
      const all=[q.question,q.answer,q.explanation,...(q.options||[]),...q.extras.flatMap(x=>[x.label,x.value]),q.sheetName].join(" ");
      q.searchText=q.searchText||normalize(all); q.pinyinText=q.pinyinText||pinyinText(all); q.id=q.id||i+1;
      return q;
    });
    return bank;
  }
  function activeBank(){return banks.find(b=>b.id===activeBankId)||banks[0];}
  function render(){
    const has=banks.length>0;
    els.firstUse.classList.toggle("hidden",has); els.workspace.classList.toggle("hidden",!has);
    if(!has){els.uploadPanel.classList.add("hidden");return;}
    if(!activeBankId)activeBankId=banks[0].id;
    els.bankCount.textContent=`${banks.length} 个`;
    els.bankList.innerHTML=banks.map(b=>`<div class="bank-item ${b.id===activeBankId?"active":""}" data-id="${b.id}"><button class="bank-select" type="button"><strong>${esc(b.name)}</strong><span>${b.questions.length} 条 · ${b.sheetCount||1} 个工作表</span></button><button class="bank-delete" type="button" aria-label="删除题库" data-delete="${b.id}">×</button></div>`).join("");
    const bank=activeBank(); els.fileSummary.textContent=`${bank.name} · 共 ${bank.questions.length} 条内容`; search();
  }
  function tokens(){return els.searchInput.value.trim().split(/\s+/).filter(Boolean);}
  function search(){
    const bank=activeBank();if(!bank)return;
    const raw=tokens(),terms=raw.map(x=>({raw:x,n:normalize(x),p:normalize(pinyinText(x))})),type=els.typeFilter.value;
    els.resetSearchBtn.classList.toggle("hidden",!raw.length);
    if(!terms.length){els.results.innerHTML="";els.noResult.classList.add("hidden");els.emptyState.classList.remove("hidden");els.resultSummary.textContent="请输入关键词";return;}
    const matched=bank.questions.filter(q=>(type==="all"||q.type===type)&&terms.every(t=>q.searchText.includes(t.n)||q.pinyinText.includes(t.n)||q.pinyinText.includes(t.p)));
    els.emptyState.classList.add("hidden");els.resultSummary.textContent=`命中 ${matched.length} 条`;
    if(!matched.length){els.results.innerHTML="";els.noResult.classList.remove("hidden");return;}
    els.noResult.classList.add("hidden");els.results.innerHTML=matched.map((q,i)=>card(q,i,raw)).join("");
  }
  function highlight(value,terms){
    let html=esc(value);
    const sorted=[...terms].filter(t=>/[\u3400-\u9fffA-Za-z0-9]/.test(t)).sort((a,b)=>b.length-a.length);
    for(const term of sorted){const safe=esc(term).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");try{html=html.replace(new RegExp(`(${safe})`,"gi"),"<mark>$1</mark>");}catch{}}
    return html;
  }
  function kindLabel(q){return q.type==="choice"?"选择题":q.kind==="knowledge"?"知识条目":"问答题";}
  function card(q,i,terms){
    const opts=(q.options||[]).map((o,j)=>({o,l:String.fromCharCode(65+j)})).filter(x=>x.o).map(x=>`<div class="option"><span class="option-label">${x.l}.</span>${highlight(x.o,terms)}</div>`).join("");
    const extras=(q.extras||[]).map(x=>`<div class="extra-row"><strong>${highlight(x.label,terms)}</strong><span>${highlight(x.value,terms)}</span></div>`).join("");
    const meta=q.sheetName?`<span class="sheet-badge">${esc(q.sheetName)}</span>`:"";
    const answer=q.answer?`<div class="answer-block"><div class="answer-title">${q.kind==="knowledge"?"内容":"答案"}</div><div class="answer-content">${highlight(q.answer,terms)}</div></div>`:"";
    return `<article class="question-card"><div class="question-main"><div class="question-head"><span class="number">${i+1}</span><span class="badge">${kindLabel(q)}</span>${meta}<div class="question-text">${highlight(q.question,terms)}</div></div>${opts?`<div class="options">${opts}</div>`:""}</div>${answer}${extras?`<div class="extra-fields">${extras}</div>`:""}${q.explanation?`<div class="explanation"><strong>补充信息</strong>${highlight(q.explanation,terms)}</div>`:""}</article>`;
  }
  function openUpload(){els.uploadPanel.classList.remove("hidden");els.uploadPanel.scrollIntoView({behavior:"smooth",block:"start"});}
  function closeUpload(){els.uploadPanel.classList.add("hidden");hideError();}
  function showError(msg){els.loadError.textContent=msg;els.loadError.classList.remove("hidden");}
  function hideError(){els.loadError.textContent="";els.loadError.classList.add("hidden");}
  [els.addBankBtn,els.asideAddBtn,els.firstAddBtn].forEach(b=>b.addEventListener("click",openUpload));els.closeUploadBtn.addEventListener("click",closeUpload);
  els.dropZone.addEventListener("click",()=>els.fileInput.click());els.dropZone.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();els.fileInput.click();}});els.fileInput.addEventListener("change",e=>handleFiles(e.target.files));
  ["dragenter","dragover"].forEach(n=>els.dropZone.addEventListener(n,e=>{e.preventDefault();els.dropZone.classList.add("dragover");}));
  ["dragleave","drop"].forEach(n=>els.dropZone.addEventListener(n,e=>{e.preventDefault();els.dropZone.classList.remove("dragover");}));
  els.dropZone.addEventListener("drop",e=>handleFiles(e.dataTransfer.files));
  els.bankList.addEventListener("click",async e=>{const del=e.target.closest("[data-delete]");if(del){e.stopPropagation();const id=del.dataset.delete;if(confirm("确认删除这个本地题库？")){await dbDelete(id);banks=banks.filter(b=>b.id!==id);if(activeBankId===id)activeBankId=banks[0]?.id||"";render();}return;}const item=e.target.closest(".bank-item");if(item){activeBankId=item.dataset.id;render();}});
  els.searchInput.addEventListener("input",search);els.typeFilter.addEventListener("change",search);els.resetSearchBtn.addEventListener("click",()=>{els.searchInput.value="";search();els.searchInput.focus();});
  document.addEventListener("keydown",e=>{if(e.key==="/"&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();els.searchInput.focus();}});
  (async()=>{try{db=await openDb();banks=(await dbGetAll()).map(migrateBank).sort((a,b)=>b.updatedAt-a.updatedAt);activeBankId=banks[0]?.id||"";render();}catch{showError("浏览器本地存储初始化失败，请确认未处于严格隐私模式。");els.firstUse.classList.remove("hidden");}})();
})();
