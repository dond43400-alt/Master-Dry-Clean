// Fast offline English (Roman) -> Punjabi (Gurmukhi) transliterator
// Tailored for Punjabi customer names, surnames, honorifics, and Punjab villages/towns.

const WORD_DICTIONARY: Record<string, string> = {
  // Honorifics & Titles
  s: 'ਸ.',
  mr: 'ਸ੍ਰੀ',
  mrs: 'ਸ੍ਰੀਮਤੀ',
  smt: 'ਸ੍ਰੀਮਤੀ',
  bibi: 'ਬੀਬੀ',
  sardar: 'ਸਰਦਾਰ',
  ji: 'ਜੀ',
  bhaji: 'ਭਾਜੀ',
  veer: 'ਵੀਰ',
  bhai: 'ਭਾਈ',

  // Very common Punjabi first names
  harpreet: 'ਹਰਪ੍ਰੀਤ',
  manpreet: 'ਮਨਪ੍ਰੀਤ',
  gurpreet: 'ਗੁਰਪ੍ਰੀਤ',
  jaspreet: 'ਜਸਪ੍ਰੀਤ',
  amandeep: 'ਅਮਨਦੀਪ',
  ramandeep: 'ਰਮਨਦੀਪ',
  sukhdeep: 'ਸੁਖਦੀਪ',
  navdeep: 'ਨਵਦੀਪ',
  hardeep: 'ਹਰਦੀਪ',
  gurdeep: 'ਗੁਰਦੀਪ',
  kuldeep: 'ਕੁਲਦੀਪ',
  mandeep: 'ਮਨਦੀਪ',
  pardeep: 'ਪਰਦੀਪ',
  sandeep: 'ਸੰਦੀਪ',
  arshdeep: 'ਅਰਸ਼ਦੀਪ',
  dilpreet: 'ਦਿਲਪ੍ਰੀਤ',
  lovepreet: 'ਲਵਪ੍ਰੀਤ',
  khushpreet: 'ਖੁਸ਼ਪ੍ਰੀਤ',
  jashanpreet: 'ਜਸ਼ਨਪ੍ਰੀਤ',
  jashan: 'ਜਸ਼ਨ',
  prabhjot: 'ਪ੍ਰਭਜੋਤ',
  harjot: 'ਹਰਜੋਤ',
  gurjot: 'ਗੁਰਜੋਤ',
  navjot: 'ਨਵਜੋਤ',
  manjot: 'ਮਨਜੋਤ',
  simranjit: 'ਸਿਮਰਨਜੀਤ',
  simran: 'ਸਿਮਰਨ',
  inderjit: 'ਇੰਦਰਜੀਤ',
  paramjit: 'ਪਰਮਜੀਤ',
  kamaljit: 'ਕਮਲਜੀਤ',
  ranjit: 'ਰਣਜੀਤ',
  surjit: 'ਸੁਰਜੀਤ',
  gurjit: 'ਗੁਰਜੀਤ',
  harjit: 'ਹਰਜੀਤ',
  manjit: 'ਮਨਜੀਤ',
  daljit: 'ਦਲਜੀਤ',
  jagjit: 'ਜਗਜੀਤ',
  amarjit: 'ਅਮਰਜੀਤ',
  charanjit: 'ਚਰਨਜੀਤ',
  sukhjinder: 'ਸੁਖਜਿੰਦਰ',
  sukhwinder: 'ਸੁਖਵਿੰਦਰ',
  lakhwinder: 'ਲਖਵਿੰਦਰ',
  balwinder: 'ਬਲਵਿੰਦਰ',
  baljinder: 'ਬਲਜਿੰਦਰ',
  rajwinder: 'ਰਾਜਵਿੰਦਰ',
  rajinder: 'ਰਾਜਿੰਦਰ',
  harjinder: 'ਹਰਜਿੰਦਰ',
  harwinder: 'ਹਰਵਿੰਦਰ',
  jaswinder: 'ਜਸਵਿੰਦਰ',
  kulwinder: 'ਕੁਲਵਿੰਦਰ',
  parminder: 'ਪਰਮਿੰਦਰ',
  harminder: 'ਹਰਮਿੰਦਰ',
  bhupinder: 'ਭੁਪਿੰਦਰ',
  davinder: 'ਦਵਿੰਦਰ',
  jatinder: 'ਜਤਿੰਦਰ',
  tejinder: 'ਤੇਜਿੰਦਰ',
  satnam: 'ਸਤਨਾਮ',
  darshan: 'ਦਰਸ਼ਨ',
  avtar: 'ਅਵਤਾਰ',
  baldev: 'ਬਲਦੇਵ',
  nirmal: 'ਨਿਰਮਲ',
  gurcharan: 'ਗੁਰਚਰਨ',
  gurbachan: 'ਗੁਰਬਚਨ',
  harbhajan: 'ਹਰਭਜਨ',
  harpal: 'ਹਰਪਾਲ',
  satpal: 'ਸਤਪਾਲ',
  jaspal: 'ਜਸਪਾਲ',
  jasvir: 'ਜਸਵੀਰ',
  satvir: 'ਸਤਵੀਰ',
  rajvir: 'ਰਾਜਵੀਰ',
  balbir: 'ਬਲਬੀਰ',
  gurmeet: 'ਗੁਰਮੀਤ',
  harmeet: 'ਹਰਮੀਤ',
  jasmeet: 'ਜਸਮੀਤ',
  manmeet: 'ਮਨਮੀਤ',
  paramveer: 'ਪਰਮਵੀਰ',
  ranveer: 'ਰਣਵੀਰ',
  kulwant: 'ਕੁਲਵੰਤ',
  balwant: 'ਬਲਵੰਤ',
  jaswant: 'ਜਸਵੰਤ',
  sukhwant: 'ਸੁਖਵੰਤ',
  malkit: 'ਮਲਕੀਤ',
  pargat: 'ਪਰਗਟ',
  shamsher: 'ਸ਼ਮਸ਼ੇਰ',
  tarsem: 'ਤਰਸੇਮ',
  raman: 'ਰਮਨ',
  aman: 'ਅਮਨ',
  kiran: 'ਕਿਰਨ',
  preeti: 'ਪ੍ਰੀਤੀ',
  neha: 'ਨੇਹਾ',
  pooja: 'ਪੂਜਾ',
  sonia: 'ਸੋਨੀਆ',
  monika: 'ਮੋਨਿਕਾ',
  anita: 'ਅਨੀਤਾ',
  sunita: 'ਸੁਨੀਤਾ',
  kavita: 'ਕਵਿਤਾ',
  komal: 'ਕੋਮਲ',
  priya: 'ਪ੍ਰਿਆ',
  nisha: 'ਨਿਸ਼ਾ',
  jyoti: 'ਜੋਤੀ',
  poonam: 'ਪੂਨਮ',
  rohit: 'ਰੋਹਿਤ',
  mohit: 'ਮੋਹਿਤ',
  rahul: 'ਰਾਹੁਲ',
  amit: 'ਅਮਿਤ',
  sumit: 'ਸੁਮਿਤ',
  ankit: 'ਅੰਕਿਤ',
  deepak: 'ਦੀਪਕ',
  karan: 'ਕਰਨ',
  arjun: 'ਅਰਜੁਨ',
  vikas: 'ਵਿਕਾਸ',
  ashok: 'ਅਸ਼ੋਕ',
  vijay: 'ਵਿਜੈ',
  sanjay: 'ਸੰਜੈ',
  manoj: 'ਮਨੋਜ',
  anil: 'ਅਨਿਲ',
  sunil: 'ਸੁਨੀਲ',
  rajesh: 'ਰਾਜੇਸ਼',
  rakesh: 'ਰਾਕੇਸ਼',
  mukesh: 'ਮੁਕੇਸ਼',
  suresh: 'ਸੁਰੇਸ਼',
  naresh: 'ਨਰੇਸ਼',
  sunny: 'ਸਨੀ',
  happy: 'ਹੈਪੀ',
  lucky: 'ਲੱਕੀ',
  rocky: 'ਰੌਕੀ',
  tony: 'ਟੋਨੀ',
  mintu: 'ਮਿੰਟੂ',
  bittu: 'ਬਿੱਟੂ',
  deepu: 'ਦੀਪੂ',
  sonu: 'ਸੋਨੂੰ',
  monu: 'ਮੋਨੂੰ',
  bablu: 'ਬਬਲੂ',
  pappu: 'ਪੱਪੂ',
  raju: 'ਰਾਜੂ',
  kaka: 'ਕਾਕਾ',
  laddi: 'ਲੱਡੀ',
  goldy: 'ਗੋਲਡੀ',
  honey: 'ਹਨੀ',
  mani: 'ਮਨੀ',
  harry: 'ਹੈਰੀ',
  garry: 'ਗੈਰੀ',
  sherry: 'ਸ਼ੈਰੀ',
  jassi: 'ਜੱਸੀ',

  // Common Surnames / Last Names
  singh: 'ਸਿੰਘ',
  kaur: 'ਕੌਰ',
  sandhu: 'ਸੰਧੂ',
  gill: 'ਗਿੱਲ',
  sidhu: 'ਸਿੱਧੂ',
  dhillon: 'ਢਿੱਲੋਂ',
  brar: 'ਬਰਾੜ',
  virk: 'ਵਿਰਕ',
  sekhon: 'ਸੇਖੋਂ',
  bains: 'ਬੈਂਸ',
  grewal: 'ਗਰੇਵਾਲ',
  randhawa: 'ਰੰਧਾਵਾ',
  bajwa: 'ਬਾਜਵਾ',
  cheema: 'ਚੀਮਾ',
  kahlon: 'ਕਾਹਲੋਂ',
  mann: 'ਮਾਨ',
  aulakh: 'ਔਲਖ',
  dosanjh: 'ਦੋਸਾਂਝ',
  chahal: 'ਚਾਹਲ',
  johal: 'ਜੋਹਲ',
  tiwana: 'ਟਿਵਾਣਾ',
  deol: 'ਦਿਓਲ',
  hundal: 'ਹੁੰਦਲ',
  bhatti: 'ਭੱਟੀ',
  sharma: 'ਸ਼ਰਮਾ',
  verma: 'ਵਰਮਾ',
  gupta: 'ਗੁਪਤਾ',
  arora: 'ਅਰੋੜਾ',
  kapoor: 'ਕਪੂਰ',
  mehta: 'ਮੇਹਤਾ',
  sethi: 'ਸੇਠੀ',
  malhotra: 'ਮਲਹੋਤਰਾ',
  chopra: 'ਚੋਪੜਾ',
  khanna: 'ਖੰਨਾ',
  bedi: 'ਬੇਦੀ',
  sodhi: 'ਸੋਢੀ',
  sood: 'ਸੂਦ',
  saini: 'ਸੈਣੀ',
  kamboj: 'ਕੰਬੋਜ',
  khaira: 'ਖਹਿਰਾ',
  pannu: 'ਪੰਨੂ',
  kang: 'ਕੰਗ',
  bhatia: 'ਭਾਟੀਆ',
  bansal: 'ਬੰਸਲ',
  garg: 'ਗਰਗ',
  mittal: 'ਮਿੱਤਲ',
  singla: 'ਸਿੰਗਲਾ',
  jindal: 'ਜਿੰਦਲ',
  chawla: 'ਚਾਵਲਾ',
  kalra: 'ਕਾਲੜਾ',
  batra: 'ਬਤਰਾ',
  gulati: 'ਗੁਲਾਟੀ',
  duggal: 'ਦੁੱਗਲ',
  kohli: 'ਕੋਹਲੀ',
  anand: 'ਆਨੰਦ',

  // Punjab Cities, Towns, Villages & Locality Terms
  pind: 'ਪਿੰਡ',
  village: 'ਪਿੰਡ',
  vill: 'ਪਿੰਡ',
  city: 'ਸ਼ਹਿਰ',
  town: 'ਕਸਬਾ',
  ward: 'ਵਾਰਡ',
  mohalla: 'ਮੁਹੱਲਾ',
  colony: 'ਕਲੋਨੀ',
  nagar: 'ਨਗਰ',
  road: 'ਰੋਡ',
  gali: 'ਗਲੀ',
  chowk: 'ਚੌਕ',
  mandi: 'ਮੰਡੀ',
  bazaar: 'ਬਾਜ਼ਾਰ',
  bazar: 'ਬਾਜ਼ਾਰ',
  kalan: 'ਕਲਾਂ',
  khurd: 'ਖੁਰਦ',
  ludhiana: 'ਲੁਧਿਆਣਾ',
  jagraon: 'ਜਗਰਾਉਂ',
  mullanpur: 'ਮੁੱਲਾਂਪੁਰ',
  dakha: 'ਦਾਖਾ',
  raikot: 'ਰਾਏਕੋਟ',
  samrala: 'ਸਮਰਾਲਾ',
  doraha: 'ਦੋਰਾਹਾ',
  payal: 'ਪਾਇਲ',
  sahnewal: 'ਸਾਹਨੇਵਾਲ',
  machhiwara: 'ਮਾਛੀਵਾੜਾ',
  sidhwan: 'ਸਿੱਧਵਾਂ',
  bet: 'ਬੇਟ',
  sudhar: 'ਸੁਧਾਰ',
  halwara: 'ਹਲਵਾਰਾ',
  pakhowal: 'ਪੱਖੋਵਾਲ',
  baddowal: 'ਬੱਦੋਵਾਲ',
  ayali: 'ਅਯਾਲੀ',
  humbran: 'ਹੰਬੜਾਂ',
  jalandhar: 'ਜਲੰਧਰ',
  amritsar: 'ਅੰਮ੍ਰਿਤਸਰ',
  patiala: 'ਪਟਿਆਲਾ',
  bathinda: 'ਬਠਿੰਡਾ',
  moga: 'ਮੋਗਾ',
  barnala: 'ਬਰਨਾਲਾ',
  sangrur: 'ਸੰਗਰੂਰ',
  firozpur: 'ਫਿਰੋਜ਼ਪੁਰ',
  ferozepur: 'ਫਿਰੋਜ਼ਪੁਰ',
  mansa: 'ਮਾਨਸਾ',
  muktsar: 'ਮੁਕਤਸਰ',
  faridkot: 'ਫਰੀਦਕੋਟ',
  kapurthala: 'ਕਪੂਰਥਲਾ',
  hoshiarpur: 'ਹੁਸ਼ਿਆਰਪੁਰ',
  phagwara: 'ਫਗਵਾੜਾ',
  nakodar: 'ਨਕੋਦਰ',
  shahkot: 'ਸ਼ਾਹਕੋਟ',
  phillaur: 'ਫਿਲੌਰ',
  goraya: 'ਗੋਰਾਇਆ',
  nurmahal: 'ਨੂਰਮਹਿਲ',
  banga: 'ਬੰਗਾ',
  nawanshahr: 'ਨਵਾਂਸ਼ਹਿਰ',
  mohali: 'ਮੋਹਾਲੀ',
  kharar: 'ਖਰੜ',
  kurali: 'ਕੁਰਾਲੀ',
  zirakpur: 'ਜ਼ੀਰਕਪੁਰ',
  chandigarh: 'ਚੰਡੀਗੜ੍ਹ',
  ropar: 'ਰੋਪੜ',
  rupnagar: 'ਰੂਪਨਗਰ',
  anandpur: 'ਅਨੰਦਪੁਰ',
  sahib: 'ਸਾਹਿਬ',
  nangal: 'ਨੰਗਲ',
  morinda: 'ਮੋਰਿੰਡਾ',
  sirhind: 'ਸਰਹਿੰਦ',
  fatehgarh: 'ਫਤਿਹਗੜ੍ਹ',
  gobindgarh: 'ਗੋਬਿੰਦਗੜ੍ਹ',
  rajpura: 'ਰਾਜਪੁਰਾ',
  nabha: 'ਨਾਭਾ',
  samana: 'ਸਮਾਣਾ',
  sunam: 'ਸੁਨਾਮ',
  dhuri: 'ਧੂਰੀ',
  malerkotla: 'ਮਾਲੇਰਕੋਟਲਾ',
  ahmedgarh: 'ਅਹਿਮਦਗੜ੍ਹ',
  kotkapura: 'ਕੋਟਕਪੂਰਾ',
  jaitu: 'ਜੈਤੋ',
  malout: 'ਮਲੋਟ',
  abohar: 'ਅਬੋਹਰ',
  fazilka: 'ਫਾਜ਼ਿਲਕਾ',
  jalalabad: 'ਜਲਾਲਾਬਾਦ',
  zira: 'ਜ਼ੀਰਾ',
  patti: 'ਪੱਟੀ',
  tarn: 'ਤਰਨ',
  taran: 'ਤਾਰਨ',
  batala: 'ਬਟਾਲਾ',
  gurdaspur: 'ਗੁਰਦਾਸਪੁਰ',
  pathankot: 'ਪਠਾਨਕੋਟ',
  dasuya: 'ਦਸੂਹਾ',
  mukerian: 'ਮੁਕੇਰੀਆਂ',
  tanda: 'ਟਾਂਡਾ',
  garhshankar: 'ਗੜ੍ਹਸ਼ੰਕਰ',
  model: 'ਮਾਡਲ',
  new: 'ਨਿਊ',
};

