// End-to-end tests: loads index.html in jsdom with mocked MyGene, UCSC and gnomAD APIs. Run: npm test
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'), path=require('path');
const FILE=process.argv[2]||path.join(__dirname,'..','index.html');
let pass=0,fail=0; const F=[];
const ok=(n,c,info='')=>{ if(c) pass++; else {fail++; F.push(n+(info?'  → '+info:''));} };
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// real CSNK2A1 model (hg38, minus strand)
const starts=[472497,486375,487426,488677,489779,492253,495718,497720,499254,499832,505117,508450,527932,543671], ends=[484076,486462,487575,488778,489881,492364,495802,497780,499305,499934,505229,508660,528049,543790];
const maneItem={chrom:'chr20',chromStart:472497,chromEnd:543790,name:'ENST00000217244.9',score:0,strand:'-',thickStart:483960,thickEnd:508551,reserved:0,blockCount:14,
  blockSizes:starts.map((s,i)=>ends[i]-s).join(',')+',',chromStarts:starts.map(s=>s-472497).join(',')+',',name2:'CSNK2A1',cdsStartStat:'cmpl',cdsEndStat:'cmpl',exonFrames:'',type:'protein_coding',
  geneName:'ENSG00000101266.19',geneName2:'CSNK2A1',geneType:'protein_coding',ensemblProtAcc:'ENSP00000217244.3',ncbiId:'NM_177559.3',ncbiGene:'1457',ncbiProtAcc:'NP_808227.1',maneStat:'MANE Select'};
