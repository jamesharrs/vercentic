// ISO 3166-1 country list + phone validation for Vercentic
export const COUNTRIES = [
  { code:"AF", name:"Afghanistan",           flag:"🇦🇫" }, { code:"AL", name:"Albania",              flag:"🇦🇱" },
  { code:"DZ", name:"Algeria",               flag:"🇩🇿" }, { code:"AR", name:"Argentina",            flag:"🇦🇷" },
  { code:"AU", name:"Australia",             flag:"🇦🇺" }, { code:"AT", name:"Austria",              flag:"🇦🇹" },
  { code:"AZ", name:"Azerbaijan",            flag:"🇦🇿" }, { code:"BH", name:"Bahrain",              flag:"🇧🇭" },
  { code:"BD", name:"Bangladesh",            flag:"🇧🇩" }, { code:"BE", name:"Belgium",              flag:"🇧🇪" },
  { code:"BR", name:"Brazil",                flag:"🇧🇷" }, { code:"BG", name:"Bulgaria",             flag:"🇧🇬" },
  { code:"CA", name:"Canada",                flag:"🇨🇦" }, { code:"CL", name:"Chile",                flag:"🇨🇱" },
  { code:"CN", name:"China",                 flag:"🇨🇳" }, { code:"CO", name:"Colombia",             flag:"🇨🇴" },
  { code:"HR", name:"Croatia",               flag:"🇭🇷" }, { code:"CY", name:"Cyprus",               flag:"🇨🇾" },
  { code:"CZ", name:"Czech Republic",        flag:"🇨🇿" }, { code:"DK", name:"Denmark",              flag:"🇩🇰" },
  { code:"EG", name:"Egypt",                 flag:"🇪🇬" }, { code:"EE", name:"Estonia",              flag:"🇪🇪" },
  { code:"ET", name:"Ethiopia",              flag:"🇪🇹" }, { code:"FI", name:"Finland",              flag:"🇫🇮" },
  { code:"FR", name:"France",                flag:"🇫🇷" }, { code:"GE", name:"Georgia",              flag:"🇬🇪" },
  { code:"DE", name:"Germany",               flag:"🇩🇪" }, { code:"GH", name:"Ghana",                flag:"🇬🇭" },
  { code:"GR", name:"Greece",                flag:"🇬🇷" }, { code:"HK", name:"Hong Kong",            flag:"🇭🇰" },
  { code:"HU", name:"Hungary",               flag:"🇭🇺" }, { code:"IN", name:"India",                flag:"🇮🇳" },
  { code:"ID", name:"Indonesia",             flag:"🇮🇩" }, { code:"IR", name:"Iran",                 flag:"🇮🇷" },
  { code:"IQ", name:"Iraq",                  flag:"🇮🇶" }, { code:"IE", name:"Ireland",              flag:"🇮🇪" },
  { code:"IL", name:"Israel",                flag:"🇮🇱" }, { code:"IT", name:"Italy",                flag:"🇮🇹" },
  { code:"JP", name:"Japan",                 flag:"🇯🇵" }, { code:"JO", name:"Jordan",               flag:"🇯🇴" },
  { code:"KZ", name:"Kazakhstan",            flag:"🇰🇿" }, { code:"KE", name:"Kenya",                flag:"🇰🇪" },
  { code:"KW", name:"Kuwait",                flag:"🇰🇼" }, { code:"LB", name:"Lebanon",              flag:"🇱🇧" },
  { code:"LY", name:"Libya",                 flag:"🇱🇾" }, { code:"LT", name:"Lithuania",            flag:"🇱🇹" },
  { code:"LU", name:"Luxembourg",            flag:"🇱🇺" }, { code:"MY", name:"Malaysia",             flag:"🇲🇾" },
  { code:"MV", name:"Maldives",              flag:"🇲🇻" }, { code:"MT", name:"Malta",                flag:"🇲🇹" },
  { code:"MX", name:"Mexico",                flag:"🇲🇽" }, { code:"MA", name:"Morocco",              flag:"🇲🇦" },
  { code:"NL", name:"Netherlands",           flag:"🇳🇱" }, { code:"NZ", name:"New Zealand",          flag:"🇳🇿" },
  { code:"NG", name:"Nigeria",               flag:"🇳🇬" }, { code:"NO", name:"Norway",               flag:"🇳🇴" },
  { code:"OM", name:"Oman",                  flag:"🇴🇲" }, { code:"PK", name:"Pakistan",             flag:"🇵🇰" },
  { code:"PS", name:"Palestine",             flag:"🇵🇸" }, { code:"PH", name:"Philippines",          flag:"🇵🇭" },
  { code:"PL", name:"Poland",                flag:"🇵🇱" }, { code:"PT", name:"Portugal",             flag:"🇵🇹" },
  { code:"QA", name:"Qatar",                 flag:"🇶🇦" }, { code:"RO", name:"Romania",              flag:"🇷🇴" },
  { code:"RU", name:"Russia",                flag:"🇷🇺" }, { code:"SA", name:"Saudi Arabia",         flag:"🇸🇦" },
  { code:"SN", name:"Senegal",               flag:"🇸🇳" }, { code:"RS", name:"Serbia",               flag:"🇷🇸" },
  { code:"SG", name:"Singapore",             flag:"🇸🇬" }, { code:"SK", name:"Slovakia",             flag:"🇸🇰" },
  { code:"ZA", name:"South Africa",          flag:"🇿🇦" }, { code:"KR", name:"South Korea",          flag:"🇰🇷" },
  { code:"ES", name:"Spain",                 flag:"🇪🇸" }, { code:"LK", name:"Sri Lanka",            flag:"🇱🇰" },
  { code:"SE", name:"Sweden",                flag:"🇸🇪" }, { code:"CH", name:"Switzerland",          flag:"🇨🇭" },
  { code:"SY", name:"Syria",                 flag:"🇸🇾" }, { code:"TW", name:"Taiwan",               flag:"🇹🇼" },
  { code:"TZ", name:"Tanzania",              flag:"🇹🇿" }, { code:"TH", name:"Thailand",             flag:"🇹🇭" },
  { code:"TN", name:"Tunisia",               flag:"🇹🇳" }, { code:"TR", name:"Turkey",               flag:"🇹🇷" },
  { code:"UG", name:"Uganda",                flag:"🇺🇬" }, { code:"UA", name:"Ukraine",              flag:"🇺🇦" },
  { code:"AE", name:"United Arab Emirates",  flag:"🇦🇪" }, { code:"GB", name:"United Kingdom",       flag:"🇬🇧" },
  { code:"US", name:"United States",         flag:"🇺🇸" }, { code:"UY", name:"Uruguay",              flag:"🇺🇾" },
  { code:"UZ", name:"Uzbekistan",            flag:"🇺🇿" }, { code:"VE", name:"Venezuela",            flag:"🇻🇪" },
  { code:"VN", name:"Vietnam",               flag:"🇻🇳" }, { code:"YE", name:"Yemen",                flag:"🇾🇪" },
  { code:"ZM", name:"Zambia",                flag:"🇿🇲" }, { code:"ZW", name:"Zimbabwe",             flag:"🇿🇼" },
];