const INDEPENDENT_VOWELS: [string, string][] = [
  ['aa', 'ਆ'],
  ['ai', 'ਐ'],
  ['au', 'ਔ'],
  ['ou', 'ਔ'],
  ['ee', 'ਈ'],
  ['ii', 'ਈ'],
  ['oo', 'ਊ'],
  ['uu', 'ਊ'],
  ['a', 'ਅ'],
  ['i', 'ਇ'],
  ['u', 'ਉ'],
  ['e', 'ਏ'],
  ['o', 'ਓ'],
];

const VOWEL_MATRAS: [string, string][] = [
  ['aa', 'ਾ'],
  ['ai', 'ੈ'],
  ['au', 'ੌ'],
  ['ou', 'ੌ'],
  ['ee', 'ੀ'],
  ['ii', 'ੀ'],
  ['oo', 'ੂ'],
  ['uu', 'ੂ'],
  ['a', ''],
  ['i', 'ਿ'],
  ['u', 'ੁ'],
  ['e', 'ੇ'],
  ['o', 'ੋ'],
];

const CONSONANTS: [string, string][] = [
  ['ksh', 'ਕਸ਼'],
  ['chh', 'ਛ'],
  ['kh', 'ਖ'],
  ['gh', 'ਘ'],
  ['ch', 'ਚ'],
  ['jh', 'ਝ'],
  ['th', 'ਥ'],
  ['dh', 'ਧ'],
  ['ph', 'ਫ'],
  ['bh', 'ਭ'],
  ['sh', 'ਸ਼'],
  ['rh', 'ੜ੍ਹ'],
  ['k', 'ਕ'],
  ['g', 'ਗ'],
  ['c', 'ਕ'],
  ['j', 'ਜ'],
  ['z', 'ਜ਼'],
  ['t', 'ਤ'],
  ['d', 'ਦ'],
  ['n', 'ਨ'],
  ['p', 'ਪ'],
  ['f', 'ਫ਼'],
  ['b', 'ਬ'],
  ['m', 'ਮ'],
  ['y', 'ਯ'],
  ['r', 'ਰ'],
  ['l', 'ਲ'],
  ['v', 'ਵ'],
  ['w', 'ਵ'],
  ['s', 'ਸ'],
  ['h', 'ਹ'],
  ['q', 'ਕ'],
  ['x', 'ਕਸ'],
];

