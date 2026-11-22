// load core logic (first <script>) as a module
// Unit tests for the core logic in index.html (first <script> block). Run: npm test
const fs=require('fs'), path=require('path');
const html=fs.readFileSync(process.argv[2]||path.join(__dirname,'..','index.html'),'utf8');
const src=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const W={}; const MOD={exports:{}}; new Function("window","module",src)(W,MOD); const L=MOD.exports;
let pass=0, fail=0; const F=[];
function eq(name,got,exp){ const g=JSON.stringify(got), e=JSON.stringify(exp); if(g===e) pass++; else { fail++; F.push(name+'\n    got '+g+'\n    exp '+e); } }
// ---- plus-strand toy gene: 3 exons, UCSC 0-based half-open
// exons: [100,200) [300,400) [500,600) ; CDS [150,550)
const plus=L.buildGene({name:'T1',name2:'G',chrom:'chr1',strand:'+',txStart:100,txEnd:600,cdsStart:150,cdsEnd:550,starts:[100,300,500],ends:[200,400,600]});
eq('plus exon1 1-based',[plus.exons[0].s1,plus.exons[0].e1],[101,200]);
eq('plus coding lens',plus.exons.map(x=>x.codingLen),[50,100,50]);
eq('plus cds',plus.cdsLen,200);
eq('plus atg',plus.atg,[151,153]); eq('plus stop',plus.stop,[548,550]);
eq('plus introns',plus.introns,[{num:1,lo:201,hi:300},{num:2,lo:401,hi:500}]);
eq('plus kinds',plus.exons.map(x=>x.kind),['cds','cds','cds']);
eq('plus phases',plus.exons.map(x=>[x.phaseIn,x.phaseOut]),[[0,2],[2,0],[0,2]]);
const sv=(s,e,t='DEL',extra={})=>Object.assign({id:'x',chrom:'1',start:s,end:e,type:t,size:e-s+1,ac:1,an:10,af:.1,hom:0,filter:'PASS'},extra);
let r;
r=L.mapSV(plus,sv(301,400)); eq('exact exon2 full',[r.cls,r.fullNums,r.partialNums,r.codingNt],['exonic',[2],[],100]);
r=L.mapSV(plus,sv(302,400)); eq('exon2 partial by 1bp',[r.fullNums,r.partialNums,r.codingNt],[[],[2],99]);
r=L.mapSV(plus,sv(201,300)); eq('intron1 exact',[r.cls,r.intron],['intronic',1]);
r=L.mapSV(plus,sv(200,300)); eq('intron + 1bp exon1',[r.cls,r.partialNums],['exonic',[1]]);
r=L.mapSV(plus,sv(50,99)); eq('upstream outside',r.cls,'outside');
r=L.mapSV(plus,sv(50,700)); eq('whole',[r.whole,r.frame.kind],[true,'whole']);
r=L.mapSV(plus,sv(301,400,'DUP')); eq('dup exon2 in-frame tandem',[r.frame.kind,r.frame.mod],['out',1]);
r=L.mapSV(plus,sv(50,200)); eq('del exon1 incl atg past 5p',[r.atgHit,r.frame.kind,r.past5bp,r.past3bp],[true,'startloss',51,0]);
r=L.mapSV(plus,sv(501,700)); eq('del last exon past 3p stop',[r.stopHit,r.frame.kind,r.lastExon,r.past3bp],[true,'stoploss',true,100]);
r=L.mapSV(plus,sv(301,400,'DEL',{chrom:'2'})); eq('other chrom',r.cls,'otherchrom');
r=L.mapSV(plus,sv(301,400,'DEL',{chrom:'chr1'})); eq('chr prefix on sv',r.cls,'exonic');
r=L.mapSV(plus,sv(301,400,'INV')); eq('inv not assessed',r.frame.kind,'na');
// ---- minus strand toy: same coords on '-'
const minus=L.buildGene({name:'T2',name2:'G',chrom:'chr1',strand:'-',txStart:100,txEnd:600,cdsStart:150,cdsEnd:550,starts:[100,300,500],ends:[200,400,600]});
eq('minus numbering',minus.exons.map(x=>x.s1),[501,301,101]);
eq('minus atg/stop',[minus.atg,minus.stop],[[548,550],[151,153]]);
eq('minus introns',minus.introns,[{num:1,lo:401,hi:500},{num:2,lo:201,hi:300}]);
r=L.mapSV(minus,sv(50,200)); eq('minus del low end = 3p',[r.first,r.past3bp,r.past5bp,r.stopHit],[3,51,0,true]);
r=L.mapSV(minus,sv(450,460)); eq('minus intron1',[r.cls,r.intron],['intronic',1]);
// ---- UTR exons + non-coding
const utr=L.buildGene({name:'T3',chrom:'chr1',strand:'+',txStart:100,txEnd:800,cdsStart:350,cdsEnd:550,starts:[100,300,500,700],ends:[200,400,600,800]});
eq('utr kinds',utr.exons.map(x=>x.kind),['utr5','cds','cds','utr3']);
r=L.mapSV(utr,sv(101,200)); eq('utr5 only',[r.utrOnly,r.frame.kind],[true,'none']);
const nc=L.buildGene({name:'NR',chrom:'chr1',strand:'+',txStart:100,txEnd:600,cdsStart:600,cdsEnd:600,starts:[100,300],ends:[200,600]});
eq('noncoding',[nc.hasCds,nc.exons.map(x=>x.kind),nc.atg],[false,['nc','nc'],null]);
r=L.mapSV(nc,sv(101,200)); eq('noncoding del',[r.cls,r.frame.kind],['exonic','none']);
// single exon gene
const one=L.buildGene({name:'S',chrom:'chr1',strand:'+',txStart:100,txEnd:400,cdsStart:150,cdsEnd:350,starts:[100],ends:[400]});
eq('single exon',[one.exons.length,one.introns.length,one.exons[0].isStart,one.exons[0].isStop],[1,0,true,true]);
r=L.mapSV(one,sv(200,210)); eq('single exon small del',[r.cls,r.partialNums,r.frame.kind],['exonic',[1],'out']);
// unsorted exon lists
const uns=L.buildGene({name:'U',chrom:'chr1',strand:'+',txStart:100,txEnd:600,cdsStart:150,cdsEnd:550,starts:[500,100,300],ends:[600,200,400]});
eq('unsorted input sorted',uns.exons.map(x=>x.s1),[101,301,501]);
// ---- query classification
const g5=L.buildGene({name:'Q',chrom:'chr1',strand:'+',txStart:0,txEnd:1000,cdsStart:0,cdsEnd:1000,starts:[0,200,400,600,800],ends:[100,300,500,700,900]});
const M=[sv(201,500),sv(150,550),sv(250,500),sv(201,300),sv(-5000,99999),sv(410,420)].map((v,i)=>{v.id='s'+i;return L.mapSV(g5,v)});
const q=L.classifyAgainstQuery(M,2,3,'DEL');
eq('query same (breakpoints in flanking introns count as same)',q.same.map(r=>r.sv.id),['s0','s1']);
eq('query superset',q.superset.map(r=>r.sv.id),['s4']);
eq('query samePartial',q.samePartial.map(r=>r.sv.id),['s2']);
eq('query partial',q.partial.map(r=>r.sv.id),['s3','s5']);
eq('extentNote whole',L.extentNote(M[4],2,3),'+E1; +E4–E5; 5001 bp past 5′ end; 99000 bp past 3′ end'.replace('5001 bp','5.0 kb').replace('99000 bp','99 kb'));
eq('query DUP excludes DEL',L.classifyAgainstQuery(M,2,3,'DUP').same.length,0);
// ---- parsers
eq('parseSize',[L.parseSize('4.4 kb'),L.parseSize('120 bp'),L.parseSize('1.2 Mb'),L.parseSize('4,401'),L.parseSize('')],[4400,120,1200000,4401,NaN]);
eq('parseRange chr',L.parseRange('chr20:495,000-499,400'),{chrom:'20',start:495000,end:499400});
eq('parseRange dash',L.parseRange('20-495000-499400'),{chrom:'20',start:495000,end:499400});
eq('parseRange nochr',L.parseRange('495000 - 499400'),{chrom:null,start:495000,end:499400});
eq('parseRange chr-pos not range',L.parseRange('20-495000'),null);
eq('parsePoint',L.parsePoint('chrX:1000'),{chrom:'X',pos:1000});
eq('normType',['deletion','Duplication','multi CNV','other','translocation','breakend','complex','insertion','inversion','CNV'].map(L.normType),['DEL','DUP','MCNV','OTH','CTX','BND','CPX','INS','INV','CNV']);
// gnomAD website CSV export (exact format from gnomad-browser ExportStructuralVariantsButton)
const gexp='Variant ID,Consequence,Class,Position,Size,Allele Count,Allele Number,Allele Frequency,Homozygote Count\r\n'+
 'DEL_CHR1_A,loss of function,deletion,301-400,100,3,1000,0.003,0\r\n'+
 'INS_CHR1_B,intronic,insertion,450,6000,2,1000,0.002,0\r\n'+
 'BND_CHR1_C,,breakend,1:250-251|5:1000-1001,,1,1000,0.001,null\r\n'+
 'CTX_CHR5_D,,translocation,5:1000-1001|1:350-351,,1,1000,0.001,0\r\n'+
 'MCNV_CHR1_E,copy gain,multi CNV,50-700,651,5,1000,0.005,0\r\n';