export const COUNTRY_MAP = Object.fromEntries(COUNTRIES.map(c => [c.code, c]));

// ── Phone rules: min/max = local digit count after dial code ─────────────────
const PHONE_RULES = {
  AE:{min:9, max:9, pattern:/^5[0-9]{8}$|^[2-4679][0-9]{7}$/,  example:"50 123 4567",   hint:"9 digits, mobile starts with 5"},
  SA:{min:9, max:9, pattern:/^[015][0-9]{8}$/,                  example:"51 234 5678",   hint:"9 digits, mobile starts with 5"},
  QA:{min:8, max:8, pattern:/^[3567][0-9]{7}$/,                 example:"5012 3456",     hint:"8 digits"},
  KW:{min:8, max:8, pattern:/^[569][0-9]{7}$/,                  example:"5012 3456",     hint:"8 digits"},
  BH:{min:8, max:8, pattern:/^[136][0-9]{7}$/,                  example:"3600 1234",     hint:"8 digits"},
  OM:{min:8, max:8, pattern:/^[79][0-9]{7}$/,                   example:"9212 3456",     hint:"8 digits"},
  JO:{min:9, max:9, pattern:/^[7][0-9]{8}$/,                    example:"79 123 4567",   hint:"9 digits, starts with 7"},
  LB:{min:7, max:8, pattern:/^[013-9][0-9]{6,7}$/,              example:"71 123 456",    hint:"7–8 digits"},
  EG:{min:10,max:10,pattern:/^[012][0-9]{9}$/,                  example:"010 1234 5678", hint:"10 digits"},
  IQ:{min:10,max:10,pattern:/^[07][0-9]{9}$/,                   example:"07901234567",   hint:"10 digits"},
  MA:{min:9, max:9, pattern:/^[5-7][0-9]{8}$/,                  example:"612 345 678",   hint:"9 digits"},
  TN:{min:8, max:8, pattern:/^[2-9][0-9]{7}$/,                  example:"20 123 456",    hint:"8 digits"},
  DZ:{min:9, max:9, pattern:/^[567][0-9]{8}$/,                  example:"551 234 567",   hint:"9 digits"},
  YE:{min:9, max:9, pattern:/^[7][0-9]{8}$/,                    example:"712 345 678",   hint:"9 digits"},
  SY:{min:9, max:9, pattern:/^[09][0-9]{8}$/,                   example:"944 123 456",   hint:"9 digits"},
  LY:{min:9, max:9, pattern:/^[29][0-9]{8}$/,                   example:"912 345 678",   hint:"9 digits"},
  PS:{min:9, max:9, pattern:/^[59][0-9]{8}$/,                   example:"599 123 456",   hint:"9 digits"},
  GB:{min:10,max:10,pattern:/^[1-9][0-9]{9}$/,                  example:"7911 123456",   hint:"10 digits, mobile starts with 7"},
  DE:{min:10,max:12,pattern:/^[1-9][0-9]{9,11}$/,               example:"151 1234 5678", hint:"10–12 digits"},
  FR:{min:9, max:9, pattern:/^[1-9][0-9]{8}$/,                  example:"6 12 34 56 78", hint:"9 digits"},
  IT:{min:9, max:11,pattern:/^[0-9]{9,11}$/,                    example:"345 678 9012",  hint:"9–11 digits"},
  ES:{min:9, max:9, pattern:/^[6-9][0-9]{8}$/,                  example:"612 345 678",   hint:"9 digits"},
  NL:{min:9, max:9, pattern:/^[1-9][0-9]{8}$/,                  example:"6 12345678",    hint:"9 digits"},
  BE:{min:8, max:9, pattern:/^[1-9][0-9]{7,8}$/,                example:"470 12 34 56",  hint:"8–9 digits"},
  PL:{min:9, max:9, pattern:/^[1-9][0-9]{8}$/,                  example:"512 345 678",   hint:"9 digits"},
  PT:{min:9, max:9, pattern:/^[1-9][0-9]{8}$/,                  example:"912 345 678",   hint:"9 digits"},
  SE:{min:7, max:10,pattern:/^[0-9]{7,10}$/,                    example:"70 123 45 67",  hint:"7–10 digits"},
  NO:{min:8, max:8, pattern:/^[2-9][0-9]{7}$/,                  example:"412 34 567",    hint:"8 digits"},
  DK:{min:8, max:8, pattern:/^[2-9][0-9]{7}$/,                  example:"20 12 34 56",   hint:"8 digits"},
  FI:{min:9, max:10,pattern:/^[1-9][0-9]{8,9}$/,                example:"50 123 4567",   hint:"9–10 digits"},
  AT:{min:10,max:13,pattern:/^[1-9][0-9]{9,12}$/,               example:"664 1234567",   hint:"10–13 digits"},
  CH:{min:9, max:9, pattern:/^[1-9][0-9]{8}$/,                  example:"78 123 45 67",  hint:"9 digits"},
  IE:{min:9, max:9, pattern:/^[1-9][0-9]{8}$/,                  example:"85 123 4567",   hint:"9 digits"},
  GR:{min:10,max:10,pattern:/^[2-9][0-9]{9}$/,                  example:"697 123 4567",  hint:"10 digits"},
  CZ:{min:9, max:9, pattern:/^[1-9][0-9]{8}$/,                  example:"601 123 456",   hint:"9 digits"},
  HU:{min:9, max:9, pattern:/^[1-9][0-9]{8}$/,                  example:"30 123 4567",   hint:"9 digits"},
  RO:{min:9, max:9, pattern:/^[2-9][0-9]{8}$/,                  example:"712 345 678",   hint:"9 digits"},
  TR:{min:10,max:10,pattern:/^[5][0-9]{9}$/,                    example:"532 123 4567",  hint:"10 digits, mobile starts with 5"},
  UA:{min:9, max:9, pattern:/^[3-9][0-9]{8}$/,                  example:"50 123 4567",   hint:"9 digits"},
  RU:{min:10,max:10,pattern:/^[3-9][0-9]{9}$/,                  example:"912 345 6789",  hint:"10 digits"},
  US:{min:10,max:10,pattern:/^[2-9][0-9]{9}$/,                  example:"212 555 0100",  hint:"10 digits, no leading 1"},
  CA:{min:10,max:10,pattern:/^[2-9][0-9]{9}$/,                  example:"416 555 0100",  hint:"10 digits, no leading 1"},
  MX:{min:10,max:10,pattern:/^[1-9][0-9]{9}$/,                  example:"55 1234 5678",  hint:"10 digits"},
  BR:{min:10,max:11,pattern:/^[1-9][0-9]{9,10}$/,               example:"11 91234 5678", hint:"10–11 digits"},
  AR:{min:10,max:10,pattern:/^[1-9][0-9]{9}$/,                  example:"11 1234 5678",  hint:"10 digits"},
  CO:{min:10,max:10,pattern:/^[3][0-9]{9}$/,                    example:"300 123 4567",  hint:"10 digits, mobile starts with 3"},
  IN:{min:10,max:10,pattern:/^[6-9][0-9]{9}$/,                  example:"98765 43210",   hint:"10 digits, starts with 6–9"},
  PK:{min:10,max:10,pattern:/^[3][0-9]{9}$/,                    example:"300 1234567",   hint:"10 digits, mobile starts with 3"},
  BD:{min:10,max:10,pattern:/^[1][0-9]{9}$/,                    example:"1711 234567",   hint:"10 digits, starts with 1"},
  LK:{min:9, max:9, pattern:/^[7][0-9]{8}$/,                    example:"71 234 5678",   hint:"9 digits, starts with 7"},
  CN:{min:11,max:11,pattern:/^[1][3-9][0-9]{9}$/,               example:"139 1234 5678", hint:"11 digits, starts with 1"},
  HK:{min:8, max:8, pattern:/^[5-9][0-9]{7}$/,                  example:"5123 4567",     hint:"8 digits"},
  TW:{min:9, max:10,pattern:/^[0-9]{9,10}$/,                    example:"912 345 678",   hint:"9–10 digits"},
  JP:{min:10,max:11,pattern:/^[0-9]{10,11}$/,                   example:"90 1234 5678",  hint:"10–11 digits"},
  KR:{min:9, max:11,pattern:/^[01][0-9]{8,10}$/,                example:"10 1234 5678",  hint:"9–11 digits"},
  SG:{min:8, max:8, pattern:/^[689][0-9]{7}$/,                  example:"9123 4567",     hint:"8 digits, starts with 6, 8 or 9"},
  MY:{min:9, max:10,pattern:/^[1][0-9]{8,9}$/,                  example:"12 345 6789",   hint:"9–10 digits, starts with 1"},
  ID:{min:9, max:12,pattern:/^[0-9]{9,12}$/,                    example:"812 3456 7890", hint:"9–12 digits"},
  PH:{min:10,max:10,pattern:/^[9][0-9]{9}$/,                    example:"912 345 6789",  hint:"10 digits, mobile starts with 9"},
  TH:{min:9, max:9, pattern:/^[0-9]{9}$/,                       example:"81 234 5678",   hint:"9 digits"},
  VN:{min:9, max:10,pattern:/^[3-9][0-9]{8,9}$/,                example:"91 234 5678",   hint:"9–10 digits"},
  AU:{min:9, max:9, pattern:/^[2-9][0-9]{8}$/,                  example:"412 345 678",   hint:"9 digits, mobile starts with 4"},
  NZ:{min:8, max:10,pattern:/^[2-9][0-9]{7,9}$/,                example:"21 123 4567",   hint:"8–10 digits"},
  ZA:{min:9, max:9, pattern:/^[6-8][0-9]{8}$/,                  example:"71 234 5678",   hint:"9 digits, starts with 6–8"},
  NG:{min:10,max:10,pattern:/^[0-9]{10}$/,                      example:"80 1234 5678",  hint:"10 digits"},
  KE:{min:9, max:9, pattern:/^[17][0-9]{8}$/,                   example:"712 345 678",   hint:"9 digits"},
  GH:{min:9, max:9, pattern:/^[2-5][0-9]{8}$/,                  example:"24 123 4567",   hint:"9 digits"},
  ET:{min:9, max:9, pattern:/^[9][0-9]{8}$/,                    example:"91 234 5678",   hint:"9 digits, starts with 9"},
  TZ:{min:9, max:9, pattern:/^[6-7][0-9]{8}$/,                  example:"621 234 567",   hint:"9 digits"},
  UG:{min:9, max:9, pattern:/^[3-4][0-9]{8}$/,                  example:"712 345 678",   hint:"9 digits"},
  ZM:{min:9, max:9, pattern:/^[9][0-9]{8}$/,                    example:"97 123 4567",   hint:"9 digits"},
  SN:{min:9, max:9, pattern:/^[7][0-9]{8}$/,                    example:"70 123 4567",   hint:"9 digits"},
  KZ:{min:10,max:10,pattern:/^[67][0-9]{9}$/,                   example:"701 234 5678",  hint:"10 digits"},
  UZ:{min:9, max:9, pattern:/^[39][0-9]{8}$/,                   example:"91 234 5678",   hint:"9 digits"},
  AZ:{min:9, max:9, pattern:/^[5][0-9]{8}$/,                    example:"50 123 4567",   hint:"9 digits"},
  GE:{min:9, max:9, pattern:/^[5][0-9]{8}$/,                    example:"55 123 4567",   hint:"9 digits"},
  IL:{min:9, max:9, pattern:/^[5][0-9]{8}$/,                    example:"50 234 5678",   hint:"9 digits, mobile starts with 5"},
  IR:{min:10,max:10,pattern:/^[09][0-9]{9}$/,                   example:"912 345 6789",  hint:"10 digits"},
};
const DEFAULT_RULE = {min:5,max:15,pattern:/^[0-9]{5,15}$/,example:"",hint:"5–15 digits"};