function matchPrefix<T>(str: string, pos: number, table: [string, T][]): [string, T] | null {
  for (const [key, val] of table) {
    if (str.startsWith(key, pos)) {
      return [key, val];
    }
  }
  return null;
}

function isVowelChar(ch: string | undefined): boolean {
  return ch !== undefined && 'aeiou'.includes(ch);
}

function transliterateWordPhonetic(rawWord: string): string {
  const lower = rawWord.toLowerCase();
  const dictKey = lower.replace(/\.$/, '');
  if (WORD_DICTIONARY[lower]) return WORD_DICTIONARY[lower];
  if (WORD_DICTIONARY[dictKey]) return WORD_DICTIONARY[dictKey];

  let i = 0;
  let out = '';

  // Handle digits directly
  if (/^\d+$/.test(lower)) return rawWord;

  while (i < lower.length) {
    const ch = lower[i];

    // Non-alpha punctuation passes through
    if (!/[a-z]/.test(ch)) {
      out += rawWord[i];
      i++;
      continue;
    }

    // Word start vowel or consecutive vowel (diphthong start)
    if (i === 0 && isVowelChar(ch)) {
      const m = matchPrefix(lower, i, INDEPENDENT_VOWELS);
      if (m) {
        const [key, gurmukhi] = m;
        // If 'a' followed by 'n'/'m' and consonant -> ਅ + tippi
        if (
          key === 'a' &&
          (lower[i + 1] === 'n' || lower[i + 1] === 'm') &&
          lower[i + 2] &&
          !isVowelChar(lower[i + 2])
        ) {
          out += 'ਅੰ';
          i += 2;
          continue;
        }
        out += gurmukhi;
        i += key.length;
        continue;
      }
    }

    // Check consonant
    const consMatch = matchPrefix(lower, i, CONSONANTS);
    if (consMatch) {
      const [cKey, cChar] = consMatch;

      // Double single-letter consonant (e.g. ll, tt, pp, ss, gg, nn, kk) -> Addak + consonant
      if (
        cKey.length === 1 &&
        i + 1 < lower.length &&
        lower[i + 1] === cKey &&
        i > 0
      ) {
        out += 'ੱ' + cChar;
        i += 2;
      } else {
        out += cChar;
        i += cKey.length;
      }

      // Handle 'r' conjunct right after p/k/t/b/d/g/s (like pr -> ਪ੍ਰ, kr -> ਕ੍ਰ) if at start or followed by vowel
      if (
        i < lower.length &&
        lower[i] === 'r' &&
        ['p', 'b', 'k', 'g', 't', 'd'].includes(cKey) &&
        isVowelChar(lower[i + 1]) &&
        out.length <= 2
      ) {
        out += '੍ਰ';
        i++;
      }

      // Check vowel matra after consonant
      if (i < lower.length && isVowelChar(lower[i])) {
        const vMatch = matchPrefix(lower, i, VOWEL_MATRAS);
        if (vMatch) {
          const [vKey, matra] = vMatch;
          const afterV = i + vKey.length;

          // Trailing 'a' at end of word usually sounds like aa (ਕੰਨਾ 'ਾ')
          if (vKey === 'a' && afterV === lower.length && lower.length > 2) {
            out += 'ਾ';
          } else {
            out += matra;
          }
          i = afterV;

          // Nasalization: 'n' or 'm' before consonant OR 'n' at end of word after 'a'/'o'/'i'
          if (
            (lower[i] === 'n' || lower[i] === 'm') &&
            i + 1 < lower.length &&
            !isVowelChar(lower[i + 1]) &&
            lower[i + 1] !== lower[i]
          ) {
            const usesBindi = matra === 'ਾ' || matra === 'ੀ' || matra === 'ੇ' || matra === 'ੈ' || matra === 'ੋ' || matra === 'ੌ';
            out += usesBindi ? 'ਂ' : 'ੰ';
            i++;
          } else if (
            lower[i] === 'n' &&
            i + 1 === lower.length &&
            (vKey === 'aa' || vKey === 'o' || vKey === 'i')
          ) {
            out += 'ਂ';
            i++;
          }
        }
      }
      continue;
    }

    // Standalone vowel inside word
    if (isVowelChar(ch)) {
      const m = matchPrefix(lower, i, INDEPENDENT_VOWELS);
      if (m) {
        out += m[1];
        i += m[0].length;
        continue;
      }
    }

    out += rawWord[i];
    i++;
  }

  // Common ending adjustments: word ending in 'y' -> ੀ
  if (lower.endsWith('y') && out.endsWith('ਯ') && lower.length > 2) {
    out = out.slice(0, -1) + 'ੀ';
  }

  return out;
}

export function transliterateEnglishToPunjabi(input: string): string {
  if (!input) return '';
  // Split preserving whitespace so cursor/spaces feel natural while typing
  return input
    .split(/(\s+)/)
    .map((token) => {
      if (!token || /^\s+$/.test(token)) return token;
      return transliterateWordPhonetic(token);
    })
    .join('');
}

export function formatCombinedBilingual(pa: string, en: string): string {
  const cleanPa = (pa || '').trim();
  const cleanEn = (en || '').trim();
  if (cleanPa && cleanEn && cleanPa.toLowerCase() !== cleanEn.toLowerCase()) {
    return `${cleanPa} (${cleanEn})`;
  }
  return cleanPa || cleanEn;
}
