-- Ensure slug is unique so we can safely upsert by slug
CREATE UNIQUE INDEX IF NOT EXISTS content_items_slug_key ON public.content_items (slug);

-- Mantras
INSERT INTO public.content_items (type, slug, title_hi, title_en, deity, meaning, order_index, is_published) VALUES
('mantra','om-namah-shivaya','ॐ नमः शिवाय','Om Namah Shivaya','Shiva','Salutations to Lord Shiva',10,true),
('mantra','om-namo-bhagavate-vasudevaya','ॐ नमो भगवते वासुदेवाय','Om Namo Bhagavate Vasudevaya','Vishnu','Salutations to the divine Vasudeva',20,true),
('mantra','ram-jai-ram','श्री राम जय राम जय जय राम','Shri Ram Jai Ram Jai Jai Ram','Rama','Victory to Lord Rama',30,true),
('mantra','hare-krishna','हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे','Hare Krishna Hare Krishna','Krishna','Invocation of divine love and joy',40,true),
('mantra','om-gan-ganapataye','ॐ गं गणपतये नमः','Om Gan Ganapataye Namah','Ganesha','Salutations to remover of obstacles',50,true),
('mantra','om-hanumate-namah','ॐ हं हनुमते नमः','Om Han Hanumate Namah','Hanuman','Salutations to mighty Hanuman',60,true),
('mantra','jai-shri-krishna','जय श्री कृष्ण','Jai Shri Krishna','Krishna','Glory to Lord Krishna',70,true),
('mantra','om-dum-durgayei','ॐ दुं दुर्गायै नमः','Om Dum Durgayei Namah','Durga','Salutations to Mother Durga',80,true),
('mantra','om-aim-saraswatyai','ॐ ऐं सरस्वत्यै नमः','Om Aim Saraswatyai Namah','Saraswati','Salutations to goddess of wisdom',90,true),
('mantra','om-shreem-mahalakshmiyei','ॐ श्रीं महालक्ष्म्यै नमः','Om Shreem Mahalakshmiyei Namah','Lakshmi','Salutations to goddess of abundance',100,true),
('mantra','gayatri','ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं','Om Bhur Bhuvah Svah Tat Savitur Varenyam','Surya','Gayatri — invocation of divine light',110,true),
('mantra','mahamrityunjaya','ॐ त्र्यम्बकं यजामहे','Om Tryambakam Yajamahe','Shiva','Mahamrityunjaya — for healing and protection',120,true),
('mantra','om','ॐ','Om','Universal','The primordial sound of creation',130,true),
('mantra','sita-ram','सीता राम','Sita Ram','Rama','Sacred union of Sita and Rama',140,true),
('mantra','radhe-radhe','राधे राधे','Radhe Radhe','Radha','Invocation of divine devotion',150,true)
ON CONFLICT (slug) DO NOTHING;

-- Chalisas (verses joined by blank line — split on /\n{2,}/ in app)
INSERT INTO public.content_items (type, slug, title_hi, title_en, deity, body_hi, order_index, is_published) VALUES
('chalisa','hanuman-chalisa','हनुमान चालीसा','Hanuman Chalisa','Hanuman',
E'श्रीगुरु चरन सरोज रज,\nनिज मन मुकुरु सुधारि।\nबरनउँ रघुबर बिमल जसु,\nजो दायकु फल चारि॥\n\nबुद्धिहीन तनु जानिके,\nसुमिरौं पवन-कुमार।\nबल बुधि बिद्या देहु मोहिं,\nहरहु कलेस बिकार॥\n\nजय हनुमान ज्ञान गुन सागर।\nजय कपीस तिहुँ लोक उजागर॥\n\nराम दूत अतुलित बल धामा।\nअंजनि-पुत्र पवनसुत नामा॥\n\nमहाबीर बिक्रम बजरंगी।\nकुमति निवार सुमति के संगी॥\n\nकंचन बरन बिराज सुबेसा।\nकानन कुंडल कुंचित केसा॥\n\nहाथ बज्र औ ध्वजा बिराजै।\nकाँधे मूँज जनेऊ साजै॥\n\nशंकर सुवन केसरीनंदन।\nतेज प्रताप महा जग बंदन॥\n\nविद्यावान गुनी अति चातुर।\nराम काज करिबे को आतुर॥\n\nप्रभु चरित्र सुनिबे को रसिया।\nराम लखन सीता मन बसिया॥',
10,true),
('chalisa','durga-chalisa','दुर्गा चालीसा','Durga Chalisa','Durga',
E'नमो नमो दुर्गे सुख करनी।\nनमो नमो अम्बे दुख हरनी॥\n\nनिरंकार है ज्योति तुम्हारी।\nतिहूँ लोक फैली उजियारी॥\n\nशशि ललाट मुख महा बिशाला।\nनेत्र लाल भृकुटी विकराला॥\n\nरूप मातु को अधिक सुहावै।\nदरश करत जन अति सुख पावै॥\n\nतुम संसार शक्ति लय कीना।\nपालन हेतु अन्न धन दीना॥\n\nअन्नपूर्णा हुई जग पाला।\nतुम ही आदि सुन्दरी बाला॥\n\nप्रलयकाल सब नाशन हारी।\nतुम गौरी शिव-शंकर प्यारी॥\n\nशिव योगी तुम्हरे गुण गावैं।\nब्रह्मा विष्णु तुम्हें नित ध्यावैं॥\n\nरूप सरस्वती को तुम धारा।\nदे सुबुद्धि ऋषि मुनिन उबारा॥\n\nधरयो रूप नरसिंह को अम्बा।\nप्रकट भईं फाड़ कर खम्बा॥',
20,true),
('chalisa','shiv-chalisa','शिव चालीसा','Shiv Chalisa','Shiva',
E'जय गणेश गिरिजा सुवन।\nमंगल मूल सुजान।\nकहत अयोध्यादास तुम,\nदेहु अभय वरदान॥\n\nजय गिरिजा पति दीन दयाला।\nसदा करत सन्तन प्रतिपाला॥\n\nभाल चन्द्रमा सोहत नीके।\nकानन कुंडल नागफनी के॥\n\nअंग गौर शिर गंग बहाये।\nमुण्डमाल तन क्षार लगाये॥\n\nवस्त्र खाल बाघम्बर सोहे।\nछवि को देख नाग मुनि मोहे॥\n\nमैना मातु की हवे दुलारी।\nबाम अंग सोहत छवि न्यारी॥\n\nकर त्रिशूल सोहत छवि भारी।\nकरत सदा शत्रुन क्षयकारी॥\n\nनंदी गणेश सोहैं तहँ कैसे।\nसागर मध्य कमल हैं जैसे॥',
30,true)
ON CONFLICT (slug) DO NOTHING;