let p=L.parseSVText(gexp,'1');
eq('export rows',p.svs.length,5);
const byId=Object.fromEntries(p.svs.map(v=>[v.id,v]));
eq('export DEL',[byId.DEL_CHR1_A.start,byId.DEL_CHR1_A.end,byId.DEL_CHR1_A.chrom,byId.DEL_CHR1_A.type],[301,400,'1','DEL']);
eq('export INS is a point (not pos+size)',[byId.INS_CHR1_B.start,byId.INS_CHR1_B.end,byId.INS_CHR1_B.size],[450,450,6000]);
eq('export MCNV type',byId.MCNV_CHR1_E.type,'MCNV');
eq('export BND chrom',byId.BND_CHR1_C&&[byId.BND_CHR1_C.chrom,byId.BND_CHR1_C.start],['1',250]);
const ctx=byId.CTX_CHR5_D; eq('export CTX partner on gene chrom maps', ctx? L.mapSV(plus,ctx).cls : 'missing', 'exonic');
eq('export hom null',byId.BND_CHR1_C&&byId.BND_CHR1_C.hom,null);
// copied web table (TSV, positions "pos - end", BND "a | b")
const gtsv='Variant ID\tSource\tConsequence\tClass\tPosition\tSize\tAllele Count\tAllele Number\tAllele Frequency\n'+
 'DEL_1\t\tloss of function\tdeletion\t301 - 400\t100 bp\t3\t1000\t3.0e-3\n'+
 'BND_1\t\t\tbreakend\t1:250 | 5:1000\t\t1\t1000\t1.0e-3\n'+
 'INS_1\t\tintronic\tinsertion\t450\t6.0 kb\t2\t1000\t2.0e-3\n';
