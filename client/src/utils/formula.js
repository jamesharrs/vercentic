/**
 * Vercentic Formula Parser
 * Evaluates formula expressions against a record's field values.
 *
 * Supported syntax:
 *   {field_key}          → reference another field's value
 *   +, -, *, /           → arithmetic
 *   (...)                → grouping
 *
 * Built-in functions:
 *   SUM(a, b, ...)       ROUND(n, d)     TODAY()
 *   AVG(a, b, ...)       ABS(n)          LEN(str)
 *   MIN(a, b, ...)       CONCAT(a, b)    UPPER(str)
 *   MAX(a, b, ...)       IF(cond, y, n)  LOWER(str)
 *   DATEDIFF(d1, d2)     DAYS_FROM_TODAY(d)  CONTAINS(str, sub)
 */

const FUNCTIONS = {
  SUM:             (...args) => args.reduce((a, b) => (Number(a)||0) + (Number(b)||0), 0),
  AVG:             (...args) => args.length ? args.reduce((a,b)=>(Number(a)||0)+(Number(b)||0),0)/args.length : 0,
  MIN:             (...args) => Math.min(...args.map(Number).filter(n=>!isNaN(n))),
  MAX:             (...args) => Math.max(...args.map(Number).filter(n=>!isNaN(n))),
  ROUND:           (n, d=0) => Math.round(Number(n)*Math.pow(10,d))/Math.pow(10,d),
  ABS:             (n) => Math.abs(Number(n)),
  CONCAT:          (...args) => args.map(a=>a??'').join(''),
  IF:              (cond, yes, no) => (cond && cond!=='false' && cond!=='0' && cond!=='') ? yes : no,
  DATEDIFF:        (d1, d2) => { const a=new Date(d1),b=new Date(d2); if(isNaN(a)||isNaN(b))return null; return Math.round((b-a)/(1000*60*60*24)); },
  DAYS_FROM_TODAY: (d) => { const t=new Date(d); if(isNaN(t))return null; const today=new Date();today.setHours(0,0,0,0); return Math.round((t-today)/(1000*60*60*24)); },
  TODAY:           () => new Date().toISOString().slice(0,10),
  LEN:             (str) => String(str??'').length,
  UPPER:           (str) => String(str??'').toUpperCase(),
  LOWER:           (str) => String(str??'').toLowerCase(),
  CONTAINS:        (str, sub) => String(str??'').toLowerCase().includes(String(sub??'').toLowerCase()),
};

function tokenise(expr) {
  const tokens = []; let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch==='"'||ch==="'") { const q=ch; let s=''; i++; while(i<expr.length&&expr[i]!==q)s+=expr[i++]; i++; tokens.push({type:'string',value:s}); continue; }
    if (ch==='{') { let key=''; i++; while(i<expr.length&&expr[i]!=='}')key+=expr[i++]; i++; tokens.push({type:'field',value:key}); continue; }
    if (/[\d.]/.test(ch)) { let num=''; while(i<expr.length&&/[\d.]/.test(expr[i]))num+=expr[i++]; tokens.push({type:'number',value:Number(num)}); continue; }
    if (/[A-Za-z_]/.test(ch)) { let id=''; while(i<expr.length&&/[A-Za-z0-9_]/.test(expr[i]))id+=expr[i++]; const u=id.toUpperCase(); if(u==='TRUE'){tokens.push({type:'boolean',value:true});continue;} if(u==='FALSE'){tokens.push({type:'boolean',value:false});continue;} if(u==='NULL'){tokens.push({type:'null',value:null});continue;} tokens.push({type:'ident',value:u}); continue; }
    if ('+-*/(),'.includes(ch)){tokens.push({type:'op',value:ch});i++;continue;}
    if (ch==='>'||ch==='<'||ch==='='||ch==='!'){let op=ch;i++;if((ch==='>'||ch==='<'||ch==='!'||ch==='=')&&expr[i]==='='){op+='=';i++;}tokens.push({type:'op',value:op});continue;}
    i++;
  }
  return tokens;
}