-- Aartis
INSERT INTO public.content_items (type, slug, title_hi, title_en, deity, body_hi, order_index, is_published) VALUES
('aarti','om-jai-jagdish','ॐ जय जगदीश हरे','Om Jai Jagdish Hare','Vishnu',
E'ॐ जय जगदीश हरे,\nस्वामी जय जगदीश हरे।\nभक्तजनों के संकट,\nक्षण में दूर करे॥\n\nजो ध्यावै फल पावै,\nदुख बिनसे मन का।\nस्वामी दुख बिनसे मन का।\nसुख सम्पति घर आवै,\nकष्ट मिटे तन का॥\n\nमात-पिता तुम मेरे,\nशरण गहूँ किसकी।\nस्वामी शरण गहूँ किसकी।\nतुम बिन और न दूजा,\nआस करूँ जिसकी॥\n\nतुम पूरण परमात्मा,\nतुम अन्तर्यामी।\nस्वामी तुम अन्तर्यामी।\nपारब्रह्म परमेश्वर,\nतुम सबके स्वामी॥\n\nदीनबन्धु दुखहर्ता,\nठाकुर तुम मेरे।\nस्वामी ठाकुर तुम मेरे।\nअपने हाथ उठाओ,\nद्वार पड़ा तेरे॥',
10,true),
('aarti','shiv-aarti','ॐ जय शिव ओंकारा','Om Jai Shiv Omkara','Shiva',
E'ॐ जय शिव ओंकारा,\nस्वामी जय शिव ओंकारा।\nब्रह्मा विष्णु सदाशिव,\nअर्द्धांगी धारा॥\n\nएकानन चतुरानन,\nपञ्चानन राजे।\nस्वामी पञ्चानन राजे।\nहंसासन गरुड़ासन,\nवृषवाहन साजे॥\n\nदो भुज चार चतुर्भुज,\nदसभुज अति सोहे।\nस्वामी दसभुज अति सोहे।\nत्रिगुण रूप निरखता,\nत्रिभुवन जन मोहे॥\n\nअक्षमाला वनमाला,\nमुण्डमाला धारी।\nस्वामी मुण्डमाला धारी।\nत्रिपुरारी कंसारी,\nकर माला धारी॥',
20,true),
('aarti','ganesh-aarti','जय गणेश जय गणेश देवा','Jai Ganesh Deva','Ganesha',
E'जय गणेश जय गणेश,\nजय गणेश देवा।\nमाता जाकी पार्वती,\nपिता महादेवा॥\n\nएक दन्त दयावन्त,\nचार भुजा धारी।\nमाथे पर तिलक सोहे,\nमूसे की सवारी॥\n\nपान चढ़े फूल चढ़े,\nऔर चढ़े मेवा।\nलड्डुअन का भोग लगे,\nसन्त करें सेवा॥\n\nअंधन को आँख देत,\nकोढ़िन को काया।\nबाँझन को पुत्र देत,\nनिर्धन को माया॥',
30,true)
ON CONFLICT (slug) DO NOTHING;