export const PHONE_CODES = [
  {code:"AE",dial:"+971"},{code:"AF",dial:"+93"}, {code:"AL",dial:"+355"},{code:"DZ",dial:"+213"},
  {code:"AR",dial:"+54"}, {code:"AU",dial:"+61"}, {code:"AT",dial:"+43"}, {code:"AZ",dial:"+994"},
  {code:"BH",dial:"+973"},{code:"BD",dial:"+880"},{code:"BE",dial:"+32"}, {code:"BR",dial:"+55"},
  {code:"CA",dial:"+1"},  {code:"CL",dial:"+56"}, {code:"CN",dial:"+86"}, {code:"CO",dial:"+57"},
  {code:"CY",dial:"+357"},{code:"CZ",dial:"+420"},{code:"DK",dial:"+45"}, {code:"EG",dial:"+20"},
  {code:"ET",dial:"+251"},{code:"FI",dial:"+358"},{code:"FR",dial:"+33"}, {code:"GE",dial:"+995"},
  {code:"DE",dial:"+49"}, {code:"GH",dial:"+233"},{code:"GR",dial:"+30"}, {code:"HK",dial:"+852"},
  {code:"HU",dial:"+36"}, {code:"IN",dial:"+91"}, {code:"ID",dial:"+62"}, {code:"IR",dial:"+98"},
  {code:"IQ",dial:"+964"},{code:"IE",dial:"+353"},{code:"IL",dial:"+972"},{code:"IT",dial:"+39"},
  {code:"JP",dial:"+81"}, {code:"JO",dial:"+962"},{code:"KZ",dial:"+7"},  {code:"KE",dial:"+254"},
  {code:"KW",dial:"+965"},{code:"LB",dial:"+961"},{code:"LY",dial:"+218"},{code:"LT",dial:"+370"},
  {code:"LU",dial:"+352"},{code:"MY",dial:"+60"}, {code:"MV",dial:"+960"},{code:"MT",dial:"+356"},
  {code:"MX",dial:"+52"}, {code:"MA",dial:"+212"},{code:"NL",dial:"+31"}, {code:"NZ",dial:"+64"},
  {code:"NG",dial:"+234"},{code:"NO",dial:"+47"}, {code:"OM",dial:"+968"},{code:"PK",dial:"+92"},
  {code:"PS",dial:"+970"},{code:"PH",dial:"+63"}, {code:"PL",dial:"+48"}, {code:"PT",dial:"+351"},
  {code:"QA",dial:"+974"},{code:"RO",dial:"+40"}, {code:"RU",dial:"+7"},  {code:"SA",dial:"+966"},
  {code:"SN",dial:"+221"},{code:"RS",dial:"+381"},{code:"SG",dial:"+65"}, {code:"SK",dial:"+421"},
  {code:"ZA",dial:"+27"}, {code:"KR",dial:"+82"}, {code:"ES",dial:"+34"}, {code:"LK",dial:"+94"},
  {code:"SE",dial:"+46"}, {code:"CH",dial:"+41"}, {code:"SY",dial:"+963"},{code:"TW",dial:"+886"},
  {code:"TZ",dial:"+255"},{code:"TH",dial:"+66"}, {code:"TN",dial:"+216"},{code:"TR",dial:"+90"},
  {code:"UG",dial:"+256"},{code:"UA",dial:"+380"},{code:"GB",dial:"+44"}, {code:"US",dial:"+1"},
  {code:"UY",dial:"+598"},{code:"UZ",dial:"+998"},{code:"VE",dial:"+58"}, {code:"VN",dial:"+84"},
  {code:"YE",dial:"+967"},{code:"ZM",dial:"+260"},{code:"ZW",dial:"+263"},
].map(p=>({...p,...(COUNTRY_MAP[p.code]||{}),label:`${COUNTRY_MAP[p.code]?.flag||''} ${p.dial}`}));