function parse(tokens, data) {
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];
  const expect = (v) => { if(peek()?.value!==v)throw new Error(`Expected ${v}`); consume(); };

  function parseExpr()       { return parseComparison(); }
  function parseComparison() {
    let left = parseAddSub();
    while(peek()&&['>', '<', '>=', '<=', '==', '!=', '='].includes(peek().value)) {
      const op=consume().value; const right=parseAddSub();
      if(op==='>')  left=Number(left)>Number(right);
      if(op==='<')  left=Number(left)<Number(right);
      if(op==='>=') left=Number(left)>=Number(right);
      if(op==='<=') left=Number(left)<=Number(right);
      if(op==='=='||op==='=') left=String(left)===String(right);
      if(op==='!=') left=String(left)!==String(right);
    }
    return left;
  }
  function parseAddSub() {
    let left=parseMulDiv();
    while(peek()&&(peek().value==='+'||peek().value==='-')){const op=consume().value;const right=parseMulDiv();left=op==='+'?Number(left)+Number(right):Number(left)-Number(right);}
    return left;
  }
  function parseMulDiv() {
    let left=parseUnary();
    while(peek()&&(peek().value==='*'||peek().value==='/')){const op=consume().value;const right=parseUnary();left=op==='*'?Number(left)*Number(right):(Number(right)!==0?Number(left)/Number(right):null);}
    return left;
  }
  function parseUnary() { if(peek()?.value==='-'){consume();return -Number(parsePrimary());} return parsePrimary(); }
  function parsePrimary() {
    const t=peek(); if(!t)return null;
    if(t.type==='number'){consume();return t.value;}
    if(t.type==='string'){consume();return t.value;}
    if(t.type==='boolean'){consume();return t.value;}
    if(t.type==='null'){consume();return null;}
    if(t.type==='field'){consume();const raw=data?.[t.value];if(raw===null||raw===undefined)return null;if(!isNaN(Number(raw))&&raw!=='')return Number(raw);return raw;}
    if(t.type==='op'&&t.value==='('){consume();const val=parseExpr();expect(')');return val;}
    if(t.type==='ident'){const name=consume().value;if(peek()?.value==='('){consume();const args=[];while(peek()?.value!==')'){args.push(parseExpr());if(peek()?.value===',')consume();}consume();const fn=FUNCTIONS[name];if(fn)return fn(...args);return null;}return null;}
    return null;
  }
  try { return parseExpr(); } catch { return '#ERROR'; }
}

export function evaluateFormula(expression, data) {
  if (!expression||typeof expression!=='string') return null;
  try { const tokens=tokenise(expression); if(!tokens.length)return null; return parse(tokens,data); } catch { return '#ERROR'; }
}

export function extractFieldRefs(expression) {
  const refs=[]; const re=/\{([^}]+)\}/g; let m;
  while((m=re.exec(expression))!==null) refs.push(m[1]);
  return [...new Set(refs)];
}

export function validateFormula(expression, availableFields=[]) {
  if(!expression)return{valid:false,error:'Empty expression'};
  const refs=extractFieldRefs(expression);
  const keys=availableFields.map(f=>f.api_key);
  const missing=refs.filter(r=>!keys.includes(r));
  if(missing.length)return{valid:false,error:`Unknown fields: ${missing.join(', ')}`};
  try { const d={}; availableFields.forEach(f=>{d[f.api_key]=0;}); evaluateFormula(expression,d); return{valid:true,refs}; }
  catch(e){return{valid:false,error:e.message};}
}

export function formatFormulaResult(value, outputType='auto') {
  if(value===null||value===undefined)return '—';
  if(value==='#ERROR')return '#ERROR';
  if(outputType==='currency'){const n=Number(value);return isNaN(n)?String(value):`$${n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;}
  if(outputType==='number'){const n=Number(value);return isNaN(n)?String(value):n.toLocaleString();}
  if(outputType==='percent'){const n=Number(value);return isNaN(n)?String(value):`${n}%`;}
  if(typeof value==='boolean')return value?'Yes':'No';
  return String(value);
}