p=L.parseSVText(gtsv,'1'); const t2=Object.fromEntries(p.svs.map(v=>[v.id,v]));
eq('tsv rows (incl BND)',p.svs.length,3);
eq('tsv DEL',t2.DEL_1&&[t2.DEL_1.start,t2.DEL_1.end,t2.DEL_1.af],[301,400,0.003]);
eq('tsv INS point',t2.INS_1&&[t2.INS_1.start,t2.INS_1.end],[450,450]);
// API route
const api=[{variant_id:'DEL_X',chrom:'1',pos:301,end:400,length:100,type:'DEL',ac:3,an:1000,af:.003,ac_hom:0,filters:[],major_consequence:'lof'},
 {variant_id:'CTX_Y',chrom:'5',pos:1000,end:1001,chrom2:'1',pos2:350,end2:351,length:-1,type:'CTX',ac:1,an:1000,af:.001,filters:['UNRESOLVED']},
 {variant_id:'INS_Z',chrom:'1',pos:450,end:451,length:6000,type:'INS',ac:1,an:1000,af:.001,filters:null}];
p=L.parseSVText(L.apiSVsToTable(api),'1'); const t3=Object.fromEntries(p.svs.map(v=>[v.id,v]));
eq('api rows',p.svs.length,3);
eq('api DEL filter PASS',[t3.DEL_X.filter,t3.DEL_X.start,t3.DEL_X.end],['PASS',301,400]);
eq('api CTX filter',t3.CTX_Y.filter,'UNRESOLVED');
eq('api CTX partner in gene maps',L.mapSV(plus,t3.CTX_Y).cls,'exonic');
eq('api INS point-ish',[t3.INS_Z.start,t3.INS_Z.end<=451],[450,true]);
eq('api INS size kept',t3.INS_Z.size,6000);
// quick list
p=L.parseQuickList('chr1:301-400 DEL AC=3 AF=1e-5\nchr1:301,000-302,000 duplication AC=1,200\nbad line','1');
eq('quick list',[p.svs.length,p.svs[0].ac,p.svs[0].af,p.svs[1].type,p.skipped.length],[2,3,1e-5,'DUP',1]);
eq('quick AC with comma',p.svs[1].ac,1200);
// filters
const fs2=[sv(1,2,'DEL',{filter:'PASS'}),sv(1,2,'DUP',{filter:'LOW_CALL_RATE',ac:null}),sv(1,2,'INV',{filter:''})];
eq('filter pass',L.applyFilters(fs2,{types:{DEL:1,DUP:1,OTHER:1},passOnly:true,minAC:0,text:''}).length,2);
eq('filter minAC null ac',L.applyFilters(fs2,{types:{DEL:1,DUP:1,OTHER:1},passOnly:false,minAC:1,text:''}).length,2);
// UCSC row parsing
const row='#bin\tname\tchrom\tstrand\ttxStart\ttxEnd\tcdsStart\tcdsEnd\texonCount\texonStarts\texonEnds\tscore\tname2\n585\tNM_1.2\tchr1\t+\t100\t600\t150\t550\t3\t100,300,500,\t200,400,600,\t0\tGENE\tcmpl\tcmpl\t0,2,0,';
const gr=L.parseGenePredRow(row); eq('genePred row',[gr.name,gr.name2,gr.exons.length,gr.cdsLen],['NM_1.2','GENE',3,200]);
const big='chr1\t100\t600\tENST1.1\t0\t+\t150\t550\t0\t3\t100,100,100,\t0,200,400,\tGENE\tcmpl';
const gb=L.parseGenePredRow(big); eq('bigGenePred row',[gb.name,gb.exons.map(x=>x.s1),gb.cdsLen],['ENST1.1',[101,301,501],200]);
// header detection: row with "chrom" word in data
eq('looksLikeHeader',L.looksLikeHeader(['Variant ID','Class','Position']),true);
console.log('PASS',pass,'FAIL',fail); F.forEach(f=>console.log('✗',f));
process.exitCode = fail ? 1 : 0;