export const DIAL_TO_CODE = Object.fromEntries(PHONE_CODES.map(p=>[p.dial,p.code]));

export const getCountryByCode = (code) => COUNTRY_MAP[code]||null;

export const formatPhone = (value) => {
  if(!value)return '';
  if(typeof value==='string')return value;
  const{dial='',number=''}=value;
  return[dial,number].filter(Boolean).join(' ');
};

export const stripPhoneDigits = (number) => String(number||'').replace(/\D/g,'');

export const getPhoneRule = (countryCode) => PHONE_RULES[countryCode]||DEFAULT_RULE;

export const countryCodeFromDial = (dial) => DIAL_TO_CODE[dial]||null;

/**
 * Validate a phone number.
 * @param {string|{dial,number}} value
 * @param {'phone'|'phone_intl'} fieldType
 * @returns {{valid:boolean, error:string|null, hint:string|null, example:string|null}}
 */
export function validatePhone(value, fieldType='phone') {
  if(!value||(typeof value==='object'&&!value.number?.trim()))
    return{valid:true,error:null,hint:null,example:null};

  if(fieldType==='phone'){
    const str=String(value).trim();
    const digits=stripPhoneDigits(str);
    if(digits.length<5)return{valid:false,error:'Too short — enter at least 5 digits'};
    if(digits.length>16)return{valid:false,error:'Too long — max 16 digits'};
    if(/^(.)\1+$/.test(digits))return{valid:false,error:'Invalid — all digits are the same'};
    if(str.startsWith('+')){
      const sorted=PHONE_CODES.slice().sort((a,b)=>b.dial.length-a.dial.length);
      const match=sorted.find(p=>str.replace(/\s/g,'').startsWith(p.dial));
      if(match){
        const localDigits=stripPhoneDigits(str.replace(/\s/g,'').slice(match.dial.length));
        const rule=getPhoneRule(match.code);
        if(!rule.pattern.test(localDigits))
          return{valid:false,error:`Invalid for ${COUNTRY_MAP[match.code]?.name||match.dial}`,hint:rule.hint,example:rule.example?`e.g. ${match.dial} ${rule.example}`:null};
      }
    }
    return{valid:true,error:null,hint:null,example:null};
  }

  // phone_intl
  const{dial='',number=''}=typeof value==='object'?value:{number:value};
  const digits=stripPhoneDigits(number);
  if(!number.trim())return{valid:true,error:null,hint:null,example:null};
  if(!/^[\d\s\-()+.]+$/.test(number))
    return{valid:false,error:'Invalid characters — digits, spaces, hyphens or parentheses only'};
  const countryCode=countryCodeFromDial(dial);
  const rule=getPhoneRule(countryCode);
  const countryName=countryCode?(COUNTRY_MAP[countryCode]?.name||countryCode):null;
  if(digits.length<rule.min)
    return{valid:false,error:countryName?`Too short for ${countryName} — needs ${rule.min} digits (got ${digits.length})`:`Too short — needs at least ${rule.min} digits`,hint:rule.hint,example:rule.example?`e.g. ${dial} ${rule.example}`:null};
  if(digits.length>rule.max)
    return{valid:false,error:countryName?`Too long for ${countryName} — max ${rule.max} digits (got ${digits.length})`:`Too long — max ${rule.max} digits`,hint:rule.hint,example:rule.example?`e.g. ${dial} ${rule.example}`:null};
  if(!rule.pattern.test(digits))
    return{valid:false,error:countryName?`Invalid format for ${countryName}`:'Invalid phone number format',hint:rule.hint,example:rule.example?`e.g. ${dial} ${rule.example}`:null};
  return{valid:true,error:null,hint:null,example:null};
}

/** Auto-format number as user types — cosmetic spacing only. */
export function autoFormatPhoneNumber(raw, countryCode) {
  const d=stripPhoneDigits(raw); if(!d)return raw;
  if(countryCode==='AE'){if(d.length<=2)return d;if(d.length<=6)return`${d.slice(0,2)} ${d.slice(2)}`;return`${d.slice(0,2)} ${d.slice(2,6)} ${d.slice(6,10)}`;}
  if(countryCode==='GB'){if(d.length<=5)return d;return`${d.slice(0,5)} ${d.slice(5,11)}`;}
  if(countryCode==='US'||countryCode==='CA'){if(d.length<=3)return d;if(d.length<=6)return`${d.slice(0,3)} ${d.slice(3)}`;return`${d.slice(0,3)} ${d.slice(3,6)} ${d.slice(6,10)}`;}
  if(d.length<=4)return d;
  if(d.length<=7)return`${d.slice(0,3)} ${d.slice(3)}`;
  if(d.length<=10)return`${d.slice(0,3)} ${d.slice(3,6)} ${d.slice(6)}`;
  return`${d.slice(0,3)} ${d.slice(3,6)} ${d.slice(6,9)} ${d.slice(9)}`;
}
