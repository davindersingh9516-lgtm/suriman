export interface Mantra {
  id: string;
  hi: string;          // Devanagari
  en: string;          // Transliteration
  deity: string;
  meaning: string;     // one-line
}

export const MANTRAS: Mantra[] = [
  {
    id: "om-namah-shivaya",
    hi: "ॐ नमः शिवाय",
    en: "Om Namah Shivaya",
    deity: "Shiva",
    meaning: "Salutations to Lord Shiva",
  },
  {
    id: "om-namo-bhagavate-vasudevaya",
    hi: "ॐ नमो भगवते वासुदेवाय",
    en: "Om Namo Bhagavate Vasudevaya",
    deity: "Vishnu",
    meaning: "Salutations to the divine Vasudeva",
  },
  {
    id: "ram-jai-ram",
    hi: "श्री राम जय राम जय जय राम",
    en: "Shri Ram Jai Ram Jai Jai Ram",
    deity: "Rama",
    meaning: "Victory to Lord Rama",
  },
  {
    id: "hare-krishna",
    hi: "हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे",
    en: "Hare Krishna Hare Krishna",
    deity: "Krishna",
    meaning: "Invocation of divine love and joy",
  },
  {
    id: "om-gan-ganapataye",
    hi: "ॐ गं गणपतये नमः",
    en: "Om Gan Ganapataye Namah",
    deity: "Ganesha",
    meaning: "Salutations to remover of obstacles",
  },
  {
    id: "om-hanumate-namah",
    hi: "ॐ हं हनुमते नमः",
    en: "Om Han Hanumate Namah",
    deity: "Hanuman",
    meaning: "Salutations to mighty Hanuman",
  },
  {
    id: "jai-shri-krishna",
    hi: "जय श्री कृष्ण",
    en: "Jai Shri Krishna",
    deity: "Krishna",
    meaning: "Glory to Lord Krishna",
  },
  {
    id: "om-dum-durgayei",
    hi: "ॐ दुं दुर्गायै नमः",
    en: "Om Dum Durgayei Namah",
    deity: "Durga",
    meaning: "Salutations to Mother Durga",
  },
  {
    id: "om-aim-saraswatyai",
    hi: "ॐ ऐं सरस्वत्यै नमः",
    en: "Om Aim Saraswatyai Namah",
    deity: "Saraswati",
    meaning: "Salutations to goddess of wisdom",
  },
  {
    id: "om-shreem-mahalakshmiyei",
    hi: "ॐ श्रीं महालक्ष्म्यै नमः",
    en: "Om Shreem Mahalakshmiyei Namah",
    deity: "Lakshmi",
    meaning: "Salutations to goddess of abundance",
  },
  {
    id: "gayatri",
    hi: "ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं",
    en: "Om Bhur Bhuvah Svah Tat Savitur Varenyam",
    deity: "Surya",
    meaning: "Gayatri — invocation of divine light",
  },
  {
    id: "mahamrityunjaya",
    hi: "ॐ त्र्यम्बकं यजामहे",
    en: "Om Tryambakam Yajamahe",
    deity: "Shiva",
    meaning: "Mahamrityunjaya — for healing and protection",
  },
  {
    id: "om",
    hi: "ॐ",
    en: "Om",
    deity: "Universal",
    meaning: "The primordial sound of creation",
  },
  {
    id: "sita-ram",
    hi: "सीता राम",
    en: "Sita Ram",
    deity: "Rama",
    meaning: "Sacred union of Sita and Rama",
  },
  {
    id: "radhe-radhe",
    hi: "राधे राधे",
    en: "Radhe Radhe",
    deity: "Radha",
    meaning: "Invocation of divine devotion",
  },
];