const gp=(name)=>({bin:585,name,chrom:'chr20',strand:'-',txStart:472497,txEnd:543790,cdsStart:483960,cdsEnd:508551,exonCount:14,exonStarts:starts.join(',')+',',exonEnds:ends.join(',')+',',score:0,name2:'CSNK2A1',cdsStartStat:'cmpl',cdsEndStat:'cmpl',exonFrames:''});
const SVS=[
 {variant_id:'DEL_CHR20_A',chrom:'20',pos:495000,end:499400,length:4401,type:'DEL',ac:3,an:126000,af:2.38e-5,ac_hom:0,homozygote_count:0,filters:[],major_consequence:'lof'},
 {variant_id:'DUP_CHR20_B',chrom:'20',pos:486300,end:488800,length:2501,type:'DUP',ac:1,an:126000,af:7.9e-6,ac_hom:0,homozygote_count:0,filters:['LOW_CALL_RATE'],major_consequence:'dup_partial'},
 {variant_id:'INS_CHR20_C',chrom:'20',pos:489000,end:489001,length:6000,type:'INS',ac:2,an:126000,af:1.6e-5,ac_hom:0,homozygote_count:0,filters:[],major_consequence:'intronic'},
 {variant_id:'CTX_CHR5_D',chrom:'5',pos:1000000,end:1000001,chrom2:'20',pos2:496000,end2:496001,length:-1,type:'CTX',ac:1,an:126000,af:7.9e-6,ac_hom:0,homozygote_count:0,filters:[],major_consequence:'lof'},
 {variant_id:'MCNV_CHR20_E',chrom:'20',pos:400000,end:600000,length:200001,type:'MCNV',ac:5,an:126000,af:4e-5,ac_hom:null,homozygote_count:null,filters:[],major_consequence:'copy_gain'},
 {variant_id:'DEL_CHR20_<img src=x onerror=alert(1)>',chrom:'20',pos:543600,end:543800,length:201,type:'DEL',ac:4,an:126000,af:3.2e-5,ac_hom:0,homozygote_count:0,filters:[],major_consequence:'utr'},
];
const SVFIELDS=['ac','an','af','homozygote_count','hemizygote_count','reference_genome','chrom','chrom2','end','end2','major_consequence','filters','length','pos','pos2','type','variant_id','consequence','ac_hom','ac_hemi'];
async function page(opts={}){
  const errs=[], calls=[];
  const dom=new JSDOM(fs.readFileSync(FILE,'utf8'),{runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole().on('jsdomError',e=>errs.push(e.message))});
  const w=dom.window, d=w.document;
  const J=(o,status=200)=>({ok:status<400,status,json:async()=>o});
  w.fetch=async(url,init)=>{ url=String(url); calls.push(url);
    if(opts.offline) throw new TypeError('Failed to fetch');
    if(/mygene/.test(url)){ const hg19=/hg19/.test(url); return J({hits:[{symbol:'CSNK2A1',[hg19?'genomic_pos_hg19':'genomic_pos']:[{chr:'20',start:472498,end:543790},{chr:'HSCHR20_1_CTG1',start:1,end:2}]}]}); }
    if(/api\.genome\.ucsc/.test(url)){ const tr=url.match(/track=([^;]+)/)[1];
      if(tr==='mane') return /hg19/.test(url)? J({error:'no track'},400) : J({mane:[maneItem]});
      if(tr==='ncbiRefSeqSelect') return J({ncbiRefSeqSelect:[gp('NM_177559.3')]});
      if(tr==='ncbiRefSeqCurated') return J({ncbiRefSeqCurated:[gp('NM_177559.3'),gp('NM_001895.4'),Object.assign(gp('NM_999.1'),{name2:'OTHERGENE'})]});
      return J({error:'x'},400); }
    if(/gnomad/.test(url)){ const q=JSON.parse(init.body).query;
      if(opts.rate) return J({},429);
      if(/__type\(name: "Gene"\)/.test(q)) return J({data:{__type:{fields:[{name:'structural_variants',type:{kind:'NON_NULL',ofType:{kind:'LIST',ofType:{kind:'NON_NULL',ofType:{kind:'OBJECT',name:'StructuralVariant'}}}}}]}}});
      if(/__type\(name: "StructuralVariant"\)/.test(q)) return J({data:{__type:{fields:SVFIELDS.map(name=>({name}))}}});
      const sym=q.match(/gene_symbol: "([^"]*)"/)[1];
      if(sym.toUpperCase()!=='CSNK2A1') return J({errors:[{message:'Gene not found'}],data:{gene:null}});
      const fields=q.match(/structural_variants\(dataset: \w+\) \{ ([^}]*) \}/)[1].split(' ');
      const bad=fields.filter(f=>!SVFIELDS.includes(f)); if(bad.length) return J({errors:bad.map(f=>({message:'Cannot query field "'+f+'" on type "StructuralVariant".'}))});
      return J({data:{gene:{gene_id:'ENSG00000101266',symbol:'CSNK2A1',structural_variants:SVS.map(v=>Object.fromEntries(fields.map(f=>[f,v[f]===undefined?null:v[f]])))}}}); }
    throw new TypeError('Failed to fetch');
  };
  let saved=null; w.URL.createObjectURL=b=>{saved=b; return 'blob:x'}; w.URL.revokeObjectURL=()=>{};
  w.HTMLAnchorElement.prototype.click=function(){ w.__dl=this.download; };
  w.navigator.clipboard={writeText:async t=>{w.__clip=t;}};
  for(const sc of d.querySelectorAll('script')) w.eval(sc.textContent);
  const $=s=>d.querySelector(s); const T=s=>($(s)||{}).textContent||'';
  const type=(sel,v)=>{ const el=$(sel); el.value=v; el.dispatchEvent(new w.Event('input',{bubbles:true})); };
  const step=()=>[...d.querySelectorAll('.stepper .stepb')].map(e=>e.classList.contains('done')?'✓':(e.classList.contains('next')?'>':'·')).join('');
  const blobText=()=>new Promise(r=>{const fr=new w.FileReader(); fr.onload=()=>r(fr.result); fr.readAsText(saved);});
  const showAll=()=>{ const b=d.querySelector('#svAllBtn'); if(b && /Show all/.test(b.textContent)) b.click(); };
  const rowsById=()=>{ showAll(); return Object.fromEntries([...d.querySelectorAll('#svTable tbody tr')].map(r=>[...r.children].map((c,i)=>i===1&&c.firstChild?c.firstChild.textContent:c.textContent)).filter(c=>c.length>2).map(c=>[c[1],c])); };
  const idCell=id=>[...d.querySelectorAll('#svTable tbody tr td:nth-child(2)')].find(td=>td.firstChild&&td.firstChild.textContent===id);
  return {w,d,$,T,type,step,errs,calls,blob:()=>({text:blobText}),showAll,rowsById,idCell};
}
(async()=>{
 // ---------- 1. lookup → use → fetch (hg38, MANE default)
 let P=await page(); let {$,T,type,step,d}=P;
 ok('7 steps in strip',d.querySelectorAll('.stepper .stepb').length===7);
 ok('badges 2,3,4 on field labels',['#symIn','#txSel','#svGene'].every((q,i)=>{const b=$(q).parentElement.querySelector('.stepb'); return b&&b.dataset.step===String(i+2);}));
 ok('badges 6,7 on Show and Sort',!!d.querySelector('.filters .lbl .stepb[data-step="6"]')&&!!$('#sortSel').parentElement.querySelector('.stepb[data-step="7"]'));
 ok('initial steps',step()==='·>·····',step());
 type('#symIn','CSNK2A1'); ok('gnomAD box mirrors',$('#svGene').value==='CSNK2A1');
 $('#lookupBtn').click(); await sleep(50);
 const opts=[...d.querySelectorAll('#txSel option')].map(o=>o.textContent);
 ok('MANE listed first',/MANE Select/.test(opts[0]),opts[0]);
 ok('MANE alt shows NM accession',/NM_177559\.3/.test(opts[0]),opts[0]);
 ok('other gene filtered out',!opts.some(o=>/NM_999/.test(o)),opts.join(' | '));
 ok('MANE selected by default',$('#txSel').value==='0');
 ok('steps after lookup',step()==='·✓>····',step());
 $('#useTxBtn').click(); await sleep(10);
 ok('gene name2 is symbol',/CSNK2A1/.test(T('#txSummary')) && !/ENSG/.test(T('#txSummary')),T('#txSummary'));
 ok('gnomAD box still symbol after Use',$('#svGene').value==='CSNK2A1',$('#svGene').value);
 ok('steps after use',step()==='·✓✓>···',step());
 ok('recent chip is symbol',/^Recent\s*CSNK2A1/.test(T('#recentGenes').trim()),T('#recentGenes'));
 $('#gnomadBtn').click(); await sleep(80);
 ok('fetch status ok',/Pulled 6 SVs/.test(T('#gnomadStatus')),T('#gnomadStatus'));
 ok('all steps done',step()==='·✓✓✓✓··',step());
 ok('no warnings',T('#warnBox')==='',T('#warnBox'));
 ok('no query: hint instead of table',/Pick the exons of your variant/.test(T('#svTable')),T('#svTable').slice(0,80));
 ok('PASS-only on by default',$('#fPass').checked && /gnomAD quality filter: PASS only/.test($('#fPass').parentElement.textContent));
 ok('default hides LOW_CALL_RATE DUP',!/DUP_CHR20_B/.test((P.showAll(),T('#svTable'))));
 $('#fPass').click(); await sleep(5);
 const R=P.rowsById();
 ok('DEL A exons E6–E8',R.DEL_CHR20_A&&R.DEL_CHR20_A[5]==='E6–E8',R.DEL_CHR20_A&&R.DEL_CHR20_A[5]);
 ok('failed filter tagged next to ID',/LOW_CALL_RATE/.test((P.idCell('DUP_CHR20_B')||{}).textContent||''));
 ok('no Filter column',![...d.querySelectorAll('#svTable th')].some(th=>th.textContent==='Filter'));
 ok('INS is intronic point',R.INS_CHR20_C&&R.INS_CHR20_C[5]==='intron 10',R.INS_CHR20_C&&R.INS_CHR20_C[5]);
 ok('CTX partner breakpoint in gene mapped',R.CTX_CHR5_D&&/E|intron/.test(R.CTX_CHR5_D[5])&&!/other chromosome/.test(R.CTX_CHR5_D[5]),R.CTX_CHR5_D&&R.CTX_CHR5_D[5]);
 ok('MCNV whole gene as other',R.MCNV_CHR20_E&&R.MCNV_CHR20_E[2]==='MCNV'&&R.MCNV_CHR20_E[5]==='E1–E14');
 ok('XSS escaped',!d.querySelector('img'),'img element injected');
 ok('Hom null shown as dash',R.MCNV_CHR20_E&&R.MCNV_CHR20_E[11]==='—',R.MCNV_CHR20_E&&R.MCNV_CHR20_E[11]);
 // filters
 $('#fPass').click(); await sleep(5); ok('PASS filter hides DUP',!/DUP_CHR20_B/.test(T('#svTable')));
 $('#fPass').click(); type('#fAC','3'); await sleep(5); ok('minAC 3',Object.keys(P.rowsById()).length===3,d.querySelectorAll('#svTable tbody tr').length);
 type('#fAC','0'); type('#fText','dup'); await sleep(5); ok('ID text filter',Object.keys(P.rowsById()).length===1);
 type('#fText','');
 // query by clicking exons 6 and 8
 const exg=[...d.querySelectorAll('#trackGrid g.ex')]; ok('14 exon glyphs',exg.length===14);
 exg[5].dispatchEvent(new P.w.MouseEvent('click',{bubbles:true})); [...d.querySelectorAll('#trackGrid g.ex')][7].dispatchEvent(new P.w.MouseEvent('click',{bubbles:true})); await sleep(5);
 ok('query inputs set',$('#qa').value==='6'&&$('#qb').value==='8',$('#qa').value+'-'+$('#qb').value);
 ok('query same = DEL_A',/Same exon set[\s\S]*?13/.test(T('#qOut'))&&/Same exon set\s*DEL_CHR20_A/.test(T('#svTable')),T('#qOut').slice(0,200));
 ok('one merged card (no separate SV details)',!d.querySelector('#h-svt')&&$('#svTable').closest('section')===$('#qOut').closest('section'));
 ok('IDs not repeated in summary',!/DEL_CHR20_A/.test(T('#qOut')));
 $('#copyBtn').click(); await sleep(5); ok('copy summary',/exons 6–8/.test(P.w.__clip||''),P.w.__clip);
 ok('copy summary names transcript',/CSNK2A1 ENST00000217244\.9/.test(P.w.__clip||''),P.w.__clip);
 // query out of range
 type('#qa','15'); type('#qb','15'); await sleep(5); ok('out of range warn',/between 1 and 14/.test(T('#qOut')));
 type('#qa','6'); type('#qb','8');
 // export (back to matched-only view first)
 { const bb=d.querySelector('#svAllBtn'); if(bb && /matched only/.test(bb.textContent)) bb.click(); }
 $('#expSv').click(); await sleep(5); const csv=await P.blob().text();
 ok('export filename (matches)',P.w.__dl==='CSNK2A1_SV_exon_map_matches_E6-E8.csv',P.w.__dl);
 ok('export = matched rows only (header+2)',csv.split('\n').length===3,csv.split('\n').length);
 ok('export has Match column',/^Match,Why larger,/.test(csv)&&/Same exon set/.test(csv)&&/Larger SV/.test(csv),csv.slice(0,200));
 $('#expEx').click(); await sleep(5); const ecsv=await P.blob().text(); ok('exon export 15 lines',ecsv.trim().split('\n').length===15);
 
 // ===== v1.5: matched-only SV details, yellow key columns, query type = Show =====
 P.showAll(); const back=d.querySelector('#svAllBtn'); if(back && /matched only/.test(back.textContent)) back.click();
 let mrows=[...d.querySelectorAll('#svTable tbody tr')].map(r=>[...r.children].map(c=>c.textContent));
 ok('details lists only same + larger',mrows.length===2,mrows.map(c=>c[0]+' '+c[1]).join(' | '));
 ok('same first',mrows[0]&&/^Same exon set/.test(mrows[0][0])&&mrows[0][1]==='DEL_CHR20_A',mrows[0]&&mrows[0].join('|'));
 ok('larger with reason',mrows[1]&&/^Larger SV/.test(mrows[1][0])&&/past/.test(mrows[1][0])&&mrows[1][1]==='MCNV_CHR20_E',mrows[1]&&mrows[1][0]);
 ok('count label',/2 matched · E6–E8/.test(T('#svCount')),T('#svCount'));
 ok('no not-listed note when nothing hidden',!/Not listed/.test(T('#svNote')),T('#svNote'));
 ok('yellow header cells = 4',d.querySelectorAll('#svTable th.k').length===4);
 ok('yellow frame edges',d.querySelector('#svTable th.k.kl').textContent==='Allele count'&&[...d.querySelectorAll('#svTable th.k')][1].textContent==='Total allele number'&&d.querySelector('#svTable th.k.kr').textContent==='Hom');
 ok('yellow cells per row',d.querySelectorAll('#svTable tbody tr td.k').length===8);
 ok('Total AC framed in match table',d.querySelectorAll('#qOut th.k, #qOut td.k').length===5);
 const kc=P.w.getComputedStyle(d.querySelector('#svTable td.k.kl')); ok('yellow border drawn',/2px/.test(kc.borderLeftWidth||kc.borderLeft||'2px'));
 type('#qa','12'); type('#qb','14'); await sleep(5);
 ok('not-listed note when SVs hidden',/Not listed: \d+ with a breakpoint inside an end exon, \d+ partial overlap/.test(T('#svNote')),T('#svNote'));
 type('#qa','6'); type('#qb','8'); await sleep(5);
 // untick DUP and Other → query becomes DEL only
 $('#fDUP').click(); $('#fOTHER').click(); await sleep(5);
 ok('qType follows Show (DEL)',$('#qType').value==='DEL',$('#qType').value);
 ok('query header DEL',/Query: DEL of E6–E8 · 195 coding nt, in-frame if fully deleted/.test(T('#qOut')),T('#qOut').slice(0,90));
 mrows=[...d.querySelectorAll('#svTable tbody tr')].map(r=>r.children[1]&&r.children[1].textContent);
 ok('MCNV dropped when Other unticked',mrows.length===1&&mrows[0]==='DEL_CHR20_A',mrows.join(','));
 ok('track bracket says DEL',/query DEL E6–E8/.test(T('#trackGrid')),'');
 $('#expSv').click(); await sleep(5); ok('export filename with type',P.w.__dl==='CSNK2A1_SV_exon_map_matches_E6-E8_DEL.csv',P.w.__dl);
 // pick DUP in the query Type → Show boxes follow
 $('#qType').value='DUP'; $('#qType').dispatchEvent(new P.w.Event('change')); await sleep(5);
 ok('Show follows qType (DUP only)',!$('#fDEL').checked&&$('#fDUP').checked&&!$('#fOTHER').checked);
 ok('DUP header',/Query: DUP of E6–E8 .*if duplicated in tandem/.test(T('#qOut')),T('#qOut').slice(0,90));
 ok('no DUP match → message',/No SV with the same exon set or larger covers E6–E8 for DUP/.test(T('#svTable')),T('#svTable'));
 // two types ticked → mixed label
 $('#fDEL').click(); await sleep(5);
 ok('mixed Show → qType shows DEL + DUP',$('#qType').value==='MIX'&&/DEL \+ DUP \(from Show\)/.test($('#qType').selectedOptions[0].textContent),$('#qType').value);
 ok('mixed header',/Query: DEL \+ DUP of E6–E8/.test(T('#qOut')));
 // none ticked
 $('#fDEL').click(); $('#fDUP').click(); await sleep(5);
 ok('none ticked → warn',/Tick at least one SV type/.test(T('#qOut')));
 // All types restores everything
 $('#qType').value='ALL'; $('#qType').dispatchEvent(new P.w.Event('change')); await sleep(5);
 ok('All → all boxes ticked',$('#fDEL').checked&&$('#fDUP').checked&&$('#fOTHER').checked&&$('#qType').value==='ALL');
 ok('mix option removed',!d.querySelector('#qType option[data-mix]'));
 // show all toggle
 d.querySelector('#svAllBtn').click(); await sleep(5);
 ok('show all lists every shown SV',d.querySelectorAll('#svTable tbody tr').length===6&&/Show matched only/.test(T('#svNote')),d.querySelectorAll('#svTable tbody tr').length);
 d.querySelector('#svAllBtn').click(); ok('back to matched',d.querySelectorAll('#svTable tbody tr').length===2);
 ok('no script errors (flow 1)',P.errs.length===0,P.errs.join('; '));

 // ---------- 2. accession matching
 P=await page(); ({$,T,type,d}=P);
 type('#symIn','CSNK2A1'); type('#accIn','NM_001895'); $('#lookupBtn').click(); await sleep(50);
 ok('versionless accession selects without error',/NM_001895\.4/.test($('#txSel').selectedOptions[0].textContent)&&!$('#fetchStatus').classList.contains('err'),T('#fetchStatus'));
 type('#accIn','NM_177559.3'); $('#lookupBtn').click(); await sleep(50);
 ok('NM of MANE selects MANE entry',/MANE/.test($('#txSel').selectedOptions[0].textContent),$('#txSel').selectedOptions[0].textContent);
 type('#accIn','NM_001895.3'); $('#lookupBtn').click(); await sleep(50);
 ok('version mismatch warns',/UCSC has NM_001895\.4/.test(T('#fetchStatus')),T('#fetchStatus'));
 type('#accIn','NM_000000.1'); $('#lookupBtn').click(); await sleep(50);
 ok('missing accession warns',/was not among/.test(T('#fetchStatus')));

 // ---------- 3. hg19: no MANE, dataset v2, mismatch warning
 P=await page(); ({$,T,type,d}=P);
 type('#symIn','CSNK2A1'); $('#buildIn').value='hg19'; $('#lookupBtn').click(); await sleep(50);
 ok('hg19 lookup works',d.querySelectorAll('#txSel option').length>0,T('#fetchStatus'));
 ok('hg19 says no MANE',/No MANE Select/.test(T('#fetchStatus')),T('#fetchStatus'));
 $('#useTxBtn').click(); ok('dataset switched to v2',$('#dataset').value==='v2');
 $('#dataset').value='v4'; $('#dataset').dispatchEvent(new P.w.Event('change')); await sleep(5);
 ok('build mismatch warning',/GRCh38.*transcript is GRCh37/.test(T('#warnBox')),T('#warnBox'));

 // ---------- 4. errors
 P=await page({offline:true}); type=P.type; type('#symIn','CSNK2A1'); P.$('#lookupBtn').click(); await sleep(30);
 ok('offline lookup message',/Could not reach/.test(P.T('#fetchStatus')),P.T('#fetchStatus'));
 P.$('#gnomadBtn').click(); await sleep(30); ok('offline gnomAD message',/Could not reach/.test(P.T('#gnomadStatus')),P.T('#gnomadStatus'));
 P=await page(); P.type('#svGene','NOTAGENE'); P.$('#gnomadBtn').click(); await sleep(50);
 ok('gene not found msg',/did not find gene "NOTAGENE"/.test(P.T('#gnomadStatus')),P.T('#gnomadStatus'));
 P=await page({rate:true}); P.type('#svGene','CSNK2A1'); P.$('#gnomadBtn').click(); await sleep(50);
 ok('429 msg',/limiting requests/.test(P.T('#gnomadStatus')),P.T('#gnomadStatus'));
 ok('button re-enabled',!P.$('#gnomadBtn').disabled);

 // ---------- 5. gene mismatch warning + fetch before Use
 P=await page(); ({$,T,type,d}=P);
 type('#svGene','CSNK2A1'); $('#gnomadBtn').click(); await sleep(60);
 ok('fetch before transcript → hint',/step 3/.test(T('#gnomadStatus'))&&/no transcript is in use/.test(T('#emptyState')),T('#emptyState'));
 $('#demoBtn').click(); await sleep(5);
 // demo replaces svIn; demo gene = CSNK2A1
 ok('demo loads',/Read 10 SVs/.test(T('#svStatus')),T('#svStatus'));

 // ---------- 6. paste routes
 P=await page(); ({$,T,type,d}=P);
 d.querySelector('button.tab[data-panel="pPaste"]').click();
 $('#rowIn').value='585\tNM_177559.3\tchr20\t-\t472497\t543790\t483960\t508551\t14\t'+starts.join(',')+',\t'+ends.join(',')+',\t0\tCSNK2A1\tcmpl\tcmpl\t0,';
 $('#pasteBtn').click(); ok('paste row loads',/Loaded NM_177559\.3 \(14 exons\)/.test(T('#pasteStatus')),T('#pasteStatus'));
 $('#svIn').value='Variant ID,Consequence,Class,Position,Size,Allele Count,Allele Number,Allele Frequency,Homozygote Count\r\nDEL_1,lof,deletion,495000-499400,4401,3,126000,2.38e-05,0\r\nINS_1,intronic,insertion,489000,6000,2,126000,1.6e-05,0\r\nMC_1,copy,multi CNV,400000-600000,200001,5,126000,4e-05,null\r\n';
 $('#readBtn').click(); await sleep(5);
 ok('export paste read 3',/Read 3 SVs/.test(T('#svStatus')),T('#svStatus'));
 const prow=P.rowsById();
 ok('pasted INS stays point (intron 10)',prow.INS_1&&prow.INS_1[5]==='intron 10',prow.INS_1&&prow.INS_1[5]);
 ok('pasted multi CNV normalized',prow.MC_1&&prow.MC_1[2]==='MCNV',prow.MC_1&&prow.MC_1[2]);
 // column mapping change: unset size
 const sel=[...d.querySelectorAll('#mapGrid select')].find(s=>s.dataset.field==='start'); sel.value='-1'; sel.dispatchEvent(new P.w.Event('change'));
 ok('unmapping start reports',/No start\/position column/.test(T('#svStatus')),T('#svStatus'));
 // clear
 $('#clearSvBtn').click(); ok('clear',d.querySelectorAll('#svTable tbody tr').length===1&&!/DEL_1/.test(T('#svTable')),T('#svTable'));
 ok('no script errors (paste)',P.errs.length===0,P.errs.join('; '));

 console.log('PASS',pass,'FAIL',fail); F.forEach(f=>console.log('✗',f));
 process.exitCode = fail ? 1 : 0;
})();
